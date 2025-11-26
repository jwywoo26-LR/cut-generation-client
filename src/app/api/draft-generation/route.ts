import { NextResponse } from 'next/server';
import { ImageAPIClient } from '@/lib/imageApiClient';
import { uploadToS3 } from '@/lib/s3Upload';

interface TimingSettings {
  statusCheckInterval?: number; // ms between status check rounds (default: 3000)
  statusCheckDelay?: number; // ms between individual task checks (default: 500)
  maxStatusChecks?: number; // max checks before timeout (default: 60)
  taskCreationDelay?: number; // ms between creating new tasks (default: 500)
}

interface DraftGenerationRequest {
  tableName: string;
  queueSize?: number; // Maximum concurrent tasks (default: 5)
  followReferenceRatio?: boolean; // Match output dimensions to reference image aspect ratio (default: false)
  timingSettings?: TimingSettings; // Custom timing settings for polling
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
    regenerate_status?: string | boolean;
    image_1?: Array<{ url: string }>;
    image_2?: Array<{ url: string }>;
    image_3?: Array<{ url: string }>;
    [key: string]: unknown;
  };
}

interface QueuedTask {
  recordId: string;
  recordIndex: number;
  variation: number; // 1, 2, or 3
  prompt: string;
  characterId: string;
  referenceImageUrl: string;
  width: number;
  height: number;
}

interface ActiveTask {
  recordId: string;
  recordIndex: number;
  variation: number;
  synthId: string;
  prompt: string;
  statusChecks: number;
  createdAt: number;
}

interface TaskResult {
  recordId: string;
  status: string;
  variation?: number;
  generatedImageUrl?: string;
  error?: string;
}

// Track record data for per-record Airtable updates
interface RecordDraftData {
  recordId: string;
  recordIndex: number;
  totalVariations: number;
  completedVariations: Map<number, string>; // variation number -> S3 URL
  airtableUpdated: boolean;
}

// Rolling queue configuration (defaults)
const DEFAULT_STATUS_CHECK_INTERVAL = 3000; // 3 seconds between status check rounds
const DEFAULT_STATUS_CHECK_DELAY = 500; // 0.5 seconds between individual task checks
const DEFAULT_MAX_STATUS_CHECKS = 60; // Max checks before timeout (~3 minutes)
const DEFAULT_TASK_CREATION_DELAY = 500; // 0.5 seconds between creating new tasks

// Number of variations to generate per record
const VARIATIONS_COUNT = 3;

