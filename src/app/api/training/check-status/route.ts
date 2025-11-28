import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tableName, recordId } = await request.json();

    if (!tableName || !recordId) {
      return NextResponse.json(
        { error: 'Table name and record ID are required' },
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

    // 1. Get the record from Airtable to get character_id (train_id)
    const encodedTableName = encodeURIComponent(tableName);
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${recordId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
        },
      }
    );

    if (!airtableResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Airtable record' },
        { status: airtableResponse.status }
      );
    }

    const airtableRecord = await airtableResponse.json();
    const characterId = airtableRecord.fields.character_id as string;

    if (!characterId) {
      return NextResponse.json(
        { error: 'No character_id found in record' },
        { status: 400 }
      );
    }

    // 2. Check training status from AI API
    // Extract task_id from train_id (format: train-<uuid>)
    // The API endpoint expects just the numeric ID, but we have train_id
    // According to the schema, we need to use the train_id directly

    // First, we need to get the internal task_id
    // Since the v2 API uses train_id directly in the path, we'll use that

    // Try to extract numeric ID if it exists in the format
    // For v2 API, we should use the train_id from the training task
    // Let's check if there's a separate task_id field
    const taskId = airtableRecord.fields.task_id as number | undefined;

    let statusResponse;

    if (taskId) {
      // Use V2 training status endpoint with task_id
      statusResponse = await fetch(
        `${aiApiUrl}/api/v2/training-tasks/${taskId}/training-status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
          },
        }
      );
    } else {
      // If no task_id, we can't check status
      return NextResponse.json(
        { error: 'No task_id found in record. Cannot check training status.' },
        { status: 400 }
      );
    }

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('AI API status check error:', errorText);
      return NextResponse.json(
        { error: 'Failed to check training status', details: errorText },
        { status: statusResponse.status }
      );
    }

    const statusData = await statusResponse.json();

    // 3. Update Airtable if training is completed
    const isCompleted = statusData.progress.training_percentage === 100;

    const updateFields: Record<string, unknown> = {};

    // Update status based on completion
    // When training completes, set to 'active' by default
    // User can manually change to 'inactive' later if needed
    if (isCompleted) {
      updateFields.status = 'active';
    }
    // If still training, keep it as training (no update needed unless status changed)

    const updateResponse = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: updateFields }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Airtable update error:', errorText);
      return NextResponse.json(
        { error: 'Failed to update Airtable record', details: errorText },
        { status: updateResponse.status }
      );
    }

    const updatedRecord = await updateResponse.json();

    return NextResponse.json({
      success: true,
      status: statusData.status,
      training_percentage: statusData.progress.training_percentage,
      variation_percentage: statusData.progress.variation_percentage,
      is_completed: isCompleted,
      updated_record: updatedRecord,
      full_status: statusData,
    });

  } catch (error) {
    console.error('Error checking training status:', error);
    return NextResponse.json(
      { error: 'Failed to check training status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
