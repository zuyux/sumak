'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat } from 'lucide-react';

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

// Sample album data - replace with your actual data source
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

export default function Player() {
  const [currentAlbum, setCurrentAlbum] = useState<Album>(albums[0]); // Start with first album
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(240); // Default 4 minutes
  const [volume, setVolume] = useState(0.7);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [albumsWithMetadata, setAlbumsWithMetadata] = useState<Album[]>(albums);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

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
        setCurrentAlbum(firstAlbumWithMetadata);
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
    if (audioRef.current && currentAlbum.metadata) {
      const audioUrl = currentAlbum.metadata.audio_url || currentAlbum.metadata.properties.audio_file;
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load(); // Reload the audio element with new source
        
        // If should be playing, start playback once loaded
        if (isPlaying) {
          const handleCanPlay = () => {
            audioRef.current?.play().catch((error) => {
              console.error('Error playing audio:', error);
              setIsPlaying(false);
            });
            audioRef.current?.removeEventListener('canplay', handleCanPlay);
          };
          
          audioRef.current.addEventListener('canplay', handleCanPlay);
        }
      }
    }
  }, [currentAlbum, isPlaying]);

  // Format time from seconds to mm:ss
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Handle previous track
  const previousTrack = useCallback(() => {
    const wasPlaying = isPlaying; // Remember if we were playing
    const currentIndex = albumsWithMetadata.findIndex(album => album.id === currentAlbum.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : albumsWithMetadata.length - 1;
    const previousAlbum = albumsWithMetadata[previousIndex];
    
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Update state
    setCurrentTime(0);
    setCurrentAlbum(previousAlbum);
    
    if (previousAlbum.metadata) {
      setDuration(previousAlbum.metadata.properties.duration);
      // Auto-play the new track if we were previously playing
      if (wasPlaying) {
        setIsPlaying(true);
        
        // Play audio after a short delay to ensure source is loaded
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch((error) => {
              console.error('Error playing audio:', error);
              setIsPlaying(false);
            });
          }
        }, 100);
      } else {
        setIsPlaying(false);
      }
    }
  }, [albumsWithMetadata, currentAlbum.id, isPlaying]);

  // Handle next track
  const nextTrack = useCallback(() => {
    const currentIndex = albumsWithMetadata.findIndex(album => album.id === currentAlbum.id);
    const nextIndex = currentIndex < albumsWithMetadata.length - 1 ? currentIndex + 1 : 0;
    const nextAlbum = albumsWithMetadata[nextIndex];
    
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Update state
    setCurrentTime(0);
    setCurrentAlbum(nextAlbum);
    
    if (nextAlbum.metadata) {
      setDuration(nextAlbum.metadata.properties.duration);
      // Auto-play the new track (always play when using next/prev buttons or when song ends)
      setIsPlaying(true);
      
      // Play audio after a short delay to ensure source is loaded
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch((error) => {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
          });
        }
      }, 100);
    }
  }, [albumsWithMetadata, currentAlbum.id]);

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Keyboard shortcuts for track navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!currentAlbum.metadata) return; // Don't handle keys if no metadata loaded
      
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
  }, [currentAlbum.metadata, previousTrack, nextTrack, togglePlayPause]);

  // Simulate audio progress (replace with actual audio events)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p className="text-white text-lg">Loading music metadata...</p>
          </div>
        </div>
      )}

      {/* Album Covers Slider */}
      <div className="relative w-full mb-8 overflow-hidden">
        <div 
          ref={sliderRef}
          className="flex items-center justify-center gap-6 transition-transform duration-500"
        >
          {albumsWithMetadata.map((album) => {
            const isActive = album.id === currentAlbum.id;
            
            return (
              <div
                key={album.id}
                className={`cursor-pointer transition-all duration-500 ${
                  isActive 
                    ? 'z-10' 
                    : 'opacity-70'
                }`}
                onClick={() => {
                  // Stop current audio
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                  
                  // Update state
                  setCurrentTime(0);
                  setCurrentAlbum(album);
                  
                  if (album.metadata) {
                    setDuration(album.metadata.properties.duration);
                    // Auto-play the selected track
                    setIsPlaying(true);
                    
                    // Play audio after a short delay to ensure source is loaded
                    setTimeout(() => {
                      if (audioRef.current) {
                        audioRef.current.play().catch((error) => {
                          console.error('Error playing audio:', error);
                          setIsPlaying(false);
                        });
                      }
                    }, 100);
                  }
                }}
              >
                <div className={`relative overflow-hidden transition-all duration-700 w-80 h-80 ${
                  isActive 
                    ? `${isPlaying ? 'rounded-full' : 'rounded-lg'} ${isPlaying ? 'animate-spin-slow' : ''}` 
                    : 'rounded-lg'
                }`}>
                  {album.metadata ? (
                    <Image
                      src={album.metadata.image}
                      alt={`${album.metadata.properties.title} by ${album.metadata.properties.artist}`}
                      fill
                      className="object-contain"
                      onError={(e) => {
                        // Fallback to a placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMjggODBDMTM5LjA0NiA4MCA0OCA4OC45NTQzIDQ4IDEwMFYxNTZDNDggMTY3LjA0NiA1Ni45NTQzIDE3NiA2OCAxNzZIMTg4QzE5OS4wNDYgMTc2IDIwOCAxNjcuMDQ2IDIwOCAxNTZWMTAwQzIwOCA4OC45NTQzIDE5OS4wNDYgODAgMTg4IDgwSDEyOFoiIGZpbGw9IiM2MzY5N0EiLz4KPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTI4IiByPSIyNCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                  {isActive && album.metadata && (
                    <div className="absolute inset-0 bg-black/10 bg-opacity-20 flex items-center justify-center">
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Track Info */}
      <div className="text-center mb-6">
        {currentAlbum.metadata ? (
          <>
            <h2 className="text-2xl font-bold mb-2">
              {currentAlbum.metadata.properties.title || currentAlbum.metadata.name}
            </h2>
            <p className="text-lg text-gray-300">
              {currentAlbum.metadata.properties.artist}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {currentAlbum.metadata.properties.genre} • {currentAlbum.metadata.properties.year} • {formatTime(currentAlbum.metadata.properties.duration)}
            </p>
          </>
        ) : (
          <>
            <div className="h-8 w-48 bg-gray-700 rounded mb-2 mx-auto animate-pulse"></div>
            <div className="h-6 w-32 bg-gray-700 rounded mx-auto animate-pulse"></div>
            <div className="h-4 w-40 bg-gray-700 rounded mx-auto mt-2 animate-pulse"></div>
          </>
        )}
      </div>

      {/* Timeline */}
      <div className="w-full max-w-2xl mb-6">
        <div 
          className="relative h-2 bg-gray-600 rounded-full cursor-pointer mb-2"
          onClick={handleTimelineClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-100"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex items-center gap-8 mb-6">
        <button
          onClick={() => setIsShuffled(!isShuffled)}
          disabled={!currentAlbum.metadata}
          className={`p-2 rounded-full transition-colors ${
            !currentAlbum.metadata
              ? 'text-gray-600 cursor-not-allowed'
              : isShuffled 
                ? 'text-blue-400' 
                : 'text-gray-400 hover:text-white'
          }`}
        >
          <Shuffle size={20} />
        </button>

        <button
          onClick={previousTrack}
          disabled={!currentAlbum.metadata}
          className={`p-2 transition-colors ${
            !currentAlbum.metadata
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <SkipBack size={24} />
        </button>

        <button
          onClick={togglePlayPause}
          disabled={!currentAlbum.metadata}
          className={`p-4 rounded-full transition-transform ${
            !currentAlbum.metadata
              ? 'bg-gray-600 text-gray-800 cursor-not-allowed'
              : 'bg-white text-black hover:scale-105'
          }`}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} />}
        </button>

        <button
          onClick={nextTrack}
          disabled={!currentAlbum.metadata}
          className={`p-2 transition-colors ${
            !currentAlbum.metadata
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <SkipForward size={24} />
        </button>

        <button
          onClick={() => setIsRepeating(!isRepeating)}
          disabled={!currentAlbum.metadata}
          className={`p-2 rounded-full transition-colors ${
            !currentAlbum.metadata
              ? 'text-gray-600 cursor-not-allowed'
              : isRepeating 
                ? 'text-blue-400' 
                : 'text-gray-400 hover:text-white'
          }`}
        >
          <Repeat size={20} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <Volume2 size={20} className="text-gray-400" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
        />
        <span className="text-sm text-gray-400 w-8 text-right">
          {Math.round(volume * 100)}
        </span>
      </div>

      {/* Audio element with actual audio integration */}
      <audio 
        ref={audioRef} 
        preload="metadata"
        src={currentAlbum.metadata?.audio_url || currentAlbum.metadata?.properties.audio_file}
        onLoadedMetadata={() => {
          if (audioRef.current && currentAlbum.metadata) {
            setDuration(audioRef.current.duration || currentAlbum.metadata.properties.duration);
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          nextTrack();
        }}
      />

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}