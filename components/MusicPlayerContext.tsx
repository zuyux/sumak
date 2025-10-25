'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  audio_url: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    artist: string;
    title: string;
    year: number;
    genre: string;
    duration: number;
    bpm: number;
    key: string;
    format: string;
    bitrate: number;
    sample_rate: number;
    channels: number;
    file_size: string;
    audio_file: string;
  };
  collection: {
    name: string;
    family: string;
  };
}

interface Album {
  id: string;
  metadataUrl: string;
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
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

// Sample album data
const albums: Album[] = [
  {
    id: '1',
    metadataUrl: 'https://ipfs.io/ipfs/bafkreigi6s5uig63h2njdynkgdhzohp4wfmsyqzp5winunvlcdfy3pm74u'
  },
  {
    id: '2', 
    metadataUrl: 'https://ipfs.io/ipfs/bafkreigi6s5uig63h2njdynkgdhzohp4wfmsyqzp5winunvlcdfy3pm74u'
  },
  {
    id: '3',
    metadataUrl: 'https://ipfs.io/ipfs/bafkreigi6s5uig63h2njdynkgdhzohp4wfmsyqzp5winunvlcdfy3pm74u'
  },
  {
    id: '4',
    metadataUrl: 'https://ipfs.io/ipfs/bafkreigi6s5uig63h2njdynkgdhzohp4wfmsyqzp5winunvlcdfy3pm74u'
  }
];

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
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

  // Load metadata for a specific album
  const loadMetadata = async (album: Album): Promise<NFTMetadata | null> => {
    try {
      const response = await fetch(album.metadataUrl);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      const metadata: NFTMetadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Error loading metadata:', error);
      return null;
    }
  };

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
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load metadata on component mount
  useEffect(() => {
    loadAllMetadata();
  }, [loadAllMetadata]);

  // Update audio source when current album changes
  useEffect(() => {
    if (audioRef.current && currentAlbum?.metadata) {
      const audioUrl = currentAlbum.metadata.audio_url || currentAlbum.metadata.properties.audio_file;
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        // Set volume after loading
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.volume = volume;
          }
        }, 100);
      }
    }
  }, [currentAlbum, volume]);

  // Update volume when volume state changes
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.volume - volume) > 0.01) {
      audioRef.current.volume = volume;
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

  const nextTrack = useCallback(() => {
    if (!currentAlbum) return;
    
    const currentIndex = albumsWithMetadata.findIndex(album => album.id === currentAlbum.id);
    const nextIndex = currentIndex < albumsWithMetadata.length - 1 ? currentIndex + 1 : 0;
    const nextAlbum = albumsWithMetadata[nextIndex];
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setCurrentTime(0);
    setCurrentAlbum(nextAlbum);
    
    if (nextAlbum.metadata && isPlaying) {
      setTimeout(() => {
        audioRef.current?.play().catch(console.error);
      }, 100);
    }
  }, [albumsWithMetadata, currentAlbum, isPlaying, setCurrentAlbum]);

  const previousTrack = useCallback(() => {
    if (!currentAlbum) return;
    
    const currentIndex = albumsWithMetadata.findIndex(album => album.id === currentAlbum.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : albumsWithMetadata.length - 1;
    const previousAlbum = albumsWithMetadata[previousIndex];
    
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
  }, [albumsWithMetadata, currentAlbum, isPlaying, setCurrentAlbum]);

  const setVolume = useCallback((newVolume: number) => {
    // Ensure volume is between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    
    // Only update if the volume has actually changed
    setVolumeState(currentVolume => {
      if (Math.abs(currentVolume - clampedVolume) > 0.01) {
        return clampedVolume;
      }
      return currentVolume;
    });
    
    if (audioRef.current && Math.abs(audioRef.current.volume - clampedVolume) > 0.01) {
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

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // Only set volume if it differs significantly to avoid conflicts
      if (Math.abs(audio.volume - volume) > 0.01) {
        audio.volume = volume;
      }
    };
    const handleCanPlay = () => {
      // Only set volume if it differs significantly to avoid conflicts
      if (Math.abs(audio.volume - volume) > 0.01) {
        audio.volume = volume;
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      nextTrack();
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
  }, [nextTrack, volume]);

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

      if (!currentAlbum?.metadata) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          previousTrack();
          break;
        case 'ArrowRight':
          event.preventDefault();
          nextTrack();
          break;
        case ' ': // Spacebar for play/pause
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