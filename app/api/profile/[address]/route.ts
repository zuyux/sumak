import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/profile/[address]
export async function GET(req: NextRequest, context: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await context.params;
    
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    console.log(`Fetching profile for address: ${address}`);

    // Case-insensitive search for the address
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('username, address, display_name, avatar_url, tagline, creator_verified, verified_artist, biography, website, twitter, instagram')
      .ilike('address', address)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found - return null profile instead of error
        console.log(`No profile found for address: ${address}`);
        return NextResponse.json({ profile: null }, { status: 200 });
      }
      
      // Log other errors but don't crash
      console.warn(`Profile API error for ${address}:`, error);
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    console.log(`Profile found for address: ${address}`);
    return NextResponse.json({ profile: data }, { status: 200 });
    
  } catch (error) {
    console.error('Profile API unexpected error:', error);
    // Return null profile instead of error to prevent cascading failures
    return NextResponse.json({ profile: null }, { status: 200 });
  }
}
