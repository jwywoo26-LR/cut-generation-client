import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    // Encode table name for URL
    const encodedTableName = encodeURIComponent(tableName);
    
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodedTableName}?maxRecords=50`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform records to a more usable format
    const records = data.records.map((record: {
      id: string;
      fields: Record<string, unknown>;
      createdTime: string;
    }) => ({
      id: record.id,
      fields: record.fields,
      createdTime: record.createdTime,
    }));

    return NextResponse.json({ 
      records,
      tableName,
      total: records.length 
    });
  } catch (error) {
    console.error('Error fetching Airtable records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}