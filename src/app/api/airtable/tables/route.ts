import { NextResponse } from 'next/server';

// Required columns for the application
const REQUIRED_COLUMNS = [
  'reference_image',
  'initial_prompt',
  'edited_prompt',
  'reference_image_attached',
  'selected_characters',
  'status',
  'initial_prompt_image_1',
  'initial_prompt_image_2',
  'initial_prompt_image_3',
  'initial_prompt_image_4',
  'initial_prompt_image_5',
  'edited_prompt_image_1',
  'edited_prompt_image_2',
  'edited_prompt_image_3',
  'edited_prompt_image_4',
  'edited_prompt_image_5'
];

export async function GET() {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter tables that have all required columns
    const compatibleTables = data.tables
      .filter((table: { fields: Array<{ name: string }> }) => {
        const tableColumns = table.fields.map((field: { name: string }) => field.name.toLowerCase());
        
        // Check if all required columns exist in the table
        return REQUIRED_COLUMNS.every(requiredCol => 
          tableColumns.includes(requiredCol.toLowerCase())
        );
      })
      .map((table: { id: string; name: string; description?: string }) => ({
        id: table.id,
        name: table.name,
        description: table.description || '',
      }))
      .sort((a: { id: string }, b: { id: string }) => {
        // Airtable IDs contain timestamp info - newer IDs are lexicographically greater
        return b.id.localeCompare(a.id);
      });

    return NextResponse.json({ 
      tables: compatibleTables,
      totalTables: data.tables.length,
      compatibleTables: compatibleTables.length 
    });
  } catch (error) {
    console.error('Error fetching Airtable tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}