export async function POST(request: Request) {
  const body: DraftGenerationRequest = await request.json();
  const {
    tableName,
    queueSize = 5,
    followReferenceRatio = false,
    timingSettings,
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

  // Use Server-Sent Events for streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isControllerClosed = false;

      const sendEvent = (eventType: string, data: Record<string, unknown>) => {
        if (isControllerClosed) {
          console.log(`⚠️ Skipping event '${eventType}' - controller already closed`);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.log(`⚠️ Failed to send event '${eventType}':`, error);
          isControllerClosed = true;
        }
      };

      const closeController = () => {
        if (!isControllerClosed) {
          isControllerClosed = true;
          controller.close();
        }
      };

      try {
        // Initialize image API client
        const imageClient = new ImageAPIClient();

        // Fetch records from Airtable
        const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

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

        // Filter records for draft generation
        const recordsToProcess = airtableData.records.filter((record: AirtableRecord) => {
          const initialPrompt = record.fields.initial_prompt;
          const hasPrompt = initialPrompt && String(initialPrompt).trim() !== '';
          const hasReference =
            record.fields.reference_image_attached &&
            Array.isArray(record.fields.reference_image_attached) &&
            record.fields.reference_image_attached.length > 0;

          return hasPrompt && hasReference;
        });

        if (recordsToProcess.length === 0) {
          sendEvent('complete', {
            message: 'No records ready for draft generation',
            processedCount: 0,
          });
          closeController();
          return;
        }

        const totalGenerations = recordsToProcess.length * VARIATIONS_COUNT;
        sendEvent('progress', { current: 0, total: totalGenerations, status: 'starting' });

        console.log(`🎨 Draft Generation: Processing ${recordsToProcess.length} records with ${VARIATIONS_COUNT} variations each`);

        // Build task queue - 3 variations per record
        const taskQueue: QueuedTask[] = [];

        // Track record data for per-record Airtable updates
        const recordDraftData: Map<string, RecordDraftData> = new Map();

        for (let i = 0; i < recordsToProcess.length; i++) {
          const record = recordsToProcess[i] as AirtableRecord;
          const referenceImageUrl = record.fields.reference_image_attached?.[0]?.url;

          if (!referenceImageUrl) continue;

          const prompt = String(record.fields.initial_prompt || '');
          const characterId = record.fields.character_id || '';

          // Initialize record draft data
          recordDraftData.set(record.id, {
            recordId: record.id,
            recordIndex: i,
            totalVariations: VARIATIONS_COUNT,
            completedVariations: new Map(),
            airtableUpdated: false,
          });

          // Determine dimensions
          let width = 1024;
          let height = 1536; // Default portrait

          if (followReferenceRatio) {
            try {
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
              // Fall back to default dimensions
            }
          }

          // Add 3 tasks for each record (image_1, image_2, image_3)
          for (let v = 1; v <= VARIATIONS_COUNT; v++) {
            taskQueue.push({
              recordId: record.id,
              recordIndex: i,
              variation: v,
              prompt,
              characterId,
              referenceImageUrl,
              width,
              height,
            });
          }
        }

        // Results tracking
        const results: TaskResult[] = [];
        let updateSuccessCount = 0;
        let updateErrorCount = 0;

        // Rolling queue processing
        const activeTasks: Map<string, ActiveTask> = new Map();
        const startTime = Date.now();

        // Helper function to update Airtable when all variations for a record are complete
        const updateAirtableForRecord = async (recordData: RecordDraftData): Promise<boolean> => {
          if (recordData.airtableUpdated) return true;

          try {
            const fields: Record<string, unknown> = {};

            const image1Url = recordData.completedVariations.get(1);
            const image2Url = recordData.completedVariations.get(2);
            const image3Url = recordData.completedVariations.get(3);

            if (image1Url) {
              fields.image_1 = [{ url: image1Url }];
            }
            if (image2Url) {
              fields.image_2 = [{ url: image2Url }];
            }
            if (image3Url) {
              fields.image_3 = [{ url: image3Url }];
            }

            console.log(`📝 Updating record ${recordData.recordId} with images`);

            const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${recordData.recordId}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fields }),
            });

            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error(`❌ Failed to update record ${recordData.recordId}:`, errorText);
              updateErrorCount++;
              return false;
            }

            console.log(`✅ Updated record ${recordData.recordId} with draft images`);
            recordData.airtableUpdated = true;
            updateSuccessCount++;

            // Send record_updated event
            sendEvent('record_updated', {
              recordId: recordData.recordId,
              recordIndex: recordData.recordIndex,
              image1Url,
              image2Url,
              image3Url,
            });

            return true;
          } catch (error) {
            console.error(`❌ Error updating record ${recordData.recordId}:`, error);
            updateErrorCount++;
            return false;
          }
        };

        // Helper function to create a task
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
          } catch (error) {
            console.error(`Failed to create task for record ${queuedTask.recordId}:`, error);
            return null;
          }
        };

        // Helper function to process completed task
        const processCompletedTask = async (
          task: ActiveTask,
          statusResponse: { result_paths?: string[]; image_urls?: string[] }
        ): Promise<{ success: boolean; s3Url?: string }> => {
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
              `draft-images/${task.recordId}-v${task.variation}-${Date.now()}.png`,
              'image/png'
            );

            // Track completed variation
            const recordData = recordDraftData.get(task.recordId);
            if (recordData) {
              recordData.completedVariations.set(task.variation, s3Url);

              // Check if all variations for this record are complete
              if (recordData.completedVariations.size >= recordData.totalVariations && !recordData.airtableUpdated) {
                // Update Airtable immediately when all 3 variations are done
                await updateAirtableForRecord(recordData);
              }
            }

            return { success: true, s3Url };
          } catch (error) {
            console.error(`Failed to process completed task for record ${task.recordId}:`, error);
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

          // Log progress
          const completedCount = results.length;
          console.log(`🎨 Draft Generation Progress: ${completedCount}/${totalGenerations}`);
        }

        // Calculate total time
        const totalTime = (Date.now() - startTime) / 1000;
        const successCount = results.filter((r) => r.status === 'success').length;

        // Send final complete event
        sendEvent('complete', {
          message: `Draft generation complete. Processed ${recordsToProcess.length} records with ${VARIATIONS_COUNT} variations each.`,
          processedCount: recordsToProcess.length,
          totalGenerations: results.length,
          successCount,
          updateSuccessCount,
          updateErrorCount,
          queueSize,
          totalTimeSeconds: Math.round(totalTime),
          results,
        });

        closeController();
      } catch (error) {
        sendEvent('error', { error: error instanceof Error ? error.message : 'Failed to process draft generation' });
        closeController();
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
