import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Verify email verification code
 * POST /api/auth/verify-token
 * Body: { email: string, code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Find the verification code
    const { data: verificationData, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('used', false)
      .single();

    if (fetchError || !verificationData) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Check if code has expired
    const expiresAt = new Date(verificationData.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id);

    if (updateError) {
      console.error('Failed to mark code as used:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
      email: email.toLowerCase(),
    });
  } catch (error) {
    console.error('Verify token error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}
