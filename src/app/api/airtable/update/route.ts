import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { tableName, recordId, fieldKey, value } = body;

    if (!tableName || !recordId || !fieldKey || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tableName, recordId, fieldKey, value' },
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
    
    // Prepare the update payload
    const updateData = {
      fields: {
        [fieldKey]: value
      }
    };

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodedTableName}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Airtable API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const updatedRecord = await response.json();
    
    return NextResponse.json({ 
      success: true,
      record: {
        id: updatedRecord.id,
        fields: updatedRecord.fields,
        createdTime: updatedRecord.createdTime,
      }
    });

  } catch (error) {
    console.error('Error updating Airtable record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update record' },
      { status: 500 }
    );
  }
}