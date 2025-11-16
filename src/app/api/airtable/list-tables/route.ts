import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not configured' },
        { status: 500 }
      );
    }

    // Fetch base schema to get list of tables
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${airtableBaseId}/tables`,
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
          error: 'Failed to fetch tables',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      tables: result.tables || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch tables',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
