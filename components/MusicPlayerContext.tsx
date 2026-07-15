'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { preferIpfsGateway } from '@/lib/ipfs-utils';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  animation_url: string;
  external_url: string | null;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    duration: number;
    format: string;
    file_size: string;
    channels: number;
    sample_rate: number;
    title: string;
    audio_file: string;
  };
  interoperabilityFormats: unknown[];
  customizationData: Record<string, unknown>;
  edition: unknown;
  royalties: unknown;
  soulbound: boolean;
  location: {
    lat: number;
    lon: number;
  };
}

interface NFTRecord {
  id: number;
  token_id: number;
  contract_address: string;
  contract_name: string;
  creator_address: string;
  current_owner: string;
  name: string;
  description: string | null;
  artist: string | null;
  image_url: string | null;
  image_cid: string | null;
  audio_url: string | null;
  audio_cid: string | null;
  external_url: string | null;
  audio_format: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  metadata_cid: string;
  royalty_percentage: number | null;
  attributes: Record<string, unknown> | null;
  mint_tx_id: string;
  block_height: number | null;
  mint_location_lat: number | null;
  mint_location_lng: number | null;
  created_at: string;
  updated_at: string;
  is_listed: boolean;
  list_price: number | null;
  list_currency: string;
  status: string;
}

interface Album {
  id: string;
  metadataUrl: string;
  nftUrl?: string;
  metadata?: NFTMetadata;
  nftRecord?: NFTRecord; // Add NFT record data
}

interface MusicPlayerContextType {
  currentAlbum: Album | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  isRepeating: boolean;
  albumsWithMetadata: Album[];
  isLoading: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  
  // Actions
  setCurrentAlbum: (album: Album) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setIsShuffled: (shuffled: boolean) => void;
  setIsRepeating: (repeating: boolean) => void;
  seekTo: (time: number) => void;
  navigateToCurrentNFT: () => void;
  refreshMusicQueue: () => void; // New function to refresh the music queue
  
  // Helper functions
  createNFTUrl: (creatorAddress: string, contractName: string, tokenId: number) => string;
  getCurrentBackgroundImage: () => string | null; // Helper to get current background image
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

const IPFS_GATEWAY_FALLBACKS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://w3s.link/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://dweb.link/ipfs/'
];

