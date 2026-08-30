
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useMusicPlayer } from './MusicPlayerContext';
import { useIsMobile } from '../hooks/use-mobile';

export default function PersistentPlayer() {
  const router = useRouter();
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
    navigateToCurrentNFT,
  } = useMusicPlayer();

  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [coverImageLoading, setCoverImageLoading] = useState(true);
  const [modalImageLoading, setModalImageLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

    const isMobile = useIsMobile();

  // Reset image error when album changes
  useEffect(() => {
    setImageError(false);
    setCoverImageLoading(true);
    setModalImageLoading(false);
  }, [currentAlbum?.metadata?.image]);

  const handleImageError = () => {
    setImageError(true);
    setCoverImageLoading(false);
    setModalImageLoading(false);
  };

  const handleCoverImageLoad = () => {
    setImageError(false);
    setCoverImageLoading(false);
  };

  const handleModalImageLoad = () => {
    setImageError(false);
    setModalImageLoading(false);
  };
  
  const openImageModal = useCallback((e?: React.SyntheticEvent) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    setModalImageLoading(true);
    setShowImageModal(true);
  }, []);

  const closeImageModal = useCallback(() => {
    setShowImageModal(false);
    setModalImageLoading(false);
  }, []);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  // Helper functions to extract metadata from new structure
  const getAttributeValue = useCallback((metadata: unknown, traitType: string): string => {
    const metadataObj = metadata as { attributes?: Array<{ trait_type: string; value: string | number }> };
    const attribute = metadataObj?.attributes?.find((attr) => attr.trait_type === traitType);
    return attribute?.value?.toString() || '';
  }, []);

  const getTitle = useCallback((metadata: unknown): string => {
    const metadataObj = metadata as { properties?: { title?: string }; name?: string };
    return metadataObj?.properties?.title || metadataObj?.name || 'Unknown Title';
  }, []);

  const getArtist = useCallback((metadata: unknown): string => {
    return getAttributeValue(metadata, 'Artist') || 'Unknown Artist';
  }, [getAttributeValue]);

  const getGenre = useCallback((metadata: unknown): string => {
    return getAttributeValue(metadata, 'genre') || 'Unknown Genre';
  }, [getAttributeValue]);

  const getYear = useCallback((metadata: unknown): string => {
    return getAttributeValue(metadata, 'year') || '';
  }, [getAttributeValue]);

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

  // Enhanced track navigation with background update feedback
  const handleNextTrack = useCallback(() => {
    setIsTransitioning(true);
    nextTrack();
    // Reset transition state after a short delay
    setTimeout(() => setIsTransitioning(false), 300);
  }, [nextTrack]);

  const handlePreviousTrack = useCallback(() => {
    setIsTransitioning(true);
    previousTrack();
    // Reset transition state after a short delay
    setTimeout(() => setIsTransitioning(false), 300);
  }, [previousTrack]);

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

  const timelineDuration = Number.isFinite(duration) && duration > 0
    ? duration
    : (currentAlbum?.metadata?.properties?.duration ?? 0);
  const progressPercentage = timelineDuration > 0
    ? Math.min(Math.max((currentTime / timelineDuration) * 100, 0), 100)
    : 0;
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    // Ensure the volume is valid
    if (isNaN(newVolume) || newVolume < 0 || newVolume > 1) {
      console.warn('Invalid volume value:', newVolume);
      return;
    }
    
    setLocalVolume(newVolume); // Immediate UI feedback
    setVolume(newVolume); // Update global state
  };

  // Measure persistent player height and expose it to the rest of the app
  useEffect(() => {
    // Prefer measuring the inner content's natural size (scrollHeight) so
    // the outer container can be height:0 initially and animate to the
    // measured value on hover. Fall back to playerRef if innerRef missing.
    const target = innerRef.current ?? playerRef.current;
    if (!target) return;

    const publishHeight = (height: number) => {
      try {
        document.documentElement.style.setProperty('--persistent-player-height', `${height}px`);
      } catch {
        // ignore style mutation errors on some SSR contexts
      }
      // Also publish the visible timeline height so the outer container
      // can remain visible (showing the timeline) while the inner
      // controls animate in on hover.
      try {
        const timelineEl = playerRef.current?.querySelector('.player-timeline-wrapper') as HTMLElement | null;
        // Prefer scrollHeight/content size, fall back to bounding rect/offsetHeight, finally to 6px
        const timelineH = (timelineEl && (timelineEl.scrollHeight || timelineEl.getBoundingClientRect().height || timelineEl.offsetHeight)) || 6;
        document.documentElement.style.setProperty('--persistent-player-timeline-height', `${timelineH}px`);
      } catch {
        // ignore
      }
      try {
        window.dispatchEvent(new CustomEvent('persistent-player-height', { detail: { height } }));
      } catch {
        // ignore gracefully
      }
    };

    // Initial publish using scrollHeight for natural content height
  const initialHeight = (innerRef.current && innerRef.current.scrollHeight) || target.getBoundingClientRect().height || 0;
    publishHeight(initialHeight);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // entry.contentRect.height reflects layout height; for content-driven
        // size we prefer scrollHeight of the element when available.
        const el = entry.target as HTMLElement;
        const h = el.scrollHeight || entry.contentRect.height || 0;
        publishHeight(h);
      }
    });

    ro.observe(target as Element);

    return () => {
      try {
        ro.disconnect();
      } catch {
        // ignore
      }
    };
  }, [isExpanded]);

  // Don't render if no current album
  if (!currentAlbum?.metadata) {
    return null;
  }

  // Floating centered-left cover while playing
  const floatingCover = isPlaying && currentAlbum?.metadata?.image && !showImageModal ? (
    <div className="hidden opacity-0 md:flex fixed left-4 top-1/2 transform -translate-y-1/2 z-50 items-center floating-cover">
      <div
        className="cover-hover-wrapper w-40 h-40 rounded-lg overflow-hidden shadow-lg"
        tabIndex={0}
        role="button"
        aria-label={`Open ${getTitle(currentAlbum.metadata)} cover`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openImageModal(e);
          }
        }}
      >
        <div className="cover-scale w-full h-full relative">
          <Image
            src={imageError ? '/SUMAK.png' : currentAlbum.metadata.image}
            alt={getTitle(currentAlbum.metadata)}
            width={210}
            height={210}
            className="cursor-pointer w-full h-full object-cover"
            onClick={openImageModal}
            onError={handleImageError}
            onLoad={handleCoverImageLoad}
            style={{ opacity: coverImageLoading ? 0 : 1, transition: 'opacity 240ms ease' }}
          />
        </div>
      </div>

      {/* Info panel shown to the right when hovering/focusing the cover */}
      <div className="cover-hover-info ml-3 pointer-events-none opacity-0 transform translate-x-0 transition-all duration-220">
        <div
          className="cover-hover-info-inner bg-black/60 backdrop-blur rounded-md px-3 py-2 cursor-pointer"
          onClick={() => navigateToCurrentNFT()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigateToCurrentNFT();
            }
          }}
        >
          <div className="text-sm font-semibold text-white truncate" title={getTitle(currentAlbum.metadata)}>
            {getTitle(currentAlbum.metadata)}
          </div>
          <div className="text-xs text-white/80 truncate" title={getArtist(currentAlbum.metadata)}>
            {getArtist(currentAlbum.metadata)}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>

        {floatingCover}

        {/* Fullscreen image modal */}
        {showImageModal && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
            onClick={closeImageModal}
          >
            <div className="relative w-screen h-screen">
              <div className="relative flex items-center justify-center w-full h-full">
                <Image
                  src={imageError ? '/SUMAK.png' : currentAlbum.metadata.image}
                  alt={getTitle(currentAlbum.metadata)}
                  width={1200}
                  height={1200}
                  priority
                  className="object-contain"
                  style={{
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '100%',
                    maxHeight: '58vh',
                    display: 'block',
                    marginTop: '21%',
                    marginBottom: '21%'
                  }}
                  onLoad={handleModalImageLoad}
                  onError={handleImageError}
                />
                {modalImageLoading && (
                  <div className="absolute inset-0 z-70 flex items-center justify-center pointer-events-none">
                    <div className="cover-spinner" role="status" aria-live="polite">
                      <span className="sr-only">Loading cover</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); closeImageModal(); }}
                className="cursor-pointer absolute top-4 right-4 bg-black bg-opacity-60 text-white p-2 rounded z-80"
                aria-label="Close image"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
  <div 
    ref={playerRef} 
    className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border transition-all duration-300 persistent-player`}
    style={{
      backgroundColor: 'rgba(10, 10, 10, 0.1)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)'
    }}
  >
    {/* Top timeline spanning the full viewport width */}
    <div
      className="player-timeline-wrapper h-1 bg-background/10 w-full"
      onClick={handleTimelineClick}
      role="slider"
      aria-label="Seek timeline"
      aria-valuemin={0}
      aria-valuemax={duration || 0}
      aria-valuenow={currentTime}
    >
      <div
        className="player-timeline-fill"
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
    <div ref={innerRef} className="persistent-player-inner">
        {/* Collapsed view - Grid layout similar to Spotify */}
        {!isExpanded && (
          <div className="grid grid-cols-[1fr_2fr_1fr] items-center px-0 py-0 h-20 gap-2 pp-controls">
          {/* Left section - Song info (1/3 width) */}
          <div 
            className={`flex items-center space-x-3 min-w-0 cursor-pointer hover:bg-muted/20 p-0 rounded-lg transition-all duration-300 ${
              isTransitioning ? 'scale-105 bg-primary/10' : ''
            }`}
            onClick={navigateToCurrentNFT}
            title="View NFT details"
          >
            {!isMobile && (
              <div className={`cover-hover-wrapper relative flex-shrink-0 transition-all duration-300 ${isTransitioning ? 'ring-2 ring-primary/50' : ''}`}>
                <div className={`cover-scale w-20 h-20 relative rounded overflow-hidden`}>
                  {coverImageLoading && (
                    <Skeleton className="absolute inset-0 w-full h-full z-10" />
                  )}
                  {currentAlbum?.metadata?.image ? (
                    <Image
                      src={imageError ? '/SUMAK.png' : currentAlbum.metadata.image}
                      alt={getTitle(currentAlbum.metadata)}
                      fill
                      sizes="80px"
                      priority
                      className="object-cover"
                      onError={handleImageError}
                      onLoad={handleCoverImageLoad}
                      style={{ opacity: coverImageLoading ? 0 : 1, transition: 'opacity 220ms ease' }}
                    />
                  ) : (
                    <Image
                      src="/SUMAK.png"
                      alt="SUMAK Default"
                      fill
                      sizes="80px"
                      priority
                      className="object-cover"
                      onLoad={handleCoverImageLoad}
                      style={{ opacity: coverImageLoading ? 0 : 1, transition: 'opacity 220ms ease' }}
                    />
                  )}
                  {/* Make the cover itself clickable to open the fullscreen modal */}
                  <div
                    onClick={openImageModal}
                    role="button"
                    aria-label="Open cover fullscreen"
                    className="absolute inset-0 z-30"
                  />
                </div>
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="hidden md:block">
                <p
                  className="text-sm font-medium text-foreground truncate w-full block"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}
                  title={getTitle(currentAlbum.metadata)}
                >
                  {getTitle(currentAlbum.metadata)}
                </p>
                <p
                  className="text-xs text-muted-foreground truncate w-full block"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}
                  title={getArtist(currentAlbum.metadata)}
                >
                  {getArtist(currentAlbum.metadata)}
                </p>
              </div>
              {isTransitioning && (
                <p className="text-xs text-primary animate-pulse">...</p>
              )}
            </div>
          </div>

          {/* Center section - Controls (1/3 width) */}
            <div className="flex flex-col items-center space-y-2 pp-controls">
            <div className="flex items-center justify-center w-full">
              <button
                onClick={handlePreviousTrack}
                className={`text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer mr-4 ${
                  isTransitioning ? 'scale-110 text-primary' : ''
                }`}
                title="Previous track (will update background)"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={togglePlayPause}
                className="w-8 h-8 rounded-full bg-black/90 backdrop-blur text-white border border-white/10 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer mx-2"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={handleNextTrack}
                className={`text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer ml-4 ${
                  isTransitioning ? 'scale-110 text-primary' : ''
                }`}
                title="Next track (will update background)"
              >
                <SkipForward size={16} />
              </button>
            </div>
            {/* timeline moved to top of player */}
          </div>

          {/* Right section - Volume and expand (1/3 width) */}
          <div className="flex items-center justify-end space-x-3">
            {!isMobile && (
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
                  style={{ '--volume-percentage': localVolume * 100 } as React.CSSProperties}
                />
              </div>
            )}
            <button
              onClick={() => setIsExpanded(true)}
              className="text-muted-foreground hover:bg-[#111] hover:text-foreground transition-colors rounded-md cursor-pointer px-4 py-6 mr-2"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Expanded view */}
          {isExpanded && (
        <div className="p-2 space-y-2 pp-controls">
          {/* Header with collapse button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Now Playing</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:bg-[#111] hover:text-foreground transition-colors rounded-md cursor-pointer px-4 py-6"
            >
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Song info */}
          <div 
            className="flex items-center space-x-4 cursor-pointer hover:bg-muted/20 p-3 rounded-lg transition-colors"
            onClick={navigateToCurrentNFT}
            title="View NFT details"
          >
            {!isMobile && (
              <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0">
                {coverImageLoading && (
                  <Skeleton className="absolute inset-0 w-full h-full z-10" />
                )}
                <Image
                  src={currentAlbum.metadata.image}
                  alt={getTitle(currentAlbum.metadata)}
                  fill
                  className="object-cover"
                  sizes="64px"
                  priority
                  style={{ opacity: coverImageLoading ? 0 : 1, transition: 'opacity 220ms ease' }}
                  onError={(e) => {
                    // Silently handle image loading errors (often due to IPFS gateway timeouts)
                    const img = e.target as HTMLImageElement;
                    if (img.src.includes('gateway.pinata.cloud')) {
                      // Try fallback to ipfs.io gateway
                      const ipfsHash = img.src.split('/ipfs/')[1];
                      if (ipfsHash) {
                        img.src = `https://ipfs.io/ipfs/${ipfsHash}`;
                      }
                    }
                    setCoverImageLoading(false);
                  }}
                  onLoad={() => {
                    setCoverImageLoading(false);
                  }}
                />
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <>
                <h4
                  className="text-lg font-medium text-foreground truncate w-full block"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}
                  title={getTitle(currentAlbum.metadata)}
                >
                  {getTitle(currentAlbum.metadata)}
                </h4>
                <p
                  className="text-muted-foreground truncate w-full block"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}
                  title={getArtist(currentAlbum.metadata)}
                >
                  {getArtist(currentAlbum.metadata)}
                </p>
              </>
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
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shuffle size={16} />
              </button>
              <button
                onClick={() => setIsRepeating(!isRepeating)}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isRepeating ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Repeat size={16} />
              </button>
            </div>

            {/* Center - Main controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handlePreviousTrack}
                className={`text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer ${
                  isTransitioning ? 'scale-110 text-primary' : ''
                }`}
                title="Previous track (will update background)"
              >
                <SkipBack size={24} />
              </button>
              <button
                onClick={togglePlayPause}
                className="w-12 h-12 rounded-full bg-black/60 backdrop-blur text-white border border-white/10 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button
                onClick={handleNextTrack}
                className={`text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer ${
                  isTransitioning ? 'scale-110 text-primary' : ''
                }`}
                title="Next track (will update background)"
              >
                <SkipForward size={24} />
              </button>
            </div>

            {/* Right - Volume */}
            {!isMobile && (
              <div className="flex items-center justify-end space-x-2">
                <Volume2 size={16} className="text-muted-foreground pointer-events-none" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={localVolume}
                  onChange={handleVolumeChange}
                  className="w-20 h-2 bg-white rounded-lg appearance-none cursor-pointer slider"
                  style={{ '--volume-percentage': localVolume * 100 } as React.CSSProperties}
                />
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round(localVolume * 100)}
                </span>
              </div>
            )}
          </div>

          {/* Playlist section */}
          {albumsWithMetadata.length > 0 && (
            <div className="border-t border-border pt-6">
              <h4 className="text-lg font-semibold mb-4">Queue</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {albumsWithMetadata.map((album) => (
                  <div key={album.id} className="flex">
                    <button
                      onClick={() => setCurrentAlbum(album)}
                      className={`flex-1 p-3 rounded-l-lg transition-colors text-left hover:bg-muted/50 cursor-pointer ${
                        currentAlbum?.id === album.id
                          ? 'bg-background/20 border border-primary/40 border-r-0'
                          : 'bg-black/10 backdrop-blur border border-transparent border-r-0'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {album.metadata && (
                          <div className="w-10 h-10 relative rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={album.metadata.image}
                              alt={getTitle(album.metadata)}
                              fill
                              sizes="40px"
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
                    <button
                      onClick={() => album.nftUrl && router.push(album.nftUrl)}
                      className={`p-3 rounded-r-lg transition-colors hover:bg-muted/50 cursor-pointer flex items-center ${
                        currentAlbum?.id === album.id
                          ? 'bg-primary/20 border border-primary/40 border-l-0'
                          : 'bg-black/60 backdrop-blur border border-transparent border-l-0'
                      }`}
                      title="View NFT details"
                    >
                      <ChevronUp className="w-4 h-4 transform rotate-45 mr-8" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

  <style jsx>{`
        .slider {
          background: linear-gradient(to right, white 0%, white ${localVolume * 100}%, #404040 ${localVolume * 100}%, #404040 100%);
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
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          border: none;
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
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
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

        /* Always show persistent player on desktop */
        @media (min-width: 768px) {
          /* outer container always visible */
          .persistent-player {
            height: var(--persistent-player-height);
            overflow: visible;
            background-color: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(40px) saturate(180%);
            -webkit-backdrop-filter: blur(40px) saturate(180%);
            transition: height 260ms cubic-bezier(.2,.9,.2,1), background-color 220ms ease-in-out, backdrop-filter 220ms ease-in-out;
          }

          /* inner content always visible */
          .persistent-player-inner {
            max-height: var(--persistent-player-height);
            overflow: visible;
            transition: max-height 260ms cubic-bezier(.2,.9,.2,1);
          }

          .persistent-player:hover .persistent-player-inner,
          .persistent-player.expanded .persistent-player-inner {
            max-height: var(--persistent-player-height);
          }

          /* background/blur always applied */
          .persistent-player:hover,
          .persistent-player.expanded {
            /* Amplify the whole player area to the measured full height */
            height: var(--persistent-player-height);
            background-color: rgba(10, 10, 10, 0.98);
            backdrop-filter: blur(50px) saturate(200%);
            -webkit-backdrop-filter: blur(50px) saturate(200%);
          }

          .persistent-player .pp-controls {
            opacity: 1;
            pointer-events: auto;
            transition: opacity 180ms ease-in-out;
          }

          .persistent-player:hover .pp-controls,
          .persistent-player.expanded .pp-controls {
            opacity: 1;
            pointer-events: auto;
          }
        }

        /* Mobile: keep normal flow (no collapsing) */
        @media (hover: none) and (pointer: coarse), (max-width: 767px) {
          .persistent-player {
            height: auto;
            overflow: visible;
            background-color: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(40px) saturate(180%);
            -webkit-backdrop-filter: blur(40px) saturate(180%);
          }
          .persistent-player-inner { max-height: none; }
        }

        /* Cover hover expand and overlay */
        .cover-hover-wrapper {
          display: inline-block;
          position: relative;
          will-change: transform;
        }

        .cover-scale {
          transition: transform 220ms cubic-bezier(.2,.9,.2,1), box-shadow 220ms;
          transform-origin: left center;
          z-index: 10;
        }

        /* Overlay hidden by default */
        .cover-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 8px;
          z-index: 25;
          pointer-events: none;
          opacity: 0;
          transition: opacity 180ms ease-in-out, transform 220ms cubic-bezier(.2,.9,.2,1);
        }

        .cover-overlay-inner {
          text-align: center;
          backdrop-filter: blur(6px);
          background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%);
          padding: 6px 8px;
          border-radius: 6px;
        }

        .cover-title {
          font-family: 'Nimbus', 'Nimbus Sans', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-weight: 700;
          font-size: 12px;
          color: #ffffff;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 160px;
        }

        .cover-artist {
          font-family: 'Nimbus', 'Nimbus Sans', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-weight: 500;
          font-size: 11px;
          color: #ffffff;
          opacity: 0.9;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 160px;
        }

        /* Only apply hover effects on devices that support hover to avoid mobile surprises */
        @media (hover: hover) and (pointer: fine) {
          .cover-hover-wrapper:hover .cover-scale {
            transform: none;
            z-index: 60;
            box-shadow: none;
          }

          .cover-hover-wrapper:hover .cover-overlay {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Floating cover: reveal an info panel to the right on hover/focus */
        .floating-cover { display: flex; align-items: center; gap: 0.75rem; }

        .cover-hover-info {
          transition: opacity 180ms ease, transform 220ms cubic-bezier(.2,.9,.2,1);
          opacity: 0;
          transform: translateX(-6px);
          pointer-events: none;
          display: flex;
          align-items: center;
          position: relative;
          z-index: 80; /* above the scaled cover */
        }

        .cover-hover-info-inner {
          pointer-events: none; /* become active only when visible */
          max-width: 220px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Show info panel when either the cover wrapper or the whole floating container is hovered/focused.
           This keeps the panel visible while moving the pointer from the image to the panel. */
        .cover-hover-wrapper:hover + .cover-hover-info,
        .cover-hover-wrapper:focus + .cover-hover-info,
        .cover-hover-wrapper:focus-within + .cover-hover-info,
        .floating-cover:hover .cover-hover-info,
        .floating-cover:focus-within .cover-hover-info {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        /* When visible, make inner panel interactive */
        .floating-cover:hover .cover-hover-info-inner,
        .floating-cover:focus-within .cover-hover-info-inner {
          pointer-events: auto;
        }

        /* On touch devices, show a smaller static overlay to ensure title/artist visibility */
        @media (hover: none) and (pointer: coarse) {
          .cover-overlay { opacity: 1; }
          .cover-scale { transform: none; }
        }

        /* Player timeline at top border */
        .player-timeline-wrapper {
          position: relative;
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: rgba(255,255,255,0.12);
          z-index: 96;
          border-radius: 0;
          overflow: hidden;
          flex-shrink: 0;
        }

        .player-timeline-fill {
          height: 100%;
          background: #ffffff;
          transition: width 120ms linear;
        }

        /* Fullscreen cover loading spinner */
        .cover-spinner {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 4px solid rgba(255,255,255,0.12);
          border-top-color: rgba(255,255,255,0.95);
          animation: cover-spin 0.9s linear infinite;
        }

        @keyframes cover-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
    </>
  );
}