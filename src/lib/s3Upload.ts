import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function uploadToS3(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  // Get AWS credentials from environment
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || 'ap-northeast-2';
  const s3Bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;

  if (!awsAccessKeyId || !awsSecretAccessKey || !s3Bucket) {
    throw new Error('AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME) must be set in environment variables');
  }

  // Initialize S3 client
  const s3Client = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });

  // Generate a unique filename to avoid collisions
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const key = `reference-images/${timestamp}-${randomString}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    Body: file,
    ContentType: contentType,
    // Note: ACL removed - bucket should be configured for public access via bucket policy
  });

  await s3Client.send(command);

  // Return public HTTP URL
  const url = `https://${s3Bucket}.s3.${awsRegion}.amazonaws.com/${key}`;
  return url;
}
