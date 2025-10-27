import { supabase } from '@/lib/supabaseClient';
import axios from 'axios';

export interface NFTSaveData {
  tokenId: number;
  contractAddress: string;
  contractName: string;
  creatorAddress: string;
  name: string;
  description?: string;
  artist?: string;
  imageUrl?: string;
  imageCid?: string;
  audioUrl?: string;
  audioCid?: string;
  externalUrl?: string;
  audioFormat?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  metadataCid: string;
  royaltyPercentage?: number;
  attributes?: Record<string, unknown>;
  mintTxId: string;
  blockHeight?: number;
  mintLocationLat?: number;
  mintLocationLng?: number;
}

export async function getNftsByCreator(address: string) {
  try {
    // Query the NFTs table for NFTs created by this address
    const { data, error } = await supabase
      .from('nfts')
      .select('*')
      .eq('creator_address', address)
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

// New function to save NFT data after successful minting using API route
export async function saveNFTToDatabase(nftData: NFTSaveData): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const requestData = {
      tokenId: nftData.tokenId,
      contractAddress: nftData.contractAddress,
      contractName: nftData.contractName,
      creatorAddress: nftData.creatorAddress,
      currentOwner: nftData.creatorAddress, // Initially, creator is the owner
      name: nftData.name,
      description: nftData.description,
      artist: nftData.artist,
      imageUrl: nftData.imageUrl,
      imageCid: nftData.imageCid,
      audioUrl: nftData.audioUrl,
      audioCid: nftData.audioCid,
      externalUrl: nftData.externalUrl,
      audioFormat: nftData.audioFormat,
      durationSeconds: nftData.durationSeconds,
      fileSizeBytes: nftData.fileSizeBytes,
      metadataCid: nftData.metadataCid,
      royaltyPercentage: nftData.royaltyPercentage,
      attributes: nftData.attributes,
      mintTxId: nftData.mintTxId,
      blockHeight: nftData.blockHeight,
      mintLocationLat: nftData.mintLocationLat,
      mintLocationLng: nftData.mintLocationLng,
    };

    const response = await axios.post('/api/nfts', requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Failed to save NFT data',
      };
    }
  } catch (error) {
    console.error('Error saving NFT to database:', error);
    
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
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
