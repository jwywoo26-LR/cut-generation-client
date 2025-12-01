import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3Upload';
import {
  resizeImage,
  downloadImage,
  getContentTypeFromUrl,
} from '@/lib/imageResize';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

interface AirtableAttachment {
  url: string;
  filename?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { tableName } = (await request.json()) as {
      tableName: string;
    };

    if (!tableName) {
      return NextResponse.json(
        { error: 'Missing required field: tableName' },
        { status: 400 }
      );
    }

    // Fetch all records from the table
    const listUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;

    const listResponse = await fetch(listUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorData = await listResponse.json();
      return NextResponse.json(
        { error: 'Failed to fetch records from Airtable', details: errorData },
        { status: listResponse.status }
      );
    }

    const listData = await listResponse.json();
    const records = listData.records || [];

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        resizedCount: 0,
        skippedCount: 0,
        totalRecords: 0,
        message: 'No records found in table',
      });
    }

    // Filter records that have reference_image_attached
    const recordsWithImages = records.filter(
      (record: { id: string; fields: Record<string, unknown> }) => {
        const attachment = record.fields.reference_image_attached;
        return attachment && Array.isArray(attachment) && attachment.length > 0;
      }
    );

    if (recordsWithImages.length === 0) {
      return NextResponse.json({
        success: true,
        resizedCount: 0,
        skippedCount: 0,
        totalRecords: records.length,
        message: 'No records with reference images found',
      });
    }

    let resizedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each record
    for (const record of recordsWithImages) {
      try {
        const attachments = record.fields.reference_image_attached as AirtableAttachment[];
        const imageUrl = attachments[0]?.url;

        if (!imageUrl) {
          skippedCount++;
          continue;
        }

        // Download the image
        const imageBuffer = await downloadImage(imageUrl);

        // Resize the image (auto-selects best preset based on aspect ratio)
        const { buffer: resizedBuffer, resized } = await resizeImage(imageBuffer);

        if (!resized) {
          // Image is already smaller than target dimensions
          skippedCount++;
          continue;
        }

        // Get content type and generate filename
        const contentType = getContentTypeFromUrl(imageUrl);
        const originalFilename = attachments[0]?.filename || record.fields.reference_image || 'image';
        const filename = String(originalFilename);

        // Upload resized image to S3
        const s3Url = await uploadToS3(resizedBuffer, filename, contentType);

        // Update Airtable record with new image URL
        const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${record.id}`;

        const updateResponse = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              reference_image_attached: [{ url: s3Url }],
            },
          }),
        });

        if (updateResponse.ok) {
          resizedCount++;
        } else {
          const errorText = await updateResponse.text();
          errors.push(`Failed to update record ${record.id}: ${errorText}`);
        }

        // Rate limiting delay
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error processing record ${record.id}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      resizedCount,
      skippedCount,
      totalRecords: records.length,
      recordsWithImages: recordsWithImages.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk resize images error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk resize images' },
      { status: 500 }
    );
  }
}
