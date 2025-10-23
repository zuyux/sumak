import axios from 'axios';

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
}

export interface PinataUploadError {
  error: string;
  details?: string;
}

/**
 * Upload a file to Pinata IPFS
 */
export async function uploadFileToPinata(
  file: File
): Promise<{ success: true; data: PinataUploadResponse } | { success: false; error: string }> {
  try {
    // Validate environment variables - use JWT token (preferred) or fallback to API keys
    const pinataJWT = process.env.PINATA_JWT;
    const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_KEY;

    if (!pinataJWT && (!pinataApiKey || !pinataSecretApiKey)) {
      console.error('Pinata credentials not found in environment variables');
      return {
        success: false,
        error: 'Pinata configuration missing. Please check environment variables.'
      };
    }

    // Validate file
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).'
      };
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: `profile-avatar-${Date.now()}`,
      keyvalues: {
        type: 'profile-avatar',
        uploaded_by: 'stx-nft-marketplace',
        timestamp: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
      customPinPolicy: {
        regions: [
          {
            id: 'FRA1',
            desiredReplicationCount: 1
          },
          {
            id: 'NYC1', 
            desiredReplicationCount: 1
          }
        ]
      }
    });
    formData.append('pinataOptions', options);

    // Upload to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(pinataJWT 
            ? { 'Authorization': `Bearer ${pinataJWT}` }
            : { 
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey 
              }
          ),
        },
        timeout: 30000, // 30 second timeout
      }
    );

    if (response.status === 200 && response.data?.IpfsHash) {
      return {
        success: true,
        data: response.data as PinataUploadResponse
      };
    } else {
      return {
        success: false,
        error: 'Upload failed. Please try again.'
      };
    }
  } catch (error) {
    console.error('Pinata upload error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Upload timeout. Please try again with a smaller file.'
        };
      }
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check API credentials.'
        };
      }
      
      if (error.response?.status === 413) {
        return {
          success: false,
          error: 'File too large for upload.'
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || 'Upload failed. Please try again.'
      };
    }
    
    return {
      success: false,
      error: 'Upload failed. Please try again.'
    };
  }
}

/**
 * Get IPFS URL from CID
 * Uses ipfs.io as the default gateway
 */
export function getIPFSUrl(cid: string): string {
  // Use ipfs.io as the primary gateway
  const gatewayUrl = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 
                     process.env.PINATA_GATEWAY_URL || 
                     'https://ipfs.io'; // Default to ipfs.io
  return `${gatewayUrl}/ipfs/${cid}`;
}

/**
 * Get fallback IPFS URLs for a given CID
 * Returns an array of URLs to try in order
 */
export function getIPFSFallbackUrls(cid: string): string[] {
  const fallbackGateways = [
    'https://ipfs.io', // Primary gateway
    'https://gateway.ipfs.io',
    'https://cloudflare-ipfs.com',
    'https://dweb.link',
    'https://gateway.pinata.cloud',
    'https://nftstorage.link',
  ];
  
  return fallbackGateways.map(gateway => `${gateway}/ipfs/${cid}`);
}

/**
 * Get optimized IPFS URL from CID with query parameters
 */
export function getOptimizedIPFSUrl(cid: string, width?: number, height?: number, quality?: number): string {
  const gatewayUrl = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 
                     process.env.PINATA_GATEWAY_URL || 
                     'https://ipfs.io';
  const baseUrl = `${gatewayUrl}/ipfs/${cid}`;
  const params = new URLSearchParams();
  
  if (width) params.append('img-width', width.toString());
  if (height) params.append('img-height', height.toString());
  if (quality) params.append('img-quality', quality.toString());
  
  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

/**
 * Delete/unpin file from Pinata (requires JWT token - should be called from API route)
 */
export async function unpinFromPinata(cid: string): Promise<boolean> {
  try {
    const pinataJWT = process.env.PINATA_JWT;
    
    if (!pinataJWT) {
      console.error('Pinata JWT not found in environment variables');
      return false;
    }

    const response = await axios.delete(
      `https://api.pinata.cloud/pinning/unpin/${cid}`,
      {
        headers: {
          Authorization: `Bearer ${pinataJWT}`,
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error('Pinata unpin error:', error);
    return false;
  }
}
