import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Load accounts from environment variable
    const MOSAIC_TESTER_ACCOUNTS = process.env.MOSAIC_TESTER_ACCOUNTS;

    if (!MOSAIC_TESTER_ACCOUNTS) {
      console.error('MOSAIC_TESTER_ACCOUNTS not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Parse accounts from environment variable (format: email1:pass1,email2:pass2,...)
    const accounts = MOSAIC_TESTER_ACCOUNTS.split(',').map(account => {
      const [accountEmail, accountPassword] = account.split(':');
      return { email: accountEmail.trim(), password: accountPassword.trim() };
    });

    // Find matching account
    const matchedAccount = accounts.find(
      acc => acc.email === email && acc.password === password
    );

    if (!matchedAccount) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Authentication successful', email },
      { status: 200 }
    );
  } catch (error) {
    console.error('Mosaic tester auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
