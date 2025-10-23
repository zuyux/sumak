import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Test waitlist database connection
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Waitlist DB test error:', error);
      return NextResponse.json(
        { error: 'Failed to connect to waitlist database', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Waitlist database connection successful',
      data: data || []
    });

  } catch (error) {
    console.error('Unexpected error in waitlist DB test:', error);
    return NextResponse.json(
      { error: 'Unexpected error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}