import { NextResponse } from 'next/server';

// Note: Airtable's Meta API does NOT support deleting tables via API.
// Table deletion can only be done through the Airtable web interface.
// This endpoint will delete all records from the table instead, making it empty.

export async function DELETE(request: Request) {
  try {
    const { tableId, tableName } = await request.json();

    if (!tableId || !tableName) {
      return NextResponse.json(
        { error: 'Table ID and table name are required' },
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

    // Since Airtable doesn't support table deletion via API,
    // we'll delete all records from the table instead

    // First, get all record IDs from the table
    let allRecordIds: string[] = [];
    let offset: string | undefined;

    do {
      const listUrl = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
      listUrl.searchParams.set('fields[]', 'id'); // Only fetch record IDs
      if (offset) {
        listUrl.searchParams.set('offset', offset);
      }

      const listResponse = await fetch(listUrl.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!listResponse.ok) {
        const errorData = await listResponse.text();
        console.error('Failed to list records:', errorData);
        return NextResponse.json(
          { error: `Failed to list records: ${errorData}` },
          { status: listResponse.status }
        );
      }

      const listData = await listResponse.json();
      const recordIds = listData.records.map((r: { id: string }) => r.id);
      allRecordIds = [...allRecordIds, ...recordIds];
      offset = listData.offset;
    } while (offset);

    if (allRecordIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Table is already empty. Note: To completely delete the table, please use the Airtable web interface.',
        deletedCount: 0,
      });
    }

    // Delete records in batches of 10 (Airtable's limit)
    let deletedCount = 0;
    const batchSize = 10;

    for (let i = 0; i < allRecordIds.length; i += batchSize) {
      const batch = allRecordIds.slice(i, i + batchSize);

      const deleteUrl = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
      batch.forEach(id => deleteUrl.searchParams.append('records[]', id));

      const deleteResponse = await fetch(deleteUrl.toString(), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.text();
        console.error('Failed to delete records batch:', errorData);
        return NextResponse.json(
          { error: `Failed to delete records: ${errorData}`, deletedCount },
          { status: deleteResponse.status }
        );
      }

      const deleteData = await deleteResponse.json();
      deletedCount += deleteData.records?.length || 0;
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} records. Note: To completely delete the table, please use the Airtable web interface.`,
      deletedCount,
    });
  } catch (error) {
    console.error('Error deleting table records:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete table records',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
