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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Update canvas size and redraw when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = 60;
        }
      }
    };

    // Set initial size
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize audio context and analyser
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current && audioRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        // Set crossOrigin attribute to handle CORS
        if (audioRef.current) {
          audioRef.current.crossOrigin = 'anonymous';
        }
        
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (error) {
        console.warn('Error initializing audio context (likely CORS restriction):', error);
        // Continue without Web Audio API - will use fallback visualization
      }
    }
  }, []);

  // Visualizer animation function
  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Check if we have audio analysis data
    if (analyserRef.current) {
      try {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Check if we're getting actual data (not all zeros due to CORS)
        const hasData = dataArray.some(value => value > 0);
        
        if (hasData) {
          // Real audio data visualization with hundreds of bars
          const numBars = Math.floor(width / 2); // 2 pixels per bar for dense visualization
          const barWidth = width / numBars;

          for (let i = 0; i < numBars; i++) {
            // Map the bar index to the frequency data array
            const dataIndex = Math.floor((i / numBars) * bufferLength);
            const barHeight = (dataArray[dataIndex] / 255) * height * 0.8;
            const x = i * barWidth;
            const y = height - barHeight;

            // Use white with 0.5 opacity
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(x, y, barWidth, barHeight); // No gap to fill full width
          }
        } else {
          // Fallback: animated bars when no audio data (CORS issue)
          drawFallbackVisualization(ctx, width, height);
        }
      } catch {
        // Fallback visualization if audio analysis fails
        drawFallbackVisualization(ctx, width, height);
      }
    } else {
      // Fallback visualization when no analyser available
      drawFallbackVisualization(ctx, width, height);
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawVisualizer);
    }
  }, [isPlaying]);

  // Fallback visualization for when audio analysis is not available
  const drawFallbackVisualization = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const numBars = Math.floor(width / 2); // 2 pixels per bar for dense visualization
    const barWidth = width / numBars;
    const time = Date.now() * 0.003; // Slow animation

    for (let i = 0; i < numBars; i++) {
      // Create animated bars using sine waves
      const frequency1 = Math.sin(time + i * 0.02) * 0.5 + 0.5;
      const frequency2 = Math.sin(time * 1.5 + i * 0.01) * 0.3 + 0.3;
      const frequency3 = Math.sin(time * 0.8 + i * 0.04) * 0.2 + 0.2;
      
      const barHeight = (frequency1 + frequency2 + frequency3) * height * 0.6;
      const x = i * barWidth;
      const y = height - barHeight;

      // Use white with 0.5 opacity
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x, y, barWidth, barHeight); // No gap to fill full width
    }
  };

  // Start visualizer when playing
  useEffect(() => {
    if (isPlaying && audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    if (isPlaying) {
      drawVisualizer();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, drawVisualizer]);

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
        
        // Initialize audio context
        initializeAudioContext();
        
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
  }, [currentAlbum, isPlaying, initializeAudioContext]);

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

  // Handle timeline click for canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    <div className="relative flex flex-col items-center justify-center min-h-screen text-foreground p-8 overflow-hidden">
      {/* Blurred Background Image */}
      {currentAlbum.metadata?.image && (
        <>
          <div 
            className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${currentAlbum.metadata.image})`,
              filter: 'blur(40px) brightness(0.4)',
              transform: 'scale(1.1)',
              zIndex: -20,
            }}
          />
          {/* Dark overlay for better text readability */}
          <div 
            className="fixed inset-0 w-full h-full bg-black/10"
            style={{ zIndex: -10 }}
          />
        </>
      )}
      
      {/* Fallback background when no image */}
      {!currentAlbum.metadata?.image && (
        <div className="fixed inset-0 bg-background" style={{ zIndex: -30 }} />
      )}
      
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-foreground text-lg">Loading music metadata...</p>
          </div>
        </div>
      )}

      {/* Current Album Cover */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className={`relative overflow-hidden transition-all duration-700 w-80 h-80 ${
          isPlaying ? 'rounded-full animate-spin-slow' : 'rounded-lg'
        }`}>
          {currentAlbum.metadata ? (
            <Image
              src={currentAlbum.metadata.image}
              alt={`${currentAlbum.metadata.properties.title} by ${currentAlbum.metadata.properties.artist}`}
              fill
              className="object-contain"
              onError={(e) => {
                // Fallback to a placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMjggODBDMTM5LjA0NiA4MCA0OCA4OC45NTQzIDQ4IDEwMFYxNTZDNDggMTY3LjA0NiA1Ni45NTQzIDE3NiA2OCAxNzZIMTg4QzE5OS4wNDYgMTc2IDIwOCAxNjcuMDQ2IDIwOCAxNTZWMTAwQzIwOCA4OC45NTQzIDE5OS4wNDYgODAgMTg4IDgwSDEyOFoiIGZpbGw9IiM2MzY5N0EiLz4KPGNpcmNsZSBjeD0iMTI4IiBjeT0iMTI4IiByPSIyNCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>

      {/* Current Track Info */}
      <div className="text-center mb-6">
        {currentAlbum.metadata ? (
          <>
            <h2 className="text-2xl font-bold mb-2">
              {currentAlbum.metadata.properties.title || currentAlbum.metadata.name}
            </h2>
            <p className="text-lg text-muted-foreground">
              {currentAlbum.metadata.properties.artist}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {currentAlbum.metadata.properties.genre} • {currentAlbum.metadata.properties.year} • {formatTime(currentAlbum.metadata.properties.duration)}
            </p>
          </>
        ) : (
          <>
            <div className="h-8 w-48 bg-muted rounded mb-2 mx-auto animate-pulse"></div>
            <div className="h-6 w-32 bg-muted rounded mx-auto animate-pulse"></div>
            <div className="h-4 w-40 bg-muted rounded mx-auto mt-2 animate-pulse"></div>
          </>
        )}
      </div>

      {/* Audio Visualizer Timeline */}
      <div className="fixed bottom-3 left-0 right-0 mb-6">
        <div className="flex flex-col items-center mb-2">
          <canvas
            ref={canvasRef}
            height={60}
            className="w-full h-16 bg-transparent"
            onClick={handleCanvasClick}
            style={{ cursor: 'pointer' }}
          />
        </div>
        <div className="fixed bottom-0 justify-center text-sm text-muted-foreground mt-2">
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
              ? 'text-muted-foreground cursor-not-allowed'
              : isShuffled 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shuffle size={20} />
        </button>

        <button
          onClick={previousTrack}
          disabled={!currentAlbum.metadata}
          className={`p-2 transition-colors ${
            !currentAlbum.metadata
              ? 'text-muted-foreground cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <SkipBack size={24} />
        </button>

        <button
          onClick={togglePlayPause}
          disabled={!currentAlbum.metadata}
          className={`p-4 rounded-full transition-transform ${
            !currentAlbum.metadata
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-background text-primary-background hover:scale-105'
          }`}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} />}
        </button>

        <button
          onClick={nextTrack}
          disabled={!currentAlbum.metadata}
          className={`p-2 transition-colors ${
            !currentAlbum.metadata
              ? 'text-muted-foreground cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <SkipForward size={24} />
        </button>

        <button
          onClick={() => setIsRepeating(!isRepeating)}
          disabled={!currentAlbum.metadata}
          className={`p-2 rounded-full transition-colors ${
            !currentAlbum.metadata
              ? 'text-muted-foreground cursor-not-allowed'
              : isRepeating 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Repeat size={20} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <Volume2 size={20} className="text-muted-foreground" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer slider"
        />
        <span className="text-sm text-muted-foreground w-8 text-right">
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
          background: hsl(var(--primary));
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: hsl(var(--primary));
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