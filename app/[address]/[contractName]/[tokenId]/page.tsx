'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchCallReadOnlyFunction, uintCV, cvToJSON } from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import axios from 'axios';
import { ArrowLeft, ExternalLink, Share2, Copy, Heart, RefreshCw, Eye, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
// import { getProfile } from '@/lib/profileApi';
import { getNftsByCreator } from '@/lib/nftApi';

type TokenMetadata = {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  animation_url?: string;
  audio_url?: string;
  model?: string;
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

  const address = params?.address as string;
  const contractName = params?.contractName as string;
  const tokenId = params?.tokenId as string;

  // Fetch contract deployer (original creator)
  useEffect(() => {
    async function fetchDeployer() {
      if (!address || !contractName) return;
      try {
        // Stacks API endpoint for contract info
        const apiUrl = `https://stacks-node-api.mainnet.stacks.co/extended/v1/contract/${address}/${contractName}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.tx && data.tx.sender_address) {
            setDeployerAddress(data.tx.sender_address);
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
  const [priceData, setPriceData] = useState<{
    stxPriceUsd: number;
    nftPriceSatoshis: number;
    nftPriceStx: number;
    nftPriceUsd: number;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  type CreatorProfile = {
    avatar_url?: string;
    display_name?: string;
    username?: string;
    // Add other fields as needed
  };

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [creatorNfts, setCreatorNfts] = useState<TokenMetadata[]>([]);

  // Helper function to format duration
  const formatDuration = (duration: unknown): string => {
    if (typeof duration === 'number') {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
    return String(duration);
  };

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
          setPriceData({
            stxPriceUsd: marketplaceData.stxPriceUsd,
            nftPriceSatoshis: marketplaceData.marketplaceData.priceSatoshis,
            nftPriceStx: marketplaceData.marketplaceData.priceStx,
            nftPriceUsd: marketplaceData.marketplaceData.priceUsd
          });
          return;
        }
      }

      // Fallback to direct fetching if API fails
      const stxPriceUsd = await fetchStxPrice();
      let nftPriceStx = 5; // Default fallback price

      // Try to fetch actual price from marketplace contract directly
      try {
        const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
        const network = networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;

        const priceCV = await fetchCallReadOnlyFunction({
          contractAddress: address,
          contractName,
          functionName: 'get-listing-price',
          functionArgs: [uintCV(parseInt(tokenId))],
          network,
          senderAddress: address,
        });

        const priceJson = cvToJSON(priceCV);
        if (priceJson.value && typeof priceJson.value === 'number') {
          nftPriceStx = priceJson.value / SATOSHIS_PER_STX;
        }
      } catch {
        console.log('No marketplace price found, using default');
      }

      const priceSatoshis = nftPriceStx * SATOSHIS_PER_STX;
      const priceUsd = nftPriceStx * stxPriceUsd;

      setPriceData({
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
  }, [address, contractName, tokenId, fetchNftPrice, audioCacheKey]);

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
          const nfts = await getNftsByCreator(creatorAddr);
          setCreatorNfts(nfts.filter(nft => nft.token_id !== tokenId)); // Exclude current NFT
        } catch {
          setCreatorProfile(null);
          setCreatorNfts([]);
        }
      }
    };
    fetchCreatorData();
  }, [deployerAddress, address, tokenId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12  mx-auto mb-4"></div>
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
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                  {/* Cover Art */}
                  {coverImageUrl ? (
                    <div className="w-64 h-64 rounded-lg overflow-hidden mb-6 shadow-2xl relative">
                      <Image 
                        src={coverImageUrl} 
                        alt={metadata?.name || 'Audio NFT Cover'} 
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-64 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-2xl">
                      <div className="text-6xl">🎵</div>
                    </div>
                  )}
                  
                  {/* Audio Controls */}
                  <div className="w-full max-w-md">
                    <div className="text-center mb-4">
                      <h3 className="text-white text-lg font-semibold mb-1">
                        {metadata?.name || `Token #${tokenId}`}
                      </h3>
                      {metadata?.properties?.duration ? (
                        <p className="text-white/70 text-sm">
                          Duration: {formatDuration(metadata.properties.duration)}
                        </p>
                      ) : null}
                    </div>
                    <audio 
                      controls 
                      className="w-full"
                      src={audioBlobUrl || audioUrl}
                      preload="metadata"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
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
                  <button className="py-3 px-1  font-medium text-sm text-primary">
                    Overview
                  </button>
                  <button className="py-3 px-1  font-medium text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Properties
                    {metadata?.attributes && Array.isArray(metadata.attributes) && metadata.attributes.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {metadata.attributes.length}
                      </Badge>
                    )}
                  </button>
                  <button className="py-3 px-1  font-medium text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Bids
                  </button>
                  <button className="py-3 px-1  font-medium text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Activity
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-8 space-y-8">
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
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-muted-foreground">Refresh Metadata</span>
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
              </div>
            </div>
          </div>

          {/* Right Column - NFT Info & Actions */}
          <div className="col-span-12 lg:col-span-5">
            <div className="sticky top-6 space-y-6">
              {/* Title & Creator */}
              <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="title text-3xl my-6">{metadata?.name || `Token #${tokenId}`}</h1>
                    {metadata?.attributes && Array.isArray(metadata.attributes) && metadata.attributes.find(attr => attr.trait_type === 'Rarity') && (
                      <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 ml-2">
                        {metadata.attributes.find(attr => attr.trait_type === 'Rarity')?.value || 'Epic'}
                      </Badge>
                    )}
                  </div>
                  {/* Creator & Owner Info */}
                  <div className="space-y-3">
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
                  <Button variant="ghost" size="sm" className="p-2 hover:text-white">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:text-white">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
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
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Price</div>
                      {priceLoading ? (
                        <div className="animate-pulse">
                          <div className="h-8 bg-muted rounded w-32 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-24"></div>
                        </div>
                      ) : priceData ? (
                        <>
                          <div className="text-2xl font-bold">
                            {priceData.nftPriceSatoshis.toLocaleString()} 丰
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">Price Unavailable</div>
                          <div className="text-sm text-muted-foreground">Unable to fetch current price</div>
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Button
                        className="w-full py-6 bg-accent-foreground hover:bg-accent-foreground cursor-pointer"
                        disabled={!priceData}
                      >
                        {priceData ? `Buy now` : 'Loading price...'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Info */}
              <Card>
                <CardContent className="e-6">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Contract</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded truncate">
                          {address}.{contractName}
                        </code>
                        <Button
                          onClick={() => copyToClipboard(`${address}.${contractName}`, 'Contract')}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {owner && (
                      <div>
                        <div className="text-sm text-muted-foreground">Owner</div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${owner}`}
                            className="text-sm font-mono bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors truncate"
                          >
                            {owner.slice(0, 8)}...{owner.slice(-8)}
                          </Link>
                          <Button
                            onClick={() => copyToClipboard(owner, 'Owner address')}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
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
            <div className="text-gray-400">No other models from this creator.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {creatorNfts.map((nft) => (
                <Link key={String(nft.id ?? nft.token_id)} href={`/${nft.contract_address}/${nft.contract_name}/${nft.token_id}`} className="aspect-square bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center relative overflow-hidden">
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
