import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Load password from environment variable
    const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

    if (!DASHBOARD_PASSWORD) {
      console.error('DASHBOARD_PASSWORD not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password !== DASHBOARD_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Authentication successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dashboard auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
