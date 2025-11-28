import { NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3Upload';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tableName = formData.get('tableName') as string;
    const characterName = formData.get('characterName') as string;
    const styleType = formData.get('styleType') as string || 'anime';
    const trainingMode = formData.get('trainingMode') as string || 'single';
    const imageFile = formData.get('image') as File;

    if (!tableName || !characterName || !imageFile) {
      return NextResponse.json(
        { error: 'Table name, character name, and image are required' },
        { status: 400 }
      );
    }

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;
    const aiApiKey = process.env.AI_API_KEY;
    const aiApiUrl = process.env.AI_API_URL;

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not configured' },
        { status: 500 }
      );
    }

    if (!aiApiKey || !aiApiUrl) {
      return NextResponse.json(
        { error: 'AI API credentials not configured' },
        { status: 500 }
      );
    }

    // 1. Upload image to S3
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = imageFile.type || 'image/png';

    const s3Url = await uploadToS3(buffer, imageFile.name, contentType);

    // 2. Create training task via AI API (using v2/training-tasks/init endpoint)
    const trainingFormData = new FormData();

    // Re-create the blob from buffer for FormData
    const blob = new Blob([buffer], { type: contentType });
    trainingFormData.append('image_files', blob, imageFile.name);

    // Only add skip_variation for nsfw mode
    if (trainingMode === 'nsfw') {
      trainingFormData.append('skip_variation', 'true');
    }

    trainingFormData.append('style_type', styleType); // Use selected style type (anime or realistic)

    const trainingResponse = await fetch(`${aiApiUrl}/api/v2/training-tasks/init`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: trainingFormData,
    });

    if (!trainingResponse.ok) {
      const errorText = await trainingResponse.text();
      console.error('AI API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create training task', details: errorText },
        { status: trainingResponse.status }
      );
    }

    const trainingData = await trainingResponse.json();
    const characterId = trainingData.train_id; // This is the train_id returned from the API
    const taskId = trainingData.id; // Numeric task ID for status checking

    console.log('AI API response:', { characterId, taskId, taskIdType: typeof taskId });

    // 3. Create record in Airtable (dmm_characters table)
    const encodedTableName = encodeURIComponent(tableName);
    const recordFields: Record<string, unknown> = {
      character_id: characterId,
      task_id: taskId, // Store numeric task ID for status checking
      character_name: characterName,
      character_image: [
        {
          url: s3Url,
        },
      ],
      status: 'training', // Single status field: training, active, or inactive
      training_mode: trainingMode, // Store the training mode (single or nsfw)
      style_type: styleType, // Store the style type (anime or semi_realism)
    };

    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: recordFields }),
      }
    );

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('Airtable error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create Airtable record', details: errorText },
        { status: airtableResponse.status }
      );
    }

    const airtableRecord = await airtableResponse.json();

    return NextResponse.json({
      success: true,
      character_id: characterId,
      character_name: characterName,
      image_url: s3Url,
      airtable_record_id: airtableRecord.id,
      training_task: trainingData,
    });

  } catch (error) {
    console.error('Error creating training task:', error);
    return NextResponse.json(
      { error: 'Failed to create training task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
