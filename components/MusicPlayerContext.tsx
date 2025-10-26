'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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

interface Album {
  id: string;
  metadataUrl: string;
  nftUrl?: string;
  metadata?: NFTMetadata;
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
  
  // Helper functions
  createNFTUrl: (contractAddress: string, contractName: string, tokenId: number) => string;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

// Sample album data
const albums: Album[] = [
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
  const [currentAlbum, setCurrentAlbumState] = useState<Album | null>(albums[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(240);
  const [volume, setVolumeState] = useState(0.7);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [albumsWithMetadata, setAlbumsWithMetadata] = useState<Album[]>(albums);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Utility function to convert any IPFS gateway URL to ipfs.io
  const convertToIpfsIo = useCallback((url: string): string => {
    if (!url) return url;
    
    // Match IPFS CID patterns in URLs
    const ipfsPatterns = [
      /\/ipfs\/([a-zA-Z0-9]+)/,  // Standard /ipfs/CID pattern
      /^ipfs:\/\/([a-zA-Z0-9]+)/, // ipfs:// protocol
      /\/([a-zA-Z0-9]{46,})$/     // Just the CID at the end
    ];
    
    for (const pattern of ipfsPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const cid = match[1];
        console.log(`Converting IPFS URL: ${url} -> https://ipfs.io/ipfs/${cid}`);
        return `https://ipfs.io/ipfs/${cid}`;
      }
    }
    
    // If no IPFS pattern found, return original URL
    return url;
  }, []);

  // Load metadata for a specific album
  const loadMetadata = useCallback(async (album: Album): Promise<NFTMetadata | null> => {
    const ipfsGateways = [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];

    // Extract IPFS hash from the URL
    const getIpfsHash = (url: string): string => {
      const match = url.match(/\/ipfs\/(.+)$/);
      return match ? match[1] : url;
    };

    const ipfsHash = getIpfsHash(album.metadataUrl);

    for (const gateway of ipfsGateways) {
      try {
        const url = `${gateway}${ipfsHash}`;
        console.log(`Trying to fetch metadata from: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch from ${gateway}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const metadata: NFTMetadata = await response.json();
        console.log(`Successfully loaded metadata from: ${gateway}`);
        
        // Convert any IPFS gateway URLs in the metadata to ipfs.io
        if (metadata.image) {
          metadata.image = convertToIpfsIo(metadata.image);
        }
        if (metadata.animation_url) {
          metadata.animation_url = convertToIpfsIo(metadata.animation_url);
        }
        if (metadata.properties?.audio_file) {
          metadata.properties.audio_file = convertToIpfsIo(metadata.properties.audio_file);
        }
        
        return metadata;
      } catch (error) {
        console.warn(`Error fetching from ${gateway}:`, error);
        continue;
      }
    }

    console.error('Failed to load metadata from all gateways');
    return null;
  }, [convertToIpfsIo]);

  // Load metadata for all albums
  const loadAllMetadata = useCallback(async () => {
    setIsLoading(true);
    try {
      const albumsWithLoadedMetadata = await Promise.all(
        albums.map(async (album) => {
          const metadata = await loadMetadata(album);
          return { ...album, metadata: metadata || undefined };
        })
      );
      setAlbumsWithMetadata(albumsWithLoadedMetadata);
      
      // Set current album to first album with loaded metadata
      const firstAlbumWithMetadata = albumsWithLoadedMetadata.find(album => album.metadata);
      if (firstAlbumWithMetadata?.metadata) {
        setCurrentAlbumState(firstAlbumWithMetadata);
        setDuration(firstAlbumWithMetadata.metadata.properties.duration);
        
        // Note: Removed image preloading to prevent console warnings
        // The images will load on-demand when the player is displayed
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
      let audioUrl = currentAlbum.metadata.animation_url || currentAlbum.metadata.properties.audio_file;
      
      if (audioUrl) {
        // Convert any IPFS gateway URL to ipfs.io for better reliability
        audioUrl = convertToIpfsIo(audioUrl);
        
        // Get current volume at the time of loading
        const currentVolume = audioRef.current.volume;
        audioRef.current.src = audioUrl;
        audioRef.current.volume = currentVolume; // Set volume immediately
        audioRef.current.load();
        
        // Ensure volume is maintained after load
        const handleLoadStart = () => {
          if (audioRef.current) {
            audioRef.current.volume = currentVolume;
          }
        };
        
        audioRef.current.addEventListener('loadstart', handleLoadStart, { once: true });
      }
    }
  }, [currentAlbum, convertToIpfsIo]); // Only depend on currentAlbum to avoid circular triggers

  // Update volume when volume state changes
  useEffect(() => {
    console.log('Volume effect triggered:', { volume, audioElement: !!audioRef.current });
    if (audioRef.current) {
      console.log('Setting audio volume in effect to:', volume);
      audioRef.current.volume = volume;
      console.log('Audio volume after effect:', audioRef.current.volume);
    }
  }, [volume]);

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
        audioRef.current.play().catch((error) => {
          console.error('Error playing audio:', error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, currentAlbum]);

  const nextTrack = useCallback((autoPlay = false) => {
    if (!currentAlbum) return;
    
    let nextAlbum: Album;
    
    if (isShuffled) {
      // Get a random album that's not the current one
      const availableAlbums = albumsWithMetadata.filter(album => album.id !== currentAlbum.id);
      if (availableAlbums.length === 0) return;
      
      const randomIndex = Math.floor(Math.random() * availableAlbums.length);
      nextAlbum = availableAlbums[randomIndex];
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
        audioRef.current?.play().catch(console.error);
      }, 100);
    }
  }, [albumsWithMetadata, currentAlbum, isPlaying, isShuffled, setCurrentAlbum]);

  const previousTrack = useCallback(() => {
    if (!currentAlbum) return;
    
    let previousAlbum: Album;
    
    if (isShuffled) {
      // Get a random album that's not the current one
      const availableAlbums = albumsWithMetadata.filter(album => album.id !== currentAlbum.id);
      if (availableAlbums.length === 0) return;
      
      const randomIndex = Math.floor(Math.random() * availableAlbums.length);
      previousAlbum = availableAlbums[randomIndex];
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
        audioRef.current?.play().catch(console.error);
      }, 100);
    }
  }, [albumsWithMetadata, currentAlbum, isPlaying, isShuffled, setCurrentAlbum]);

  const setVolume = useCallback((newVolume: number) => {
    console.log('setVolume called:', { newVolume, currentVolume: volume });
    
    // Ensure volume is between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    
    // Always update the state - remove threshold check that was causing issues
    setVolumeState(clampedVolume);
    
    // Always update the audio element volume
    if (audioRef.current) {
      try {
        console.log('Setting audio element volume to:', clampedVolume);
        audioRef.current.volume = clampedVolume;
        console.log('Audio element volume after setting:', audioRef.current.volume);
      } catch (error) {
        console.error('Error setting audio volume:', error);
      }
    }
  }, [volume]);

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
  }, [currentAlbum?.nftUrl, router]);

  // Helper function to create NFT URLs
  const createNFTUrl = useCallback((contractAddress: string, contractName: string, tokenId: number) => {
    return `/${contractAddress}/${contractName}/${tokenId}`;
  }, []);

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
    createNFTUrl,
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