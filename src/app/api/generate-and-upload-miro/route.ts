import { NextResponse } from 'next/server';
import { ImageAPIClient } from '@/lib/imageApiClient';
import { MiroClient } from '@/lib/miroClient';
import { uploadToS3 } from '@/lib/s3Upload';

interface TimingSettings {
  statusCheckInterval?: number; // ms between status check rounds (default: 3000)
  statusCheckDelay?: number; // ms between individual task checks (default: 500)
  maxStatusChecks?: number; // max checks before timeout (default: 60)
  taskCreationDelay?: number; // ms between creating new tasks (default: 500)
}

interface GenerateAndUploadRequest {
  tableName: string;
  recordIds?: string[];
  variations?: number; // Number of variations to generate per record (default: 1)
  queueSize?: number; // Maximum concurrent tasks (default: 5)
  promptType?: 'initial_prompt' | 'restyled_prompt' | 'edit_prompt'; // Which prompt field to use (default: 'initial_prompt')
  followReferenceRatio?: boolean; // Match output dimensions to reference image aspect ratio (default: false)
  streamResponse?: boolean; // Use streaming response to send Miro board URL early (default: false)
  timingSettings?: TimingSettings; // Custom timing settings for polling
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

// Available dimension options for generation
const AVAILABLE_DIMENSIONS = [
  { width: 1024, height: 1024, ratio: 1.0 },     // Square (1:1)
  { width: 1024, height: 1536, ratio: 0.667 },   // Portrait (2:3)
  { width: 1536, height: 1024, ratio: 1.5 },     // Landscape (3:2)
];

// Calculate optimal dimensions from reference image
function calculateOptimalDimensions(refWidth: number, refHeight: number): { width: number; height: number } {
  const aspectRatio = refWidth / refHeight;

  let bestMatch = AVAILABLE_DIMENSIONS[0];
  let minDiff = Math.abs(aspectRatio - bestMatch.ratio);

  for (const dim of AVAILABLE_DIMENSIONS) {
    const diff = Math.abs(aspectRatio - dim.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = dim;
    }
  }

  return { width: bestMatch.width, height: bestMatch.height };
}

// Get image dimensions from buffer (supports JPEG, PNG, WebP)
function getImageDimensionsFromBuffer(buffer: Buffer): { width: number; height: number } | null {
  // Check for JPEG (SOF0 marker)
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    // Find SOF0 marker
    for (let i = 2; i < buffer.length - 9; i++) {
      if (buffer[i] === 0xff && (buffer[i + 1] === 0xc0 || buffer[i + 1] === 0xc2)) {
        const height = (buffer[i + 5] << 8) | buffer[i + 6];
        const width = (buffer[i + 7] << 8) | buffer[i + 8];
        return { width, height };
      }
    }
  }

  // Check for PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // Check for WebP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    // VP8 format
    if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
    // VP8L format
    if (buffer.toString('ascii', 12, 16) === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      return { width, height };
    }
  }

  return null;
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
  width: number;
  height: number;
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

// Track record data for Miro row upload
interface RecordMiroData {
  recordId: string;
  recordIndex: number;
  referenceImageUrl: string;
  prompt: string;
  rowLabel: string;
  totalVariations: number;
  completedVariations: Map<number, string>; // variation number -> S3 URL
  miroUploaded: boolean;
}

// Rolling queue configuration (defaults)
const DEFAULT_STATUS_CHECK_INTERVAL = 3000; // 3 seconds between status check rounds
const DEFAULT_STATUS_CHECK_DELAY = 500; // 0.5 seconds between individual task checks
const DEFAULT_MAX_STATUS_CHECKS = 60; // Max checks before timeout (~3 minutes)
const DEFAULT_TASK_CREATION_DELAY = 500; // 0.5 seconds between creating new tasks

