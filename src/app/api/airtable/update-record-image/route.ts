import { NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3Upload';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tableName = formData.get('tableName') as string;
    const recordId = formData.get('recordId') as string;
    const file = formData.get('file') as File;

    console.log('Received upload request:', {
      tableName,
      recordId,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
    });

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not configured' },
        { status: 500 }
      );
    }

    const encodedTableName = encodeURIComponent(tableName);

    // Check file size (Airtable has a 20MB limit per attachment)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 20MB limit` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type based on file extension
    const filename = file.name;
    const ext = filename.toLowerCase().split('.').pop();
    let contentType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === 'webp') {
      contentType = 'image/webp';
    }

    console.log('Uploading to S3:', filename, contentType, buffer.length, 'bytes');

    // Upload to S3 and get the public URL
    const s3Url = await uploadToS3(buffer, filename, contentType);

    console.log('S3 upload successful:', s3Url);

    const fields: Record<string, unknown> = {
      reference_image: filename,
      reference_image_attached: [
        {
          url: s3Url,
        },
      ],
    };

    console.log('Sending to Airtable:', {
      url: `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${recordId}`,
      fields: {
        reference_image: filename,
        reference_image_attached_length: 1,
      },
    });

    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        {
          error: 'Failed to update record',
          details: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const record = await response.json();
    console.log('Successfully updated record:', record.id);

    return NextResponse.json({
      success: true,
      record: record,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
