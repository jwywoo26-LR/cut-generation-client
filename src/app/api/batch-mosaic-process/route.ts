/**
 * Batch Mosaic Processing API Route
 * Port of Python batch processing script - Single Model Version
 */

import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import { ImageAPIClient } from '@/lib/imageApiClient';

const DEFAULT_MODEL = 'segnext_l_model_A_363_pair_1110_iter_80000';

interface BatchProcessRequest {
  images: {
    index: number;
    imageData: string; // base64 image data
    filename: string;
  }[];
  modelName?: string;
}

interface ProcessedResult {
  index: number;
  filename: string;
  beforeS3Url: string;
  afterS3Url: string;
  maskRatio: number;
  status: 'completed' | 'failed';
  error?: string;
}

class S3Uploader {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.region = process.env.AWS_REGION || 'ap-northeast-2';
    this.bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';

    if (!awsAccessKeyId || !awsSecretAccessKey || !this.bucketName) {
      throw new Error('AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME) not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });
  }

  async uploadImage(imageBase64: string, filename: string, prefix: string = 'batch_mosaic'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `${prefix}/${timestamp}/${filename}`;

    try {
      const buffer = Buffer.from(imageBase64, 'base64');

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/png',
      });

      await this.s3Client.send(command);

      // Return S3 URI format (s3://bucket/key) to match Python implementation
      // This format triggers the API to provide result_s3_url with presigned URL
      const s3Uri = `s3://${this.bucketName}/${s3Key}`;
      return s3Uri;
    } catch (error) {
      throw error;
    }
  }
}

// Helper to download image from S3 using AWS SDK (for private buckets)
async function downloadImageFromS3(s3Uri: string): Promise<Buffer> {
  const parts = s3Uri.replace('s3://', '').split('/', 1);
  const bucket = parts[0];
  const key = s3Uri.replace(`s3://${bucket}/`, '');

  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || 'ap-northeast-2';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS credentials not configured');
  }

  const s3Client = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    const chunks: Uint8Array[] = [];
    if (response.Body) {
      // @ts-ignore
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
    }
    const buffer = Buffer.concat(chunks);

    return buffer;
  } catch (error) {
    throw error;
  }
}

// Helper to convert S3 URI to HTTP URL (matches Python implementation)
function convertS3UriToHttpUrl(s3Uri: string): string {
  if (!s3Uri.startsWith('s3://')) {
    return s3Uri;
  }

  // Parse: s3://bucket/key -> https://bucket.s3.region.amazonaws.com/key
  const parts = s3Uri.replace('s3://', '').split('/', 1);
  const bucket = parts[0];
  const key = s3Uri.replace(`s3://${bucket}/`, '');
  const region = process.env.AWS_REGION || 'ap-northeast-2';

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// Helper to download with fallback
async function downloadImageWithFallback(s3Uri: string): Promise<Buffer> {
  // Try HTTP first
  try {
    const httpUrl = convertS3UriToHttpUrl(s3Uri);
    const response = await fetch(httpUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer;
    }
  } catch (httpError) {
    // Continue to S3 SDK fallback
  }

  // Fallback to S3 SDK
  return await downloadImageFromS3(s3Uri);
}

// Helper to save metadata to Airtable
async function saveMetadataToAirtable(
  taskId: string,
  beforeHttpUrl: string,
  afterHttpUrl: string
): Promise<void> {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;

  if (!airtableApiKey || !airtableBaseId) {
    throw new Error('Airtable credentials not configured');
  }

  const tableName = 'mosic_table';
  const encodedTableName = encodeURIComponent(tableName);

  const fields: Record<string, unknown> = {
    request_id: taskId,
    created_at: new Date().toISOString(),
    progress: 100,
    input_image: [{ url: beforeHttpUrl }],
    output_image: [{ url: afterHttpUrl }],
  };

  const createResponse = await fetch(
    `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Airtable save failed: ${createResponse.status} - ${errorText}`);
  }
}

// Helper to upload image to Airtable and get public CDN URL
// This downloads the image from S3 and re-uploads to Airtable
async function uploadToAirtable(
  s3Uri: string,
  taskId: string,
  inputImageUrl: string
): Promise<string> {
  const buffer = await downloadImageWithFallback(s3Uri);
  const base64Image = buffer.toString('base64');

  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;

  if (!airtableApiKey || !airtableBaseId) {
    throw new Error('Airtable credentials not configured');
  }

  const tableName = 'mosic_table';
  const encodedTableName = encodeURIComponent(tableName);
  const filename = s3Uri.split('/').pop() || 'mosaic_result.png';

  const fields: Record<string, unknown> = {
    request_id: taskId,
    created_at: new Date().toISOString(),
    progress: 100,
    output_image: [
      {
        filename: filename,
        contentType: 'image/png',
        base64: base64Image,
      },
    ],
  };

  if (inputImageUrl) {
    fields['input_image'] = [{ url: inputImageUrl }];
  }

  const createResponse = await fetch(
    `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Airtable upload failed: ${createResponse.status} - ${errorText}`);
  }

  const airtableRecord = await createResponse.json();
  const attachments = airtableRecord.fields.output_image;

  if (attachments && attachments.length > 0) {
    return attachments[0].url;
  }

  throw new Error('No URL returned from Airtable');
}

