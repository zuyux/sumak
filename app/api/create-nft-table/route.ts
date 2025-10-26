import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST() {
  try {
    console.log('Attempting to create nfts table...');

    // First, test if the table already exists
    const { error: testError } = await supabaseAdmin
      .from('nfts')
      .select('*')
      .limit(1);

    if (!testError) {
      return NextResponse.json({
        success: true,
        message: 'NFTs table already exists',
        tableExists: true
      });
    }

    // If table doesn't exist, provide SQL to create it
    if (testError.message.includes('relation "nfts" does not exist')) {
      return NextResponse.json({
        success: false,
        error: 'NFTs table does not exist',
        message: 'Please create the table manually in Supabase dashboard',
        sqlToRun: `
CREATE TABLE nfts (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(255) NOT NULL,
  contract_address VARCHAR(255) NOT NULL,
  contract_name VARCHAR(255) NOT NULL,
  creator VARCHAR(255) NOT NULL,
  owner VARCHAR(255),
  name VARCHAR(255),
  description TEXT,
  image_url TEXT,
  metadata_url TEXT,
  metadata JSONB,
  price_sat BIGINT,
  is_listed BOOLEAN DEFAULT false,
  blockchain VARCHAR(50) DEFAULT 'stacks',
  network VARCHAR(50) DEFAULT 'testnet',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contract_address, contract_name, token_id)
);

-- Create indexes for better performance
CREATE INDEX idx_nfts_creator ON nfts(creator);
CREATE INDEX idx_nfts_owner ON nfts(owner);
CREATE INDEX idx_nfts_contract ON nfts(contract_address, contract_name);
CREATE INDEX idx_nfts_token_id ON nfts(token_id);
CREATE INDEX idx_nfts_created_at ON nfts(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "NFTs are viewable by everyone" ON nfts FOR SELECT USING (true);

-- Create policies for insert/update (only by creator/owner)
CREATE POLICY "Users can insert their own NFTs" ON nfts FOR INSERT WITH CHECK (auth.uid()::text = creator);
CREATE POLICY "Users can update their own NFTs" ON nfts FOR UPDATE USING (auth.uid()::text = creator OR auth.uid()::text = owner);
        `,
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to the SQL Editor',
          '3. Run the provided SQL to create the nfts table',
          '4. Test the API again'
        ]
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown table error',
      details: testError?.message
    });

  } catch (error) {
    console.error('Unexpected error in NFT table creation:', error);
    return NextResponse.json(
      { error: 'Unexpected error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}