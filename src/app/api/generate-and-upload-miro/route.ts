import { NextResponse } from 'next/server';
import { ImageAPIClient } from '@/lib/imageApiClient';
import { MiroClient } from '@/lib/miroClient';
import { uploadToS3 } from '@/lib/s3Upload';

interface GenerateAndUploadRequest {
  tableName: string;
  recordIds?: string[];
  variations?: number; // Number of variations to generate per record (default: 1)
  queueSize?: number; // Maximum concurrent tasks (default: 5)
  promptType?: 'initial_prompt' | 'restyled_prompt' | 'edit_prompt'; // Which prompt field to use (default: 'initial_prompt')
  miroConfig?: {
    boardId?: string; // Optional - if not provided but boardName is, creates a new board
    boardName?: string; // Name for new board (required if boardId not provided)
    layout?: 'grid' | 'table';
    startX?: number;
    startY?: number;
    imageWidth?: number;
    imageHeight?: number;
    columns?: number;
  };
}

interface AirtableRecord {
  id: string;
  fields: {
    reference_image?: string;
    reference_image_attached?: Array<{ url: string }>;
    character_id?: string;
    initial_prompt?: string;
    restyled_prompt?: string;
    edit_prompt?: string;
    final_prompt?: string;
    status?: string;
    generated_image_url?: string;
    miro_item_id?: string;
    [key: string]: unknown;
  };
}

interface QueuedTask {
  recordId: string;
  recordIndex: number;
  variation: number;
  prompt: string;
  characterId: string;
  referenceImageUrl: string;
  rowLabel: string;
}

// Track Miro row setup per record (reference image + prompt uploaded)
interface MiroRowSetup {
  recordId: string;
  recordIndex: number;
  referenceUploaded: boolean;
  promptUploaded: boolean;
  referenceImageUrl: string;
  prompt: string;
  rowLabel: string;
}

interface ActiveTask {
  recordId: string;
  recordIndex: number;
  variation: number;
  synthId: string;
  prompt: string;
  rowLabel: string;
  statusChecks: number;
  createdAt: number;
}

interface TaskResult {
  recordId: string;
  status: string;
  variation?: number;
  generatedImageUrl?: string;
  miroUploaded?: boolean;
  error?: string;
}

// Rolling queue configuration
const STATUS_CHECK_INTERVAL = 3000; // 3 seconds between status check rounds
const STATUS_CHECK_DELAY = 500; // 0.5 seconds between individual task checks
const MAX_STATUS_CHECKS_PER_TASK = 60; // Max checks before timeout (~3 minutes)
const TASK_CREATION_DELAY = 500; // 0.5 seconds between creating new tasks