// Process a single image
async function processSingleImage(
  imageData: string,
  filename: string,
  index: number,
  s3Uploader: S3Uploader,
  imageClient: ImageAPIClient,
  modelName: string
): Promise<ProcessedResult> {
  try {
    // Step 1: Upload to S3
    const beforeS3Url = await s3Uploader.uploadImage(imageData, filename);

    // Step 2: Create mosaic segmentation task
    const createUrl = `${imageClient['baseUrl']}/api/v1/mosaic-segmentation`;
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: imageClient['headers'],
      body: JSON.stringify({
        image_origin_s3_url: beforeS3Url,
        model_name: modelName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.status}`);
    }

    const taskResult = await response.json();
    const taskId = taskResult.task_id;

    // Step 3: Poll for completion
    const maxAttempts = 120; // 10 minutes
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds

      const statusUrl = `${imageClient['baseUrl']}/api/v1/mosaic-segmentation/${taskId}`;
      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: imageClient['headers'],
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      const progress = statusData.progress || 0;

      if (progress === 100) {
        const maskRatio = statusData.mask_ratio || 0;

        // Check what URLs are available
        // result_s3_url contains presigned URL when processing is complete
        const presignedUrl = statusData.result_s3_url;
        const s3Uri = statusData.save_s3_url;

        // Download from presigned URL and re-upload to our S3
        let afterS3Url = '';

        if (presignedUrl) {
          try {
            const response = await fetch(presignedUrl);
            if (!response.ok) {
              throw new Error(`HTTP download failed: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            const processedFilename = `processed_${filename}`;
            afterS3Url = await s3Uploader.uploadImage(
              imageBuffer.toString('base64'),
              processedFilename
            );

            // Save to Airtable - convert S3 URIs to HTTP URLs
            const beforeHttpUrl = convertS3UriToHttpUrl(beforeS3Url);
            const afterHttpUrl = convertS3UriToHttpUrl(afterS3Url);
            await saveMetadataToAirtable(taskId, beforeHttpUrl, afterHttpUrl);
          } catch (error) {
            // Fallback: just save the presigned URL
            afterS3Url = presignedUrl;
            try {
              const beforeHttpUrl = convertS3UriToHttpUrl(beforeS3Url);
              await saveMetadataToAirtable(taskId, beforeHttpUrl, afterS3Url);
            } catch (airtableError) {
              // Airtable save failed silently
            }
          }
        } else if (s3Uri) {
          // No presigned URL available, convert S3 URI
          afterS3Url = convertS3UriToHttpUrl(s3Uri);
          try {
            const beforeHttpUrl = convertS3UriToHttpUrl(beforeS3Url);
            await saveMetadataToAirtable(taskId, beforeHttpUrl, afterS3Url);
          } catch (airtableError) {
            // Airtable save failed silently
          }
        }

        return {
          index,
          filename,
          beforeS3Url,
          afterS3Url,
          maskRatio,
          status: 'completed',
        };
      } else if (progress < 0) {
        throw new Error(statusData.error_info || 'Task failed');
      }

      attempts++;
    }

    throw new Error('Task timeout');
  } catch (error) {
    return {
      index,
      filename,
      beforeS3Url: '',
      afterS3Url: '',
      maskRatio: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { images, modelName = DEFAULT_MODEL, returnZip = false } = body;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Initialize clients
    const s3Uploader = new S3Uploader();
    const imageClient = new ImageAPIClient();

    const results: ProcessedResult[] = [];

    // Process each image
    for (const image of images) {
      const result = await processSingleImage(
        image.imageData,
        image.filename,
        image.index,
        s3Uploader,
        imageClient,
        modelName
      );

      results.push(result);

      // Small delay between images
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // Calculate summary
    const successful = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    // If returnZip is true, download all images and create zip
    if (returnZip) {
      const zip = new JSZip();
      const downloadedImages: Array<{ filename: string; buffer: Buffer }> = [];

      // Download all successful results
      for (const result of results) {
        if (result.status === 'completed' && result.afterS3Url) {
          try {
            const response = await fetch(result.afterS3Url);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              // Add to zip with processed filename
              const processedFilename = `processed_${result.filename}`;
              zip.file(processedFilename, buffer);
              downloadedImages.push({ filename: processedFilename, buffer });
            }
          } catch (error) {
            // Failed to download, skip this image
          }
        }
      }

      if (downloadedImages.length === 0) {
        return NextResponse.json(
          { error: 'No images could be downloaded for ZIP creation' },
          { status: 500 }
        );
      }

      // Generate ZIP file
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      // Return ZIP file as downloadable response
      return new NextResponse(zipBuffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="mosaic_processed_${Date.now()}.zip"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      });
    }

    // Otherwise return JSON response
    return NextResponse.json({
      success: true,
      results,
      summary: {
        model: modelName,
        total: results.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
