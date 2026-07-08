import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

interface StoreRequestBody {
  email: string;
  address: string;
  passkeyHash: string;
  encryptedMnemonic: string;
  encryptedPrivateKey: string;
  encryptionSalt: string;
  encryptionIv: string;
  encryptionVersion?: string;
  walletLabel?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client is not configured.');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = (await request.json()) as Partial<StoreRequestBody>;

    const {
      email,
      address,
      passkeyHash,
      encryptedMnemonic,
      encryptedPrivateKey,
      encryptionSalt,
      encryptionIv,
      encryptionVersion = '1.0.0',
      walletLabel,
    } = body;

    if (
      !email ||
      !address ||
      !passkeyHash ||
      !encryptedMnemonic ||
      !encryptedPrivateKey ||
      !encryptionSalt ||
      !encryptionIv
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    const upsertPayload = {
      email: normalizedEmail,
      address: address.trim(),
      passkey: passkeyHash,
      encrypted_mnemonic: encryptedMnemonic,
      encrypted_private_key: encryptedPrivateKey,
      encryption_salt: encryptionSalt,
      encryption_iv: encryptionIv,
      encryption_version: encryptionVersion,
      wallet_label: walletLabel ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .upsert(upsertPayload, { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert encrypted account:', error);
      return NextResponse.json(
        { error: 'Failed to store encrypted wallet' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, accountId: data?.id });
  } catch (error) {
    console.error('Encrypted account store error:', error);
    return NextResponse.json(
      { error: 'Failed to store encrypted wallet' },
      { status: 500 }
    );
  }
}
