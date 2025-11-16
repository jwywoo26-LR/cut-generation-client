import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { tableName, recordId } = await request.json();

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
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

    console.log('Deleting record:', {
      tableName,
      recordId,
      url: `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${recordId}`,
    });

    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete record:', errorText);
      return NextResponse.json(
        {
          error: 'Failed to delete record',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Successfully deleted record:', result);

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully',
      deleted: result.deleted,
      id: result.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete record',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
