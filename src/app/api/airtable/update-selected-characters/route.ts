import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tableName, modelId } = await request.json();

    if (!tableName || !modelId) {
      return NextResponse.json(
        { error: 'Table name and model ID are required' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    // Fetch all records from the table
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}`;
    
    const airtableResponse = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!airtableResponse.ok) {
      throw new Error(`Airtable API error: ${airtableResponse.status}`);
    }

    const airtableData = await airtableResponse.json();
    
    // Update selected_characters field for all records
    const updatePromises = airtableData.records.map(async (record: { id: string; fields: Record<string, unknown> }) => {
      try {
        const updateResponse = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              selected_characters: modelId
            }
          })
        });

        if (!updateResponse.ok) {
          console.error(`Failed to update record ${record.id}`);
          return { recordId: record.id, status: 'error' };
        }
        
        return { recordId: record.id, status: 'success' };
      } catch (error) {
        console.error(`Error updating record ${record.id}:`, error);
        return { recordId: record.id, status: 'error' };
      }
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Updated selected_characters for ${successCount} records`,
      totalRecords: results.length,
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('Error updating selected_characters:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to update selected_characters: ${errorMessage}` },
      { status: 500 }
    );
  }
}