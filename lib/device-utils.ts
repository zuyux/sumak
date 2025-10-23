/**
 * Universal device and browser detection utilities
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWebKit: boolean;
  supportModernFeatures: boolean;
  preferredImageFormat: 'avif' | 'webp' | 'png';
}

/**
 * Detect device and browser capabilities
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      isIOS: false,
      isAndroid: false,
      isWebKit: false,
      supportModernFeatures: true,
      preferredImageFormat: 'webp',
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /ipad|iphone|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = /mobi|android|iphone|ipod/.test(userAgent);
  const isTablet = /ipad|tablet/.test(userAgent) || (isAndroid && !/mobile/.test(userAgent));
  const isDesktop = !isMobile && !isTablet;

  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);
  const isEdge = /edge/.test(userAgent);
  const isWebKit = /webkit/.test(userAgent);

  // Feature detection
  const supportsAvif = typeof window !== 'undefined' && 'createImageBitmap' in window;
  const supportsWebp = typeof window !== 'undefined' && document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;

  let preferredImageFormat: 'avif' | 'webp' | 'png' = 'png';
  if (supportsAvif && !isSafari) {
    preferredImageFormat = 'avif';
  } else if (supportsWebp) {
    preferredImageFormat = 'webp';
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    isIOS,
    isAndroid,
    isWebKit,
    supportModernFeatures: !isIOS || (isIOS && parseInt(userAgent.match(/os (\d+)_/)?.[1] || '0') >= 14),
    preferredImageFormat,
  };
}

/**
 * Get optimal image loading strategy based on device
 */
export function getImageLoadingStrategy(deviceInfo: DeviceInfo) {
  const connection = typeof navigator !== 'undefined' ? (navigator as unknown as { connection?: { effectiveType?: string } }).connection : undefined;
  
  return {
    // Use eager loading for mobile to improve perceived performance
    loading: deviceInfo.isMobile ? 'eager' : 'lazy',
    // Higher quality for desktop, lower for mobile
    quality: deviceInfo.isDesktop ? 90 : 75,
    // Use proxy for problematic browsers
    useProxy: deviceInfo.isSafari || deviceInfo.isIOS,
    // Preload critical images on fast connections
    preloadCritical: !deviceInfo.isMobile || connection?.effectiveType === '4g',
  };
}

/**
 * Generate optimized image URLs based on device capabilities
 */
export function optimizeImageUrl(originalUrl: string, deviceInfo: DeviceInfo, filename?: string): string {
  // Extract IPFS hash
  const hashMatch = originalUrl.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (!hashMatch) return originalUrl;
  
  const hash = hashMatch[1];
  
  // Use proxy for Safari/iOS or problematic browsers
  if (deviceInfo.isSafari || deviceInfo.isIOS) {
    return `/api/ipfs-proxy?hash=${hash}&filename=${filename || 'image.png'}`;
  }
  
  // Use direct gateway for other browsers
  const gateway = 'https://ipfs.io/ipfs/';
  return `${gateway}${hash}`;
}

/**
 * Get responsive image sizes based on device
 */
export function getResponsiveSizes(deviceInfo: DeviceInfo): string {
  if (deviceInfo.isMobile) {
    return '100vw';
  } else if (deviceInfo.isTablet) {
    return '(max-width: 1024px) 50vw, 33vw';
  } else {
    return '(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw';
  }
}

/**
 * Hook to get device info with SSR safety
 */
export function useDeviceInfo(): DeviceInfo | null {
  if (typeof window === 'undefined') return null;
  return getDeviceInfo();
}