import { NextRequest, NextResponse } from 'next/server';
import { unpinFromPinata } from '@/lib/pinataUpload';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { cid, address } = await request.json();

    if (!cid || !address) {
      return NextResponse.json(
        { error: 'CID and address are required' },
        { status: 400 }
      );
    }

    // Remove from Pinata
    console.log('Removing banner from Pinata:', cid);
    const result = await unpinFromPinata(cid);
    
    if (!result) {
      console.error('Failed to unpin from Pinata');
      // Continue with database update even if Pinata removal fails
    }

    // Update profile to remove banner CID
    const { error } = await supabase
      .from('profiles')
      .update({
        banner_cid: null,
        updated_at: new Date().toISOString(),
      })
      .ilike('address', address);

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Banner removed successfully'
    });

  } catch (error) {
    console.error('Banner remove error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
