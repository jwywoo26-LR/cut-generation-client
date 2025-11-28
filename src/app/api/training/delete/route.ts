import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { tableName, recordId } = await request.json();

    if (!tableName || !recordId) {
      return NextResponse.json(
        { error: 'Table name and record ID are required' },
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

    // Delete the record from Airtable
    const encodedTableName = encodeURIComponent(tableName);
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodedTableName}/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable delete error:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete record from Airtable' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Character deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json(
      { error: 'Failed to delete character', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
