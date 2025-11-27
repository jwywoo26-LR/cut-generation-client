import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tableName, fields, imageUrl } = await request.json();

    if (!tableName || !fields) {
      return NextResponse.json(
        { error: 'Table name and fields are required' },
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

    console.log(`Creating record in table: ${tableName}`);

    // Check if filename already exists in the table
    if (fields.filename) {
      const checkResponse = await fetch(
        `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}?filterByFormula=${encodeURIComponent(`{filename}="${fields.filename}"`)}`,
        {
          headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
          },
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.records && checkData.records.length > 0) {
          return NextResponse.json(
            {
              error: 'Duplicate filename',
              details: `A record with filename "${fields.filename}" already exists in ${tableName}`,
            },
            { status: 409 }
          );
        }
      }
    }

    // Prepare fields with image attachment if provided
    const recordFields = { ...fields };
    if (imageUrl) {
      recordFields.image_attachment = [{ url: imageUrl }];
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: recordFields }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', response.status, errorText);
      return NextResponse.json(
        {
          error: 'Failed to create record',
          details: errorText,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    // If table is moaning or moaning_text, also create in sound_effect table
    console.log(`Checking if should create sound_effect record: tableName=${tableName}, imageUrl=${!!imageUrl}`);

    if ((tableName === 'moaning' || tableName === 'moaning_text') && imageUrl) {
      console.log('Creating corresponding sound_effect record with filename:', fields.filename);

      try {
        const soundEffectPayload = {
          fields: {
            filename: fields.filename,
            image_attachment: [{ url: imageUrl }],
          },
        };

        console.log('Sound effect payload:', JSON.stringify(soundEffectPayload, null, 2));

        const soundEffectResponse = await fetch(
          `https://api.airtable.com/v0/${airtableBaseId}/sound_effect`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(soundEffectPayload),
          }
        );

        if (!soundEffectResponse.ok) {
          const errorText = await soundEffectResponse.text();
          console.error('Failed to create sound_effect record:', soundEffectResponse.status, errorText);
        } else {
          const soundEffectResult = await soundEffectResponse.json();
          console.log('✅ Created corresponding sound_effect record:', soundEffectResult.id);
        }
      } catch (err) {
        console.error('❌ Error creating sound_effect record:', err);
      }
    } else {
      console.log('Skipping sound_effect record creation');
    }

    return NextResponse.json({
      success: true,
      record: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create record',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
