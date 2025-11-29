import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function PATCH(request: NextRequest) {
  try {
    const { tableName, generationType } = await request.json();

    if (!tableName || !generationType) {
      return NextResponse.json(
        { error: 'Missing required fields: tableName and generationType' },
        { status: 400 }
      );
    }

    if (generationType !== 'prompt' && generationType !== 'reference') {
      return NextResponse.json(
        { error: 'Invalid generation type. Must be "prompt" or "reference"' },
        { status: 400 }
      );
    }

    // First, fetch all records from the table
    const listUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;

    const listResponse = await fetch(listUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorData = await listResponse.json();
      return NextResponse.json(
        { error: 'Failed to fetch records from Airtable', details: errorData },
        { status: listResponse.status }
      );
    }

    const listData = await listResponse.json();
    const records = listData.records || [];

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No records found in table', updatedCount: 0 },
        { status: 200 }
      );
    }

    // Airtable allows updating up to 10 records per request
    const BATCH_SIZE = 10;
    let updatedCount = 0;

    // Process records in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const updatePayload = {
        records: batch.map((record: { id: string }) => ({
          id: record.id,
          fields: {
            generation_type: generationType,
          },
        })),
      };

      const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;

      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        updatedCount += updateData.records?.length || 0;
      } else {
        console.error(`Failed to update batch ${i / BATCH_SIZE + 1}`);
      }

      // Add a small delay between batches to respect rate limits
      if (i + BATCH_SIZE < records.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      totalRecords: records.length,
    });
  } catch (error) {
    console.error('Bulk update generation type error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update generation type' },
      { status: 500 }
    );
  }
}
