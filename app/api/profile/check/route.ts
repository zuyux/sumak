import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Check if profiles table exists and return status
 * GET /api/profile/check
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        error: 'Supabase admin client not available',
        hint: 'Check SUPABASE_SECRET_KEY environment variable'
      }, { status: 500 });
    }

    // Try to query the profiles table
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          exists: false,
          error: 'Profiles table does not exist',
          hint: 'Run the SQL migration from docs/supabase-migrations.sql',
          errorCode: error.code
        });
      }

      return NextResponse.json({
        exists: false,
        error: error.message,
        errorCode: error.code,
        hint: error.hint
      });
    }

    return NextResponse.json({
      exists: true,
      message: 'Profiles table exists and is accessible',
      count: data
    });
  } catch (error) {
    console.error('Check profiles table error:', error);
    return NextResponse.json({
      error: 'Failed to check profiles table',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