export async function POST(request: Request) {
  const body: GenerateAndUploadRequest = await request.json();
  const {
    tableName,
    recordIds,
    variations = 1,
    queueSize = 5,
    promptType = 'initial_prompt',
    followReferenceRatio = false,
    streamResponse = false,
    timingSettings,
    miroConfig,
  } = body;

  // Apply custom timing settings or use defaults
  const statusCheckInterval = timingSettings?.statusCheckInterval ?? DEFAULT_STATUS_CHECK_INTERVAL;
  const statusCheckDelay = timingSettings?.statusCheckDelay ?? DEFAULT_STATUS_CHECK_DELAY;
  const maxStatusChecks = timingSettings?.maxStatusChecks ?? DEFAULT_MAX_STATUS_CHECKS;
  const taskCreationDelay = timingSettings?.taskCreationDelay ?? DEFAULT_TASK_CREATION_DELAY;

  console.log(`⏱️ Timing settings: interval=${statusCheckInterval}ms, delay=${statusCheckDelay}ms, maxChecks=${maxStatusChecks}, creationDelay=${taskCreationDelay}ms`);

  if (!tableName) {
    return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
  }

  // Get Airtable configuration
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    return NextResponse.json({ error: 'Missing Airtable configuration' }, { status: 500 });
  }

  // Miro is optional - use if token exists and either boardId or boardName is provided
  const useMiro = process.env.MIRO_TOKEN && miroConfig && (miroConfig.boardId || miroConfig.boardName);

  // For streaming response, use Server-Sent Events
  if (streamResponse) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (eventType: string, data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
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
                miroBoardUrl = `https://miro.com/app/board/${boardInfo.id}/`;
              } else if (miroConfig!.boardName) {
                const newBoard = await miroClient.createBoard(miroConfig!.boardName);
                miroBoardId = newBoard.id;
                miroBoardUrl = `https://miro.com/app/board/${newBoard.id}/`;
              }

              // Send Miro board URL immediately after creation
              if (miroBoardUrl) {
                sendEvent('miro_board', { miroBoardId, miroBoardUrl });
              }
            } catch {
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
          // Only process records where regenerate_status is true or empty/undefined (for initial generation)
          const recordsToProcess = airtableData.records.filter((record: AirtableRecord) => {
            const promptField = record.fields[promptType];
            const hasPrompt = promptField && String(promptField).trim() !== '';
            const hasReference =
              record.fields.reference_image_attached &&
              Array.isArray(record.fields.reference_image_attached) &&
              record.fields.reference_image_attached.length > 0;

            // Check regenerate_status: 'true' means regenerate, undefined/null means initial generation
            // Empty string '', 'false', or false means already generated (skip)
            const regenerateStatus = record.fields.regenerate_status;

            // Debug logging
            console.log(`📋 Record ${record.id}: regenerate_status = "${regenerateStatus}" (type: ${typeof regenerateStatus})`);

            const shouldGenerate =
              regenerateStatus === true ||
              regenerateStatus === 'true' ||
              regenerateStatus === undefined ||
              regenerateStatus === null;

            console.log(`   shouldGenerate: ${shouldGenerate}, hasPrompt: ${hasPrompt}, hasReference: ${hasReference}`);

            return hasPrompt && hasReference && shouldGenerate;
          });

          if (recordsToProcess.length === 0) {
            sendEvent('complete', {
              message: 'No records ready for generation',
              processedCount: 0,
            });
            controller.close();
            return;
          }

          // Send initial progress
          const totalGenerations = recordsToProcess.length * variations;
          sendEvent('progress', { current: 0, total: totalGenerations, status: 'starting' });

          // Continue with the rest of the generation process (same as non-streaming)
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

            // Determine dimensions - either from reference image or default
            let width = 1024;
            let height = 1536; // Default portrait

            if (followReferenceRatio) {
              try {
                // Download reference image to detect dimensions
                const referenceBuffer = await imageClient.downloadImage(referenceImageUrl);
                const detectedDimensions = getImageDimensionsFromBuffer(referenceBuffer);

                if (detectedDimensions) {
                  const optimalDimensions = calculateOptimalDimensions(
                    detectedDimensions.width,
                    detectedDimensions.height
                  );
                  width = optimalDimensions.width;
                  height = optimalDimensions.height;
                }
              } catch {
                // Fall back to default dimensions if detection fails
              }
            }

            // Note: Not updating status field as it doesn't exist in this Airtable table

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
                width,
                height,
              });
            }
          }

          // Results tracking
          const results: TaskResult[] = [];

          // Track successful generations per record
          const recordGeneratedUrls: Map<string, string[]> = new Map();

          // Track record data for Miro row uploads (reference image | prompt | variations)
          const recordMiroData: Map<string, RecordMiroData> = new Map();

          // Initialize record Miro data
          for (let i = 0; i < recordsToProcess.length; i++) {
            const record = recordsToProcess[i] as AirtableRecord;
            const referenceImageUrl = record.fields.reference_image_attached?.[0]?.url;
            if (!referenceImageUrl) continue;

            const prompt = String(record.fields[promptType] || '');
            const rowLabel = record.fields.reference_image
              ? String(record.fields.reference_image).split('/').pop() || `Row ${i + 1}`
              : `Row ${i + 1}`;

            recordMiroData.set(record.id, {
              recordId: record.id,
              recordIndex: i,
              referenceImageUrl,
              prompt,
              rowLabel,
              totalVariations: variations,
              completedVariations: new Map(),
              miroUploaded: false,
            });
          }

          // Miro upload tracking
          let miroUploadCount = 0;
          let miroUploadErrors = 0;

          // Miro layout configuration with wide gaps
          const MIRO_LAYOUT = {
            referenceImageWidth: 300,
            promptTextWidth: 400,
            generatedImageWidth: miroConfig?.imageWidth || 300,
            generatedImageHeight: miroConfig?.imageHeight || 450,
            gapBetweenReferenceAndPrompt: 150, // Wide gap
            gapBetweenPromptAndResults: 200, // Wide gap
            gapBetweenGeneratedImages: 30,
            rowSpacing: 250, // Wide gap between rows
            startX: miroConfig?.startX || 0,
            startY: miroConfig?.startY || 0,
          };

          // Rolling queue processing
          const activeTasks: Map<string, ActiveTask> = new Map();
          const startTime = Date.now();

          // Helper function to upload entire record row to Miro when all variations complete
          const uploadRecordRowToMiro = async (recordData: RecordMiroData): Promise<boolean> => {
            if (!miroClient || !miroBoardId || recordData.miroUploaded) return false;

            try {
              const { recordIndex, referenceImageUrl, prompt, rowLabel, completedVariations } = recordData;

              // Calculate Y position for this row
              const rowY = MIRO_LAYOUT.startY + recordIndex * (MIRO_LAYOUT.generatedImageHeight + MIRO_LAYOUT.rowSpacing);

              // Calculate X positions
              let currentX = MIRO_LAYOUT.startX;

              // 1. Upload reference image
              await miroClient.uploadImageFromUrl(
                miroBoardId,
                referenceImageUrl,
                { x: currentX, y: rowY },
                `${rowLabel}_reference`,
                MIRO_LAYOUT.referenceImageWidth
              );
              currentX += MIRO_LAYOUT.referenceImageWidth + MIRO_LAYOUT.gapBetweenReferenceAndPrompt;

              // 2. Upload prompt as text label
              await miroClient.createTextLabel(
                miroBoardId,
                prompt.length > 500 ? prompt.substring(0, 500) + '...' : prompt,
                { x: currentX, y: rowY },
                MIRO_LAYOUT.promptTextWidth
              );
              currentX += MIRO_LAYOUT.promptTextWidth + MIRO_LAYOUT.gapBetweenPromptAndResults;

              // 3. Upload generated images in order (variation 1, 2, 3, ...)
              const sortedVariations = Array.from(completedVariations.entries()).sort((a, b) => a[0] - b[0]);

              for (const [variationNum, s3Url] of sortedVariations) {
                await miroClient.uploadImageFromUrl(
                  miroBoardId,
                  s3Url,
                  { x: currentX, y: rowY },
                  `${rowLabel}_v${variationNum}`,
                  MIRO_LAYOUT.generatedImageWidth
                );
                currentX += MIRO_LAYOUT.generatedImageWidth + MIRO_LAYOUT.gapBetweenGeneratedImages;

                // Rate limiting
                await new Promise((resolve) => setTimeout(resolve, 200));
              }

              recordData.miroUploaded = true;
              // Count: reference + prompt + variations
              miroUploadCount += 2 + sortedVariations.length;
              return true;
            } catch {
              miroUploadErrors++;
              return false;
            }
          };

          // Helper function to create a task (downloads reference image per task)
          const createTask = async (queuedTask: QueuedTask): Promise<string | null> => {
            try {
              const referenceBuffer = await imageClient.downloadImage(queuedTask.referenceImageUrl);
              const referenceBase64 = ImageAPIClient.encodeImageToBase64(referenceBuffer);

              const generateResponse = await imageClient.generateImageWithReference({
                prompt: queuedTask.prompt,
                reference_image_base64: referenceBase64,
                width: queuedTask.width,
                height: queuedTask.height,
                body_model_id: queuedTask.characterId || undefined,
              });

              return generateResponse.synth_id || null;
            } catch {
              return null;
            }
          };

          // Helper function to process completed task (download, upload to S3, check if record complete for Miro)
          const processCompletedTask = async (
            task: ActiveTask,
            statusResponse: { result_paths?: string[]; image_urls?: string[] }
          ): Promise<{ success: boolean; s3Url?: string; miroUploaded?: boolean }> => {
            try {
              const imageUrls = statusResponse.result_paths || statusResponse.image_urls || [];
              if (imageUrls.length === 0) {
                return { success: false };
              }

              const generatedImageUrl = imageUrls[0];

              // Download generated image and upload to S3
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

              // Track completed variation for Miro row upload
              const recordData = recordMiroData.get(task.recordId);
              let miroUploaded = false;

              if (recordData) {
                recordData.completedVariations.set(task.variation, s3Url);

                // Check if all variations for this record are complete
                if (recordData.completedVariations.size >= recordData.totalVariations && !recordData.miroUploaded) {
                  // Upload entire row to Miro: reference image | prompt | variations
                  miroUploaded = await uploadRecordRowToMiro(recordData);
                }
              }

              return { success: true, s3Url, miroUploaded };
            } catch {
              return { success: false };
            }
          };

          // Fill initial queue
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
            } else {
              results.push({
                recordId: task.recordId,
                variation: task.variation,
                status: 'error',
                error: 'Failed to create task',
              });
            }

            await new Promise((resolve) => setTimeout(resolve, taskCreationDelay));
          }

          // Rolling queue loop
          while (activeTasks.size > 0) {
            await new Promise((resolve) => setTimeout(resolve, statusCheckInterval));

            const completedInRound: string[] = [];

            // Check status of all active tasks
            for (const [synthId, task] of activeTasks) {
              try {
                const statusResponse = await imageClient.checkTaskStatus(synthId);
                const status = statusResponse.status;
                const progress = statusResponse.progress || 0;

                task.statusChecks++;

                await new Promise((resolve) => setTimeout(resolve, statusCheckDelay));

                if (status === 'completed' || progress === 100) {
                  const result = await processCompletedTask(task, statusResponse);

                  if (result.success) {
                    results.push({
                      recordId: task.recordId,
                      variation: task.variation,
                      status: 'success',
                      generatedImageUrl: result.s3Url,
                      miroUploaded: result.miroUploaded,
                    });
                  } else {
                    results.push({
                      recordId: task.recordId,
                      variation: task.variation,
                      status: 'error',
                      error: 'Failed to process completed task',
                    });
                  }

                  completedInRound.push(synthId);

                  // Send progress update
                  sendEvent('progress', {
                    current: results.length,
                    total: totalGenerations,
                    status: 'generating',
                  });
                } else if (status === 'failed' || progress < 0) {
                  results.push({
                    recordId: task.recordId,
                    variation: task.variation,
                    status: 'error',
                    error: 'Image generation failed',
                  });
                  completedInRound.push(synthId);
                } else if (task.statusChecks >= maxStatusChecks) {
                  results.push({
                    recordId: task.recordId,
                    variation: task.variation,
                    status: 'error',
                    error: 'Task timeout',
                  });
                  completedInRound.push(synthId);
                }
              } catch {
                task.statusChecks++;
                if (task.statusChecks >= 3) {
                  results.push({
                    recordId: task.recordId,
                    variation: task.variation,
                    status: 'error',
                    error: 'Failed to check status',
                  });
                  completedInRound.push(synthId);
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
                } else {
                  results.push({
                    recordId: newTask.recordId,
                    variation: newTask.variation,
                    status: 'error',
                    error: 'Failed to create task',
                  });
                }

                await new Promise((resolve) => setTimeout(resolve, taskCreationDelay));
              }
            }
          }

          // Calculate total time
          const totalTime = (Date.now() - startTime) / 1000;

          // Update Airtable records with regenerate_status = 'false' to mark as completed
          console.log(`📝 Updating regenerate_status for ${recordGeneratedUrls.size} records with successful generations`);
          for (const [recordId, urls] of recordGeneratedUrls) {
            console.log(`   Record ${recordId}: ${urls.length} URLs generated`);
            if (urls.length > 0) {
              try {
                const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`, {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    fields: {
                      regenerate_status: 'false',
                    },
                  }),
                });

                if (!updateResponse.ok) {
                  const errorText = await updateResponse.text();
                  console.error(`❌ Failed to update record ${recordId}:`, errorText);
                } else {
                  const responseData = await updateResponse.json();
                  console.log(`✅ Updated record ${recordId} - regenerate_status set to 'false'. Response:`, JSON.stringify(responseData.fields?.regenerate_status));
                }
              } catch (error) {
                console.error(`❌ Error updating record ${recordId}:`, error);
              }
            }
          }

          // Note: Not marking failed records with status field as it doesn't exist in this Airtable table

          const successCount = results.filter((r) => r.status === 'success').length;

          // Send final complete event
          sendEvent('complete', {
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

          controller.close();
        } catch (error) {
          sendEvent('error', { error: error instanceof Error ? error.message : 'Failed to process' });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // Non-streaming response (original behavior)
  try {
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
          miroBoardUrl = `https://miro.com/app/board/${boardInfo.id}/`;
        } else if (miroConfig!.boardName) {
          const newBoard = await miroClient.createBoard(miroConfig!.boardName);
          miroBoardId = newBoard.id;
          miroBoardUrl = `https://miro.com/app/board/${newBoard.id}/`;
        }
      } catch {
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
    // Only process records where regenerate_status is true or empty/undefined (for initial generation)
    const recordsToProcess = airtableData.records.filter((record: AirtableRecord) => {
      const promptField = record.fields[promptType];
      const hasPrompt = promptField && String(promptField).trim() !== '';
      const hasReference =
        record.fields.reference_image_attached &&
        Array.isArray(record.fields.reference_image_attached) &&
        record.fields.reference_image_attached.length > 0;

      // Check regenerate_status: 'true' means regenerate, undefined/null means initial generation
      // Empty string '' means already generated (skip)
      const regenerateStatus = record.fields.regenerate_status;

      // Debug logging
      console.log(`📋 Record ${record.id}: regenerate_status = "${regenerateStatus}" (type: ${typeof regenerateStatus})`);

      const shouldGenerate =
        regenerateStatus === true ||
        regenerateStatus === 'true' ||
        regenerateStatus === undefined ||
        regenerateStatus === null;

      console.log(`   shouldGenerate: ${shouldGenerate}, hasPrompt: ${hasPrompt}, hasReference: ${hasReference}`);

      return hasPrompt && hasReference && shouldGenerate;
    });

    if (recordsToProcess.length === 0) {
      return NextResponse.json({
        message: 'No records ready for generation',
        processedCount: 0,
      });
    }

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

      // Determine dimensions - either from reference image or default
      let width = 1024;
      let height = 1536; // Default portrait

      if (followReferenceRatio) {
        try {
          // Download reference image to detect dimensions
          const referenceBuffer = await imageClient.downloadImage(referenceImageUrl);
          const detectedDimensions = getImageDimensionsFromBuffer(referenceBuffer);

          if (detectedDimensions) {
            const optimalDimensions = calculateOptimalDimensions(
              detectedDimensions.width,
              detectedDimensions.height
            );
            width = optimalDimensions.width;
            height = optimalDimensions.height;
          }
        } catch {
          // Fall back to default dimensions if detection fails
        }
      }

      // Note: Not updating status field as it doesn't exist in this Airtable table

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
          width,
          height,
        });
      }
    }

    // Results tracking
    const results: TaskResult[] = [];

    // Track successful generations per record
    const recordGeneratedUrls: Map<string, string[]> = new Map();

    // Track record data for Miro row uploads (reference image | prompt | variations)
    const recordMiroData: Map<string, RecordMiroData> = new Map();

    // Initialize record Miro data
    for (let i = 0; i < recordsToProcess.length; i++) {
      const record = recordsToProcess[i] as AirtableRecord;
      const referenceImageUrl = record.fields.reference_image_attached?.[0]?.url;
      if (!referenceImageUrl) continue;

      const prompt = String(record.fields[promptType] || '');
      const rowLabel = record.fields.reference_image
        ? String(record.fields.reference_image).split('/').pop() || `Row ${i + 1}`
        : `Row ${i + 1}`;

      recordMiroData.set(record.id, {
        recordId: record.id,
        recordIndex: i,
        referenceImageUrl,
        prompt,
        rowLabel,
        totalVariations: variations,
        completedVariations: new Map(),
        miroUploaded: false,
      });
    }

    // Miro upload tracking
    let miroUploadCount = 0;
    let miroUploadErrors = 0;

    // Miro layout configuration with wide gaps
    const MIRO_LAYOUT = {
      referenceImageWidth: 300,
      promptTextWidth: 400,
      generatedImageWidth: miroConfig?.imageWidth || 300,
      generatedImageHeight: miroConfig?.imageHeight || 450,
      gapBetweenReferenceAndPrompt: 150, // Wide gap
      gapBetweenPromptAndResults: 200, // Wide gap
      gapBetweenGeneratedImages: 30,
      rowSpacing: 250, // Wide gap between rows
      startX: miroConfig?.startX || 0,
      startY: miroConfig?.startY || 0,
    };

    // Rolling queue processing
    const activeTasks: Map<string, ActiveTask> = new Map();
    const startTime = Date.now();

    // Helper function to upload entire record row to Miro when all variations complete
    const uploadRecordRowToMiro = async (recordData: RecordMiroData): Promise<boolean> => {
      if (!miroClient || !miroBoardId || recordData.miroUploaded) return false;

      try {
        const { recordIndex, referenceImageUrl, prompt, rowLabel, completedVariations } = recordData;

        // Calculate Y position for this row
        const rowY = MIRO_LAYOUT.startY + recordIndex * (MIRO_LAYOUT.generatedImageHeight + MIRO_LAYOUT.rowSpacing);

        // Calculate X positions
        let currentX = MIRO_LAYOUT.startX;

        // 1. Upload reference image
        await miroClient.uploadImageFromUrl(
          miroBoardId,
          referenceImageUrl,
          { x: currentX, y: rowY },
          `${rowLabel}_reference`,
          MIRO_LAYOUT.referenceImageWidth
        );
        currentX += MIRO_LAYOUT.referenceImageWidth + MIRO_LAYOUT.gapBetweenReferenceAndPrompt;

        // 2. Upload prompt as text label
        await miroClient.createTextLabel(
          miroBoardId,
          prompt.length > 500 ? prompt.substring(0, 500) + '...' : prompt,
          { x: currentX, y: rowY },
          MIRO_LAYOUT.promptTextWidth
        );
        currentX += MIRO_LAYOUT.promptTextWidth + MIRO_LAYOUT.gapBetweenPromptAndResults;

        // 3. Upload generated images in order (variation 1, 2, 3, ...)
        const sortedVariations = Array.from(completedVariations.entries()).sort((a, b) => a[0] - b[0]);

        for (const [variationNum, s3Url] of sortedVariations) {
          await miroClient.uploadImageFromUrl(
            miroBoardId,
            s3Url,
            { x: currentX, y: rowY },
            `${rowLabel}_v${variationNum}`,
            MIRO_LAYOUT.generatedImageWidth
          );
          currentX += MIRO_LAYOUT.generatedImageWidth + MIRO_LAYOUT.gapBetweenGeneratedImages;

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        recordData.miroUploaded = true;
        // Count: reference + prompt + variations
        miroUploadCount += 2 + sortedVariations.length;
        return true;
      } catch {
        miroUploadErrors++;
        return false;
      }
    };

    // Helper function to create a task (downloads reference image per task)
    const createTask = async (queuedTask: QueuedTask): Promise<string | null> => {
      try {
        const referenceBuffer = await imageClient.downloadImage(queuedTask.referenceImageUrl);
        const referenceBase64 = ImageAPIClient.encodeImageToBase64(referenceBuffer);

        const generateResponse = await imageClient.generateImageWithReference({
          prompt: queuedTask.prompt,
          reference_image_base64: referenceBase64,
          width: queuedTask.width,
          height: queuedTask.height,
          body_model_id: queuedTask.characterId || undefined,
        });

        return generateResponse.synth_id || null;
      } catch {
        return null;
      }
    };

    // Helper function to process completed task (download, upload to S3, check if record complete for Miro)
    const processCompletedTask = async (
      task: ActiveTask,
      statusResponse: { result_paths?: string[]; image_urls?: string[] }
    ): Promise<{ success: boolean; s3Url?: string; miroUploaded?: boolean }> => {
      try {
        const imageUrls = statusResponse.result_paths || statusResponse.image_urls || [];
        if (imageUrls.length === 0) {
          return { success: false };
        }

        const generatedImageUrl = imageUrls[0];

        // Download generated image and upload to S3
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

        // Track completed variation for Miro row upload
        const recordData = recordMiroData.get(task.recordId);
        let miroUploaded = false;

        if (recordData) {
          recordData.completedVariations.set(task.variation, s3Url);

          // Check if all variations for this record are complete
          if (recordData.completedVariations.size >= recordData.totalVariations && !recordData.miroUploaded) {
            // Upload entire row to Miro: reference image | prompt | variations
            miroUploaded = await uploadRecordRowToMiro(recordData);
          }
        }

        return { success: true, s3Url, miroUploaded };
      } catch {
        return { success: false };
      }
    };

    // Fill initial queue
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
      } else {
        results.push({
          recordId: task.recordId,
          variation: task.variation,
          status: 'error',
          error: 'Failed to create task',
        });
      }

      await new Promise((resolve) => setTimeout(resolve, taskCreationDelay));
    }

    // Rolling queue loop
    while (activeTasks.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, statusCheckInterval));

      const completedInRound: string[] = [];

      // Check status of all active tasks
      for (const [synthId, task] of activeTasks) {
        try {
          const statusResponse = await imageClient.checkTaskStatus(synthId);
          const status = statusResponse.status;
          const progress = statusResponse.progress || 0;

          task.statusChecks++;

          await new Promise((resolve) => setTimeout(resolve, statusCheckDelay));

          if (status === 'completed' || progress === 100) {
            const result = await processCompletedTask(task, statusResponse);

            if (result.success) {
              results.push({
                recordId: task.recordId,
                variation: task.variation,
                status: 'success',
                generatedImageUrl: result.s3Url,
                miroUploaded: result.miroUploaded,
              });
            } else {
              results.push({
                recordId: task.recordId,
                variation: task.variation,
                status: 'error',
                error: 'Failed to process completed task',
              });
            }

            completedInRound.push(synthId);
          } else if (status === 'failed' || progress < 0) {
            results.push({
              recordId: task.recordId,
              variation: task.variation,
              status: 'error',
              error: 'Image generation failed',
            });
            completedInRound.push(synthId);
          } else if (task.statusChecks >= maxStatusChecks) {
            results.push({
              recordId: task.recordId,
              variation: task.variation,
              status: 'error',
              error: 'Task timeout',
            });
            completedInRound.push(synthId);
          }
        } catch {
          task.statusChecks++;
          if (task.statusChecks >= 3) {
            results.push({
              recordId: task.recordId,
              variation: task.variation,
              status: 'error',
              error: 'Failed to check status',
            });
            completedInRound.push(synthId);
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
          } else {
            results.push({
              recordId: newTask.recordId,
              variation: newTask.variation,
              status: 'error',
              error: 'Failed to create task',
            });
          }

          await new Promise((resolve) => setTimeout(resolve, taskCreationDelay));
        }
      }
    }

    // Calculate total time
    const totalTime = (Date.now() - startTime) / 1000;

    // Update Airtable records - set regenerate_status to 'false' to mark as completed
    console.log(`📝 Updating regenerate_status for ${recordGeneratedUrls.size} records with successful generations`);
    for (const [recordId, urls] of recordGeneratedUrls) {
      console.log(`   Record ${recordId}: ${urls.length} URLs generated`);
      if (urls.length > 0) {
        try {
          const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                regenerate_status: 'false',
              },
            }),
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`❌ Failed to update record ${recordId}:`, errorText);
          } else {
            const responseData = await updateResponse.json();
            console.log(`✅ Updated record ${recordId} - regenerate_status set to 'false'. Response:`, JSON.stringify(responseData.fields?.regenerate_status));
          }
        } catch (error) {
          console.error(`❌ Error updating record ${recordId}:`, error);
        }
      }
    }

    // Note: Not marking failed records with status field as it doesn't exist in this Airtable table

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process' },
      { status: 500 }
    );
  }
}
