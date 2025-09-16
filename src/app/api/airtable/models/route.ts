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

    // First try with basic request (no sorting) to test if table exists
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/available_models`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Airtable API Error:', response.status, errorData);
      throw new Error(`Airtable API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Transform records to model format
    const models = data.records
      .filter((record: any) => {
        // Check if status field exists and is Active, otherwise include all records
        return !record.fields.status || record.fields.status === 'Active';
      })
      .map((record: any) => {
        // Try multiple possible thumbnail field names including the typo
        let thumbnailUrl = '';
        const possibleFields = ['thumnail', 'thumbnail', 'Thumbnail', 'image', 'Image', 'photo', 'Photo'];
        
        for (const fieldName of possibleFields) {
          const field = record.fields[fieldName];
          if (field && Array.isArray(field) && field.length > 0 && field[0].url) {
            thumbnailUrl = field[0].url;
            break;
          }
        }
        
        return {
          id: record.fields.model_id || record.fields.Model_ID || record.fields['Model ID'] || record.id,
          name: (record.fields.model_name || record.fields.Model_Name || record.fields['Model Name'] || 'Unknown').trim(),
          thumbnail: thumbnailUrl,
        };
      });

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}