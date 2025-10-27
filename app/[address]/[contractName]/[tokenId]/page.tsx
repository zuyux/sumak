'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchCallReadOnlyFunction, uintCV, cvToJSON, contractPrincipalCV } from '@stacks/transactions';
import { request } from '@stacks/connect';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import axios from 'axios';
import { ArrowLeft, ExternalLink, Share2, Heart, RefreshCw, Eye, MoreHorizontal, Play, Pause, ShoppingCart, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMusicPlayer } from '@/components/MusicPlayerContext';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { supabase } from '@/lib/supabaseClient';
// import { getProfile } from '@/lib/profileApi';
// Temporarily removed import: import { getNftsByCreator } from '@/lib/nftApi';

type TokenMetadata = {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  animation_url?: string;
  audio_url?: string;
  mint?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  properties?: Record<string, unknown>;
  creator?: string;
  royalties?: number;
  edition?: number;
  total_supply?: number;
  created_date?: string;
  collection?: {
    name?: string;
    family?: string;
  };
  royalty?: {
    percentage?: number;
    recipient?: string;
  };
  created_by?: string;
  created_at?: string;
  minted_at?: string;
  blockchain?: string;
  token_standard?: string;
  [key: string]: unknown;
};

export default function NFTDetailPage() {
  const [deployerAddress, setDeployerAddress] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  
  // NFT Collection state
  const [isListed, setIsListed] = useState<boolean>(false);
  const [listingPrice, setListingPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  
  // Get current user address
  const currentUserAddress = useCurrentAddress();

  const address = params?.address as string;
  const contractName = params?.contractName as string;
  const tokenId = params?.tokenId as string;

  // Fetch contract deployer (original creator)
  useEffect(() => {
    async function fetchDeployer() {
      if (!address || !contractName) return;
      try {
        // Determine the correct API URL based on network
        const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
        const apiUrl = networkEnv === "mainnet" 
          ? `https://stacks-node-api.mainnet.stacks.co/extended/v1/contract/${address}/${contractName}`
          : `https://stacks-node-api.testnet.stacks.co/extended/v1/contract/${address}/${contractName}`;
        
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.tx && data.tx.sender_address) {
            setDeployerAddress(data.tx.sender_address);
          }
          
          // Store contract transaction data for activity timeline
          if (data.tx) {
            setContractTxData({
              burn_block_time: data.tx.burn_block_time,
              burn_block_time_iso: data.tx.burn_block_time_iso,
              canonical: data.tx.canonical,
              tx_id: data.tx.tx_id,
              tx_status: data.tx.tx_status,
              block_height: data.tx.block_height
            });
          }
        }
      } catch {
        // fallback: do nothing
      }
    }
    fetchDeployer();
  }, [address, contractName]);

  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [owner, setOwner] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [audioBlobUrl, setAudioBlobUrl] = useState<string>('');
  const audioCacheKey = `nft-audio-${address}-${contractName}-${tokenId}`;
  const audioBlobUrlRef = useRef<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  type CreatorProfile = {
    avatar_url?: string;
    display_name?: string;
    username?: string;
    // Add other fields as needed
  };

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [creatorNfts, setCreatorNfts] = useState<TokenMetadata[]>([]);

  // Contract interaction functions
  const checkIfListed = useCallback(async () => {
    if (!address || !contractName || !tokenId) return;
    
    try {
      setIsLoading(true);
      
      // Check listing status from database instead of contract
      const { data, error } = await supabase
        .from('nfts')
        .select('is_listed, list_price, list_currency')
        .eq('contract_address', address)
        .eq('contract_name', contractName)
        .eq('token_id', parseInt(tokenId))
        .single();
      
      if (error) {
        console.warn('Could not fetch listing status from database:', error);
        setIsListed(false);
        setListingPrice(null);
        return;
      }
      
      if (data) {
        setIsListed(data.is_listed || false);
        setListingPrice(data.list_price || null);
        console.log('Listing status from database:', { 
          isListed: data.is_listed, 
          price: data.list_price,
          currency: data.list_currency 
        });
      } else {
        setIsListed(false);
        setListingPrice(null);
      }
    } catch (error) {
      console.error('Error checking listing status:', error);
      setIsListed(false);
      setListingPrice(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, contractName, tokenId]);

  const collectNFT = useCallback(async () => {
    if (!currentUserAddress || !address || !contractName || !tokenId || !listingPrice) {
      toast('Please connect your wallet first');
      return;
    }

    try {
      setIsCollecting(true);
      
      // For this example, we'll use a simple commission trait contract
      // In a real app, you'd want to use a proper marketplace commission contract
      const commissionContract = `${process.env.NEXT_PUBLIC_COMMISSION_CONTRACT_ADDRESS || address}.commission-trait`;
      
      const functionArgs = [
        uintCV(parseInt(tokenId)),
        contractPrincipalCV(commissionContract.split('.')[0], commissionContract.split('.')[1])
      ];

      const contractId = `${address}.${contractName}` as const;
      const txOptions = {
        contract: contractId,
        functionName: 'buy-in-sat',
        functionArgs: functionArgs,
        network: process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet',
        postConditionMode: 'allow' as const,
      };

      console.log('Collecting NFT with options:', txOptions);
      
      const response = await request('stx_callContract', txOptions);
      
      if (response.txid) {
        toast(`Collection transaction submitted! TX ID: ${response.txid}`);
        
        // Wait a bit then refresh the listing status
        setTimeout(() => {
          checkIfListed();
        }, 3000);
      }
    } catch (error) {
      console.error('Error collecting NFT:', error);
      toast('Failed to collect NFT. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  }, [currentUserAddress, address, contractName, tokenId, listingPrice, checkIfListed]);

  // Check if NFT is listed when component mounts
  useEffect(() => {
    checkIfListed();
  }, [checkIfListed]);
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'bids' | 'activity'>('overview');
  const [contractTxData, setContractTxData] = useState<{
    burn_block_time: number;
    burn_block_time_iso: string;
    canonical: boolean;
    tx_id: string;
    tx_status: string;
    block_height: number;
  } | null>(null);

  // Music player integration
  const { setCurrentAlbum, togglePlayPause, isPlaying, currentAlbum } = useMusicPlayer();

  // Function to play audio using global music player
  const handlePlayAudio = useCallback(() => {
    if (!metadata || !audioUrl) return;

    const albumId = `${address}-${contractName}-${tokenId}`;
    
    // If this track is already playing, just toggle pause/play
    if (currentAlbum?.id === albumId) {
      togglePlayPause();
      return;
    }

    // Create album object for music player
    const album = {
      id: albumId,
      metadataUrl: `nft:${address}/${contractName}/${tokenId}`,
      metadata: {
        name: metadata.name || `Token #${tokenId}`,
        description: metadata.description || '',
        image: coverImageUrl || metadata.image || '',
        audio_url: audioBlobUrl || audioUrl,
        animation_url: metadata.animation_url || '',
        external_url: metadata.external_url || '',
        attributes: [
          ...(metadata.attributes || []),
          {
            trait_type: 'Artist',
            value: metadata.creator || deployerAddress || 'Unknown Artist'
          }
        ],
        soulbound: false, // Add this property
        location: { lat: 0, lon: 0 }, // Add this property with correct type
        properties: {
          duration: 0,
          format: 'audio/mp3',
          file_size: '0MB',
          channels: 2,
          sample_rate: 44100,
          title: metadata.name || `Token #${tokenId}`,
          audio_file: audioBlobUrl || audioUrl,
        },
        interoperabilityFormats: [],
        customizationData: {},
        edition: null,
        royalties: null,
      },
    };

    // Set as current album and start playing
    setCurrentAlbum(album);
    
    // Small delay to ensure the album is set before toggling play
    setTimeout(() => {
      if (!isPlaying) {
        togglePlayPause(); 
      }
    }, 100);
  }, [metadata, audioUrl, audioBlobUrl, coverImageUrl, address, contractName, tokenId, deployerAddress, setCurrentAlbum, togglePlayPause, isPlaying, currentAlbum]);


  // Utility functions for Satoshi conversion
  const SATOSHIS_PER_STX = 1000; // 1 STX = 1,000,000 Satoshis

  const fetchStxPrice = async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd');
      const data = await response.json();
      return data.blockstack?.usd || 0;
    } catch (error) {
      console.error('Error fetching STX price:', error);
      return 0;
    }
  };

  const fetchNftPrice = useCallback(async () => {
    setPriceLoading(true);
    try {
      // Try to fetch from our marketplace API first
      const marketplaceResponse = await fetch(`/api/marketplace/${address}/${contractName}/${tokenId}`);

      if (marketplaceResponse.ok) {
        const marketplaceData = await marketplaceResponse.json();
        if (marketplaceData.success) {
          console.log('Found marketplace data:', marketplaceData);
          return;
        }
      }

      // Check price from database
      const { data: nftData } = await supabase
        .from('nfts')
        .select('is_listed, list_price, list_currency')
        .eq('contract_address', address)
        .eq('contract_name', contractName)
        .eq('token_id', parseInt(tokenId))
        .single();

      // Fallback to default pricing if needed
      const stxPriceUsd = await fetchStxPrice();
      let nftPriceStx = 5; // Default fallback price

      // Use database price if available
      if (nftData?.is_listed && nftData.list_price) {
        nftPriceStx = nftData.list_price / SATOSHIS_PER_STX;
        console.log('Using database price:', nftData.list_price, 'satoshis');
      } else {
        console.log('No database price found, using default');
      }

      const priceSatoshis = nftPriceStx * SATOSHIS_PER_STX;
      const priceUsd = nftPriceStx * stxPriceUsd;

      console.log('Calculated price data:', {
        stxPriceUsd,
        nftPriceSatoshis: priceSatoshis,
        nftPriceStx: nftPriceStx,
        nftPriceUsd: priceUsd
      });
    } catch (error) {
      console.error('Error fetching NFT price:', error);
    } finally {
      setPriceLoading(false);
    }
  }, [address, contractName, tokenId]);

  useEffect(() => {
    const fetchNFTData = async () => {
      try {
        setLoading(true);
        setError('');

        // Try to load audio from localStorage first
        try {
          const cached = localStorage.getItem(audioCacheKey);
          if (cached) {
            const blob = new Blob([Uint8Array.from(atob(cached), c => c.charCodeAt(0))]);
            const blobUrl = URL.createObjectURL(blob);
            setAudioBlobUrl(blobUrl);
            audioBlobUrlRef.current = blobUrl;
          }
        } catch { /* ignore */ }

        // Try to fetch from API endpoint that queries the contract
        const contractResponse = await fetch(`/api/nft/${address}/${contractName}`);
        if (contractResponse.ok) {
          const contractData = await contractResponse.json();
          if (contractData.success && contractData.metadataCid) {
            // Fetch metadata from IPFS using ipfs.io gateway
            const metadataUrl = `https://ipfs.io/ipfs/${contractData.metadataCid}`;

            const response = await fetch(metadataUrl);

            if (response.ok) {
              const nftData: TokenMetadata = await response.json();
              setMetadata(nftData);

              // Set audio URL from audio_url or animation_url field
              let audioSrc = '';
              if (nftData.audio_url) {
                audioSrc = nftData.audio_url;
              } else if (nftData.animation_url) {
                audioSrc = nftData.animation_url;
              }
              
              // Convert IPFS URLs to use ipfs.io gateway
              if (audioSrc) {
                if (audioSrc.startsWith('ipfs://')) {
                  audioSrc = audioSrc.replace('ipfs://', 'https://ipfs.io/ipfs/');
                } else if (audioSrc.includes('gateway.pinata.cloud')) {
                  // Replace Pinata gateway with ipfs.io
                  audioSrc = audioSrc.replace('https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/');
                }
                setAudioUrl(audioSrc);
              }

              // Set cover image URL from image field
              let imageSrc = '';
              if (nftData.image) {
                imageSrc = nftData.image;
                if (imageSrc.startsWith('ipfs://')) {
                  imageSrc = imageSrc.replace('ipfs://', 'https://ipfs.io/ipfs/');
                } else if (imageSrc.includes('gateway.pinata.cloud')) {
                  imageSrc = imageSrc.replace('https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/');
                }
                setCoverImageUrl(imageSrc);
              }

              // If not already cached, fetch and cache the audio file for offline playback
              if (audioSrc && !audioBlobUrlRef.current) {
                try {
                  const audioRes = await fetch(audioSrc);
                  if (audioRes.ok) {
                    const arrayBuffer = await audioRes.arrayBuffer();
                    const uint8Arr = new Uint8Array(arrayBuffer);
                    // Store as base64 string in localStorage (only for smaller files < 10MB)
                    if (uint8Arr.length < 10 * 1024 * 1024) {
                      const b64 = btoa(String.fromCharCode(...uint8Arr));
                      localStorage.setItem(audioCacheKey, b64);
                    }
                    // Create blob URL for immediate use
                    const blob = new Blob([uint8Arr]);
                    const blobUrl = URL.createObjectURL(blob);
                    setAudioBlobUrl(blobUrl);
                    audioBlobUrlRef.current = blobUrl;
                  }
                } catch { 
                  console.log('Failed to cache audio file, using direct URL');
                }
              }
            }
          }
        } else {
          // Fallback to direct contract query if API fails
          const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
          const network = networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;

          // Fetch token URI
          try {
            const uriCV = await fetchCallReadOnlyFunction({
              contractAddress: address,
              contractName,
              functionName: 'get-token-uri',
              functionArgs: [uintCV(parseInt(tokenId))],
              network,
              senderAddress: address,
            });
            const uriJson = cvToJSON(uriCV);
            let uri = '';
            if (uriJson.value && uriJson.value.value && typeof uriJson.value.value.value === 'string') {
              uri = uriJson.value.value.value;
            } else if (typeof uriJson.value === 'string') {
              uri = uriJson.value;
            } else if (typeof uriJson.value?.value === 'string') {
              uri = uriJson.value.value;
            }

            // Fetch metadata if URI is available
            if (uri && !uri.startsWith('https')) {
              let cid = uri;
              if (cid.startsWith('ipfs://')) {
                cid = cid.replace('ipfs://', '');
              }
              const metadataUrl = `https://ipfs.io/ipfs/${cid}`;
              try {
                const res = await axios.get<TokenMetadata>(metadataUrl, { timeout: 10000 });
                setMetadata(res.data);

                // Set audio URL from audio_url or animation_url field
                let audioSrc = '';
                if (res.data.audio_url) {
                  audioSrc = res.data.audio_url;
                } else if (res.data.animation_url) {
                  audioSrc = res.data.animation_url;
                }
                
                // Convert IPFS URLs to use ipfs.io gateway
                if (audioSrc) {
                  if (audioSrc.startsWith('ipfs://')) {
                    audioSrc = audioSrc.replace('ipfs://', 'https://ipfs.io/ipfs/');
                  } else if (audioSrc.includes('gateway.pinata.cloud')) {
                    audioSrc = audioSrc.replace('https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/');
                  }
                  setAudioUrl(audioSrc);
                }

                // Set cover image URL
                let imageSrc = '';
                if (res.data.image) {
                  imageSrc = res.data.image;
                  if (imageSrc.startsWith('ipfs://')) {
                    imageSrc = imageSrc.replace('ipfs://', 'https://ipfs.io/ipfs/');
                  } else if (imageSrc.includes('gateway.pinata.cloud')) {
                    imageSrc = imageSrc.replace('https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/');
                  }
                  setCoverImageUrl(imageSrc);
                }

                // Cache audio file if available and not too large
                if (audioSrc && !audioBlobUrlRef.current) {
                  try {
                    const audioRes = await fetch(audioSrc);
                    if (audioRes.ok) {
                      const arrayBuffer = await audioRes.arrayBuffer();
                      const uint8Arr = new Uint8Array(arrayBuffer);
                      if (uint8Arr.length < 10 * 1024 * 1024) {
                        const b64 = btoa(String.fromCharCode(...uint8Arr));
                        localStorage.setItem(audioCacheKey, b64);
                      }
                      const blob = new Blob([uint8Arr]);
                      const blobUrl = URL.createObjectURL(blob);
                      setAudioBlobUrl(blobUrl);
                      audioBlobUrlRef.current = blobUrl;
                    }
                  } catch { 
                    console.log('Failed to cache audio file');
                  }
                }
              } catch (err) {
                console.log('Error fetching metadata:', err);
                setError('Failed to load NFT metadata');
              }
            }
          } catch (err) {
            console.log('Error fetching token URI:', err);
            setError('Failed to load NFT data');
          }
        }

        // Fetch owner separately
        try {
          const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
          const network = networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;

          const ownerCV = await fetchCallReadOnlyFunction({
            contractAddress: address,
            contractName,
            functionName: 'get-owner',
            functionArgs: [uintCV(parseInt(tokenId))],
            network,
            senderAddress: address,
          });
          const ownerJson = cvToJSON(ownerCV);
          let ownerAddr: string | undefined;
          if (
            ownerJson.value &&
            ownerJson.value.value &&
            typeof ownerJson.value.value.value === 'string'
          ) {
            ownerAddr = ownerJson.value.value.value;
          } else if (typeof ownerJson.value === 'string') {
            ownerAddr = ownerJson.value;
          } else if (typeof ownerJson.value?.value === 'string') {
            ownerAddr = ownerJson.value.value;
          }
          setOwner(ownerAddr || '');
        } catch (err) {
          console.log('Error fetching owner:', err);
        }

      } catch (err) {
        console.log('Error in fetchNFTData:', err);
        setError('Failed to load NFT data');
      } finally {
        setLoading(false);
      }
    };

    const initializeData = async () => {
      await fetchNFTData();
      await fetchNftPrice();
    };

    if (address && contractName && tokenId) {
      initializeData();
    }
  }, [address, contractName, tokenId, fetchNftPrice, audioCacheKey, currentUserAddress]);

  useEffect(() => {
    const fetchCreatorData = async () => {
      const creatorAddr = deployerAddress || address;
      if (creatorAddr) {
        try {
          // Fetch profile from new API route
          const res = await fetch(`/api/profile/${creatorAddr}`);
          if (res.ok) {
            const { profile } = await res.json();
            setCreatorProfile(profile);
          } else {
            setCreatorProfile(null);
          }
          // Temporarily disable getNftsByCreator until nfts table is created
          // const nfts = await getNftsByCreator(creatorAddr);
          // setCreatorNfts(nfts.filter(nft => nft.token_id !== tokenId)); // Exclude current NFT
          setCreatorNfts([]); // Return empty array for now
        } catch {
          setCreatorProfile(null);
          setCreatorNfts([]);
        }
      }
    };
    fetchCreatorData();
  }, [deployerAddress, address, tokenId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-white mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column - NFT Media */}
          <div className="col-span-12 lg:col-span-7">
            {/* Audio Player Display */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
              {(audioUrl || audioBlobUrl) ? (
                <div className="w-full h-full flex items-center justify-center">
                  {/* Cover Art */}
                  {coverImageUrl ? (
                    <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl relative group cursor-pointer" onClick={handlePlayAudio}>
                      <Image 
                        src={coverImageUrl} 
                        alt={metadata?.name || 'Audio NFT Cover'} 
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-4">
                          {isPlaying && currentAlbum?.id === `${address}-${contractName}-${tokenId}` ? (
                            <Pause className="w-8 h-8 text-white" />
                          ) : (
                            <Play className="w-8 h-8 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl group cursor-pointer relative" onClick={handlePlayAudio}>
                      <div className="text-6xl">🎵</div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-4">
                          {isPlaying && currentAlbum?.id === `${address}-${contractName}-${tokenId}` ? (
                            <Pause className="w-8 h-8 text-white" />
                          ) : (
                            <Play className="w-8 h-8 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-white/70">
                    <div className="text-6xl mb-4">�</div>
                    <p className="text-lg font-medium">No Audio Available</p>
                    <p className="text-sm mt-2">This NFT doesn&apos;t have an audio file</p>
                  </div>
                </div>
              )}
              
              {/* Rarity Badge */}
              {metadata?.attributes && Array.isArray(metadata.attributes) && metadata.attributes.find(attr => attr.trait_type === 'Rarity') && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-orange-500/20 backdrop-blur-sm text-white border-orange-500/30">
                    {metadata.attributes.find(attr => attr.trait_type === 'Rarity')?.value || 'Epic'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Tabs Section */}
            <div className="mt-8">
              <div className="border-b border-border">
                <nav className="flex space-x-8">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={`py-3 px-1 font-medium text-sm transition-colors ${
                      activeTab === 'overview' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setActiveTab('properties')}
                    className={`py-3 px-1 font-medium text-sm transition-colors ${
                      activeTab === 'properties' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Properties
                    {metadata?.attributes && Array.isArray(metadata.attributes) && metadata.attributes.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {metadata.attributes.length}
                      </Badge>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('bids')}
                    className={`py-3 px-1 font-medium text-sm transition-colors ${
                      activeTab === 'bids' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Bids
                  </button>
                  <button 
                    onClick={() => setActiveTab('activity')}
                    className={`py-3 px-1 font-medium text-sm transition-colors ${
                      activeTab === 'activity' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Activity
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-8 space-y-8">
                {activeTab === 'overview' && (
                  <>
                    {/* Description */}
                    {metadata?.description && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Description</h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {metadata.description}
                        </p>
                      </div>
                    )}

                    {/* Details Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-6">Details</h3>
                      <div className="space-y-4">
                        <a
                          href={`https://explorer.hiro.so/txid/${address}.${contractName}?chain=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Eye className="w-4 h-4" />
                          </div>
                          <span className="text-sm text-muted-foreground">View on Explorer</span>
                          <ExternalLink className="w-4 h-4 ml-auto" />
                        </a>
                        <div 
                          onClick={checkIfListed}
                          className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-muted-foreground">
                              {isLoading ? 'Checking listing status...' : 'Refresh Listing Status'}
                            </span>
                          </div>
                          {!isLoading && (
                            <Badge variant={isListed ? "default" : "secondary"} className="text-xs">
                              {isListed ? "Listed" : "Not Listed"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Royalties */}
                    {(metadata?.royalties || metadata?.creator) && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Royalties <Badge variant="secondary" className="text-xs">10%</Badge></h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Split royalties are automatically deposited into the creator&apos;s wallet
                        </p>
                        {metadata?.creator && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                              <span className="text-xs">👤</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">Creator</div>
                            </div>
                            <div className="text-sm font-medium">100%</div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'properties' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-6">Properties</h3>
                    {metadata?.attributes && Array.isArray(metadata.attributes) && metadata.attributes.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {metadata.attributes.map((attr, index) => (
                          <div key={index} className="bg-muted/30 rounded-lg p-4 border border-border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              {attr.trait_type}
                            </div>
                            <div className="text-sm font-medium">
                              {String(attr.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No properties available for this NFT</p>
                      </div>
                    )}

                    {/* Additional metadata properties */}
                    {metadata?.properties && typeof metadata.properties === 'object' && Object.keys(metadata.properties).length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-md font-semibold mb-4">Additional Properties</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(metadata.properties).map(([key, value]) => (
                            <div key={key} className="bg-muted/20 rounded-lg p-4 border border-border/50">
                              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm font-medium">
                                {String(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'bids' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-6">Bids</h3>
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No bids yet</p>
                      <p className="text-xs mt-2">Be the first to make an offer!</p>
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-6">Activity</h3>
                    <div className="space-y-4">
                      {/* Contract Deployed Activity - Using timestamp from contract name */}
                      {(() => {
                        // Extract timestamp from contract name (format: contractName-TIMESTAMP)
                        const contractNameParts = contractName.split('-');
                        const timestampStr = contractNameParts[contractNameParts.length - 1];
                        
                        // Check if the last part is a valid timestamp
                        const timestamp = parseInt(timestampStr);
                        const isValidTimestamp = !isNaN(timestamp) && timestamp > 1000000000000; // Valid Unix timestamp in milliseconds
                        
                        if (isValidTimestamp) {
                          const mintDate = new Date(timestamp);
                          const now = new Date();
                          const diffTime = Math.abs(now.getTime() - mintDate.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          let relativeTime;
                          if (diffDays === 1) {
                            relativeTime = '1 day ago';
                          } else if (diffDays < 7) {
                            relativeTime = `${diffDays} days ago`;
                          } else if (diffDays < 30) {
                            const weeks = Math.floor(diffDays / 7);
                            relativeTime = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
                          } else if (diffDays < 365) {
                            const months = Math.floor(diffDays / 30);
                            relativeTime = months === 1 ? '1 month ago' : `${months} months ago`;
                          } else {
                            const years = Math.floor(diffDays / 365);
                            relativeTime = years === 1 ? '1 year ago' : `${years} years ago`;
                          }
                          
                          return (
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">Contract Deployed & NFT Minted</p>
                                    <p className="text-xs text-muted-foreground">
                                      by{' '}
                                      <Link href={`/${deployerAddress || address}`} className="font-mono hover:text-foreground transition-colors">
                                        {(deployerAddress || address)?.slice(0, 6)}...{(deployerAddress || address)?.slice(-4)}
                                      </Link>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Contract: {contractName}
                                      {contractTxData && (
                                        <span> • Block #{contractTxData.block_height}</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                      {mintDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {mintDate.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {relativeTime}
                                </div>
                                {contractTxData && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <a
                                      href={`https://explorer.hiro.so/txid/${contractTxData.tx_id}?chain=${process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet'}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View Transaction
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        
                        return null;
                      })()}

                      {/* Fallback to blockchain data if contract name doesn't contain timestamp */}
                      {(() => {
                        const contractNameParts = contractName.split('-');
                        const timestampStr = contractNameParts[contractNameParts.length - 1];
                        const timestamp = parseInt(timestampStr);
                        const isValidTimestamp = !isNaN(timestamp) && timestamp > 1000000000000;
                        
                        if (!isValidTimestamp && contractTxData) {
                          return (
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">Contract Deployed & NFT Minted</p>
                                    <p className="text-xs text-muted-foreground">
                                      by{' '}
                                      <Link href={`/${deployerAddress || address}`} className="font-mono hover:text-foreground transition-colors">
                                        {(deployerAddress || address)?.slice(0, 6)}...{(deployerAddress || address)?.slice(-4)}
                                      </Link>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Block #{contractTxData.block_height} • Status: {contractTxData.tx_status}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(contractTxData.burn_block_time_iso).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(contractTxData.burn_block_time_iso).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {(() => {
                                    const mintDate = new Date(contractTxData.burn_block_time_iso);
                                    const now = new Date();
                                    const diffTime = Math.abs(now.getTime() - mintDate.getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    if (diffDays === 1) {
                                      return '1 day ago';
                                    } else if (diffDays < 7) {
                                      return `${diffDays} days ago`;
                                    } else if (diffDays < 30) {
                                      const weeks = Math.floor(diffDays / 7);
                                      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
                                    } else if (diffDays < 365) {
                                      const months = Math.floor(diffDays / 30);
                                      return months === 1 ? '1 month ago' : `${months} months ago`;
                                    } else {
                                      const years = Math.floor(diffDays / 365);
                                      return years === 1 ? '1 year ago' : `${years} years ago`;
                                    }
                                  })()}
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                  <a
                                    href={`https://explorer.hiro.so/txid/${contractTxData.tx_id}?chain=${process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet'}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View Transaction
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return null;
                      })()}

                      {/* Metadata Creation Activity (if different and available) */}
                      {metadata?.created_at && (
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/10 border border-border/30">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">Metadata Created</p>
                                <p className="text-xs text-muted-foreground">NFT metadata uploaded to IPFS</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(metadata.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(metadata.created_at).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* No activity data available fallback */}
                      {(() => {
                        const contractNameParts = contractName.split('-');
                        const timestampStr = contractNameParts[contractNameParts.length - 1];
                        const timestamp = parseInt(timestampStr);
                        const isValidTimestamp = !isNaN(timestamp) && timestamp > 1000000000000;
                        
                        if (!isValidTimestamp && !contractTxData) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No activity data available</p>
                              <p className="text-xs mt-2">Unable to determine minting timestamp from contract name or blockchain data</p>
                            </div>
                          );
                        }
                        
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - NFT Info & Actions */}
          <div className="col-span-12 lg:col-span-5">
            <div className="sticky top-6 space-y-6">
              {/* Title & Creator */}
              <div>
                  <div className="flex items-center gap-2">
                    <h1 className="title text-3xl mt-6">{metadata?.name || `Token #${tokenId}`}</h1>
                    {metadata?.attributes && Array.isArray(metadata.attributes) && metadata.attributes.find(attr => attr.trait_type === 'Rarity') && (
                      <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 ml-2">
                        {metadata.attributes.find(attr => attr.trait_type === 'Rarity')?.value || 'Epic'}
                      </Badge>
                    )}
                  </div>
                  {/* Artist */}
                  {metadata?.attributes && Array.isArray(metadata.attributes) && (() => {
                    const artistAttribute = metadata.attributes.find(attr => attr.trait_type === 'Artist');
                    if (artistAttribute) {
                      return (
                        <p className="text-lg text-muted-foreground mb-4">
                          {artistAttribute.value}
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {/* Creator & Owner Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Creator</div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            {(deployerAddress || address) ? (
                              <>
                                <Link href={`/${deployerAddress || address}`} className="font-mono">
                                  {(deployerAddress || address).slice(0, 6)}...{(deployerAddress || address).slice(-4)}
                                </Link>
                                {creatorProfile?.username && (
                                  <span className="ml-2 text-xs text-foreground">@{creatorProfile.username}</span>
                                )}
                              </>
                            ) : (
                              <span className="inline-block h-5 w-24 bg-muted animate-pulse rounded"></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  {owner && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Current owner</div>
                          <div className="text-sm font-medium font-mono">
                            <Link href={`/${owner}`}>{owner.slice(0, 6)}...{owner.slice(-4)}</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>


                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  {/* Loading indicator while checking listing status */}
                  {isLoading && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 rounded-lg">
                      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Checking listing status...</span>
                    </div>
                  )}
                  
                  {/* Collect Button - Show if NFT is listed for sale and user is not the owner */}
                  {!isLoading && 
                   isListed && 
                   listingPrice && 
                   currentUserAddress && 
                   owner && 
                   currentUserAddress.toLowerCase() !== owner.toLowerCase() && (
                    <Button 
                      onClick={collectNFT}
                      disabled={isCollecting}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 cursor-pointer"
                    >
                      {isCollecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Collecting...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Collect for {(listingPrice / 1000000).toFixed(6)} STX
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Show listing price if listed */}
                  {!isLoading && isListed && listingPrice && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
                      <Coins className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {(listingPrice / 1000000).toFixed(6)} STX
                      </span>
                    </div>
                  )}
                  
                  <Button variant="ghost" size="sm" className="p-2 hover:text-white cursor-pointer">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:text-white cursor-pointer">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hover:text-white cursor-pointer"
                    onClick={checkIfListed}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Checking...' : 'Refresh'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchNftPrice}
                    disabled={priceLoading}
                    className={`hover:text-white`}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${priceLoading ? 'animate-spin' : ''}`} />
                    {priceLoading ? 'Updating...' : 'Price'}
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 hover:text-white">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Price & Purchase Section */}
              <Card>
                <CardContent className="px-6">
                  <div className="space-y-0">
                    <div className="space-y-0">
                      {/* Main Collect Button - Only show if not owner and conditions are met */}
                      {(() => {
                        const isOwner = currentUserAddress && owner && 
                          currentUserAddress.toLowerCase() === owner.toLowerCase();
                        const canCollect = !isOwner && isListed && listingPrice && currentUserAddress;
                        
                        if (isOwner) {
                          return (
                            <Button
                              className="w-full py-6 bg-blue-500/20 border border-blue-500/40 text-blue-400 cursor-not-allowed"
                              disabled={true}
                            >
                              You own this NFT
                            </Button>
                          );
                        } else if (canCollect) {
                          return (
                            <Button
                              className="w-full py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white cursor-pointer"
                              onClick={collectNFT}
                              disabled={isCollecting}
                            >
                              {isCollecting ? 'Collecting...' : `Collect for ${((listingPrice || 0) / 1000000).toFixed(6)} STX`}
                            </Button>
                          );
                        } else if (!isListed) {
                          return (
                            <Button
                              className="w-full py-6 bg-gray-600 text-gray-400 cursor-not-allowed"
                              disabled={true}
                            >
                              Not listed for sale
                            </Button>
                          );
                        } else {
                          return (
                            <Button
                              className="w-full py-6 bg-gray-600 text-gray-400 cursor-not-allowed"
                              disabled={true}
                            >
                              {!currentUserAddress ? 'Connect wallet to collect' : 'Loading...'}
                            </Button>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>

        {/* More from this creator */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">More from this creator</h2>
          {creatorNfts.length === 0 ? (
            <div className="text-gray-400">No other songs from this creator.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {creatorNfts.map((nft) => (
                <Link key={String(nft.id ?? nft.token_id)} href={`/${nft.creator_address}/${nft.contract_name}/${nft.token_id}`} className="aspect-square bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {nft.image ? (
                    <Image 
                      src={nft.image} 
                      alt={nft.name || 'NFT'} 
                      fill
                      className="object-cover rounded-lg" 
                    />
                  ) : (
                    <span className="text-white">{nft.name || 'Audio NFT'}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
