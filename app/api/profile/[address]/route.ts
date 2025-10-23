import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/profile/[address]
export async function GET(req: NextRequest, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params;
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  // Case-insensitive search for the address
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('username, address, display_name')
    .ilike('address', address)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return NextResponse.json({ profile: null }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data }, { status: 200 });
}
