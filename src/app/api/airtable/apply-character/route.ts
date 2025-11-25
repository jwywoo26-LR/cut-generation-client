import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tableName, characterId } = await request.json();

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
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

    // First, fetch all records from the table
    const fetchResponse = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
        },
      }
    );

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error('Airtable API error:', fetchResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch records', details: errorText },
        { status: fetchResponse.status }
      );
    }

    const fetchResult = await fetchResponse.json();
    const records = fetchResult.records || [];

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No records to update',
        updatedCount: 0,
      });
    }

    // Update records in batches of 10 (Airtable limit)
    const batchSize = 10;
    let updatedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      const updatePayload = {
        records: batch.map((record: { id: string }) => ({
          id: record.id,
          fields: {
            character_id: characterId,
          },
        })),
      };

      const updateResponse = await fetch(
        `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Airtable update error:', updateResponse.status, errorText);
        return NextResponse.json(
          {
            error: 'Failed to update records',
            details: errorText,
            updatedCount,
          },
          { status: updateResponse.status }
        );
      }

      updatedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully applied character to ${updatedCount} records`,
      updatedCount,
    });
  } catch (error) {
    console.error('Apply character error:', error);
    return NextResponse.json(
      {
        error: 'Failed to apply character',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
