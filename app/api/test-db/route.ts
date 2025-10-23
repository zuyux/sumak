import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET() {
  try {
    console.log('Environment variables in API route:');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Secret key available:', !!process.env.SUPABASE_SECRET_KEY);
    console.log('Anon key available:', !!process.env.NEXT_PUBLIC_SUPABASE_KEY);
    
    // Test basic connection by checking database status
    const { error } = await supabaseAdmin.rpc('version');

    if (error) {
      // If basic connection fails, try a simpler test
      const { data: healthCheck, error: healthError } = await supabaseAdmin
        .from('connected_accounts')
        .select('count')
        .limit(1);

      return NextResponse.json({
        success: !healthError,
        basicConnection: false,
        connectedAccountsTable: {
          exists: !healthError,
          error: healthError?.message || null,
          canQuery: !!healthCheck
        },
        connectionError: error?.message,
        environmentCheck: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_KEY
        }
      });
    }

    // If basic connection works, test the connected_accounts table
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('connected_accounts')
      .select('count')
      .limit(1);

    return NextResponse.json({
      success: !tableError,
      basicConnection: true,
      connectedAccountsTable: {
        exists: !tableError,
        error: tableError?.message || null,
        canQuery: !!tableCheck
      },
      environmentCheck: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_KEY
      }
    });

  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}