const extractIpfsHash = (rawUrl: string): string | null => {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();

  if (/^[a-zA-Z0-9]{46,}$/.test(trimmed)) {
    return trimmed;
  }

  const pathMatch = trimmed.match(/(?:ipfs:\/\/|\/ipfs\/)([^/?#]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  try {
    const parsed = new URL(trimmed);
    const subdomainMatch = parsed.hostname.match(/^([a-z0-9]+)\.ipfs\./i);
    if (subdomainMatch && subdomainMatch[1]) {
      return subdomainMatch[1];
    }
  } catch {
    // Ignore invalid URLs
  }

  return null;
};

// Function to fetch NFT music data from Supabase
const fetchNFTMusicData = async (): Promise<Album[]> => {
  try {
    const { data: nfts, error } = await supabase
      .from('nfts')
      .select('*')
      .not('audio_url', 'is', null) // Only get NFTs with audio
      .eq('status', 'active') // Only active NFTs
      .order('created_at', { ascending: true })
      .limit(50); // Limit to 50 oldest

    if (error) {
      console.error('Error fetching NFTs:', error);
      // Return fallback albums if there's an error
      return getFallbackAlbums();
    }

    if (!nfts || nfts.length === 0) {
      return getFallbackAlbums();
    }

    // Convert NFT records to Album format
    const albums: Album[] = nfts.map((nft: NFTRecord) => {
      const rawImageUrl = nft.image_url || (nft.image_cid ? `https://ipfs.io/ipfs/${nft.image_cid}` : '');
      const rawAudioUrl = nft.audio_url || (nft.audio_cid ? `https://ipfs.io/ipfs/${nft.audio_cid}` : '');
      const imageUrl = preferIpfsGateway(rawImageUrl) || rawImageUrl;
      const audioUrl = preferIpfsGateway(rawAudioUrl) || rawAudioUrl;
      
      // Ensure we have a valid image URL, provide fallback if needed
      const safeImageUrl = imageUrl || '/SUMAK.png'; // Use SUMAK logo as fallback
      
      return {
        id: `${nft.contract_address}-${nft.token_id}`,
        metadataUrl: `https://ipfs.io/ipfs/${nft.metadata_cid}`,
        nftUrl: `/${nft.creator_address}/${nft.contract_name}/${nft.token_id}`,
        nftRecord: nft,
        // Create metadata from NFT record for immediate use
        metadata: {
          name: nft.name,
          description: nft.description || '',
          image: safeImageUrl,
          animation_url: audioUrl,
          external_url: nft.external_url,
          attributes: Array.isArray(nft.attributes) ? nft.attributes as Array<{trait_type: string; value: string | number}> : [],
          properties: {
            duration: nft.duration_seconds || 240,
            format: nft.audio_format || 'mp3',
            file_size: nft.file_size_bytes?.toString() || '0',
            channels: 2,
            sample_rate: 44100,
            title: nft.name,
            audio_file: audioUrl,
          },
          interoperabilityFormats: [],
          customizationData: {},
          edition: null,
          royalties: nft.royalty_percentage || 500,
          soulbound: false,
          location: {
            lat: nft.mint_location_lat || 0,
            lon: nft.mint_location_lng || 0,
          },
        } as NFTMetadata
      };
    });

    return albums;
  } catch (error) {
    console.error('Error in fetchNFTMusicData:', error);
    return getFallbackAlbums();
  }
};

// Fallback albums when no NFTs are available
const getFallbackAlbums = (): Album[] => [
  {
    id: '1',
    metadataUrl: 'https://ipfs.io/ipfs/QmQx3XDVeWtXsnoWavLwKfh822mFCLWoQ8FFcrG4cwB6yg',
    nftUrl: '/ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ/cholo-1761380645632/1'
  },
  {
    id: '2',
    metadataUrl: 'https://ipfs.io/ipfs/QmeZ329grqNRx8dDVMyDvtr1afkDHFfPotaSy2fwQrwbWF',
    nftUrl: '/ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ/shakedown-1761419817658/1'    
  },
  {
    id: '3',
    metadataUrl: 'https://ipfs.io/ipfs/QmPM6aCi9gLaF4rWKcMrtYrXSbS2dJrEUsvpZ6b72mLFvo',
    nftUrl: '/ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ/cool-cat-queen-1761422931492/1'
  },
  {
    id: '4',
    metadataUrl: 'https://ipfs.io/ipfs/QmayE1pGpMD57Wcx9WsMnKvJtP4JhHATFuBGQDcz9aCBN5',
    nftUrl: '/ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ/hydrogen-1761448324287/1'
  }
];

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [currentAlbum, setCurrentAlbumState] = useState<Album | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(240);
  const [volume, setVolumeState] = useState(0.7);
  const [isShuffled, setIsShuffledState] = useState(true);
  const [isRepeating, setIsRepeating] = useState(false);
  const [albumsWithMetadata, setAlbumsWithMetadata] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  // For shuffle-play: maintain a queued order (no repeats until all played)
  const shuffleQueueRef = useRef<string[]>([]);
  // History stack for previousTrack when shuffled
  const shuffleHistoryRef = useRef<string[]>([]);

  // Utility function to convert any IPFS gateway URL or CID to ipfs.io
  const convertToIpfsIo = useCallback((url: string): string => {
    if (!url) return url;
    const preferred = preferIpfsGateway(url) ?? url;
    const trimmed = preferred.trim();
    if (!trimmed) return trimmed;
    // If it's already a valid https URL (possibly rewritten to ipfs.io), use as-is
    if (trimmed.startsWith('https://')) return trimmed;
    // If it's a CID (46+ chars, alphanumeric), build the ipfs.io URL
    if (/^[a-zA-Z0-9]{46,}$/.test(trimmed)) {
      return `https://ipfs.io/ipfs/${trimmed}`;
    }
    // Match IPFS CID patterns in URLs
    const ipfsPatterns = [
      /\/ipfs\/([a-zA-Z0-9]+)/,  // Standard /ipfs/CID pattern
      /^ipfs:\/\/([a-zA-Z0-9]+)/, // ipfs:// protocol
      /\/([a-zA-Z0-9]{46,})$/     // Just the CID at the end
    ];
    for (const pattern of ipfsPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const cid = match[1];
        const finalUrl = `https://ipfs.io/ipfs/${cid}`;
        return finalUrl;
      }
    }
    // If no IPFS pattern found, return original URL
    return trimmed;
  }, []);

  // Decide whether a URL should be proxied to avoid CORS issues (e.g. pinata gateways)
  const shouldProxyUrl = useCallback((url: string): boolean => {
    try {
      const u = new URL(url);
      const hostsToProxy = [
        'pinata',
        'gateway.pinata',
        'ipfs.io',
        'dweb.link',
        'gateway.ipfs.io',
        'nftstorage.link',
        'w3s.link',
        'infura',
        'ipfs.infura.io'
      ];
      return hostsToProxy.some((h) => u.hostname.includes(h));
    } catch {
      return false;
    }
  }, []);

  const maybeProxy = useCallback((url: string): string => {
    if (!url) return url;
    if (shouldProxyUrl(url)) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, [shouldProxyUrl]);

  // Generate a prioritized list of candidate URLs for audio playback.
  // This helps when a gateway is unavailable or returns an unsupported response.
  const generateAudioCandidates = useCallback((rawUrl: string): string[] => {
    if (!rawUrl) return [];

    const seen = new Set<string>();
    const ordered: string[] = [];
    const push = (candidate: string | null) => {
      if (!candidate) return;
      if (seen.has(candidate)) return;
      seen.add(candidate);
      ordered.push(candidate);
    };
    const pushWithProxy = (candidate: string | null) => {
      if (!candidate) return;
      // Public IPFS gateways support CORS and byte-range requests, so let the
      // browser stream from them directly. Keep the proxy as a fallback.
      push(candidate);
      const prox = maybeProxy(candidate);
      if (prox !== candidate) {
        push(prox);
      }
    };

    // Preserve the stored gateway first; it is often the pinning provider
    // that is most likely to have the content locally.
    const trimmed = rawUrl.trim();
    const canonical = convertToIpfsIo(trimmed);
    const ipfsHash = extractIpfsHash(trimmed);

    // Start with the preferred URL (proxied first when it is an IPFS gateway).
    pushWithProxy(trimmed);

    if (ipfsHash) {
      for (const gateway of IPFS_GATEWAY_FALLBACKS) {
        pushWithProxy(`${gateway}${ipfsHash}`);
      }
    } else if (canonical !== trimmed) {
      // Non-IPFS URLs might still benefit from canonicalization
      pushWithProxy(canonical);
    }

    return ordered;
  }, [convertToIpfsIo, maybeProxy]);

  // Load metadata for a specific album
  const loadMetadata = useCallback(async (album: Album): Promise<NFTMetadata | null> => {
    const targets: string[] = [];
    const ipfsHash = extractIpfsHash(album.metadataUrl);

    if (ipfsHash) {
      for (const gateway of IPFS_GATEWAY_FALLBACKS) {
        targets.push(`${gateway}${ipfsHash}`);
      }
    }

    // Always try canonical + original metadata URLs as well
    targets.push(convertToIpfsIo(album.metadataUrl));
    targets.push(album.metadataUrl);

    for (const url of Array.from(new Set(targets))) {
      if (!url) continue;
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch metadata from ${url}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const metadata: NFTMetadata = await response.json();
        
        if (metadata.image) {
          const convertedImage = convertToIpfsIo(metadata.image);
          metadata.image = convertedImage || '/SUMAK.png';
        } else {
          metadata.image = '/SUMAK.png';
        }
        
        if (metadata.animation_url) {
          metadata.animation_url = convertToIpfsIo(metadata.animation_url);
        }
        if (metadata.properties?.audio_file) {
          metadata.properties.audio_file = convertToIpfsIo(metadata.properties.audio_file);
        }
        
        return metadata;
      } catch (error) {
        console.warn(`Error fetching metadata from ${url}:`, error);
        continue;
      }
    }

    console.error('Failed to load metadata from available IPFS gateways');
    return null;
  }, [convertToIpfsIo]);

  // Load metadata for all albums
  // Fisher-Yates shuffle
  const shuffleArray = (arr: string[]) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const loadAllMetadata = useCallback(async () => {
    setIsLoading(true);
    try {
      // First, fetch NFT data from Supabase
      const nftAlbums = await fetchNFTMusicData();
      
      // If we have NFT albums with existing metadata, use them directly
      if (nftAlbums.length > 0 && nftAlbums.some(album => album.metadata)) {
        setAlbumsWithMetadata(nftAlbums);
        
          // Set current album to a random album with metadata
          const albumsWithMeta = nftAlbums.filter((album: Album) => album.metadata);
          if (albumsWithMeta.length > 0) {
            const randomIndex = Math.floor(Math.random() * albumsWithMeta.length);
            const randomAlbum = albumsWithMeta[randomIndex];
            if (randomAlbum.metadata) {
              setCurrentAlbumState(randomAlbum);
              setDuration(randomAlbum.metadata.properties.duration);
            }
          }
        return;
      }
      
      // Fallback: load metadata from IPFS if needed
      const albumsWithLoadedMetadata = await Promise.all(
        nftAlbums.map(async (album: Album) => {
          // If album already has metadata from NFT record, use it
          if (album.metadata) {
            return album;
          }
          
          // Otherwise, fetch from IPFS
          const metadata = await loadMetadata(album);
          return { ...album, metadata: metadata || undefined };
        })
      );
      
      setAlbumsWithMetadata(albumsWithLoadedMetadata);
      
        // Set current album to a random album with loaded metadata
        const albumsWithMeta = albumsWithLoadedMetadata.filter((album: Album) => album.metadata);
        if (albumsWithMeta.length > 0) {
          const randomIndex = Math.floor(Math.random() * albumsWithMeta.length);
          const randomAlbum = albumsWithMeta[randomIndex];
          if (randomAlbum.metadata) {
            setCurrentAlbumState(randomAlbum);
            setDuration(randomAlbum.metadata.properties.duration);
          }
        }
    } catch (error) {
      console.error('Error loading music data:', error);
      // On error, try to load fallback albums
      const fallbackAlbums = getFallbackAlbums();
      const albumsWithLoadedMetadata = await Promise.all(
        fallbackAlbums.map(async (album: Album) => {
          const metadata = await loadMetadata(album);
          return { ...album, metadata: metadata || undefined };
        })
      );
      setAlbumsWithMetadata(albumsWithLoadedMetadata);
      
        const albumsWithMeta = albumsWithLoadedMetadata.filter((album: Album) => album.metadata);
        if (albumsWithMeta.length > 0) {
          const randomIndex = Math.floor(Math.random() * albumsWithMeta.length);
          const randomAlbum = albumsWithMeta[randomIndex];
          if (randomAlbum.metadata) {
            setCurrentAlbumState(randomAlbum);
            setDuration(randomAlbum.metadata.properties.duration);
          }
        }
    } finally {
      setIsLoading(false);
    }
  }, [loadMetadata]);
  // Load metadata on component mount
  useEffect(() => {
    loadAllMetadata();
  }, [loadAllMetadata]);

  // Update audio source when current album changes
  useEffect(() => {
    if (audioRef.current && currentAlbum?.metadata) {
  const audioUrl = currentAlbum.metadata.animation_url || currentAlbum.metadata.properties.audio_file;

      if (audioUrl) {
        // Build a list of candidate URLs (direct gateways + proxied forms)
        const candidates = generateAudioCandidates(audioUrl);
        if (candidates.length === 0) return;

        let index = 0;
        const audioEl = audioRef.current;
        const currentVolume = audioEl.volume;

        const applyCandidate = (i: number) => {
          if (!audioRef.current) return;
          const src = candidates[i];
          audioRef.current.src = src;
          audioRef.current.volume = currentVolume;
          // Trigger load for some browsers
          try {
            audioRef.current.load();
          } catch {
            // ignore
          }
        };

        const onError = () => {
          // Move to next candidate
          index += 1;
          if (index < candidates.length) {
            console.warn('Audio source failed, trying next candidate:', candidates[index]);
            applyCandidate(index);
          } else {
            console.error('All audio candidates failed for', audioUrl, candidates);
          }
        };

        const onCanPlay = () => {
          // Ensure volume stays as expected
          if (audioRef.current) audioRef.current.volume = currentVolume;
        };

        // Attach listeners
        audioEl.addEventListener('error', onError);
        audioEl.addEventListener('canplay', onCanPlay);

        // Start with first candidate
        applyCandidate(0);

        // Cleanup listeners when effect re-runs or unmounts
        return () => {
          try {
            audioEl.removeEventListener('error', onError);
            audioEl.removeEventListener('canplay', onCanPlay);
          } catch {
            // ignore
          }
        };
      }
    }
  }, [currentAlbum, convertToIpfsIo, maybeProxy, generateAudioCandidates]); // Only depend on currentAlbum to avoid circular triggers

  // Update volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Helper to call play() safely and suppress AbortError (common when play is
  // interrupted by a pause/load). Returns true if play succeeded.
  const safePlay = useCallback(async (): Promise<boolean> => {
    try {
      if (!audioRef.current) return false;
      await audioRef.current.play();
      return true;
    } catch (error: unknown) {
      // Ignore benign AbortError caused by concurrent pause/load
      const e = error as { name?: string; message?: string } | undefined;
      if (e && (e.name === 'AbortError' || /interrupt/i.test(String(e.message || '')))) {
        // Debug-level log only
        console.debug('Audio play was interrupted (ignored):', e.message || e);
        return false;
      }
      console.error('Error playing audio:', error);
      return false;
    }
  }, []);

  const setCurrentAlbum = useCallback((album: Album) => {
    setCurrentAlbumState(album);
    if (album.metadata) {
      setDuration(album.metadata.properties.duration);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current && currentAlbum?.metadata) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Fire-and-forget safe play; we don't want benign AbortError to spam console
        void safePlay();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, currentAlbum, safePlay]);

  const nextTrack = useCallback((autoPlay = false) => {
    if (!currentAlbum) return;
    
    let nextAlbum: Album;
    
    if (isShuffled) {
      // Use the shuffle queue to pick the next album (no repeats until exhausted)
      // Ensure queue is initialized
      if (!shuffleQueueRef.current || shuffleQueueRef.current.length === 0) {
        const ids = albumsWithMetadata.map(a => a.id).filter(id => id !== currentAlbum.id);
        shuffleQueueRef.current = shuffleArray(ids);
        shuffleHistoryRef.current = [];
      }

      const nextId = shuffleQueueRef.current.shift();
      if (!nextId) {
        // Nothing left in queue
        if (isRepeating) {
          const ids = albumsWithMetadata.map(a => a.id).filter(id => id !== currentAlbum.id);
          shuffleQueueRef.current = shuffleArray(ids);
          const regenerated = shuffleQueueRef.current.shift();
          if (!regenerated) return;
          shuffleHistoryRef.current = [];
          const found = albumsWithMetadata.find(a => a.id === regenerated);
          if (!found) return;
          nextAlbum = found;
        } else {
          // Stop playback if queue exhausted and not repeating
          setIsPlaying(false);
          return;
        }
      } else {
        // Push current to history and find next album
        shuffleHistoryRef.current.push(currentAlbum.id);
        const found = albumsWithMetadata.find(a => a.id === nextId);
        if (!found) return;
        nextAlbum = found;
      }
    } else {
      // Normal sequential playback
      const currentIndex = albumsWithMetadata.findIndex(album => album.id === currentAlbum.id);
      const nextIndex = currentIndex < albumsWithMetadata.length - 1 ? currentIndex + 1 : 0;
      nextAlbum = albumsWithMetadata[nextIndex];
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setCurrentTime(0);
    setCurrentAlbum(nextAlbum);
    
    // Auto-play if requested (from auto-advance) or if currently playing
    if ((autoPlay || isPlaying) && nextAlbum.metadata) {
      setTimeout(() => {
        // Try to play, but ignore AbortError
        void safePlay();
      }, 100);
    }
  }, [albumsWithMetadata, currentAlbum, isPlaying, isShuffled, isRepeating, setCurrentAlbum, safePlay]);

  const previousTrack = useCallback(() => {
    if (!currentAlbum) return;
    
    let previousAlbum: Album;
    
    if (isShuffled) {
      // Use the shuffle history stack to go back
      if (shuffleHistoryRef.current && shuffleHistoryRef.current.length > 0) {
        const prevId = shuffleHistoryRef.current.pop();
        if (prevId) {
          // Put the current album back to the front of the queue so it can be revisited
          shuffleQueueRef.current = [currentAlbum.id, ...(shuffleQueueRef.current || [])];
          const found = albumsWithMetadata.find(a => a.id === prevId);
          if (!found) return;
          previousAlbum = found;
        } else {
          return;
        }
      } else {
        // No history, fallback to sequential previous
        const currentIndex = albumsWithMetadata.findIndex(album => album.id === currentAlbum.id);
        const previousIndex = currentIndex > 0 ? currentIndex - 1 : albumsWithMetadata.length - 1;
        previousAlbum = albumsWithMetadata[previousIndex];
      }
    } else {
      // Normal sequential playback
      const currentIndex = albumsWithMetadata.findIndex(album => album.id === currentAlbum.id);
      const previousIndex = currentIndex > 0 ? currentIndex - 1 : albumsWithMetadata.length - 1;
      previousAlbum = albumsWithMetadata[previousIndex];
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setCurrentTime(0);
    setCurrentAlbum(previousAlbum);
    
    if (previousAlbum.metadata && isPlaying) {
      setTimeout(() => {
        void safePlay();
      }, 100);
    }
  }, [albumsWithMetadata, currentAlbum, isPlaying, isShuffled, setCurrentAlbum, safePlay]);

  const setVolume = useCallback((newVolume: number) => {
    // Ensure volume is between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    
    // Always update the state - remove threshold check that was causing issues
    setVolumeState(clampedVolume);
    
    // Always update the audio element volume
    if (audioRef.current) {
      try {
        audioRef.current.volume = clampedVolume;
      } catch (error) {
        console.error('Error setting audio volume:', error);
      }
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  // Navigation function to go to the current NFT page
  const navigateToCurrentNFT = useCallback(() => {
    if (currentAlbum?.nftUrl) {
      router.push(currentAlbum.nftUrl);
    }
  }, [currentAlbum, router]);

  // Helper function to create NFT URLs
  const createNFTUrl = useCallback((creatorAddress: string, contractName: string, tokenId: number) => {
    return `/${creatorAddress}/${contractName}/${tokenId}`;
  }, []);

  // Function to refresh the music queue from Supabase
  const refreshMusicQueue = useCallback(async () => {
    await loadAllMetadata();
  }, [loadAllMetadata]);

  // Exposed setter that also initializes/clears shuffle queue and history
  const setIsShuffled = useCallback((shuffled: boolean) => {
    setIsShuffledState(shuffled);
    if (shuffled) {
      const ids = albumsWithMetadata.map(a => a.id).filter(id => id !== currentAlbum?.id);
      shuffleQueueRef.current = shuffleArray(ids);
      shuffleHistoryRef.current = [];
    } else {
      shuffleQueueRef.current = [];
      shuffleHistoryRef.current = [];
    }
  }, [albumsWithMetadata, currentAlbum?.id]);

  // Ensure the shuffle queue is initialized when albums or shuffle mode changes
  useEffect(() => {
    if (isShuffled && albumsWithMetadata.length > 0) {
      if (!shuffleQueueRef.current || shuffleQueueRef.current.length === 0) {
        const ids = albumsWithMetadata.map(a => a.id).filter(id => id !== currentAlbum?.id);
        shuffleQueueRef.current = shuffleArray(ids);
        shuffleHistoryRef.current = [];
      }
    }
  }, [albumsWithMetadata, isShuffled, currentAlbum?.id]);

  // Helper function to get current background image
  const getCurrentBackgroundImage = useCallback((): string | null => {
    const imageUrl = currentAlbum?.metadata?.image;
    
    // Return null if no image or if it's the placeholder
    if (!imageUrl || imageUrl === '/SUMAK.png') {
      return null;
    }
    
    return imageUrl;
  }, [currentAlbum?.metadata?.image]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // Don't force volume here - let the volume effect handle it
    };
    const handleCanPlay = () => {
      // Don't force volume here - let the volume effect handle it
    };
    const handleEnded = () => {
      if (isRepeating) {
        // Repeat current song
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.error);
        }
        setCurrentTime(0);
      } else {
        // Auto-advance to next track and continue playing
        nextTrack(true);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [nextTrack, volume, isRepeating, isPlaying]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if not typing in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          // Only handle track navigation if there's a current album
          if (!currentAlbum?.metadata) return;
          event.preventDefault();
          previousTrack();
          break;
        case 'ArrowRight':
          // Only handle track navigation if there's a current album
          if (!currentAlbum?.metadata) return;
          event.preventDefault();
          nextTrack();
          break;
        case ' ': // Spacebar for play/pause
          // Allow play/pause even without current album (it will just do nothing gracefully)
          event.preventDefault();
          togglePlayPause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentAlbum?.metadata, previousTrack, nextTrack, togglePlayPause]);

  const value: MusicPlayerContextType = {
    currentAlbum,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffled,
    isRepeating,
    albumsWithMetadata,
    isLoading,
    audioRef,
    setCurrentAlbum,
    togglePlayPause,
    nextTrack,
    previousTrack,
    setVolume,
    setCurrentTime,
    setIsShuffled,
    setIsRepeating,
    seekTo,
    navigateToCurrentNFT,
    refreshMusicQueue,
    createNFTUrl,
    getCurrentBackgroundImage,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio 
        ref={audioRef} 
        preload="metadata"
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}
