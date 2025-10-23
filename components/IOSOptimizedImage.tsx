'use client';

import Image from 'next/image';
import { useState } from 'react';

interface IOSOptimizedImageProps {
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
  unoptimized?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function IOSOptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  className = '',
  priority = false,
  quality = 85,
  sizes,
  loading,
  placeholder,
  blurDataURL,
  unoptimized = false,
  onLoad,
  onError,
}: IOSOptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
  };

  // iOS-specific optimizations
  const iosOptimizedClassName = `
    ${className}
    ${isLoading ? 'opacity-0' : 'opacity-100'}
    transition-opacity duration-300
    ios-image-fix
  `.trim();

  if (imageError) {
    return (
      <div 
        className={`bg-muted flex items-center justify-center ${className}`}
        style={fill ? {} : { width, height }}
      >
        <span className="text-muted-foreground text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <Image 
      src={src}
      alt={alt}
      {...(fill ? { fill: true } : { width, height })}
      className={iosOptimizedClassName}
      onLoad={handleLoad}
      onError={handleError}
      quality={quality}
      priority={priority}
      unoptimized={unoptimized}
      {...(sizes && { sizes })}
      {...(loading && { loading })}
      {...(placeholder && { placeholder })}
      {...(blurDataURL && { blurDataURL })}
    />
  );
}