import { NextResponse } from 'next/server';

interface FieldDefinition {
  name: string;
  type: string;
  options?: Record<string, unknown>;
}

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

    // Define the schema for the character reference table
    const fields: FieldDefinition[] = [
      { name: 'id', type: 'singleLineText' },
      { name: 'reference_image', type: 'singleLineText' },
      { name: 'character_id', type: 'singleLineText' },
      { name: 'reference_image_attached', type: 'multipleAttachments' },
      { name: 'initial_prompt', type: 'multilineText' },
      { name: 'restyled_prompt', type: 'multilineText' },
      { name: 'edit_prompt', type: 'multilineText' },
      { name: 'regenerate_status', type: 'singleLineText' },
      { name: 'image_1', type: 'multipleAttachments' },
      { name: 'image_2', type: 'multipleAttachments' },
      { name: 'image_3', type: 'multipleAttachments' },
    ];

    // Create table using Airtable Metadata API
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
          fields,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: 'Failed to create table',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      table: result,
      message: `Table "${tableName}" created successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create table',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
