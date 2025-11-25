import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Get the password from environment variable
    const translatorPassword = process.env.TRANSLATOR_PASSWORD;

    if (!translatorPassword) {
      return NextResponse.json(
        { success: false, error: 'Translator password not configured' },
        { status: 500 }
      );
    }

    // Check if password matches
    if (password === translatorPassword) {
      return NextResponse.json({
        success: true,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Translator auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
