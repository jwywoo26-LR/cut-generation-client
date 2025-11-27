import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    return await fetchRecordsFromAirtable(tableName);
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tableName = body.tableName;

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    return await fetchRecordsFromAirtable(tableName);
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

async function fetchRecordsFromAirtable(tableName: string) {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;

  if (!airtableApiKey || !airtableBaseId) {
    return NextResponse.json(
      { error: 'Airtable credentials not configured' },
      { status: 500 }
    );
  }

  const encodedTableName = encodeURIComponent(tableName);

  console.log(`Fetching records from table: ${tableName} (base: ${airtableBaseId})`);

  // Fetch records from the table - no sorting to avoid field errors
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
    console.error('Airtable API error:', response.status, errorText);
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
}
