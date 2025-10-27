import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export interface SaveNFTRequest {
  // Basic NFT Info
  tokenId: number;
  contractAddress: string;
  contractName: string;
  
  // Owner and Creator Info
  creatorAddress: string;
  currentOwner: string;
  
  // Metadata
  name: string;
  description?: string;
  artist?: string;
  imageUrl?: string;
  imageCid?: string;
  audioUrl?: string;
  audioCid?: string;
  externalUrl?: string;
  
  // Audio Metadata
  audioFormat?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  
  // Smart Contract Data
  metadataCid: string;
  royaltyPercentage?: number;
  
  // Additional Attributes
  attributes?: Record<string, unknown>;
  
  // Transaction Info
  mintTxId: string;
  blockHeight?: number;
  
  // Location Data (optional)
  mintLocationLat?: number;
  mintLocationLng?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveNFTRequest = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'tokenId', 'contractAddress', 'contractName', 
      'creatorAddress', 'currentOwner', 'name', 
      'metadataCid', 'mintTxId'
    ];
    
    for (const field of requiredFields) {
      if (!body[field as keyof SaveNFTRequest]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Check if NFT already exists
    const { data: existing } = await supabaseAdmin
      .from('nfts')
      .select('id')
      .eq('contract_address', body.contractAddress)
      .eq('token_id', body.tokenId)
      .single();
    
    if (existing) {
      return NextResponse.json(
        { error: 'NFT already exists in database' },
        { status: 409 }
      );
    }
    
    // Prepare data for insertion
    const nftData = {
      token_id: body.tokenId,
      contract_address: body.contractAddress,
      contract_name: body.contractName,
      creator_address: body.creatorAddress,
      current_owner: body.currentOwner,
      name: body.name,
      description: body.description,
      artist: body.artist,
      image_url: body.imageUrl,
      image_cid: body.imageCid,
      audio_url: body.audioUrl,
      audio_cid: body.audioCid,
      external_url: body.externalUrl,
      audio_format: body.audioFormat,
      duration_seconds: body.durationSeconds,
      file_size_bytes: body.fileSizeBytes,
      metadata_cid: body.metadataCid,
      royalty_percentage: body.royaltyPercentage || 500, // Default 5%
      attributes: body.attributes,
      mint_tx_id: body.mintTxId,
      block_height: body.blockHeight,
      mint_location_lat: body.mintLocationLat,
      mint_location_lng: body.mintLocationLng,
    };
    
    // Insert NFT data
    const { data, error } = await supabaseAdmin
      .from('nfts')
      .insert([nftData])
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save NFT data', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'NFT data saved successfully',
      data: {
        id: data.id,
        tokenId: data.token_id,
        contractAddress: data.contract_address,
        contractName: data.contract_name,
        createdAt: data.created_at
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve NFT data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('contractAddress');
    const tokenId = searchParams.get('tokenId');
    const creatorAddress = searchParams.get('creatorAddress');
    
    let query = supabaseAdmin.from('nfts').select('*');
    
    if (contractAddress && tokenId) {
      query = query
        .eq('contract_address', contractAddress)
        .eq('token_id', parseInt(tokenId));
    } else if (creatorAddress) {
      query = query
        .eq('creator_address', creatorAddress)
        .order('created_at', { ascending: false });
    } else {
      // Return recent NFTs
      query = query
        .order('created_at', { ascending: false })
        .limit(50);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch NFT data', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: data || []
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}