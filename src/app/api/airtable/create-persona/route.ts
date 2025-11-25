import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { characterName, series, persona } = await request.json();

    if (!characterName || !series || !persona) {
      return NextResponse.json(
        { error: 'Character name, series, and persona are required' },
        { status: 400 }
      );
    }

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;
    const tableName = 'dmm_persona';

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not configured' },
        { status: 500 }
      );
    }

    const encodedTableName = encodeURIComponent(tableName);

    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            character_name: characterName,
            series: series,
            persona: persona
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', errorText);
      return NextResponse.json(
        { error: `Failed to create persona: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      record: data
    });

  } catch (error) {
    console.error('Create persona error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create persona';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
