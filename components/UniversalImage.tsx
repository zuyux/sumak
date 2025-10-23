'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { getDeviceInfo, optimizeImageUrl, getImageLoadingStrategy, getResponsiveSizes } from '@/lib/device-utils';

interface UniversalImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  loading?: 'eager' | 'lazy';
  onLoad?: () => void;
  onError?: () => void;
  filename?: string;
}

// Multiple IPFS gateways for maximum compatibility - ordered by reliability
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
] as const;

function extractIPFSHash(url: string): string | null {
  const patterns = [
    /\/ipfs\/([a-zA-Z0-9]+)/,
    /ipfs:\/\/([a-zA-Z0-9]+)/,
    /^([a-zA-Z0-9]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function generateFallbackUrls(originalUrl: string): string[] {
  const hash = extractIPFSHash(originalUrl);
  
  if (!hash) {
    return [originalUrl];
  }

  // Generate URLs with all available gateways, excluding the original gateway if it failed
  const originalGateway = originalUrl.replace(`/ipfs/${hash}`, '/ipfs/');
  const filteredGateways = IPFS_GATEWAYS.filter(gateway => gateway !== originalGateway);
  const fallbackUrls = [originalUrl, ...filteredGateways.map(gateway => `${gateway}${hash}`)];
  
  return fallbackUrls;
}

export default function UniversalImage({
  src,
  alt,
  width,
  height,
  fill,
  className = '',
  priority = false,
  quality: propQuality,
  sizes: propSizes,
  loading: propLoading,
  onLoad,
  onError,
  filename,
}: UniversalImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const fallbackUrls = useRef<string[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Optimize for device capabilities
    if (typeof window !== 'undefined') {
      const deviceInfo = getDeviceInfo();
      const optimizedUrl = optimizeImageUrl(src, deviceInfo, filename);
      const strategy = getImageLoadingStrategy(deviceInfo);
      
      // Generate fallback URLs
      fallbackUrls.current = [optimizedUrl, ...generateFallbackUrls(src)];
      setCurrentSrc(fallbackUrls.current[0]);
      
      console.log('Device-optimized image URL:', optimizedUrl);
      console.log('Device info:', deviceInfo);
      console.log('Loading strategy:', strategy);
    } else {
      // Fallback for SSR
      fallbackUrls.current = generateFallbackUrls(src);
      setCurrentSrc(fallbackUrls.current[0]);
    }
    
    setImageError(false);
    setIsLoading(true);
    setFallbackIndex(0);
  }, [src, filename]);

  const tryNextFallback = () => {
    if (fallbackIndex < fallbackUrls.current.length - 1) {
      const nextIndex = fallbackIndex + 1;
      setFallbackIndex(nextIndex);
      setCurrentSrc(fallbackUrls.current[nextIndex]);
      setImageError(false);
      setIsLoading(true);
      
      console.log(`Trying fallback URL ${nextIndex + 1}/${fallbackUrls.current.length}:`, fallbackUrls.current[nextIndex]);
    } else {
      // All fallbacks failed
      setImageError(true);
      setIsLoading(false);
      console.error('All image fallback URLs failed for:', src);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setImageError(false);
    onLoad?.();
    
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const handleError = () => {
    console.warn(`Image failed to load: ${currentSrc}`);
    onError?.();
    
    // Try next fallback immediately for faster error recovery
    retryTimeoutRef.current = setTimeout(() => {
      tryNextFallback();
    }, 50);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Get device-optimized settings
  const deviceInfo = typeof window !== 'undefined' ? getDeviceInfo() : null;
  const strategy = deviceInfo ? getImageLoadingStrategy(deviceInfo) : null;
  
  // Use device-optimized or prop values, but avoid conflicts
  const quality = propQuality || strategy?.quality || 85;
  const sizes = propSizes || (deviceInfo ? getResponsiveSizes(deviceInfo) : "100vw");
  
  // If priority is true, don't set loading (Next.js handles it automatically)
  // If priority is false, use the specified loading or strategy loading
  const loading = priority ? undefined : (propLoading || (strategy?.loading as 'eager' | 'lazy') || 'lazy');

  // Enhanced className with universal compatibility fixes
  const universalClassName = `
    ${className}
    ${isLoading ? 'opacity-0' : 'opacity-100'}
    transition-opacity duration-300
    universal-image-fix
  `.trim();

  if (imageError) {
    return (
      <div 
        className={`bg-muted/50 flex items-center justify-center border border-border/50 rounded ${className}`}
        style={fill ? {} : { width, height }}
      >
        <div className="text-center p-2">
          <div className="text-muted-foreground text-lg mb-1">🖼️</div>
          <div className="text-muted-foreground text-xs">Failed to load</div>
        </div>
      </div>
    );
  }

  return (
    <Image 
      src={currentSrc}
      alt={alt}
      className={universalClassName}
      onLoad={handleLoad}
      onError={handleError}
      quality={quality}
      priority={priority}
      sizes={sizes}
      unoptimized={false}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      {...(fill ? { fill: true } : { width, height })}
      {...(!priority && loading ? { loading } : {})}
    />
  );
}