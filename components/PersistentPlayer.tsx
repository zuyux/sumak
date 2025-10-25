'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, ChevronUp, ChevronDown } from 'lucide-react';
import { useMusicPlayer } from './MusicPlayerContext';

export default function PersistentPlayer() {
  const {
    currentAlbum,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffled,
    isRepeating,
    albumsWithMetadata,
    togglePlayPause,
    nextTrack,
    previousTrack,
    setVolume,
    seekTo,
    setIsShuffled,
    setIsRepeating,
    setCurrentAlbum,
  } = useMusicPlayer();

  const [isExpanded, setIsExpanded] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Helper functions to extract metadata from new structure
  const getAttributeValue = (metadata: unknown, traitType: string): string => {
    const metadataObj = metadata as { attributes?: Array<{ trait_type: string; value: string | number }> };
    const attribute = metadataObj?.attributes?.find((attr) => attr.trait_type === traitType);
    return attribute?.value?.toString() || '';
  };

  const getTitle = (metadata: unknown): string => {
    const metadataObj = metadata as { properties?: { title?: string }; name?: string };
    return metadataObj?.properties?.title || metadataObj?.name || 'Unknown Title';
  };

  const getArtist = (metadata: unknown): string => {
    return getAttributeValue(metadata, 'Artist') || 'Unknown Artist';
  };

  const getGenre = (metadata: unknown): string => {
    return getAttributeValue(metadata, 'genre') || 'Unknown Genre';
  };

  const getYear = (metadata: unknown): string => {
    return getAttributeValue(metadata, 'year') || '';
  };

  // Sync local volume with global volume
  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  // Format time from seconds to mm:ss
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Visualizer animation function
  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Fallback visualization
    const numBars = Math.floor(width / 3); // 3 pixels per bar for dense visualization
    const barWidth = width / numBars;
    const time = Date.now() * 0.003;

    for (let i = 0; i < numBars; i++) {
      const frequency1 = Math.sin(time + i * 0.02) * 0.5 + 0.5;
      const frequency2 = Math.sin(time * 1.5 + i * 0.01) * 0.3 + 0.3;
      const frequency3 = Math.sin(time * 0.8 + i * 0.04) * 0.2 + 0.2;
      
      const barHeight = (frequency1 + frequency2 + frequency3) * height * 0.6;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawVisualizer);
    }
  }, [isPlaying]);

  // Start visualizer when playing
  useEffect(() => {
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

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    seekTo(newTime);
  };
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    console.log('Volume change triggered:', { newVolume, currentVolume: volume, localVolume });
    
    // Ensure the volume is valid
    if (isNaN(newVolume) || newVolume < 0 || newVolume > 1) {
      console.warn('Invalid volume value:', newVolume);
      return;
    }
    
    setLocalVolume(newVolume); // Immediate UI feedback
    setVolume(newVolume); // Update global state
  };

  // Don't render if no current album
  if (!currentAlbum?.metadata) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
      {/* Collapsed view - Grid layout similar to Spotify */}
      {!isExpanded && (
        <div className="grid grid-cols-3 items-center p-4 h-20 gap-4">
          {/* Left section - Song info (1/3 width) */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-14 h-14 relative rounded overflow-hidden flex-shrink-0">
              <Image
                src={currentAlbum.metadata.image}
                alt={getTitle(currentAlbum.metadata)}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {getTitle(currentAlbum.metadata)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getArtist(currentAlbum.metadata)}
              </p>
            </div>
          </div>

          {/* Center section - Controls (1/3 width) */}
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-4">
              <button
                onClick={previousTrack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipBack size={16} />
              </button>
              
              <button
                onClick={togglePlayPause}
                className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              
              <button
                onClick={nextTrack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward size={16} />
              </button>
            </div>
            {/* Progress bar */}
            <div className="w-full flex items-center space-x-2">
              <span className="text-xs text-muted-foreground min-w-[30px] text-right">
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 h-1 bg-muted rounded-full cursor-pointer"
                onClick={handleTimelineClick}
              >
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[30px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right section - Volume and expand (1/3 width) */}
          <div className="flex items-center justify-end space-x-3">
            <div className="flex items-center space-x-2">
              <Volume2 size={16} className="text-muted-foreground pointer-events-none" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localVolume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-white rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Header with collapse button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Now Playing</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Song info */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={currentAlbum.metadata.image}
                alt={getTitle(currentAlbum.metadata)}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-lg font-medium text-foreground truncate">
                {getTitle(currentAlbum.metadata)}
              </h4>
              <p className="text-muted-foreground truncate">
                {getArtist(currentAlbum.metadata)}
              </p>
              <p className="text-sm text-muted-foreground">
                {getGenre(currentAlbum.metadata)}{getYear(currentAlbum.metadata) && ` • ${getYear(currentAlbum.metadata)}`}
              </p>
            </div>
          </div>

          {/* Controls grid */}
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Left - Additional controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsShuffled(!isShuffled)}
                className={`p-2 rounded-full transition-colors ${
                  isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shuffle size={16} />
              </button>
              <button
                onClick={() => setIsRepeating(!isRepeating)}
                className={`p-2 rounded-full transition-colors ${
                  isRepeating ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Repeat size={16} />
              </button>
            </div>

            {/* Center - Main controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={previousTrack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipBack size={24} />
              </button>
              
              <button
                onClick={togglePlayPause}
                className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              
              <button
                onClick={nextTrack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward size={24} />
              </button>
            </div>

            {/* Right - Volume */}
            <div className="flex items-center justify-end space-x-2">
              <Volume2 size={16} className="text-muted-foreground pointer-events-none" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localVolume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-muted rounded-lg appearance-none cursor-pointer slider"
                style={{ '--volume-percentage': localVolume * 100 } as React.CSSProperties}
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {Math.round(localVolume * 100)}
              </span>
            </div>
          </div>

          {/* Playlist section */}
          {albumsWithMetadata.length > 0 && (
            <div className="border-t border-border pt-6">
              <h4 className="text-lg font-semibold mb-4">Queue</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {albumsWithMetadata.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => setCurrentAlbum(album)}
                    className={`w-full p-3 rounded-lg transition-colors text-left hover:bg-muted/50 ${
                      currentAlbum?.id === album.id
                        ? 'bg-primary/20 border border-primary/40'
                        : 'bg-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {album.metadata && (
                        <div className="w-10 h-10 relative rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={album.metadata.image}
                            alt={getTitle(album.metadata)}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getTitle(album.metadata) || 'Loading...'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getArtist(album.metadata)}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {album.metadata && formatTime(album.metadata.properties.duration)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .slider {
          background: linear-gradient(to right, white 0%, white calc(var(--volume-percentage) * 1%), hsl(var(--muted)) calc(var(--volume-percentage) * 1%), hsl(var(--muted)) 100%);
          outline: none;
          position: relative;
          height: 4px;
          border-radius: 2px;
        }
        
        .slider::-webkit-slider-track {
          background: transparent;
          height: 4px;
          border-radius: 2px;
        }
        
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          border: 1px solid hsl(var(--primary));
          transition: all 0.2s ease;
          position: relative;
          z-index: 2;
        }
        
        .slider:hover::-webkit-slider-thumb {
          transform: scale(1.2);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }
        
        .slider::-moz-range-track {
          background: transparent;
          height: 4px;
          border-radius: 2px;
          border: none;
        }
        
        .slider::-moz-range-thumb {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 1px solid hsl(var(--primary));
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }

        .slider:hover::-moz-range-thumb {
          transform: scale(1.2);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }

        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .slider:focus::-moz-range-thumb {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 1px 3px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}