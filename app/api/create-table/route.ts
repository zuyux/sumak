import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST() {
  try {
    console.log('Attempting to create encrypted_accounts table...');

    // First, test if the table already exists
    const { error: testError } = await supabase
      .from('encrypted_accounts')
      .select('*')
      .limit(1);

    if (!testError) {
      return NextResponse.json({
        success: true,
        message: 'Table already exists',
        tableExists: true
      });
    }

    // If table doesn't exist, we'll need to create it manually in Supabase dashboard
    // because Supabase client doesn't support DDL operations directly
    if (testError.message.includes('relation "encrypted_accounts" does not exist')) {
      return NextResponse.json({
        success: false,
        error: 'Table does not exist',
        message: 'Please create the table manually in Supabase dashboard',
        sqlToRun: `
CREATE TABLE encrypted_accounts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  passkey VARCHAR(64) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_encrypted_accounts_email ON encrypted_accounts(email);
CREATE INDEX idx_encrypted_accounts_address ON encrypted_accounts(address);
ALTER TABLE encrypted_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on encrypted_accounts" ON encrypted_accounts FOR ALL USING (true);
        `.trim()
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unexpected database error',
      details: testError.message
    });

  } catch (error) {
    console.error('Create table error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error
    });
  }
}
