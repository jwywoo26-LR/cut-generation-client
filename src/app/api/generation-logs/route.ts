import { NextResponse } from 'next/server';

interface CreateLogRequest {
  tableName: string;
  rowIndex: number | string;
  generationType: 'reference' | 'prompt_only';
  usedPrompt: string;
  synthId: string;
  modelId?: string;
}

interface UpdateLogRequest {
  logId: string;
  generatedImageUrl?: string;
}

// POST - Create a new generation log
export async function POST(request: Request) {
  try {
    const body: CreateLogRequest = await request.json();
    const {
      tableName,
      rowIndex,
      generationType,
      usedPrompt,
      synthId,
      modelId
    } = body;

    // Validate required fields
    if (!tableName || rowIndex === undefined || !generationType || !usedPrompt || !synthId) {
      return NextResponse.json(
        { error: 'tableName, rowIndex, generationType, usedPrompt, and synthId are required' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    // Create log record in generation_logs table
    const fields: Record<string, unknown> = {
      table_name: tableName,
      row_index: String(rowIndex),
      generation_type: generationType,
      used_prompt: usedPrompt,
      synth_id: synthId,
      created_at: new Date().toISOString()
    };

    // Add optional fields
    if (modelId) {
      fields.model_id = modelId;
    }

    const url = `https://api.airtable.com/v0/${baseId}/generation_logs`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create log: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log(`✅ Generation log created: ${result.id}`);

    return NextResponse.json({
      success: true,
      log_id: result.id,
      message: 'Generation log created successfully'
    });

  } catch (error) {
    console.error('Error creating generation log:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to create generation log: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing generation log
export async function PATCH(request: Request) {
  try {
    const body: UpdateLogRequest = await request.json();
    const { logId, generatedImageUrl } = body;

    if (!logId) {
      return NextResponse.json(
        { error: 'logId is required' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'generatedImageUrl is required' },
        { status: 400 }
      );
    }

    const fields: Record<string, unknown> = {
      generated_images: [{
        url: generatedImageUrl
      }]
    };

    const url = `https://api.airtable.com/v0/${baseId}/generation_logs/${logId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update log: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log(`✅ Generation log updated: ${logId}`);

    return NextResponse.json({
      success: true,
      log_id: result.id,
      message: 'Generation log updated successfully'
    });

  } catch (error) {
    console.error('Error updating generation log:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to update generation log: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET - Fetch generation logs for a specific table and row
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');
    const rowIndex = searchParams.get('rowIndex');

    if (!tableName || !rowIndex) {
      return NextResponse.json(
        { error: 'tableName and rowIndex query parameters are required' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    // Build filter formula
    const filterFormula = `AND({table_name}="${tableName}", {row_index}="${rowIndex}")`;
    const url = `https://api.airtable.com/v0/${baseId}/generation_logs?filterByFormula=${encodeURIComponent(filterFormula)}&sort[0][field]=created_at&sort[0][direction]=desc`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch logs: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      logs: result.records,
      count: result.records.length
    });

  } catch (error) {
    console.error('Error fetching generation logs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to fetch generation logs: ${errorMessage}` },
      { status: 500 }
    );
  }
}
