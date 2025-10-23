/**
 * Asset preloader utility for loading images, 3D models, and other resources
 */

export interface PreloadOptions {
  timeout?: number;
  onProgress?: (loaded: number, total: number) => void;
  onAssetLoaded?: (asset: string) => void;
  onAssetError?: (asset: string, error: Error) => void;
}

export class AssetPreloader {
  private static instance: AssetPreloader;
  
  static getInstance(): AssetPreloader {
    if (!AssetPreloader.instance) {
      AssetPreloader.instance = new AssetPreloader();
    }
    return AssetPreloader.instance;
  }

  /**
   * Preload a single asset
   */
  private preloadAsset(asset: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (asset.endsWith('.glb') || asset.endsWith('.gltf')) {
        // For 3D models, use fetch
        fetch(asset)
          .then(response => {
            if (response.ok) {
              resolve();
            } else {
              reject(new Error(`Failed to load 3D model: ${response.status}`));
            }
          })
          .catch(reject);
      } else if (asset.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
        // For images
        const img = document.createElement('img');
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image`));
        img.src = asset;
      } else if (asset.match(/\.(mp4|webm|mov)$/i)) {
        // For videos
        const video = document.createElement('video');
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error(`Failed to load video`));
        video.src = asset;
      } else {
        // For other assets, use fetch
        fetch(asset)
          .then(response => {
            if (response.ok) {
              resolve();
            } else {
              reject(new Error(`Failed to load asset: ${response.status}`));
            }
          })
          .catch(reject);
      }
    });
  }

  /**
   * Preload multiple assets with progress tracking
   */
  async preloadAssets(
    assets: string[], 
    options: PreloadOptions = {}
  ): Promise<void> {
    const { 
      timeout = 10000, 
      onProgress, 
      onAssetLoaded, 
      onAssetError 
    } = options;

    let loadedCount = 0;
    const total = assets.length;

    const promises = assets.map(async (asset) => {
      try {
        // Add timeout to individual asset loading
        const loadPromise = this.preloadAsset(asset);
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        );

        await Promise.race([loadPromise, timeoutPromise]);
        
        loadedCount++;
        onAssetLoaded?.(asset);
        onProgress?.(loadedCount, total);
        
        console.log(`✓ Loaded: ${asset}`);
      } catch (error) {
        loadedCount++;
        const errorObj = error instanceof Error ? error : new Error(String(error));
        onAssetError?.(asset, errorObj);
        onProgress?.(loadedCount, total);
        
        console.warn(`✗ Failed to load: ${asset}`, errorObj);
        // Continue with other assets even if one fails
      }
    });

    await Promise.all(promises);
    console.log(`Asset preloading completed: ${loadedCount}/${total} assets processed`);
  }

  /**
   * Get critical assets for the main app
   */
  static getCriticalAssets(): string[] {
    return [
      '/models/default.glb',
      '/home.svg',
      '/4V4-DIY.svg',
      '/4V4-DIY.png',
      '/loader.gif',
      '/loaderb.gif',
      '/delta-logo.svg',
      '/delta-logo.png',
      // Add fonts if they're critical
      '/fonts/ChakraPetch-Regular.woff2',
      '/fonts/ChakraPetch-Bold.woff2',
    ];
  }

  /**
   * Get page-specific assets
   */
  static getPageAssets(page: string): string[] {
    const assetsMap: Record<string, string[]> = {
      home: [
        '/01.png', '/02.png', '/03.png', '/04.png', 
        '/05.png', '/06.png', '/07.png'
      ],
      mint: [
        '/add-ico.svg',
        '/send-ico.svg'
      ],
      wallet: [
        '/wallet-ico.svg',
        '/seed-ico.svg'
      ],
      // Add more pages as needed
    };

    return assetsMap[page] || [];
  }

  /**
   * Preload with intelligent fallbacks
   */
  async smartPreload(
    primaryAssets: string[],
    secondaryAssets: string[] = [],
    options: PreloadOptions & { maxLoadTime?: number } = {}
  ): Promise<void> {
    const { maxLoadTime = 3000, ...preloadOptions } = options;
    
    // Start loading primary assets
    const primaryPromise = this.preloadAssets(primaryAssets, preloadOptions);
    
    // Start a timeout for primary assets
    const timeoutPromise = new Promise<void>((resolve) => 
      setTimeout(resolve, maxLoadTime)
    );
    
    // Wait for either primary assets to load or timeout
    await Promise.race([primaryPromise, timeoutPromise]);
    
    // Load secondary assets in background (don't await)
    if (secondaryAssets.length > 0) {
      this.preloadAssets(secondaryAssets, {
        ...preloadOptions,
        timeout: 5000 // Shorter timeout for secondary assets
      }).catch(() => {
        console.log('Secondary assets loading completed with some failures');
      });
    }
  }
}

export default AssetPreloader;
