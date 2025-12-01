import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

type CopyMode = 'initial_to_restyle' | 'restyle_to_edit';

export async function PATCH(request: NextRequest) {
  try {
    const { tableName, copyMode } = await request.json() as {
      tableName: string;
      copyMode: CopyMode;
    };

    if (!tableName || !copyMode) {
      return NextResponse.json(
        { error: 'Missing required fields: tableName and copyMode' },
        { status: 400 }
      );
    }

    if (copyMode !== 'initial_to_restyle' && copyMode !== 'restyle_to_edit') {
      return NextResponse.json(
        { error: 'Invalid copyMode. Must be "initial_to_restyle" or "restyle_to_edit"' },
        { status: 400 }
      );
    }

    // Determine source and destination fields
    const sourceField = copyMode === 'initial_to_restyle' ? 'initial_prompt' : 'restyled_prompt';
    const destField = copyMode === 'initial_to_restyle' ? 'restyled_prompt' : 'edit_prompt';

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

    // Filter records that have source field content AND don't already have destination content
    const recordsToCopy = records.filter((record: { id: string; fields: Record<string, unknown> }) => {
      const sourceValue = record.fields[sourceField];
      const destValue = record.fields[destField];
      const hasSource = sourceValue && String(sourceValue).trim() !== '';
      const hasDestination = destValue && String(destValue).trim() !== '';
      // Only copy if source has content AND destination is empty
      return hasSource && !hasDestination;
    });

    if (recordsToCopy.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        totalRecords: records.length,
        message: `No records to copy - either no ${sourceField} content or ${destField} already has values`,
      });
    }

    // Airtable allows updating up to 10 records per request
    const BATCH_SIZE = 10;
    let updatedCount = 0;

    // Process records in batches
    for (let i = 0; i < recordsToCopy.length; i += BATCH_SIZE) {
      const batch = recordsToCopy.slice(i, i + BATCH_SIZE);

      const updatePayload = {
        records: batch.map((record: { id: string; fields: Record<string, unknown> }) => ({
          id: record.id,
          fields: {
            [destField]: record.fields[sourceField],
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
      if (i + BATCH_SIZE < recordsToCopy.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      totalRecords: records.length,
      sourceField,
      destField,
    });
  } catch (error) {
    console.error('Bulk copy prompts error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk copy prompts' },
      { status: 500 }
    );
  }
}
