import { NextResponse } from 'next/server';

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
    
    // Extract table names from the response and sort by creation (newest first)
    const tables = data.tables
      .map((table: { id: string; name: string; description?: string }) => ({
        id: table.id,
        name: table.name,
        description: table.description || '',
      }))
      .sort((a: { id: string }, b: { id: string }) => {
        // Airtable IDs contain timestamp info - newer IDs are lexicographically greater
        return b.id.localeCompare(a.id);
      });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching Airtable tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}