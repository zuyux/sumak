import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const { email } = await request.json();

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch encrypted account:', error);
      return NextResponse.json(
        { error: 'Failed to look up account' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      account: {
        email: data.email,
        address: data.address,
        passkey: data.passkey,
        encryptedMnemonic: data.encrypted_mnemonic,
        encryptedPrivateKey: data.encrypted_private_key,
        encryptionSalt: data.encryption_salt,
        encryptionIv: data.encryption_iv,
        encryptionVersion: data.encryption_version,
        walletLabel: data.wallet_label,
      },
    });
  } catch (error) {
    console.error('Wallet login lookup failed:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate account' },
      { status: 500 }
    );
  }
}
