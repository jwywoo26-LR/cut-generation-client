/**
 * Batch Mosaic Processing API Route
 * Port of Python batch processing script - Single Model Version
 */

import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import { ImageAPIClient } from '@/lib/imageApiClient';

const DEFAULT_MODEL = 'segnext_l_model_A_363_pair_1110_iter_80000';

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
      // Type assertion needed because AWS SDK Body type doesn't properly expose async iterator in types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of response.Body as any) {
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
  } catch {
    // Continue to S3 SDK fallback
  }

  // Fallback to S3 SDK
  return await downloadImageFromS3(s3Uri);
}

// Airtable upload functions removed

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

            // Airtable upload removed
          } catch {
            // Fallback: just save the presigned URL
            afterS3Url = presignedUrl;
          }
        } else if (s3Uri) {
          // No presigned URL available, convert S3 URI
          afterS3Url = convertS3UriToHttpUrl(s3Uri);
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
          } catch {
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
      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      // Return ZIP file as downloadable response
      return new NextResponse(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="mosaic_processed_${Date.now()}.zip"`,
          'Content-Length': zipBuffer.byteLength.toString(),
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
