import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

interface MosaicSegmentationResponse {
  task_id?: string;
  progress?: number;
  status?: number;
  result_s3_url?: string;
  save_s3_url?: string;
  mask_ratio?: number;
  error_info?: string;
}

class MosaicAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = process.env.AI_API_URL || '';
    this.apiKey = process.env.AI_API_KEY || '';

    if (!this.baseUrl || !this.apiKey) {
      throw new Error("AI_API_URL and AI_API_KEY must be set in environment variables");
    }

    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
  }

  async createMosaicSegmentationTask(imageS3Url: string, modelName?: string, maskType?: string): Promise<MosaicSegmentationResponse> {
    const defaultModelName = process.env.MOSAIC_MODEL_NAME || 'segnext_l_model_A_363_pair_1110_iter_80000';
    const url = `${this.baseUrl}/api/v1/mosaic-segmentation`;

    const payload: Record<string, unknown> = {
      image_origin_s3_url: imageS3Url,
      model_name: modelName || defaultModelName
    };

    // Add mask_type if provided
    if (maskType) {
      payload.mask_type = maskType;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mosaic API request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getMosaicSegmentationStatus(taskId: string): Promise<MosaicSegmentationResponse> {
    const url = `${this.baseUrl}/api/v1/mosaic-segmentation/${taskId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status check failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

// Helper function to convert S3 URI to HTTP URL (exactly like Python backend)
function convertS3UriToHttpUrl(s3Uri: string): string {
  if (!s3Uri.startsWith('s3://')) {
    return s3Uri; // Already an HTTP URL
  }

  // Parse: s3://bucket-name/key/path -> https://bucket-name.s3.region.amazonaws.com/key/path
  const parts = s3Uri.replace('s3://', '').split('/', 1);
  const bucket = parts[0];
  const key = s3Uri.replace(`s3://${bucket}/`, '');

  // Get region from environment or use default
  const region = process.env.AWS_REGION || 'ap-northeast-2';
  const httpUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return httpUrl;
}

// Helper function to download image from HTTP URL (exactly like Python's requests.get())
async function downloadImageFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return buffer;
}

// Helper function to download image from S3 using AWS SDK (for private buckets)
async function downloadImageFromS3(s3Uri: string): Promise<Buffer> {
  // Parse S3 URI
  const parts = s3Uri.replace('s3://', '').split('/', 1);
  const bucket = parts[0];
  const key = s3Uri.replace(`s3://${bucket}/`, '');

  // Get AWS credentials
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || 'ap-northeast-2';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS credentials not configured');
  }

  // Initialize S3 client
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

    // Convert stream to buffer
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
    throw new Error(`S3 download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to download image with fallback methods
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function downloadImageWithFallback(s3Uri: string): Promise<Buffer> {
  // Method 1: Try HTTP URL (for public buckets)
  try {
    const httpUrl = convertS3UriToHttpUrl(s3Uri);
    return await downloadImageFromUrl(httpUrl);
  } catch {
    // Continue to next method
  }

  // Method 2: Try S3 SDK (for private buckets with credentials)
  try {
    return await downloadImageFromS3(s3Uri);
  } catch {
    throw new Error(`Failed to download image from ${s3Uri}. Both HTTP and S3 SDK methods failed.`);
  }
}

// Helper function to upload image to S3 and get S3 URL
async function uploadImageToS3(imageBase64: string): Promise<string> {
  try {
    // Get AWS credentials from environment
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION || 'ap-northeast-2';
    const s3Bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;

    if (!awsAccessKeyId || !awsSecretAccessKey || !s3Bucket) {
      throw new Error("AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME) must be set in environment variables");
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileName = `mosaic-test/${timestamp}-${randomString}.jpg`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/jpeg',
      // Note: ACL removed - bucket should be configured for public access via bucket policy
    });

    await s3Client.send(command);

    // Return S3 URI format (s3://bucket/key) to match Python implementation
    // This format triggers the API to provide result_s3_url with presigned URL
    const s3Uri = `s3://${s3Bucket}/${fileName}`;

    return s3Uri;
  } catch (error) {
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { imageData, modelName, account, maskType } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Initialize Mosaic API client
    const mosaicClient = new MosaicAPIClient();

    // Extract base64 data (remove data:image/...;base64, prefix if present)
    let imageBase64 = imageData;
    if (imageData.includes('base64,')) {
      imageBase64 = imageData.split('base64,')[1];
    }

    // Step 1: Upload image to S3 and get S3 URL
    const s3Url = await uploadImageToS3(imageBase64);

    // Step 2: Create mosaic segmentation task with S3 URL
    const taskResult = await mosaicClient.createMosaicSegmentationTask(
      s3Url,
      modelName,
      maskType
    );

    const taskId = taskResult.task_id;
    if (!taskId) {
      throw new Error('No task_id returned from API');
    }

    // Step 3: Poll for completion (max 10 minutes)
    const maxAttempts = 120; // 10 minutes with 5 second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await mosaicClient.getMosaicSegmentationStatus(taskId);

      // Check if completed
      if (statusResponse.progress === 100) {
        // Prioritize result_s3_url (presigned URL) over save_s3_url (plain S3 URI)
        const presignedUrl = statusResponse.result_s3_url;
        const s3Uri = statusResponse.save_s3_url;

        // Use presigned URL directly as the result URL
        const resultUrl = presignedUrl || convertS3UriToHttpUrl(s3Uri || '');

        return NextResponse.json({
          success: true,
          taskId: taskId,
          resultUrl: resultUrl,
          maskRatio: statusResponse.mask_ratio,
          message: 'Mosaic processing completed successfully'
        });
      }

      // Check if failed
      if (statusResponse.progress && statusResponse.progress < 0) {
        throw new Error(`Task failed: ${statusResponse.error_info || 'Unknown error'}`);
      }

      attempts++;
    }

    // Timeout
    throw new Error(`Task ${taskId} did not complete within 10 minutes`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to process mosaic: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// Status check endpoint
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const mosaicClient = new MosaicAPIClient();
    const statusResponse = await mosaicClient.getMosaicSegmentationStatus(taskId);

    // Return S3 URI as-is (will be processed through Airtable for public access)
    const s3Uri = statusResponse.save_s3_url || statusResponse.result_s3_url;

    return NextResponse.json({
      taskId: taskId,
      progress: statusResponse.progress,
      status: statusResponse.status,
      resultUrl: s3Uri,
      maskRatio: statusResponse.mask_ratio,
      errorInfo: statusResponse.error_info
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to check status: ${errorMessage}` },
      { status: 500 }
    );
  }
}
