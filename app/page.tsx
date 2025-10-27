'use client';

import Footer from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { useMusicPlayer } from '@/components/MusicPlayerContext';
import OrbVisualizer from '@/components/OrbVisualizer';
import Image from 'next/image';
import { useRef, useEffect, useCallback, useState } from 'react';

export default function Page() {
  const {
    currentAlbum,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    seekTo,
  } = useMusicPlayer();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);

  // Reset background image state when album changes
  useEffect(() => {
    setBackgroundImageLoaded(false); // Reset load state when album changes
  }, [currentAlbum?.id, currentAlbum?.metadata]);

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

  // Handle canvas click for seeking
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    seekTo(newTime);
  };



  return (
    <div className="bg-transparent min-h-screen">
      <Navbar />
      
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
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center px-4">
              <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-foreground text-sm md:text-lg text-center">Loading music metadata...</p>
            </div>
          </div>
        )}

        <OrbVisualizer/>

        {/* Audio Visualizer Timeline */}
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 mb-6">
          <div className="flex flex-col items-center mb-2">
            <canvas
              ref={canvasRef}
              height={60}
              className="w-full h-12 md:h-16 bg-transparent"
              onClick={handleCanvasClick}
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div className="flex justify-between px-2 md:px-4 text-xs md:text-sm text-muted-foreground mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
    </div>

      <Footer />

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