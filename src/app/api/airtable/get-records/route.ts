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

    // Fetch records from the table
    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: 'Failed to fetch records',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      records: result.records || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch records',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
