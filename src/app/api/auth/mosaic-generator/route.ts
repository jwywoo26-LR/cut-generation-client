import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Load password from environment variable
    const MOSAIC_PASSWORD = process.env.MOSAIC_PASSWORD;

    if (!MOSAIC_PASSWORD) {
      console.error('MOSAIC_PASSWORD not set in environment variables');
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

    if (password !== MOSAIC_PASSWORD) {
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
    console.error('Mosaic creator auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
