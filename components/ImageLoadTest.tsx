'use client';

import { useState, useEffect } from 'react';
import IOSOptimizedImage from './IOSOptimizedImage';

interface ImageTestProps {
  src: string;
  alt: string;
}

export default function ImageLoadTest({ src, alt }: ImageTestProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [deviceInfo, setDeviceInfo] = useState<string>('');
  const [networkInfo, setNetworkInfo] = useState<string>('');

  useEffect(() => {
    // Detect device info
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isMobile = /Mobile/.test(userAgent);
    
    setDeviceInfo(`iOS: ${isIOS}, Safari: ${isSafari}, Mobile: ${isMobile}`);

    // Detect network info if available
    if ('connection' in navigator) {
      const connection = (navigator as unknown as { connection: { effectiveType?: string; downlink?: number } }).connection;
      setNetworkInfo(`Type: ${connection.effectiveType || 'unknown'}, Downlink: ${connection.downlink || 'unknown'} Mbps`);
    }
  }, []);

  const handleLoad = () => {
    setLoadState('loaded');
    console.log('Image loaded successfully:', src);
  };

  const handleError = () => {
    setLoadState('error');
    console.error('Image failed to load:', src);
  };

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="text-sm text-muted-foreground">
        <p>Device: {deviceInfo}</p>
        {networkInfo && <p>Network: {networkInfo}</p>}
        <p>Load State: <span className={`font-semibold ${
          loadState === 'loaded' ? 'text-green-600' : 
          loadState === 'error' ? 'text-red-600' : 
          'text-yellow-600'
        }`}>{loadState}</span></p>
      </div>
      
      <div className="relative w-32 h-32 border rounded">
        <IOSOptimizedImage
          src={src}
          alt={alt}
          fill
          className="object-cover"
          onLoad={handleLoad}
          onError={handleError}
          priority
        />
      </div>
      
      <div className="text-xs text-muted-foreground break-all">
        URL: {src}
      </div>
    </div>
  );
}