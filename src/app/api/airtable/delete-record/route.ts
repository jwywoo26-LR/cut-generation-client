import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    // Try to get parameters from query string first
    const { searchParams } = new URL(request.url);
    let tableName = searchParams.get('tableName');
    let recordId = searchParams.get('recordId');

    // If not in query params, try to get from request body
    if (!tableName || !recordId) {
      try {
        const contentType = request.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const body = await request.json();
          tableName = body.tableName || tableName;
          recordId = body.recordId || recordId;
        }
      } catch (e) {
        // Body parsing failed, continue with query params
        console.error('Failed to parse request body:', e);
      }
    }

    if (!tableName || !recordId) {
      console.error('Missing parameters - tableName:', tableName, 'recordId:', recordId);
      return NextResponse.json(
        { error: 'Table name and record ID are required' },
        { status: 400 }
      );
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

    console.log(`Deleting record ${recordId} from table: ${tableName}`);

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
      console.error('Airtable API error:', response.status, errorText);
      return NextResponse.json(
        {
          error: 'Failed to delete record',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
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
