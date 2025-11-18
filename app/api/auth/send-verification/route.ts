import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseClient';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send verification code to email
 * POST /api/auth/send-verification
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Check if email is already registered
    const { data: existingAccount, error: checkError } = await supabaseAdmin
      .from('connected_accounts')
      .select('email, address')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing account:', checkError);
      return NextResponse.json(
        { error: 'Failed to check account status' },
        { status: 500 }
      );
    }

    if (existingAccount) {
      return NextResponse.json(
        { 
          error: 'This email is already registered. Please log in instead.',
          code: 'ACCOUNT_EXISTS',
          requiresLogin: true
        },
        { status: 409 }
      );
    }

    // Generate 5-digit verification code
    const verificationCode = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Store verification code in Supabase
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        email: email.toLowerCase(),
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store verification code' },
        { status: 500 }
      );
    }

    // Send verification email using Resend
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: [email],
        subject: 'Your Verification Code - Sumak',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Welcome to Sumak!</h2>
            <p style="font-size: 16px; color: #555;">Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #000; font-size: 48px; margin: 0; letter-spacing: 8px;">${verificationCode}</h1>
            </div>
            <p style="font-size: 14px; color: #777;">This code will expire in 15 minutes.</p>
            <p style="font-size: 14px; color: #777;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        throw error;
      }

      console.log('Email sent successfully:', data);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to email',
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
