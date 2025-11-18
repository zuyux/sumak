import { NextRequest, NextResponse } from 'next/server';
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

/**
 * Check if a profile exists by email or address
 * POST /api/profile/check
 * Body: { email?: string, address?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, address } = await request.json();

    if (!email && !address) {
      return NextResponse.json(
        { error: 'Email or address is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        error: 'Supabase admin client not available'
      }, { status: 500 });
    }

    if (email) {
      // Check in connected_accounts table for email
      const { data: connectedAccount, error: connectedError } = await supabaseAdmin
        .from('connected_accounts')
        .select('address, email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (connectedError && connectedError.code !== 'PGRST116') {
        console.error('Error checking connected account:', connectedError);
        return NextResponse.json(
          { error: 'Failed to check account' },
          { status: 500 }
        );
      }

      if (connectedAccount) {
        return NextResponse.json({
          exists: true,
          email: connectedAccount.email,
          address: connectedAccount.address
        });
      }
    }

    if (address) {
      // Check in profiles table for address
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('address')
        .eq('address', address)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to check profile' },
          { status: 500 }
        );
      }

      if (profile) {
        return NextResponse.json({
          exists: true,
          address: profile.address
        });
      }
    }

    return NextResponse.json({
      exists: false
    });
  } catch (error) {
    console.error('Check profile error:', error);
    return NextResponse.json({
      error: 'Failed to check profile',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
