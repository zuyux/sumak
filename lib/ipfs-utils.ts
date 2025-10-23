/**
 * IPFS URL utilities for Safari/iOS compatibility
 */

// Lista de gateways IPFS con buena compatibilidad Safari/iOS
export const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
] as const;

/**
 * Extrae el hash IPFS de cualquier URL IPFS
 */
export function extractIPFSHash(url: string): string | null {
  // Patrones para diferentes formatos de URL IPFS
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

/**
 * Convierte cualquier URL IPFS a una URL optimizada para Safari/iOS
 */
export function optimizeIPFSUrl(url: string, filename?: string): string {
  const hash = extractIPFSHash(url);
  
  if (!hash) {
    console.warn('Could not extract IPFS hash from URL:', url);
    return url;
  }

  // Si estamos en Safari/iOS, usar nuestro proxy API como primera opción
  if (typeof window !== 'undefined' && isSafariOrIOS()) {
    return `/api/ipfs-proxy?hash=${hash}&filename=${filename || 'sbtc-image.png'}`;
  }

  // Para otros navegadores, usar el gateway principal
  const baseUrl = `${IPFS_GATEWAYS[0]}${hash}`;
  
  // Agregar parámetros para mejorar compatibilidad
  const params = new URLSearchParams();
  
  if (filename) {
    params.set('filename', filename);
  }
  
  // Agregar parámetros que ayudan con el cache y CORS
  params.set('format', 'raw');
  params.set('download', 'false');
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Genera URLs de respaldo para IPFS en caso de que falle el gateway principal
 */
export function generateFallbackUrls(url: string, filename?: string): string[] {
  const hash = extractIPFSHash(url);
  
  if (!hash) {
    return [url];
  }

  const urls: string[] = [];
  
  // Si estamos en Safari/iOS, priorizar nuestro proxy
  if (typeof window !== 'undefined' && isSafariOrIOS()) {
    urls.push(`/api/ipfs-proxy?hash=${hash}&filename=${filename || 'sbtc-image.png'}`);
  }

  // Agregar URLs de gateways directos
  IPFS_GATEWAYS.forEach(gateway => {
    const baseUrl = `${gateway}${hash}`;
    const params = new URLSearchParams();
    
    if (filename) {
      params.set('filename', filename);
    }
    
    urls.push(`${baseUrl}?${params.toString()}`);
  });

  return urls;
}

/**
 * Preload de imagen con fallback automático para iOS
 */
export function preloadImageWithFallback(url: string, filename?: string): Promise<string> {
  const fallbackUrls = generateFallbackUrls(url, filename);
  
  return new Promise((resolve, reject) => {
    let currentIndex = 0;
    
    function tryNextUrl() {
      if (currentIndex >= fallbackUrls.length) {
        reject(new Error('All IPFS gateways failed'));
        return;
      }
      
      const currentUrl = fallbackUrls[currentIndex];
      const img = new Image();
      
      img.onload = () => {
        resolve(currentUrl);
      };
      
      img.onerror = () => {
        console.warn(`IPFS gateway failed: ${currentUrl}`);
        currentIndex++;
        tryNextUrl();
      };
      
      // Configurar CORS y otras propiedades para iOS
      img.crossOrigin = 'anonymous';
      img.loading = 'eager';
      img.src = currentUrl;
    }
    
    tryNextUrl();
  });
}

/**
 * Hook para detectar si estamos en Safari/iOS
 */
export function isSafariOrIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  return isSafari || isIOS;
}

/**
 * Convierte todas las URLs de un array para compatibilidad Safari
 */
export function optimizeImageUrls(urls: string[]): string[] {
  return urls.map((url, index) => 
    optimizeIPFSUrl(url, `sbtc-${index + 1}.png`)
  );
}