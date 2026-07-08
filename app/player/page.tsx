'use client';

import { useMusicPlayer } from '@/components/MusicPlayerContext';
import OrbVisualizer from '@/components/OrbVisualizer';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Pause } from 'lucide-react';
import { useRef, useEffect, useCallback, useState } from 'react';

export default function Page() {
  const {
    currentAlbum,
    isPlaying,
    togglePlayPause,
  } = useMusicPlayer();

  const coverImage = currentAlbum?.metadata?.image || '/SUMAK.png';
  const songTitle = currentAlbum?.metadata?.name || currentAlbum?.metadata?.properties?.title || 'Now Playing';
  const songArtist = currentAlbum?.nftRecord?.artist || 'Unknown artist';
  const songHref = currentAlbum?.nftUrl || '#';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);

  const handleMobileCoverToggle = () => {
    if (!currentAlbum) return;
    togglePlayPause();
  };

  const handleMobileCoverKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMobileCoverToggle();
    }
  };

  // Reset background image state when album changes
  useEffect(() => {
    setBackgroundImageLoaded(false); // Reset load state when album changes
  }, [currentAlbum?.id, currentAlbum?.metadata]);

  // Visualizer animation function
  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Fallback visualization with hundreds of bars
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

      // Use white with low opacity
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x, y, barWidth, barHeight);
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


  return (
    <div className="bg-transparent">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground p-4 md:p-8 overflow-hidden">
        {/* Blurred Background Image with proper loading */}
        {currentAlbum?.metadata?.image ? (
          <>
            {/* Use Next.js Image component for better loading control */}
            <div 
              className="fixed inset-0" 
              style={{ 
                zIndex: -20,
                opacity: backgroundImageLoaded ? 1 : 0,
                transition: 'opacity 1s ease-in-out'
              }}
            >
              <Image
                key={`bg-img-${currentAlbum.id}`}
                src={currentAlbum.metadata.image}
                alt="Background"
                fill
                sizes="100vw"
                className="object-cover"
                style={{
                  filter: 'blur(40px) brightness(0.4)',
                  transform: 'scale(1.1)',
                }}
                onLoad={() => setBackgroundImageLoaded(true)}
                onError={() => setBackgroundImageLoaded(false)}
                priority={false}
                unoptimized={true} // Since these are IPFS images
              />
            </div>
            {/* Dark overlay for better text readability */}
            <div 
              className="fixed inset-0 w-full h-full bg-black/20"
              style={{ 
                zIndex: -10,
                opacity: backgroundImageLoaded ? 1 : 0,
                transition: 'opacity 1s ease-in-out'
              }}
            />
          </>
        ) : null}
        
        {/* Fallback background when no image or loading failed */}
        <div 
          className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black" 
          style={{ 
            zIndex: -30,
            opacity: (!currentAlbum?.metadata?.image || !backgroundImageLoaded) ? 1 : 0,
            transition: 'opacity 1s ease-in-out'
          }} 
        />
        
        <div className="hidden w-full md:block">
          <OrbVisualizer />
        </div>

        <div className="md:hidden flex flex-col items-center gap-6 w-full max-w-sm mx-auto text-center">
          <div
            className="w-full aspect-square rounded-md overflow-hidden border border-white/20 shadow-2xl relative group cursor-pointer"
            role="button"
            aria-pressed={isPlaying}
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
            tabIndex={0}
            onClick={handleMobileCoverToggle}
            onKeyDown={handleMobileCoverKeyDown}
          >
            <Image
              key={`mobile-cover-${currentAlbum?.id || 'fallback'}`}
              src={coverImage}
              alt={songTitle}
              fill
              sizes="100vw"
              className="object-cover"
              priority={false}
              unoptimized
            />
            {currentAlbum && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                {isPlaying ? <Pause size={48} /> : <Play size={48} />}
              </div>
            )}
          </div>
          {currentAlbum ? (
            <Link
              href={songHref}
              className="flex flex-col gap-1 w-full"
            >
              <span className="text-2xl font-semibold leading-tight">{songTitle}</span>
              <span className="text-base text-white/70">{songArtist}</span>
            </Link>
          ) : (
            <div className="flex flex-col gap-1 w-full">
              <span className="text-2xl font-semibold leading-tight">No track selected</span>
              <span className="text-base text-white/70">Choose a song to begin</span>
            </div>
          )}
        </div>
    </div>
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
