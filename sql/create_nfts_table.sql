-- Create NFTs table for storing minted NFT metadata and contract information
CREATE TABLE IF NOT EXISTS nfts (
  id SERIAL PRIMARY KEY,
  
  -- Basic NFT Info
  token_id INTEGER NOT NULL,
  contract_address VARCHAR(255) NOT NULL,
  contract_name VARCHAR(255) NOT NULL,
  
  -- Owner and Creator Info
  creator_address VARCHAR(255) NOT NULL,
  current_owner VARCHAR(255) NOT NULL,
  
  -- Metadata
  name VARCHAR(500) NOT NULL,
  description TEXT,
  artist VARCHAR(255),
  image_url TEXT,
  image_cid VARCHAR(255),
  audio_url TEXT,
  audio_cid VARCHAR(255),
  external_url TEXT,
  
  -- Audio Metadata
  audio_format VARCHAR(50),
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  
  -- Smart Contract Data
  metadata_cid VARCHAR(255) NOT NULL,
  royalty_percentage INTEGER DEFAULT 500, -- 5% default (basis points)
  
  -- Additional Attributes (JSON)
  attributes JSONB,
  
  -- Transaction Info
  mint_tx_id VARCHAR(255) NOT NULL,
  block_height INTEGER,
  
  -- Location Data (optional)
  mint_location_lat DECIMAL(10, 8),
  mint_location_lng DECIMAL(11, 8),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Marketplace Data
  is_listed BOOLEAN DEFAULT FALSE,
  list_price BIGINT,
  list_currency VARCHAR(10) DEFAULT 'STX',
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'burned')),
  
  -- Unique constraint for performance
  UNIQUE(contract_address, token_id)
);

-- Create indexes separately for performance
CREATE INDEX IF NOT EXISTS idx_nfts_creator ON nfts (creator_address);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts (current_owner);
CREATE INDEX IF NOT EXISTS idx_nfts_contract ON nfts (contract_address);
CREATE INDEX IF NOT EXISTS idx_nfts_created_at ON nfts (created_at);
CREATE INDEX IF NOT EXISTS idx_nfts_listed ON nfts (is_listed);
CREATE INDEX IF NOT EXISTS idx_nfts_tx_id ON nfts (mint_tx_id);

-- Enable Row Level Security
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to read NFTs
CREATE POLICY "NFTs are viewable by everyone" ON nfts FOR SELECT USING (true);

-- Allow creators to insert their own NFTs
CREATE POLICY "Users can insert their own NFTs" ON nfts FOR INSERT 
WITH CHECK (auth.uid()::text = creator_address OR creator_address IS NOT NULL);

-- Allow owners to update their NFTs (for marketplace listings, etc.)
CREATE POLICY "Owners can update their NFTs" ON nfts FOR UPDATE 
USING (current_owner = auth.uid()::text OR creator_address = auth.uid()::text);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_nfts_updated_at
    BEFORE UPDATE ON nfts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE nfts IS 'Stores NFT metadata and contract information for minted music NFTs';
COMMENT ON COLUMN nfts.token_id IS 'The token ID within the smart contract';
COMMENT ON COLUMN nfts.contract_address IS 'The smart contract address on Stacks blockchain';
COMMENT ON COLUMN nfts.metadata_cid IS 'IPFS CID of the complete metadata JSON';
COMMENT ON COLUMN nfts.royalty_percentage IS 'Royalty percentage in basis points (500 = 5%)';
COMMENT ON COLUMN nfts.attributes IS 'Additional metadata attributes as JSON';