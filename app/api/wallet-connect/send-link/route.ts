import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory token storage (in production, use a database)
// Store tokens that represent private key hashes for email-based connections
const connectionTokens = new Map<string, {
  email: string;
  privateKeyHash: string;
  createdAt: number;
  expiresAt: number;
}>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of connectionTokens.entries()) {
    if (now > data.expiresAt) {
      connectionTokens.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log('📧 Email connection request for:', email);

    if (!email || typeof email !== 'string') {
      console.log('❌ Email validation failed: missing or invalid email');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Email validation failed: invalid format', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if Resend API key is available
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Generate secure token that represents a private key hash
    // In a real implementation, this would be derived from the user's private key
    const token = crypto.randomBytes(32).toString('hex');
    const privateKeyHash = crypto.createHash('sha256').update(email + token).digest('hex');
    const now = Date.now();
    const expiresAt = now + (30 * 60 * 1000); // 30 minutes expiry

    // Store connection token
    connectionTokens.set(token, {
      email,
      privateKeyHash,
      createdAt: now,
      expiresAt
    });

    console.log('🔑 Generated connection token for:', email, 'expires in 30min');

    // Create connection URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const connectionUrl = `${baseUrl}/wallet-connect?token=${token}`;

    console.log('🔗 Connection URL created:', connectionUrl);

    // Send email using Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    console.log('📬 Attempting to send email from:', fromEmail, 'to:', email);
    
    const emailData = {
      from: fromEmail,
      to: [email],
      subject: '🔐 Account Connection Link - SUMAK',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Connection</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Account Connection</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #2563eb; margin-top: 0;">Connect Your Account</h2>
            
            <p>Hello!</p>
            
            <p>You requested to connect your account to SUMAK. Click the button below to complete the connection process:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${connectionUrl}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Connect Account
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>Important:</strong> This link will expire in 30 minutes for security reasons.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this connection, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent by SUMAK STX Platform<br>
              If you can't click the button, copy and paste this link: ${connectionUrl}
            </p>
          </div>
        </body>
        </html>
      `
    };

    try {
      console.log('📤 Sending email via Resend...');
      const emailResult = await resend.emails.send(emailData);
      console.log('✅ Email sent successfully:', emailResult);
    } catch (emailError) {
      console.error('❌ Resend email error:', emailError);
      
      // Check if it's a specific Resend error
      if (emailError && typeof emailError === 'object') {
        console.error('Email error details:', JSON.stringify(emailError, null, 2));
      }
      
      return NextResponse.json(
        { error: 'Failed to send connection email. Please check the server logs for details.' },
        { status: 500 }
      );
    }

    console.log('🎉 Connection email sent successfully to:', email);
    return NextResponse.json({
      success: true,
      message: 'Connection link sent successfully'
    });

  } catch (error) {
    console.error('❌ Email connection error:', error);
    return NextResponse.json(
      { error: 'Failed to send connection email' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // For development/testing: accept any 64-character hex token
    if (process.env.NODE_ENV === 'development' && token.length === 64 && /^[a-f0-9]+$/i.test(token)) {
      return NextResponse.json({
        valid: true,
        email: 'test@example.com',
        privateKeyHash: 'development_hash',
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes from now
      });
    }

    const tokenData = connectionTokens.get(token);
    
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    if (Date.now() > tokenData.expiresAt) {
      connectionTokens.delete(token);
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: tokenData.email,
      privateKeyHash: tokenData.privateKeyHash,
      expiresAt: tokenData.expiresAt
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
