import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  try {
    const { tableName, recordId, characterName } = await request.json();

    if (!tableName || !recordId || !characterName) {
      return NextResponse.json(
        { error: 'Table name, record ID, and character name are required' },
        { status: 400 }
      );
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

    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            character_name: characterName,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable update error:', errorText);
      return NextResponse.json(
        { error: 'Failed to update character name', details: errorText },
        { status: response.status }
      );
    }

    const updatedRecord = await response.json();

    return NextResponse.json({
      success: true,
      record: updatedRecord,
    });

  } catch (error) {
    console.error('Error updating character name:', error);
    return NextResponse.json(
      { error: 'Failed to update character name', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
