import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface ImageEditResponse {
  task_id?: string;
  progress?: number;
  status?: number;
  result_s3_url?: string;
  save_s3_url?: string;
  error_info?: string;
}

class ImageEditAPIClient {
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

  async createImageEditTask(
    imageS3Url: string,
    editType: string,
    gender: string,
    seed: number
  ): Promise<ImageEditResponse> {
    const url = `${this.baseUrl}/api/v1/image-edit/`;

    const payload: Record<string, unknown> = {
      image_origin_s3_url: imageS3Url,
      edit_type: editType,
      gender: gender,
      seed: seed
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image Edit API request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getImageEditStatus(taskId: string): Promise<ImageEditResponse> {
    const url = `${this.baseUrl}/api/v1/image-edit/${taskId}`;

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

// Helper function to convert S3 URI to HTTP URL
function convertS3UriToHttpUrl(s3Uri: string): string {
  if (!s3Uri.startsWith('s3://')) {
    return s3Uri; // Already an HTTP URL
  }

  const parts = s3Uri.replace('s3://', '').split('/', 1);
  const bucket = parts[0];
  const key = s3Uri.replace(`s3://${bucket}/`, '');
  const region = process.env.AWS_REGION || 'ap-northeast-2';
  const httpUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return httpUrl;
}

// Helper function to upload image to S3 and get S3 URL
async function uploadImageToS3(imageBase64: string): Promise<string> {
  try {
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION || 'ap-northeast-2';
    const s3Bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;

    if (!awsAccessKeyId || !awsSecretAccessKey || !s3Bucket) {
      throw new Error("AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME) must be set in environment variables");
    }

    const s3Client = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    const buffer = Buffer.from(imageBase64, 'base64');
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileName = `image-edit/${timestamp}-${randomString}.jpg`;

    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/jpeg',
    });

    await s3Client.send(command);
    const s3Uri = `s3://${s3Bucket}/${fileName}`;

    return s3Uri;
  } catch (error) {
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { imageData, editType, gender } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    if (!editType) {
      return NextResponse.json(
        { error: 'Edit type is required' },
        { status: 400 }
      );
    }

    // Initialize Image Edit API client
    const imageEditClient = new ImageEditAPIClient();

    // Extract base64 data
    let imageBase64 = imageData;
    if (imageData.includes('base64,')) {
      imageBase64 = imageData.split('base64,')[1];
    }

    // Step 1: Upload image to S3
    const s3Url = await uploadImageToS3(imageBase64);

    // Step 2: Create image edit task (always use random seed -1)
    const taskResult = await imageEditClient.createImageEditTask(
      s3Url,
      editType,
      gender,
      -1 // Always use -1 for random seed
    );

    const taskId = taskResult.task_id;
    if (!taskId) {
      throw new Error('No task_id returned from API');
    }

    // Step 3: Poll for completion (max 10 minutes)
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await imageEditClient.getImageEditStatus(taskId);

      // Check if completed
      if (statusResponse.progress === 100) {
        const presignedUrl = statusResponse.result_s3_url;
        const s3Uri = statusResponse.save_s3_url;
        const resultUrl = presignedUrl || convertS3UriToHttpUrl(s3Uri || '');

        return NextResponse.json({
          success: true,
          taskId: taskId,
          resultUrl: resultUrl,
          message: 'Image edit completed successfully'
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
        error: `Failed to process image edit: ${errorMessage}`
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

    const imageEditClient = new ImageEditAPIClient();
    const statusResponse = await imageEditClient.getImageEditStatus(taskId);

    const s3Uri = statusResponse.save_s3_url || statusResponse.result_s3_url;

    return NextResponse.json({
      taskId: taskId,
      progress: statusResponse.progress,
      status: statusResponse.status,
      resultUrl: s3Uri,
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
