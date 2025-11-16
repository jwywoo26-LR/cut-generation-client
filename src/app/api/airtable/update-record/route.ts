import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tableName, recordId, fields } = await request.json();

    if (!tableName || !recordId) {
      return NextResponse.json({ error: 'Table name and record ID are required' }, { status: 400 });
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
        body: JSON.stringify({ fields }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update record:', errorText);
      return NextResponse.json(
        {
          error: 'Failed to update record',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const record = await response.json();

    return NextResponse.json({
      success: true,
      record: record,
      message: 'Record updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update record',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
