import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, passkey, passphrase, address } = await request.json();

    if (!email || !passkey || !passphrase || !address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Hash the private key with the passphrase to create the passkey
    const hashedPasskey = crypto
      .createHash('sha256')
      .update(passkey + passphrase)
      .digest('hex');

    // Check if email already exists
    const { data: existingAccount, error: checkError } = await supabaseAdmin
      .from('connected_accounts')
      .select('email')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Database check error:', checkError);
      console.error('Error details:', JSON.stringify(checkError, null, 2));
      return NextResponse.json(
        { 
          error: 'Database connection error',
          details: checkError.message,
          code: checkError.code 
        },
        { status: 500 }
      );
    }

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account with this email already exists' },
        { status: 409 }
      );
    }

    // Save to Supabase
    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .insert([
        {
          email,
          passkey: hashedPasskey,
          address,
          created_at: new Date().toISOString(),
        }
      ])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to save account',
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account saved successfully',
      accountId: data[0]?.id
    });

  } catch (error) {
    console.error('Save account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
