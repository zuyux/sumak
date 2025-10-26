import { supabase } from '@/lib/supabaseClient';

export async function getNftsByCreator(address: string) {
  try {
    // Query the NFTs table for NFTs created by this address
    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .eq('creator', address)
      .order('created_at', { ascending: false });
    
    if (error) {
      // Handle table not found error gracefully
      if (error.code === 'PGRST301' || error.message.includes('relation "nfts" does not exist')) {
        console.warn('NFTs table does not exist yet. Please create it first.');
        return [];
      }
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching NFTs by creator:', error);
    // Return empty array instead of throwing to prevent page crashes
    return [];
  }
}

// Function to save/update NFT metadata in database
export async function saveNftMetadata(nftData: {
  token_id: string;
  contract_address: string;
  contract_name: string;
  creator: string;
  owner?: string;
  name?: string;
  description?: string;
  image_url?: string;
  metadata_url?: string;
  metadata?: Record<string, unknown>;
  price_sat?: number;
  is_listed?: boolean;
  blockchain?: string;
  network?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('nfts')
      .upsert([{
        ...nftData,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'contract_address,contract_name,token_id'
      })
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving NFT metadata:', error);
    throw error;
  }
}

// Function to update NFT listing status
export async function updateNftListing(
  contractAddress: string,
  contractName: string,
  tokenId: string,
  isListed: boolean,
  priceSat?: number
) {
  try {
    const { data, error } = await supabase
      .from('nfts')
      .update({
        is_listed: isListed,
        price_sat: priceSat,
        updated_at: new Date().toISOString()
      })
      .eq('contract_address', contractAddress)
      .eq('contract_name', contractName)
      .eq('token_id', tokenId)
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating NFT listing:', error);
    throw error;
  }
}
