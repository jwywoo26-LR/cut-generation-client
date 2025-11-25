import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;
    const tableName = 'dmm_persona';

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not configured' },
        { status: 500 }
      );
    }

    // Encode table name for URL
    const encodedTableName = encodeURIComponent(tableName);

    // Fetch all records from dmm_persona table
    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
      {
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', errorText);
      return NextResponse.json(
        { error: `Failed to fetch personas: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const records = data.records || [];

    // Extract unique series
    const seriesSet = new Set<string>();
    records.forEach((record: { fields: Record<string, unknown> }) => {
      if (record.fields.series && typeof record.fields.series === 'string') {
        seriesSet.add(record.fields.series);
      }
    });

    const series = Array.from(seriesSet).sort();

    return NextResponse.json({
      success: true,
      availableSeries: series,
      records: records
    });

  } catch (error) {
    console.error('Get persona series error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch persona series';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
