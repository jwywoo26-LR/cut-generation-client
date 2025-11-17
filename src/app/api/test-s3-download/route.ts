import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Helper function to convert S3 URI to HTTP URL
function convertS3UriToHttpUrl(s3Uri: string): string {
  if (!s3Uri.startsWith('s3://')) {
    return s3Uri;
  }

  const parts = s3Uri.replace('s3://', '').split('/', 1);
  const bucket = parts[0];
  const key = s3Uri.replace(`s3://${bucket}/`, '');

  const region = process.env.AWS_REGION || 'ap-northeast-2';
  const httpUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return httpUrl;
}

// Test HTTP download (public access)
async function testHttpDownload(url: string): Promise<{ success: boolean; status?: number; error?: string; size?: number }> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      success: true,
      status: response.status,
      size: arrayBuffer.byteLength
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test S3 SDK access (authenticated)
async function testS3SdkAccess(s3Uri: string): Promise<{ success: boolean; error?: string; size?: number; contentType?: string }> {
  try {
    const parts = s3Uri.replace('s3://', '').split('/', 1);
    const bucket = parts[0];
    const key = s3Uri.replace(`s3://${bucket}/`, '');

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // First try HeadObject to check if object exists
    const headCommand = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const headResponse = await s3Client.send(headCommand);

    // Then try to get the object
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const getResponse = await s3Client.send(getCommand);

    // Convert stream to buffer to get size
    const chunks: Uint8Array[] = [];
    if (getResponse.Body) {
      // Type assertion needed because AWS SDK Body type doesn't properly expose async iterator in types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of getResponse.Body as any) {
        chunks.push(chunk);
      }
    }
    const buffer = Buffer.concat(chunks);

    return {
      success: true,
      size: buffer.length,
      contentType: headResponse.ContentType
    };
  } catch (error) {
    const err = error as Error & { name?: string };
    return {
      success: false,
      error: `${err.name || 'Error'}: ${err.message}`
    };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const s3Uri = searchParams.get('s3Uri') || 's3://lionrocket-api-image-synthesis/synth-images/mosaic_segmentation/20251112/5a8475c6-a97d-42e1-b2e1-ed368e3d015c_masked.png';

    console.log('Testing S3 download for:', s3Uri);

    // Parse S3 URI
    const parts = s3Uri.replace('s3://', '').split('/', 1);
    const bucket = parts[0];
    const key = s3Uri.replace(`s3://${bucket}/`, '');

    // Convert to HTTP URL
    const httpUrl = convertS3UriToHttpUrl(s3Uri);

    // Test 1: HTTP download (public access)
    console.log('Test 1: Trying HTTP download...');
    const httpResult = await testHttpDownload(httpUrl);

    // Test 2: S3 SDK access (authenticated)
    console.log('Test 2: Trying S3 SDK access...');
    const s3Result = await testS3SdkAccess(s3Uri);

    // Check AWS credentials
    const hasCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

    return NextResponse.json({
      s3Uri,
      bucket,
      key,
      httpUrl,
      httpDownload: httpResult,
      s3SdkAccess: s3Result,
      awsConfig: {
        hasCredentials,
        region: process.env.AWS_REGION || 'not set',
        configuredBucket: process.env.AWS_S3_BUCKET || 'not set'
      },
      diagnosis: {
        canAccessViaHttp: httpResult.success,
        canAccessViaS3Sdk: s3Result.success,
        recommendation: !httpResult.success && !s3Result.success
          ? 'Neither HTTP nor S3 SDK access works. Check: 1) S3 bucket permissions, 2) AWS credentials, 3) Bucket/key existence'
          : httpResult.success
          ? 'HTTP access works - bucket is publicly accessible'
          : s3Result.success
          ? 'S3 SDK access works - use authenticated download with AWS credentials'
          : 'Unknown issue'
      }
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
