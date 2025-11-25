import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tableName } = await request.json();

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
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

    // Create table with translator-specific fields
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${airtableBaseId}/tables`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tableName,
          fields: [
            {
              name: 'id',
              type: 'singleLineText',
              description: 'Unique identifier for the record'
            },
            {
              name: 'kor',
              type: 'multilineText',
              description: 'Korean text input'
            },
            {
              name: 'jpn_formal',
              type: 'multilineText',
              description: 'Japanese formal translation (ですます調)'
            },
            {
              name: 'jpn_friendly',
              type: 'multilineText',
              description: 'Japanese friendly translation'
            },
            {
              name: 'jpn_casual',
              type: 'multilineText',
              description: 'Japanese casual translation'
            },
            {
              name: 'jpn_narrative',
              type: 'multilineText',
              description: 'Japanese narrative translation'
            },
            {
              name: 'character_name',
              type: 'singleLineText',
              description: 'Character name used for translation'
            },
            {
              name: 'regenerate_status',
              type: 'singleLineText',
              description: 'Status of regeneration (pending, processing, completed)'
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', errorText);
      return NextResponse.json(
        { error: `Failed to create table: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      table: data
    });

  } catch (error) {
    console.error('Create table error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create table';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
