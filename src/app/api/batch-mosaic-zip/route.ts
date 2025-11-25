/**
 * Batch Mosaic Processing from ZIP file
 * User uploads ZIP → Process all images → Return ZIP with inputs/outputs/CSV
 */

import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';

const DEFAULT_MODEL = 'segnext_l_model_A_363_pair_1110_iter_80000';
const MAX_ATTEMPTS = 120;
const POLL_INTERVAL = 5000;

interface CSVRow {
  index: number;
  filename: string;
  before_s3_url: string;
  after_s3_url: string;
  mask_ratio: number;
  status: string;
  task_id: string;
  created_at: string;
}

interface MosaicStatusResponse {
  progress?: number;
  result_s3_url?: string;
  mask_ratio?: number;
  error_info?: string;
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
      throw new Error('AWS credentials not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });
  }

  async uploadImage(imageBuffer: Buffer, filename: string, prefix: string = 'batch_mosaic_zip'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `${prefix}/${timestamp}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: 'image/png',
    });

    await this.s3Client.send(command);

    // Return S3 URI format (triggers presigned URL from API)
    return `s3://${this.bucketName}/${s3Key}`;
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

// Airtable upload function removed

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get('zipFile') as File;
    const modelName = (formData.get('modelName') as string) || DEFAULT_MODEL;

    if (!zipFile) {
      return NextResponse.json({ error: 'No ZIP file provided' }, { status: 400 });
    }

    // Step 1: Extract images from uploaded ZIP
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    const inputZip = await JSZip.loadAsync(zipBuffer);

    const imageFiles: Array<{ filename: string; relativePath: string; buffer: Buffer }> = [];

    // Look for images in inputs folder or root, preserving directory structure
    for (const [relativePath, file] of Object.entries(inputZip.files)) {
      if (file.dir) continue;

      // Normalize path separators for cross-platform compatibility (ZIP uses forward slashes)
      const normalizedPath = relativePath.replace(/\\/g, '/');

      // Skip macOS metadata files and Windows system files
      if (normalizedPath.includes('__MACOSX') ||
          normalizedPath.includes('.DS_Store') ||
          normalizedPath.includes('Thumbs.db') ||
          normalizedPath.includes('desktop.ini')) {
        continue;
      }

      const filename = normalizedPath.split('/').pop() || '';

      // Skip hidden files (files starting with .)
      if (filename.startsWith('.')) {
        continue;
      }

      const ext = filename.toLowerCase().split('.').pop();

      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
        const buffer = await file.async('nodebuffer');
        imageFiles.push({
          filename,
          relativePath: normalizedPath,  // Use normalized path
          buffer
        });
      }
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'No images found in ZIP file' }, { status: 400 });
    }

    // Step 2: Initialize clients
    const s3Uploader = new S3Uploader();

    const csvData: CSVRow[] = [];
    const processedImages: Array<{ filename: string; relativePath: string; buffer: Buffer }> = [];

    // Step 3: Process each image
    for (let i = 0; i < imageFiles.length; i++) {
      const { filename, relativePath, buffer } = imageFiles[i];

      try {
        // Upload to S3
        const beforeS3Url = await s3Uploader.uploadImage(buffer, filename);

        // Create mosaic task
        const createResponse = await fetch(`${process.env.AI_API_URL}/api/v1/mosaic-segmentation`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_origin_s3_url: beforeS3Url,
            model_name: modelName,
          }),
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create task: ${createResponse.status}`);
        }

        const createData = await createResponse.json();
        const taskId = createData.task_id;

        // Poll for completion
        let attempts = 0;
        let completed = false;
        let statusData: MosaicStatusResponse | null = null;

        while (attempts < MAX_ATTEMPTS && !completed) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

          const statusResponse = await fetch(
            `${process.env.AI_API_URL}/api/v1/mosaic-segmentation/${taskId}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.AI_API_KEY}`,
              },
            }
          );

          statusData = await statusResponse.json();

          if (!statusData) {
            throw new Error('Invalid status response');
          }

          const progress = statusData.progress || 0;

          if (progress === 100) {
            completed = true;
            break;
          } else if (progress < 0) {
            throw new Error(statusData.error_info || 'Task failed');
          }

          attempts++;
        }

        if (!completed || !statusData) {
          throw new Error('Task timeout');
        }

        // Download processed image from presigned URL
        const presignedUrl = statusData.result_s3_url;
        const maskRatio = statusData.mask_ratio || 0;

        if (presignedUrl) {
          const imageResponse = await fetch(presignedUrl);
          if (imageResponse.ok) {
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

            // Preserve directory structure for outputs
            // Remove "inputs/" prefix if exists, then reconstruct with processed filename
            const cleanedPath = relativePath.replace(/^inputs\//, '');
            const dirPath = cleanedPath.split('/').slice(0, -1).join('/');
            const processedFilename = `processed_${filename}`;
            const processedRelativePath = dirPath ? `${dirPath}/${processedFilename}` : processedFilename;

            processedImages.push({
              filename: processedFilename,
              relativePath: processedRelativePath,
              buffer: imageBuffer,
            });

            // Airtable upload removed
          } else {
            throw new Error(`Failed to download result: ${imageResponse.status}`);
          }
        } else {
          throw new Error('No presigned URL in response');
        }

        // Add to CSV data
        csvData.push({
          index: i + 1,
          filename,
          before_s3_url: beforeS3Url,
          after_s3_url: presignedUrl || '',
          mask_ratio: maskRatio,
          status: 'completed',
          task_id: taskId,
          created_at: new Date().toISOString(),
        });

      } catch {
        csvData.push({
          index: i + 1,
          filename,
          before_s3_url: '',
          after_s3_url: '',
          mask_ratio: 0,
          status: 'failed',
          task_id: '',
          created_at: new Date().toISOString(),
        });
      }

      // Small delay between images
      if (i < imageFiles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Step 4: Create output ZIP
    const outputZip = new JSZip();

    // Add inputs folder with preserved directory structure
    const inputsFolder = outputZip.folder('inputs');
    if (inputsFolder) {
      for (const { relativePath, buffer } of imageFiles) {
        // Remove "inputs/" prefix if it exists in the original path
        const cleanPath = relativePath.replace(/^inputs\//, '');
        inputsFolder.file(cleanPath, buffer);
      }
    }

    // Add outputs folder with preserved directory structure
    const outputsFolder = outputZip.folder('outputs');
    if (outputsFolder) {
      for (const { relativePath, buffer } of processedImages) {
        // Remove "inputs/" prefix if it exists and use the processed relative path
        const cleanPath = relativePath.replace(/^inputs\//, '');
        outputsFolder.file(cleanPath, buffer);
      }
    }

    // Add CSV file
    const csvContent = [
      'index,filename,before_s3_url,after_s3_url,mask_ratio,status,task_id,created_at',
      ...csvData.map((row) =>
        `${row.index},"${row.filename}","${row.before_s3_url}","${row.after_s3_url}",${row.mask_ratio},${row.status},"${row.task_id}","${row.created_at}"`
      ),
    ].join('\n');

    outputZip.file('results.csv', csvContent);

    // Generate ZIP
    const finalZipBuffer = await outputZip.generateAsync({ type: 'arraybuffer' });

    // Step 5: Return ZIP file
    return new NextResponse(finalZipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="mosaic_results_${Date.now()}.zip"`,
        'Content-Length': finalZipBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process ZIP file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
