import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { recordId } = await request.json();

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
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
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', errorText);
      return NextResponse.json(
        { error: `Failed to delete persona: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      deleted: data
    });

  } catch (error) {
    console.error('Delete persona error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete persona';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
