'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCallReadOnlyFunction, uintCV, cvToJSON } from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import axios from 'axios';
import Image from 'next/image';
import { getIPFSUrl } from '@/lib/pinataUpload';
import { supabase } from '@/lib/supabaseClient';

type TokenMetadata = {
  name?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
};

type MintedToken = {
  contractAddress: string;
  contractName: string;
  tokenId: number;
  tokenUri: string;
  txId?: string;
  owner: string;
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

export default function ExplorePage() {
  const [allNFTs, setAllNFTs] = useState<MintedToken[]>([]);
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, TokenMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [userCount, setUserCount] = useState(0);
  const [processedUsers, setProcessedUsers] = useState(0);

  // Get network environment
  const networkEnv = process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet';

  useEffect(() => {
    const fetchAllNFTs = async () => {
      try {
        setLoading(true);
        setError('');
        setProcessedUsers(0);

        // 1. Get all user addresses from Supabase profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('address')
          .order('created_at', { ascending: false });

        if (profilesError) {
          throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
        }

        if (!profiles || profiles.length === 0) {
          console.log('No user profiles found');
          setAllNFTs([]);
          setLoading(false);
          return;
        }

        console.log(`Found ${profiles.length} user profiles`);
        setUserCount(profiles.length);

        // 2. For each user address, fetch their minted NFTs (same logic as address page)
        const allTokens: MintedToken[] = [];
        
        for (let i = 0; i < profiles.length; i++) {
          const { address } = profiles[i];
          setProcessedUsers(i + 1);
          
          try {
            console.log(`Processing user ${i + 1}/${profiles.length}: ${address}`);
            
            // Get smart contract deployment transactions (same logic as address page)
            const apiBase = networkEnv === 'mainnet' 
              ? 'https://api.hiro.so/extended/v1' 
              : 'https://api.testnet.hiro.so/extended/v1';

            const txResponse = await axios.get(
              `${apiBase}/address/${address}/transactions?type=smart_contract&limit=50`,
              { timeout: 10000 }
            );

            if (!txResponse.data?.results) {
              console.log(`No transactions for ${address}`);
              continue;
            }

            const txs = txResponse.data.results || [];
            console.log(`Found ${txs.length} transactions for ${address}`);

            type SmartContractTx = {
              tx_type: string;
              smart_contract?: { contract_id?: string };
              contract_call?: unknown;
              contract_id?: string;
              tx_id: string;
            };

            // Filter for contract deployments (prefer tx.smart_contract.contract_id)
            const contracts = (txs as SmartContractTx[])
              .filter((tx) => tx.tx_type === 'smart_contract' && tx.contract_call === undefined && (tx.smart_contract?.contract_id || tx.contract_id))
              .map((tx) => {
                const cid = tx.smart_contract?.contract_id || tx.contract_id!;
                const [contractAddress, contractName] = cid.split('.');
                return { contractAddress, contractName, txId: tx.tx_id };
              });

            console.log(`Found ${contracts.length} contracts for ${address}:`, contracts);

            // 3. For each contract, try to enumerate tokens owned by this address
            for (const contract of contracts) {
              if (!contract) continue;
              
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
                continue;
              }

              if (!lastTokenId || isNaN(lastTokenId)) continue;

              // For each token, check if this address owns it
              for (let tokenId = 1; tokenId <= lastTokenId; tokenId++) {
                try {
                  // Get token owner
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
                    // This address owns this token, get token URI
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

                    allTokens.push({ 
                      contractAddress, 
                      contractName, 
                      tokenId, 
                      tokenUri, 
                      txId, 
                      owner: address 
                    });
                  }
                } catch (err) {
                  console.log(`Error checking ownership for token ${tokenId} in ${contractAddress}.${contractName}:`, err);
                }
              }
            }
          } catch (err) {
            console.log(`Error processing user ${address}:`, err);
            // Continue with next user
          }
        }

        console.log(`Found ${allTokens.length} total NFTs across all users`);
        setAllNFTs(allTokens);

        // 4. Fetch metadata for all tokens
        const metadata: Record<string, TokenMetadata> = {};
        for (const token of allTokens) {
          if (!token.tokenUri) continue;

          const metaKey = `${token.contractAddress}:${token.contractName}:${token.tokenId}`;
          // Try to get from localStorage first
          const cached = getCachedMetadata(metaKey);
          if (cached) {
            metadata[metaKey] = cached;
            continue;
          }
          try {
            // Convert IPFS URIs to HTTP URLs
            let metadataUrl = token.tokenUri;
            if (token.tokenUri.startsWith('ipfs://')) {
              metadataUrl = getIPFSUrl(token.tokenUri.replace('ipfs://', ''));
            }

            const metaResponse = await axios.get(metadataUrl, { timeout: 10000 });
            const meta = metaResponse.data || {};
            // Normalize name/description fields and provide better fallbacks
            let name = meta.name || meta.title || meta['nft_name'] || meta['NFT_NAME'] || 'Unnamed NFT';
            if (typeof name !== 'string') name = 'Unnamed NFT';
            let description = meta.description || meta['desc'] || meta['nft_description'] || meta['NFT_DESCRIPTION'] || '';
            if (typeof description !== 'string') description = '';
            const normalized = {
              ...meta,
              name,
              description,
            };
            metadata[metaKey] = normalized;
            setCachedMetadata(metaKey, normalized);
          } catch (err) {
            console.log(`Error fetching metadata for ${metaKey}:`, err);
            metadata[metaKey] = { name: 'Unknown NFT', description: 'Unable to load metadata' };
          }
        }

        setTokenMetadata(metadata);
      } catch (error) {
        console.error('Error fetching NFTs:', error);
        setError(error instanceof Error ? error.message : 'Failed to load NFTs');
      } finally {
        setLoading(false);
      }
    };

    fetchAllNFTs();
  }, [networkEnv]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background my-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold my-16" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
              Explore NFTs
            </h1>
            <div className="mb-4">Loading NFTs from all users...</div>
            {userCount > 0 && (
              <div className="text-sm text-muted-foreground">
                Processing user {processedUsers} of {userCount}
              </div>
            )}
            <div className="w-full max-w-md mx-auto mt-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: userCount > 0 ? `${(processedUsers / userCount) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold my-16" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
              Explore NFTs
            </h1>
            <div className="text-red-400 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold my-16" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
            Explore
          </h1>
          <div className="text-sm text-muted-foreground">
            {allNFTs.length} NFTs found from {userCount} users
          </div>
        </div>

        {allNFTs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">No NFTs found yet.</p>
            <p className="text-muted-foreground mb-6">Be the first community member to mint an NFT!</p>
            <Link 
              href="/mint" 
              className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Mint your first NFT
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {allNFTs.map((token) => {
              const metaKey = `${token.contractAddress}:${token.contractName}:${token.tokenId}`;
              const meta = tokenMetadata[metaKey];
              
              return (
                <Link 
                  key={metaKey}
                  href={`/${token.contractAddress}/${token.contractName}/${token.tokenId}`}
                  className="block transition-transform hover:scale-[1.02]"
                >
                  <div className="bg-background rounded-xl p-4 border border-foreground shadow cursor-pointer">
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
                            out = out.replace('.mypinata.cloud/ipfs/', 'https://ipfs.io/ipfs/');
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
                        <div className="absolute inset-0 flex items-center justify-center bg-muted border-[1px] border-muted-foreground rounded-lg text-gray-500">
                          No image
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <div className="font-semibold text-sm truncate">
                        {meta?.name || 'Unnamed NFT'}
                      </div>
                      <div className="text-xs text-gray-400 mb-2 line-clamp-2">
                        {meta?.description || 'No description'}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Token #{token.tokenId}</div>
                        <div className="truncate">
                          {token.contractName}
                        </div>
                        <div 
                          className="block truncate hover:text-blue-400 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/${token.owner}`;
                          }}
                        >
                          by {token.owner.substring(0, 8)}...{token.owner.substring(token.owner.length - 8)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}