export async function POST(request: Request) {
  try {
    const body: GenerateAndUploadRequest = await request.json();
    const {
      tableName,
      recordIds,
      variations = 1,
      queueSize = 5,
      promptType = 'initial_prompt',
      miroConfig,
    } = body;

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Miro is optional - use if token exists and either boardId or boardName is provided
    const useMiro = process.env.MIRO_TOKEN && miroConfig && (miroConfig.boardId || miroConfig.boardName);

    // Get Airtable configuration
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json({ error: 'Missing Airtable configuration' }, { status: 500 });
    }

    // Initialize clients
    const imageClient = new ImageAPIClient();
    let miroClient: MiroClient | null = null;
    let miroBoardId: string | null = null;
    let miroBoardUrl: string | null = null;

    // Only initialize Miro client if needed
    if (useMiro) {
      try {
        miroClient = new MiroClient();

        if (miroConfig!.boardId) {
          const boardInfo = await miroClient.getBoardInfo(miroConfig!.boardId);
          miroBoardId = boardInfo.id;
          console.log(`✅ Using existing Miro board: ${boardInfo.name}`);
        } else if (miroConfig!.boardName) {
          const newBoard = await miroClient.createBoard(miroConfig!.boardName);
          miroBoardId = newBoard.id;
          miroBoardUrl = `https://miro.com/app/board/${newBoard.id}/`;
          console.log(`✅ Created new Miro board: ${newBoard.name}`);
        }
      } catch (error) {
        console.warn('⚠️ Miro setup failed, continuing without Miro upload:', error);
        miroClient = null;
        miroBoardId = null;
      }
    }

    // Fetch records from Airtable
    let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    if (recordIds && recordIds.length > 0) {
      const filterFormula = `OR(${recordIds.map((id) => `RECORD_ID()="${id}"`).join(',')})`;
      airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const airtableResponse = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!airtableResponse.ok) {
      throw new Error(`Airtable API error: ${airtableResponse.status}`);
    }

    const airtableData = await airtableResponse.json();

    // Filter records that are ready for generation based on the specified prompt type
    const recordsToProcess = airtableData.records.filter((record: AirtableRecord) => {
      const promptField = record.fields[promptType];
      const hasPrompt = promptField && String(promptField).trim() !== '';
      const hasReference =
        record.fields.reference_image_attached &&
        Array.isArray(record.fields.reference_image_attached) &&
        record.fields.reference_image_attached.length > 0;
      const notProcessing =
        record.fields.status !== 'generation_request_sent' &&
        record.fields.status !== 'uploading_to_miro';

      return hasPrompt && hasReference && notProcessing;
    });

    if (recordsToProcess.length === 0) {
      return NextResponse.json({
        message: 'No records ready for generation',
        processedCount: 0,
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎨 Rolling Queue Image Generator`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Records to process: ${recordsToProcess.length}`);
    console.log(`🔢 Variations per record: ${variations}`);
    console.log(`🎯 Queue size: ${queueSize} concurrent tasks`);
    console.log(`📝 Prompt type: ${promptType}`);
    console.log(`🖼️ Miro upload: ${miroClient && miroBoardId ? 'enabled (immediate)' : 'disabled'}`);
    console.log(`${'='.repeat(60)}\n`);

    // Track completed variations per record (to know when all are done)
    const recordVariationCount: Map<string, { total: number; completed: number }> = new Map();

    // Track Miro row setup per record (reference image + prompt)
    const miroRowSetups: Map<string, MiroRowSetup> = new Map();

    // Build task queue - one task per variation per record
    const taskQueue: QueuedTask[] = [];

    for (let i = 0; i < recordsToProcess.length; i++) {
      const record = recordsToProcess[i] as AirtableRecord;
      const referenceImageUrl = record.fields.reference_image_attached?.[0]?.url;

      if (!referenceImageUrl) continue;

      // Get prompt from the specified prompt type
      const prompt = String(record.fields[promptType] || '');

      // Get character_id from record to use as body_model_id
      const characterId = record.fields.character_id || '';

      // Row label for Miro
      const rowLabel = record.fields.reference_image
        ? String(record.fields.reference_image).split('/').pop() || `Row ${i + 1}`
        : `Row ${i + 1}`;

      // Update status to generation_request_sent
      await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: { status: 'generation_request_sent' },
        }),
      });

      // Initialize variation tracking for this record
      recordVariationCount.set(record.id, { total: variations, completed: 0 });

      // Initialize Miro row setup tracking
      miroRowSetups.set(record.id, {
        recordId: record.id,
        recordIndex: i,
        referenceUploaded: false,
        promptUploaded: false,
        referenceImageUrl,
        prompt,
        rowLabel,
      });

      // Add tasks for each variation (reference image will be downloaded when task is created)
      for (let v = 0; v < variations; v++) {
        taskQueue.push({
          recordId: record.id,
          recordIndex: i,
          variation: v + 1,
          prompt,
          characterId,
          referenceImageUrl,
          rowLabel,
        });
      }
    }

    const totalTasks = taskQueue.length;
    console.log(`\n📦 Total tasks queued: ${totalTasks}`);
    console.log(`🚀 Starting rolling queue processing...\n`);

    // Results tracking
    const results: TaskResult[] = [];

    // Track successful generations per record
    const recordGeneratedUrls: Map<string, string[]> = new Map();

    // Miro upload tracking
    let miroUploadCount = 0;
    let miroUploadErrors = 0;

    // Miro layout configuration with wider gaps
    const MIRO_CONFIG = {
      referenceImageWidth: 300,
      promptTextWidth: 400,
      generatedImageWidth: miroConfig?.imageWidth || 300,
      generatedImageHeight: miroConfig?.imageHeight || 450,
      gapBetweenReferenceAndPrompt: 100, // Wide gap between reference and prompt
      gapBetweenPromptAndResults: 150, // Wide gap between prompt and results
      gapBetweenGeneratedImages: 30, // Normal gap between generated images
      rowSpacing: 200, // Much wider gap between rows
      startX: miroConfig?.startX || 0,
      startY: miroConfig?.startY || 0,
    };

    // Rolling queue processing
    const activeTasks: Map<string, ActiveTask> = new Map();
    let completedCount = 0;
    const startTime = Date.now();

    // Helper function to create a task (downloads reference image per task)
    const createTask = async (queuedTask: QueuedTask): Promise<string | null> => {
      try {
        // Download reference image for this specific task
        console.log(`  📥 Downloading reference for ${queuedTask.rowLabel} v${queuedTask.variation}...`);
        const referenceBuffer = await imageClient.downloadImage(queuedTask.referenceImageUrl);
        const referenceBase64 = ImageAPIClient.encodeImageToBase64(referenceBuffer);

        // Create generation task
        const generateResponse = await imageClient.generateImageWithReference({
          prompt: queuedTask.prompt,
          reference_image_base64: referenceBase64,
          width: 1024,
          height: 1536,
          body_model_id: queuedTask.characterId || undefined,
        });

        return generateResponse.synth_id || null;
      } catch (error) {
        console.error(`  ❌ Error creating task for ${queuedTask.rowLabel} v${queuedTask.variation}:`, error);
        return null;
      }
    };

    // Helper function to process completed task (download, upload to S3, upload to Miro immediately)
    const processCompletedTask = async (
      task: ActiveTask,
      statusResponse: { result_paths?: string[]; image_urls?: string[] }
    ): Promise<{ success: boolean; s3Url?: string; miroUploaded?: boolean }> => {
      try {
        const imageUrls = statusResponse.result_paths || statusResponse.image_urls || [];
        if (imageUrls.length === 0) {
          console.log(`  ⚠️ No download URL in response for ${task.rowLabel} v${task.variation}`);
          return { success: false };
        }

        const generatedImageUrl = imageUrls[0];

        // Download generated image and upload to S3
        console.log(`  📤 Downloading & uploading ${task.rowLabel} v${task.variation} to S3...`);
        const generatedBuffer = await imageClient.downloadImage(generatedImageUrl);
        const s3Url = await uploadToS3(
          generatedBuffer,
          `generated-images/${task.recordId}-v${task.variation}-${Date.now()}.png`,
          'image/png'
        );

        // Track for record update
        if (!recordGeneratedUrls.has(task.recordId)) {
          recordGeneratedUrls.set(task.recordId, []);
        }
        recordGeneratedUrls.get(task.recordId)!.push(s3Url);

        // Upload to Miro immediately if configured
        let miroUploaded = false;
        if (miroClient && miroBoardId) {
          try {
            console.log(`  🖼️ Uploading ${task.rowLabel} v${task.variation} to Miro...`);

            // Calculate position based on record index and variation
            const imageWidth = miroConfig?.imageWidth || 300;
            const imageHeight = miroConfig?.imageHeight || 450;
            const spacing = 20;
            const startX = miroConfig?.startX || 0;
            const startY = miroConfig?.startY || 0;

            let x: number, y: number;

            if (miroConfig?.layout === 'table') {
              // Table layout: rows are records, columns are variations
              x = startX + (task.variation - 1) * (imageWidth + spacing);
              y = startY + task.recordIndex * (imageHeight + spacing);
            } else {
              // Grid layout: fill left to right, top to bottom
              const columns = miroConfig?.columns || variations || 5;
              const totalIndex = task.recordIndex * variations + (task.variation - 1);
              const col = totalIndex % columns;
              const row = Math.floor(totalIndex / columns);
              x = startX + col * (imageWidth + spacing);
              y = startY + row * (imageHeight + spacing);
            }

            await miroClient.uploadImageFromUrl(
              miroBoardId,
              s3Url,
              { x, y },
              `${task.rowLabel}_v${task.variation}`,
              imageWidth
            );

            miroUploaded = true;
            miroUploadCount++;
            console.log(`  ✅ Miro upload complete for ${task.rowLabel} v${task.variation}`);
          } catch (miroError) {
            console.error(`  ⚠️ Miro upload failed for ${task.rowLabel} v${task.variation}:`, miroError);
            miroUploadErrors++;
            // Don't fail the task - S3 upload was successful
          }

          // Rate limiting for Miro API
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        return { success: true, s3Url, miroUploaded };
      } catch (error) {
        console.error(`  ❌ Error processing ${task.rowLabel} v${task.variation}:`, error);
        return { success: false };
      }
    };

    // Fill initial queue
    console.log(`🔄 Filling initial queue (${Math.min(queueSize, taskQueue.length)} tasks)...`);
    while (activeTasks.size < queueSize && taskQueue.length > 0) {
      const task = taskQueue.shift()!;
      const synthId = await createTask(task);

      if (synthId) {
        activeTasks.set(synthId, {
          recordId: task.recordId,
          recordIndex: task.recordIndex,
          variation: task.variation,
          synthId,
          prompt: task.prompt,
          rowLabel: task.rowLabel,
          statusChecks: 0,
          createdAt: Date.now(),
        });
        console.log(`  ✅ Started task ${activeTasks.size}: ${task.rowLabel} v${task.variation}`);
      } else {
        results.push({
          recordId: task.recordId,
          variation: task.variation,
          status: 'error',
          error: 'Failed to create task',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, TASK_CREATION_DELAY));
    }

    console.log(`\n✅ Initial queue filled: ${activeTasks.size} active tasks`);
    console.log(`📊 Status: ${completedCount}/${totalTasks} completed, ${activeTasks.size} active, ${taskQueue.length} pending\n`);

    // Rolling queue loop
    while (activeTasks.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, STATUS_CHECK_INTERVAL));

      console.log(`\n--- Checking ${activeTasks.size} active tasks ---`);

      const completedInRound: string[] = [];

      // Check status of all active tasks
      for (const [synthId, task] of activeTasks) {
        try {
          const statusResponse = await imageClient.checkTaskStatus(synthId);
          const status = statusResponse.status;
          const progress = statusResponse.progress || 0;

          task.statusChecks++;

          await new Promise((resolve) => setTimeout(resolve, STATUS_CHECK_DELAY));

          if (status === 'completed' || progress === 100) {
            const timeTaken = (Date.now() - task.createdAt) / 1000;
            const minutes = Math.floor(timeTaken / 60);
            const seconds = Math.floor(timeTaken % 60);

            const result = await processCompletedTask(task, statusResponse);

            if (result.success) {
              results.push({
                recordId: task.recordId,
                variation: task.variation,
                status: 'success',
                generatedImageUrl: result.s3Url,
                miroUploaded: result.miroUploaded,
              });
              console.log(`  ✅ Completed: ${task.rowLabel} v${task.variation} (took ${minutes}m ${seconds}s)${result.miroUploaded ? ' [Miro ✓]' : ''}`);
            } else {
              results.push({
                recordId: task.recordId,
                variation: task.variation,
                status: 'error',
                error: 'Failed to process completed task',
              });
              console.log(`  ❌ Failed: ${task.rowLabel} v${task.variation} (took ${minutes}m ${seconds}s)`);
            }

            completedInRound.push(synthId);
            completedCount++;
          } else if (status === 'failed' || progress < 0) {
            console.log(`  ❌ Task failed: ${task.rowLabel} v${task.variation}`);
            results.push({
              recordId: task.recordId,
              variation: task.variation,
              status: 'error',
              error: 'Image generation failed',
            });
            completedInRound.push(synthId);
            completedCount++;
          } else if (task.statusChecks >= MAX_STATUS_CHECKS_PER_TASK) {
            console.log(`  ⏱️ Task timeout: ${task.rowLabel} v${task.variation}`);
            results.push({
              recordId: task.recordId,
              variation: task.variation,
              status: 'error',
              error: 'Task timeout',
            });
            completedInRound.push(synthId);
            completedCount++;
          } else {
            console.log(`  🔄 ${task.rowLabel} v${task.variation}: ${status} (${progress}%)`);
          }
        } catch (error) {
          console.error(`  ❌ Error checking ${task.rowLabel} v${task.variation}:`, error);
          task.statusChecks++;
          if (task.statusChecks >= 3) {
            results.push({
              recordId: task.recordId,
              variation: task.variation,
              status: 'error',
              error: 'Failed to check status',
            });
            completedInRound.push(synthId);
            completedCount++;
          }
        }
      }

      // Remove completed tasks and start new ones
      for (const synthId of completedInRound) {
        activeTasks.delete(synthId);

        // Start a new task if queue has more
        if (taskQueue.length > 0) {
          const newTask = taskQueue.shift()!;
          const newSynthId = await createTask(newTask);

          if (newSynthId) {
            activeTasks.set(newSynthId, {
              recordId: newTask.recordId,
              recordIndex: newTask.recordIndex,
              variation: newTask.variation,
              synthId: newSynthId,
              prompt: newTask.prompt,
              rowLabel: newTask.rowLabel,
              statusChecks: 0,
              createdAt: Date.now(),
            });
            console.log(`  🆕 Started new task: ${newTask.rowLabel} v${newTask.variation}`);
          } else {
            results.push({
              recordId: newTask.recordId,
              variation: newTask.variation,
              status: 'error',
              error: 'Failed to create task',
            });
          }

          await new Promise((resolve) => setTimeout(resolve, TASK_CREATION_DELAY));
        }
      }

      // Progress update
      const miroStatus = miroClient && miroBoardId ? `, ${miroUploadCount} uploaded to Miro` : '';
      console.log(
        `\n📊 Progress: ${completedCount}/${totalTasks} completed, ${activeTasks.size} active, ${taskQueue.length} pending${miroStatus}`
      );
    }

    // Calculate total time
    const totalTime = (Date.now() - startTime) / 1000;
    const totalMinutes = Math.floor(totalTime / 60);
    const totalSeconds = Math.floor(totalTime % 60);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ All tasks processed!`);
    console.log(`⏱️  Total time: ${totalMinutes}m ${totalSeconds}s`);
    if (miroClient && miroBoardId) {
      console.log(`🖼️  Miro uploads: ${miroUploadCount} successful, ${miroUploadErrors} failed`);
    }
    console.log(`${'='.repeat(60)}\n`);

    // Update Airtable records with generated URLs
    for (const [recordId, urls] of recordGeneratedUrls) {
      if (urls.length > 0) {
        await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              generated_image_url: urls[0],
              status: 'generation_completed',
            },
          }),
        });
      }
    }

    // Mark records with no successful generations as failed
    const recordsWithSuccess = new Set(recordGeneratedUrls.keys());
    for (const record of recordsToProcess as AirtableRecord[]) {
      if (!recordsWithSuccess.has(record.id)) {
        await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: { status: 'generation_failed' },
          }),
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;

    return NextResponse.json({
      message: `Processed ${recordsToProcess.length} records with ${variations} variation(s) each using queue size ${queueSize}`,
      processedCount: recordsToProcess.length,
      totalGenerations: results.length,
      successCount,
      queueSize,
      totalTimeSeconds: Math.round(totalTime),
      miroUploadCount,
      miroUploadErrors,
      miroEnabled: !!(miroClient && miroBoardId),
      miroBoardId,
      miroBoardUrl,
      results,
    });
  } catch (error) {
    console.error('Error in generate and upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process' },
      { status: 500 }
    );
  }
}
