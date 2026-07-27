import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

const SETTINGS_FIELDS = [
  'username', 'email', 'display_name', 'location',
  'website', 'twitter', 'discord', 'instagram', 'linkedin',
  'spotify', 'soundcloud', 'audius',
  'avatar_url', 'avatar_cid', 'banner_url', 'banner_cid',
  'profile_public', 'show_email', 'show_location',
  'email_notifications', 'push_notifications', 'marketing_emails',
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = typeof body.address === 'string' ? body.address.trim() : '';

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database is unavailable' }, { status: 500 });
    }

    const settings = Object.fromEntries(
      SETTINGS_FIELDS
        .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
        .map((field) => [field, body[field]])
    );
    const now = new Date().toISOString();

    const { data: existingProfile, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id, address')
      .ilike('address', address)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const result = existingProfile
      ? await supabaseAdmin
          .from('profiles')
          .update({ ...settings, updated_at: now, last_active: now })
          .eq('id', existingProfile.id)
          .select()
          .single()
      : await supabaseAdmin
          .from('profiles')
          .insert({ ...settings, address, created_at: now, updated_at: now, last_active: now })
          .select()
          .single();

    if (result.error) throw result.error;

    return NextResponse.json({ profile: result.data });
  } catch (error) {
    console.error('Profile settings save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save profile settings' },
      { status: 500 }
    );
  }
}
