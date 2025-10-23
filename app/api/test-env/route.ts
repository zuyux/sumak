import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

    return NextResponse.json({
      success: true,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlFormat: supabaseUrl ? 'OK' : 'Missing',
      keyFormat: supabaseKey ? 'OK' : 'Missing',
      usedVar: 'NEXT_PUBLIC_SUPABASE_KEY'
    });

  } catch (error) {
    console.error('Environment test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error
    });
  }
}
