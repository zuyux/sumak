'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { getProfile, Profile } from '@/lib/profileApi';
import { fetchCallReadOnlyFunction, uintCV, cvToJSON } from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import axios from 'axios';
import Image from 'next/image';
import { User, MapPin, Calendar, Briefcase, Globe, Pen, LoaderCircle } from 'lucide-react';
import { getIPFSUrl } from '@/lib/pinataUpload';
import SafariOptimizedImage from '@/components/SafariOptimizedImage';

type TokenMetadata = {
  name?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
};

// Helper: extract uint from cvToJSON output that may be wrapped in (ok ...)
function extractOkUint(input: unknown): number | null {
  if (typeof input !== 'object' || input === null) return null;
  const outer = input as { value?: unknown };
  const v = outer.value;
  if (typeof v === 'object' && v !== null) {
    const inner = (v as { value?: unknown }).value;
    if (typeof inner === 'string' || typeof inner === 'number') {
      const n = Number(inner);
      return Number.isNaN(n) ? null : n;
    }
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// MintedTokensGrid: reusable grid for displaying minted tokens
function MintedTokensGrid({ mintedTokens, tokenMetadata }: {
  mintedTokens: Array<{ contractAddress: string, contractName: string, tokenId: number, tokenUri: string, txId: string }>;
  tokenMetadata: Record<string, TokenMetadata>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3 mt-8 md:mt-12">
      {mintedTokens.map(mint => {
        const metaKey = `${mint.contractAddress}:${mint.contractName}:${mint.tokenId}`;
        const meta = tokenMetadata[metaKey];
        return (
          <Link 
            key={metaKey} 
            href={`/${mint.contractAddress}/${mint.contractName}/${mint.tokenId}`}
            className="block transition-transform"
          >
            <div className="bg-background p-0 shadow cursor-pointer">
              {/* Square cover image */}
              {meta?.image ? (
                <div className="relative w-full pt-[100%]">
                  <Image
                    src={(() => {
                      const img = meta?.image as string;
                      if (!img) return '/4V4-DIY.png';
                      let out = img;
                      if (img.startsWith('ipfs://')) {
                        out = `https://ipfs.io/ipfs/${img.replace('ipfs://', '')}`;
                      }
                      // Normalize common IPFS gateways to ipfs.io to reduce 500s
                      out = out.replace('https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/');
                      out = out.replace('.mypinata.cloud/ipfs/', '://ipfs.io/ipfs/');
                      return out;
                    })()}
                    alt={meta?.name || 'NFT Image'}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="absolute inset-0 object-cover rounded-lg"
                    unoptimized
                    onError={(e) => {
                      const imgEl = e.currentTarget as HTMLImageElement;
                      if (imgEl && imgEl.src !== window.location.origin + '/4V4-DIY.png') {
                        imgEl.src = '/4V4-DIY.png';
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="relative w-full pt-[100%]">
                  <div className="absolute inset-0 flex items-center justify-center bg-background rounded-lg text-gray-500 border border-muted-foreground">
                    no_cover
                  </div>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ProfileDisplay: reusable component for showing profile information
function ProfileDisplay({ profile, address, isOwnProfile, mintedCount = 0 }: {
  profile: Profile | null;
  address: string;
  isOwnProfile: boolean;
  mintedCount?: number;
}) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate overlay opacity based on scroll position
  const overlayOpacity = Math.min(0.8, 0.5 + (scrollY / 800));

  if (!profile) {
    return (
      <div className="relative min-h-screen w-full mb-8">
        {/* Default gradient background for no profile */}
        <div className="fixed inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-br from-blue-900/40 to-purple-900/40" />
          <div 
            className="absolute inset-0 bg-black transition-opacity duration-300 ease-out"
            style={{ opacity: overlayOpacity }}
          />
        </div>

        {/* Content container */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
          {/* Edit button in top right */}
          {isOwnProfile && (
            <Link 
              href="/settings" 
              className="fixed top-8 right-8 p-3 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full transition-colors z-20"
              title="Edit Profile"
            >
              <Pen className="w-5 h-5 text-white" />
            </Link>
          )}

          {/* Default profile picture */}
          <div className="w-40 h-40 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 mb-8 backdrop-blur-sm">
            <User className="w-20 h-20 text-white/60" />
          </div>

          {/* Profile info */}
          <div className="text-center space-y-6 max-w-2xl">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold text-white drop-shadow-lg">
                {address.substring(0, 8)}...{address.substring(address.length - 8)}
              </h1>
              
              <p className="text-lg text-white/70 font-mono bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
                {address.substring(0, 8)}...{address.substring(address.length - 8)}
              </p>
              
              {mintedCount > 0 && (
                <div className="flex items-center justify-center space-x-6 text-lg text-white/80">
                  <span className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    {mintedCount} Songs Minted
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full mb-8">
      {/* Full-screen blurred background */}
      <div className="fixed inset-0 z-0">
        {(profile.banner_cid || profile.banner_url) ? (
          profile.banner_cid ? (
            <SafariOptimizedImage
              src={getIPFSUrl(profile.banner_cid)}
              alt="Profile Banner"
              className="w-full h-full object-cover blur-sm scale-110"
              fill
              filename="profile-banner.jpg"
              onError={() => {
                console.error('Failed to load IPFS banner image with all gateways');
              }}
            />
          ) : (
            <Image
              src={profile.banner_url!}
              alt="Profile Banner"
              fill
              className="object-cover blur-sm scale-110"
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900/40 to-purple-900/40" />
        )}
        {/* Dark overlay with scroll-based opacity */}
        <div 
          className="absolute inset-0 bg-black transition-opacity duration-300 ease-out"
          style={{ opacity: overlayOpacity }}
        />
      </div>

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">


        {/* Profile picture centered */}
        <div className="w-40 h-40 bg-white/10 rounded-full flex items-center justify-center overflow-hidden border-4 border-white/20 mb-8 backdrop-blur-sm">
          {(profile.avatar_cid || profile.avatar_url) ? (
            profile.avatar_cid ? (
              <SafariOptimizedImage
                src={getIPFSUrl(profile.avatar_cid)}
                alt={profile.display_name || profile.username || 'Profile'}
                className="w-40 h-40 rounded-full object-cover"
                width={160}
                height={160}
                filename="profile-avatar.jpg"
                onError={() => {
                  console.error('Failed to load IPFS avatar image with all gateways');
                }}
              />
            ) : (
              <Image
                src={profile.avatar_url!}
                alt={profile.display_name || profile.username || 'Profile'}
                width={160}
                height={160}
                className="w-40 h-40 rounded-full object-cover"
              />
            )
          ) : (
            <User className="w-20 h-20 text-white/60" />
          )}
        </div>

        {/* Profile info centered below avatar */}
        <div className="text-center space-y-6 max-w-2xl">
          <div className="space-y-3">
            <h1 className="text-5xl font-bold text-white drop-shadow-lg">
              {profile.display_name || profile.username || `${address.substring(0, 8)}...${address.substring(address.length - 8)}`}
            </h1>
            
            {profile.username && profile.display_name && (
              <p className="text-2xl text-white/90 drop-shadow">@{profile.username}</p>
            )}
            
            <p className="text-lg text-white/70 font-mono bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
              {address.substring(0, 8)}...{address.substring(address.length - 8)}
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-lg text-white/80">
              {mintedCount > 0 && (
                <span className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  {mintedCount} Mints
                </span>
              )}
            </div>
          </div>

          {profile.tagline && (
            <p className="text-xl text-white/90 drop-shadow bg-black/20 backdrop-blur-sm px-6 py-3 rounded-xl">
              {profile.tagline}
            </p>
          )}

          {profile.biography && (
            <p className="text-lg text-white/80 leading-relaxed bg-black/20 backdrop-blur-sm px-6 py-4 rounded-xl">
              {profile.biography}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-4 text-white/70">
            {profile.location && (
              <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <MapPin className="w-5 h-5" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.occupation && (
              <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Briefcase className="w-5 h-5" />
                <span>{profile.occupation}</span>
                {profile.company && <span> at {profile.company}</span>}
              </div>
            )}
            {profile.years_experience && profile.years_experience > 0 && (
              <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Calendar className="w-5 h-5" />
                <span>{profile.years_experience} years experience</span>
              </div>
            )}
          </div>

          {profile.skills && profile.skills.length > 0 && (
            <div className="bg-black/20 backdrop-blur-sm px-6 py-4 rounded-xl">
              <div className="flex flex-wrap justify-center gap-2">
                {profile.skills.slice(0, 12).map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-white/20 text-white/90 rounded-full text-sm backdrop-blur-sm"
                  >
                    {skill}
                  </span>
                ))}
                {profile.skills.length > 12 && (
                  <span className="px-3 py-1 bg-white/10 text-white/60 rounded-full text-sm backdrop-blur-sm">
                    +{profile.skills.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                <Globe className="w-5 h-5" />
                <span>Website</span>
              </a>
            )}
            {profile.artstation && (
              <a
                href={profile.artstation.startsWith('http') ? profile.artstation : `https://${profile.artstation}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                ArtStation
              </a>
            )}
            {profile.sketchfab && (
              <a
                href={profile.sketchfab.startsWith('http') ? profile.sketchfab : `https://${profile.sketchfab}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                Sketchfab
              </a>
            )}
            {profile.behance && (
              <a
                href={profile.behance.startsWith('http') ? profile.behance : `https://${profile.behance}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                Behance
              </a>
            )}
            {profile.twitter && (
              <a
                href={`https://twitter.com/${profile.twitter.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                Twitter
              </a>
            )}
            {profile.linkedin && (
              <a
                href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ProfilePage: shows connected wallet's profile and NFTs in a grid
function ProfilePage() {
  const address = useCurrentAddress();
  const [mintedTokens, setMintedTokens] = useState<Array<{ contractAddress: string, contractName: string, tokenId: number, tokenUri: string, txId: string }>>([]);
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, TokenMetadata>>({});
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const profileData = await getProfile(address);
        setProfile(profileData);
      } catch (error) {
        console.error('Profile fetch error:', error);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
    
    const fetchMints = async () => {
      setLoading(true);
      try {
        // 1. Fetch all smart_contract transactions by this address
        const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
        const apiBase = networkEnv === "mainnet"
          ? "https://api.hiro.so/extended/v1"
          : "https://api.testnet.hiro.so/extended/v1";
        // Get all smart_contract transactions
        const txRes = await axios.get(`${apiBase}/address/${address}/transactions?type=smart_contract&limit=50`);
        const txs = txRes.data?.results || [];
        console.log('Txs length:', txs.length);
        type SmartContractTx = {
          tx_type: string;
          smart_contract?: { contract_id?: string };
          contract_call?: unknown;
          contract_id?: string;
          tx_id: string;
        };
        (txs as SmartContractTx[]).forEach((tx, idx) => {
          console.log(`TX[${idx}] smart_contract:`, tx.smart_contract);
        });
        // Filter for contract deployments (prefer tx.smart_contract.contract_id)
        const contracts = (txs as SmartContractTx[])
          .filter((tx) => tx.tx_type === 'smart_contract' && tx.contract_call === undefined && (tx.smart_contract?.contract_id || tx.contract_id))
          .map((tx) => {
            const cid = tx.smart_contract?.contract_id || tx.contract_id!;
            const [contractAddress, contractName] = cid.split('.');
            return { contractAddress, contractName, txId: tx.tx_id };
          });
        console.log('Contracts found:', contracts);

        // 2. For each contract, try to enumerate tokens
        const allTokens: Array<{ contractAddress: string, contractName: string, tokenId: number, tokenUri: string, txId: string }> = [];
        for (const contract of contracts) {
          const { contractAddress, contractName, txId } = contract;
          // Try to get last token id
          let lastTokenId = 0;
          try {
            const lastTokenIdCV = await fetchCallReadOnlyFunction({
              contractAddress,
              contractName,
              functionName: 'get-last-token-id',
              functionArgs: [],
              network: networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET,
              senderAddress: address,
            });
            const lastJson = cvToJSON(lastTokenIdCV);
            const parsed = extractOkUint(lastJson);
            lastTokenId = parsed ?? 0;
            console.log(`Contract ${contractAddress}.${contractName} lastTokenId:`, lastTokenId);
          } catch (err) {
            console.log(`Error getting lastTokenId for ${contractAddress}.${contractName}:`, err);
          }
          if (!lastTokenId || isNaN(lastTokenId)) continue;
          for (let tokenId = 1; tokenId <= lastTokenId; tokenId++) {
            try {
              const ownerCV = await fetchCallReadOnlyFunction({
                contractAddress,
                contractName,
                functionName: 'get-owner',
                functionArgs: [uintCV(tokenId)],
                network: networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET,
                senderAddress: address,
              });
              const ownerJson = cvToJSON(ownerCV);
              let owner: string | undefined;
              if (
                ownerJson.value &&
                ownerJson.value.value &&
                typeof ownerJson.value.value.value === 'string'
              ) {
                owner = ownerJson.value.value.value;
              } else if (typeof ownerJson.value === 'string') {
                owner = ownerJson.value;
              } else if (typeof ownerJson.value?.value === 'string') {
                owner = ownerJson.value.value;
              } else {
                owner = undefined;
              }
              console.log(`Token ${tokenId} owner for ${contractAddress}.${contractName}:`, owner);
              if (owner && owner === address) {
                // Get token URI
                let tokenUri = '';
                try {
                  const uriCV = await fetchCallReadOnlyFunction({
                    contractAddress,
                    contractName,
                    functionName: 'get-token-uri',
                    functionArgs: [uintCV(tokenId)],
                    network: networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET,
                    senderAddress: address,
                  });
                  const uriJson = cvToJSON(uriCV);
                  if (uriJson.value && uriJson.value.value && typeof uriJson.value.value.value === 'string') {
                    tokenUri = uriJson.value.value.value;
                  } else if (typeof uriJson.value === 'string') {
                    tokenUri = uriJson.value;
                  } else if (typeof uriJson.value?.value === 'string') {
                    tokenUri = uriJson.value.value;
                  }
                } catch (err) {
                  console.log(`Error getting tokenUri for token ${tokenId} in ${contractAddress}.${contractName}:`, err);
                }
                allTokens.push({ contractAddress, contractName, tokenId, tokenUri, txId });
              }
            } catch (err) {
              console.log(`Error getting owner for token ${tokenId} in ${contractAddress}.${contractName}:`, err);
            }
          }
        }
        console.log('All minted tokens:', allTokens);
        setMintedTokens(allTokens);
        // Fetch metadata for IPFS CIDs (not https links)
        const metadataPromises = allTokens.map(async (token) => {
          const metaKey = `${token.contractAddress}:${token.contractName}:${token.tokenId}`;
          // Try to get from localStorage first
          const cached = getCachedMetadata(metaKey);
          if (cached) {
            return { key: metaKey, metadata: cached };
          }
          if (!token.tokenUri.startsWith('https')) {
            let cid = token.tokenUri;
            if (cid.startsWith('ipfs://')) {
              cid = cid.replace('ipfs://', '');
            }
            const url = `https://ipfs.io/ipfs/${cid}`;
            try {
              const res = await axios.get<TokenMetadata>(url, { timeout: 5000 });
              setCachedMetadata(metaKey, res.data);
              return { key: metaKey, metadata: res.data };
            } catch {
              return { key: metaKey, metadata: null };
            }
          }
          return { key: metaKey, metadata: null };
        });
        const metadatas = await Promise.all(metadataPromises);
        const metaMap: Record<string, TokenMetadata> = {};
        metadatas.forEach(({ key, metadata }) => {
          if (metadata) metaMap[key] = metadata;
        });
        setTokenMetadata(metaMap);
      } catch (err) {
        console.log('Error in fetchMints:', err);
        setMintedTokens([]);
      }
      setLoading(false);
    };
    fetchMints();
  }, [address]);

  return (
    <div className='w-full'>
      {/* ProfileDisplay component for own profile - full screen */}
      {!profileLoading && (
        <ProfileDisplay 
          profile={profile} 
          address={address || ''} 
          isOwnProfile={true} 
          mintedCount={mintedTokens.length}
        />
      )}
      
      {/* Content section with NFT grid */}
      <div className='bg-background px-4 md:px-8 py-12'>
        <div className='max-w-5xl mx-auto'>
          <div className='text-center items-center justify-center'>
            {profileLoading && (
              <div className="animate-pulse">
                <div className="bg-background rounded-xl p-6 mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-white/10 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-white/10 rounded w-32"></div>
                      <div className="h-3 bg-white/10 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {!address && <p>Please connect your wallet.</p>}
          {loading && (
            <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
              <LoaderCircle/>
            </div>
          )}
          {!loading && mintedTokens.length === 0 && address && (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Models</h2>
              <p className='text-foreground/60'>
                No Minted Models yet. <Link href="/mint" className="text-blue-400 underline">Mint here</Link>
              </p>
            </div>
          )}
          {/* Grid of minted models */}
          {mintedTokens.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-8 text-center">My Models</h2>
              <MintedTokensGrid mintedTokens={mintedTokens} tokenMetadata={tokenMetadata} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// AddressPage: shows profile for a given address param
function AddressPage({ address, currentAddress }: { address: string, currentAddress?: string }) {
  // List minted NFTs for the given address using Hiro API
  const [mintedTokens, setMintedTokens] = useState<Array<{ contractAddress: string, contractName: string, tokenId: number, tokenUri: string, txId: string }>>([]);
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, TokenMetadata>>({});
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const profileData = await getProfile(address);
        setProfile(profileData);
      } catch (error) {
        console.error('Profile fetch error:', error);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
    
    const fetchMints = async () => {
      setLoading(true);
      try {
        // 1. Fetch all smart_contract transactions by this address
        const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
        const apiBase = networkEnv === "mainnet"
          ? "https://api.hiro.so/extended/v1"
          : "https://api.testnet.hiro.so/extended/v1";
        // Get all smart_contract transactions
        const txRes = await axios.get(`${apiBase}/address/${address}/transactions?type=smart_contract&limit=50`);
        const txs = txRes.data?.results || [];
        console.log('Txs length:', txs.length);
        type SmartContractTx = {
          tx_type: string;
          smart_contract?: { contract_id?: string };
          contract_call?: unknown;
          contract_id?: string;
          tx_id: string;
        };
        (txs as SmartContractTx[]).forEach((tx, idx) => {
          console.log(`TX[${idx}] smart_contract:`, tx.smart_contract);
        });
        // Filter for contract deployments (prefer tx.smart_contract.contract_id)
        const contracts = (txs as SmartContractTx[])
          .filter((tx) => tx.tx_type === 'smart_contract' && tx.contract_call === undefined && (tx.smart_contract?.contract_id || tx.contract_id))
          .map((tx) => {
            const cid = tx.smart_contract?.contract_id || tx.contract_id!;
            const [contractAddress, contractName] = cid.split('.');
            return { contractAddress, contractName, txId: tx.tx_id };
          });

        // 2. For each contract, try to enumerate tokens
        const allTokens: Array<{ contractAddress: string, contractName: string, tokenId: number, tokenUri: string, txId: string }> = [];
        for (const contract of contracts) {
          const { contractAddress, contractName, txId } = contract;
          // Try to get last token id
          let lastTokenId = 0;
          try {
            const lastTokenIdCV = await fetchCallReadOnlyFunction({
              contractAddress,
              contractName,
              functionName: 'get-last-token-id',
              functionArgs: [],
              network: networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET,
              senderAddress: address,
            });
            const lastJson = cvToJSON(lastTokenIdCV);
            const parsed = extractOkUint(lastJson);
            lastTokenId = parsed ?? 0;
          } catch {}
          if (!lastTokenId || isNaN(lastTokenId)) continue;
          for (let tokenId = 1; tokenId <= lastTokenId; tokenId++) {
            try {
              const ownerCV = await fetchCallReadOnlyFunction({
                contractAddress,
                contractName,
                functionName: 'get-owner',
                functionArgs: [uintCV(tokenId)],
                network: networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET,
                senderAddress: address,
              });
              const ownerJson = cvToJSON(ownerCV);
              let owner: string | undefined;
              if (
                ownerJson.value &&
                ownerJson.value.value &&
                typeof ownerJson.value.value.value === 'string'
              ) {
                owner = ownerJson.value.value.value;
              } else if (typeof ownerJson.value === 'string') {
                owner = ownerJson.value;
              } else if (typeof ownerJson.value?.value === 'string') {
                owner = ownerJson.value.value;
              } else {
                owner = undefined;
              }
              if (owner && owner === address) {
                // Get token URI
                let tokenUri = '';
                try {
                  const uriCV = await fetchCallReadOnlyFunction({
                    contractAddress,
                    contractName,
                    functionName: 'get-token-uri',
                    functionArgs: [uintCV(tokenId)],
                    network: networkEnv === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET,
                    senderAddress: address,
                  });
                  const uriJson = cvToJSON(uriCV);
                  if (uriJson.value && uriJson.value.value && typeof uriJson.value.value.value === 'string') {
                    tokenUri = uriJson.value.value.value;
                  } else if (typeof uriJson.value === 'string') {
                    tokenUri = uriJson.value;
                  } else if (typeof uriJson.value?.value === 'string') {
                    tokenUri = uriJson.value.value;
                  }
                } catch {}
                allTokens.push({ contractAddress, contractName, tokenId, tokenUri, txId });
              }
            } catch {}
          }
        }
        setMintedTokens(allTokens);
        // Fetch metadata for IPFS CIDs (not https links)
        const metadataPromises = allTokens.map(async (token) => {
          const metaKey = `${token.contractAddress}:${token.contractName}:${token.tokenId}`;
          // Try to get from localStorage first
          const cached = getCachedMetadata(metaKey);
          if (cached) {
            return { key: metaKey, metadata: cached };
          }
          if (!token.tokenUri.startsWith('https')) {
            let cid = token.tokenUri;
            if (cid.startsWith('ipfs://')) {
              cid = cid.replace('ipfs://', '');
            }
            const url = `https://ipfs.io/ipfs/${cid}`;
            try {
              const res = await axios.get<TokenMetadata>(url, { timeout: 5000 });
              setCachedMetadata(metaKey, res.data);
              return { key: metaKey, metadata: res.data };
            } catch {
              return { key: metaKey, metadata: null };
            }
          }
          return { key: metaKey, metadata: null };
        });
        const metadatas = await Promise.all(metadataPromises);
        const metaMap: Record<string, TokenMetadata> = {};
        metadatas.forEach(({ key, metadata }) => {
          if (metadata) metaMap[key] = metadata;
        });
        setTokenMetadata(metaMap);
      } catch {
        setMintedTokens([]);
      }
      setLoading(false);
    };
    fetchMints();
  }, [address]);

  return (
    <div className="w-full">
      {/* ProfileDisplay component for public profile - full screen */}
      {!profileLoading && (
        <ProfileDisplay 
          profile={profile} 
          address={address} 
          isOwnProfile={false} 
          mintedCount={mintedTokens.length}
        />
      )}
      
      {/* Content section with NFT grid */}
      <div className='bg-background px-4 md:px-8 py-12'>
        <div className="max-w-5xl mx-auto">
          {profileLoading && (
            <div className="animate-pulse">
              <div className="bg-background border border-white/20 rounded-xl p-6 mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-white/10 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-32"></div>
                    <div className="h-3 bg-white/10 rounded w-24"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NFT grid for this address */}
          {loading && (
            <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
              <Image
                src="/loader.gif"
                alt="Loading..."
                width={120}
                height={120}
                priority
                unoptimized
                className="rounded-lg"
              />
            </div>
          )}
          {!loading && mintedTokens.length === 0 && address && currentAddress && address.toLowerCase() === currentAddress.toLowerCase() && (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Models</h2>
              <p className='text-center text-[#555]'>
                No Minted Models yet. <Link href="/mint" className="border-[1px] border-[#222] p-2 rounded-md text-blue-400">Mint here</Link>
              </p>
            </div>
          )}
          {mintedTokens.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
                {address && currentAddress && address.toLowerCase() === currentAddress.toLowerCase() ? 'My Models' : 'Models'}
              </h2>
              <MintedTokensGrid mintedTokens={mintedTokens} tokenMetadata={tokenMetadata} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to get/set NFT metadata in localStorage
function getCachedMetadata(key: string): TokenMetadata | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

function setCachedMetadata(key: string, data: TokenMetadata) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// Main export: decide which page to show based on params
export default function Page() {
  const params = useParams();
  const currentAddress = useCurrentAddress();
  let address: string | undefined;
  if (params && typeof params.address === 'string') {
    address = params.address;
  } else if (params && Array.isArray(params.address) && typeof params.address[0] === 'string') {
    address = params.address[0];
  }

  // If no address param, show ProfilePage (current user)
  if (!address) {
    return <ProfilePage />;
  }

  // If address param matches current user, show ProfilePage (with grid)
  if (currentAddress && address && currentAddress.toLowerCase() === address.toLowerCase()) {
    return <ProfilePage />;
  }

  // Otherwise, show AddressPage (public profile)
  return <AddressPage address={address} currentAddress={currentAddress ?? undefined} />;
}
