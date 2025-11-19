import { NextResponse } from 'next/server';

interface AccountStatus {
  account: string;
  limit: number;
  usage: number;
}

// Get account status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account');

    if (!account) {
      return NextResponse.json(
        { error: 'Account email is required' },
        { status: 400 }
      );
    }

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;

    if (!airtableApiKey || !airtableBaseId) {
      throw new Error('Airtable credentials not configured');
    }

    const tableName = 'account_status';
    const encodedTableName = encodeURIComponent(tableName);

    // Search for the account record
    const searchUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}?filterByFormula={account}="${account}"`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return NextResponse.json(
        { error: 'Account not found in account_status table' },
        { status: 404 }
      );
    }

    const record = data.records[0];
    const accountStatus: AccountStatus = {
      account: record.fields.account || account,
      limit: record.fields.limit || 0,
      usage: record.fields.usage || 0,
    };

    return NextResponse.json({
      success: true,
      data: accountStatus,
      canProcess: accountStatus.usage < accountStatus.limit,
      remaining: accountStatus.limit - accountStatus.usage,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to get account status: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Increment usage
export async function POST(request: Request) {
  try {
    const { account } = await request.json();

    if (!account) {
      return NextResponse.json(
        { error: 'Account email is required' },
        { status: 400 }
      );
    }

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;

    if (!airtableApiKey || !airtableBaseId) {
      throw new Error('Airtable credentials not configured');
    }

    const tableName = 'account_status';
    const encodedTableName = encodeURIComponent(tableName);

    // Search for the account record
    const searchUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}?filterByFormula={account}="${account}"`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Airtable search failed: ${searchResponse.status} - ${errorText}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.records || searchData.records.length === 0) {
      return NextResponse.json(
        { error: 'Account not found in account_status table' },
        { status: 404 }
      );
    }

    const record = searchData.records[0];
    const currentUsage = record.fields.usage || 0;
    const limit = record.fields.limit || 0;

    // Check if limit exceeded
    if (currentUsage >= limit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usage limit exceeded',
          usage: currentUsage,
          limit: limit,
        },
        { status: 403 }
      );
    }

    // Increment usage
    const updateUrl = `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}/${record.id}`;

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          usage: currentUsage + 1,
        },
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Airtable update failed: ${updateResponse.status} - ${errorText}`);
    }

    const updatedRecord = await updateResponse.json();

    return NextResponse.json({
      success: true,
      usage: updatedRecord.fields.usage,
      limit: updatedRecord.fields.limit,
      remaining: updatedRecord.fields.limit - updatedRecord.fields.usage,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to increment usage: ${errorMessage}` },
      { status: 500 }
    );
  }
}
