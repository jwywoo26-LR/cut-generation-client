import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { uploadToS3 } from '@/lib/s3Upload';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tableName = formData.get('tableName') as string;
    const files = formData.getAll('files') as File[];

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
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
    const imageFiles: Array<{ filename: string; buffer: Buffer }> = [];

    // Process each file
    for (const file of files) {
      if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        // Extract images from ZIP
        const arrayBuffer = await file.arrayBuffer();
        const zipBuffer = Buffer.from(arrayBuffer);
        const zip = await JSZip.loadAsync(zipBuffer);

        for (const [relativePath, zipFile] of Object.entries(zip.files)) {
          if (zipFile.dir) continue;

          // Normalize path and skip metadata files
          const normalizedPath = relativePath.replace(/\\/g, '/');
          if (normalizedPath.includes('__MACOSX') ||
              normalizedPath.includes('.DS_Store') ||
              normalizedPath.includes('Thumbs.db') ||
              normalizedPath.includes('desktop.ini')) {
            continue;
          }

          const filename = normalizedPath.split('/').pop() || '';
          if (filename.startsWith('.')) continue;

          const ext = filename.toLowerCase().split('.').pop();
          if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
            const buffer = await zipFile.async('nodebuffer');
            imageFiles.push({ filename, buffer });
          }
        }
      } else if (file.type.startsWith('image/')) {
        // Process individual image file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imageFiles.push({ filename: file.name, buffer });
      }
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'No valid images found in uploaded files' }, { status: 400 });
    }

    // Create Airtable records for each image
    const createdRecords: string[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const { filename, buffer } = imageFiles[i];
      try {
        // Generate a unique ID for the row using timestamp and random string
        const timestamp = Date.now() + i; // Add index to ensure uniqueness even in rapid succession
        const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const rowId = `row_${timestamp}_${randomString}`;

        // Determine content type based on file extension
        const ext = filename.toLowerCase().split('.').pop();
        let contentType = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') {
          contentType = 'image/jpeg';
        } else if (ext === 'webp') {
          contentType = 'image/webp';
        }

        console.log(`Uploading to S3 [${i + 1}/${imageFiles.length}]:`, filename, contentType, buffer.length, 'bytes');

        // Upload to S3 and get the public URL
        const s3Url = await uploadToS3(buffer, filename, contentType);

        console.log('S3 upload successful:', s3Url);

        const fields: Record<string, unknown> = {
          id: rowId,  // Random row ID
          character_id: '',  // Empty by default - user fills this in
          reference_image: filename,  // Store the filename as text
          reference_image_attached: [
            {
              url: s3Url,
            },
          ],
          initial_prompt: '',
          restyled_prompt: '',
          edit_prompt: '',
          regenerate_status: '',
        };

        const response = await fetch(
          `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields }),
          }
        );

        if (response.ok) {
          const record = await response.json();
          console.log('Created record:', record.id);
          createdRecords.push(rowId);
        } else {
          const errorText = await response.text();
          console.error('Failed to create record for', filename, ':', errorText);
        }
      } catch (error) {
        console.error('Error processing image', filename, ':', error);
        // Continue with next image if one fails
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      count: createdRecords.length,
      message: `Successfully uploaded ${createdRecords.length} reference image(s)`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to upload files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
