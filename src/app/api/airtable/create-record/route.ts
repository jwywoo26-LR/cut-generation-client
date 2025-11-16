import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tableName } = await request.json();

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
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

    // Create empty record with all fields empty
    const fields: Record<string, unknown> = {
      character_id: '',
      reference_image: '',
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create record:', errorText);
      return NextResponse.json(
        {
          error: 'Failed to create record',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const record = await response.json();

    return NextResponse.json({
      success: true,
      record: record,
      message: 'Record created successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create record',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
