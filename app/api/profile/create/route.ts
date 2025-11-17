import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Create or update profile for a user
 * POST /api/profile/create
 * Body: { address: string, email?: string, username?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { address, email, username } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .ilike('address', address)
      .maybeSingle();

    if (existingProfile) {
      console.log('Profile already exists for address:', address);
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile,
      });
    }

    // Create default username from address if not provided
    const defaultUsername = username || address.slice(0, 8).toLowerCase();
    const profileEmail = email || null;

    console.log('Creating profile for address:', address);

    // Create new profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        address: address,
        email: profileEmail,
        username: defaultUsername,
        display_name: defaultUsername,
        profile_public: true,
        account_status: 'active',
        email_verified: !!email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('Failed to create profile:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });
      
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    console.log('Profile created successfully:', profileData);

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: profileData,
    });
  } catch (error) {
    console.error('Create profile error:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}
