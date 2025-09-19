import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tableName, imageType, recordIds } = await request.json();

    if (!tableName || !imageType || !recordIds || !Array.isArray(recordIds)) {
      return NextResponse.json(
        { error: 'Table name, image type, and record IDs are required' },
        { status: 400 }
      );
    }

    if (!['initial', 'edited'].includes(imageType)) {
      return NextResponse.json(
        { error: 'Image type must be "initial" or "edited"' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    // Determine image fields based on type
    const imageFields = imageType === 'initial' 
      ? ['initial_prompt_image_1', 'initial_prompt_image_2', 'initial_prompt_image_3', 'initial_prompt_image_4', 'initial_prompt_image_5']
      : ['edited_prompt_image_1', 'edited_prompt_image_2', 'edited_prompt_image_3', 'edited_prompt_image_4', 'edited_prompt_image_5'];

    const results = [];
    
    // Process each record
    for (const recordId of recordIds) {
      try {
        // Create update object to clear all image fields
        const updateFields: Record<string, null> = {};
        imageFields.forEach(field => {
          updateFields[field] = null;
        });

        const updateResponse = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${recordId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: updateFields
          })
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`Failed to clear images for record ${recordId}:`, errorText);
          results.push({
            recordId,
            status: 'error',
            error: `Failed to update record: ${updateResponse.status}`
          });
        } else {
          results.push({
            recordId,
            status: 'success',
            clearedFields: imageFields.length
          });
        }

      } catch (error) {
        console.error(`Error processing record ${recordId}:`, error);
        results.push({
          recordId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Cleared ${imageType} images from ${successCount} records`,
      processedCount: results.length,
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('Error clearing images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to clear images: ${errorMessage}` },
      { status: 500 }
    );
  }
}