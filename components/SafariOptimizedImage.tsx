'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { optimizeIPFSUrl, preloadImageWithFallback, isSafariOrIOS } from '@/lib/ipfs-utils';

interface SafariOptimizedImageProps {
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
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  filename?: string;
}

export default function SafariOptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  className = '',
  priority = false,
  quality = 90,
  sizes,
  loading,
  placeholder = 'blur',
  blurDataURL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==",
  onLoad,
  onError,
  filename,
}: SafariOptimizedImageProps) {
  const [optimizedSrc, setOptimizedSrc] = useState<string>(src);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Si estamos en Safari/iOS, optimizar la URL
    if (isSafariOrIOS()) {
      const optimized = optimizeIPFSUrl(src, filename || `sbtc-image.png`);
      setOptimizedSrc(optimized);
      
      // Precargar la imagen con fallback automático
      preloadImageWithFallback(src, filename)
        .then((workingUrl) => {
          setOptimizedSrc(workingUrl);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to load image with all gateways:', error);
          setImageError(true);
          setIsLoading(false);
        });
    } else {
      // Para otros navegadores, usar la URL original
      setOptimizedSrc(src);
      setIsLoading(false);
    }
  }, [src, filename]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
    
    // Si falla, intentar con una URL optimizada como último recurso
    if (optimizedSrc === src) {
      const fallback = optimizeIPFSUrl(src, filename || 'sbtc-image.png');
      setOptimizedSrc(fallback);
      setImageError(false); // Dar otra oportunidad
    }
  };

  // Clases CSS optimizadas para Safari/iOS
  const optimizedClassName = `
    ${className}
    ${isLoading ? 'opacity-0' : 'opacity-100'}
    transition-opacity duration-300
    safari-image-fix
  `.trim();

  if (imageError) {
    return (
      <div 
        className={`bg-muted flex items-center justify-center border border-border rounded ${className}`}
        style={fill ? {} : { width, height }}
      >
        <div className="text-center p-4">
          <div className="text-muted-foreground text-sm mb-2">🖼️</div>
          <div className="text-muted-foreground text-xs">Image failed to load</div>
        </div>
      </div>
    );
  }

  return (
    <Image 
      src={optimizedSrc}
      alt={alt}
      className={optimizedClassName}
      onLoad={handleLoad}
      onError={handleError}
      quality={quality}
      priority={priority}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      {...(fill ? { fill: true } : { width, height })}
      {...(sizes && { sizes })}
      {...(loading && { loading })}
    />
  );
}