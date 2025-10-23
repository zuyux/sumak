import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory token storage (in production, use a database)
const connectionTokens = new Map<string, {
  email: string;
  privateKeyHash: string;
  createdAt: number;
  expiresAt: number;
}>();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate secure token
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

    // Create connection URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const connectionUrl = `${baseUrl}/wallet-recovery?token=${token}`;

    // For development, just return the URL instead of sending email
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: 'Recovery link generated successfully',
        url: connectionUrl,
        token,
        expiresAt
      });
    }

    // In production, you would send an actual email here
    return NextResponse.json({
      success: true,
      message: 'Recovery link sent successfully'
    });

  } catch (error) {
    console.error('Recovery link generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recovery link' },
      { status: 500 }
    );
  }
}

// Endpoint to verify token
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
