'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Share2, MapPin } from 'lucide-react';
import { toast } from "sonner";
import CenterPanel from '@/components/features/avatar/CenterPanel';

// Dynamic import to avoid SSR issues with Leaflet
const LocationMapModal = dynamic(() => import('@/components/LocationMapModal'), {
  ssr: false,
});

interface NFTMetadata {
  name: string;
  description: string;
  external_url: string;
  animation_url: string;
  image: string;
  attributes: Record<string, string | number>;
  properties: Record<string, string | number | boolean | null>;
  customizationData?: Record<string, unknown>;
  interoperabilityFormats: string[];
  edition: string;
  royalties: string;
  location?: string | Record<string, unknown>; // More specific typing
  soulbound: boolean;
}

export default function NFTViewerPage() {
  const params = useParams();
  const router = useRouter();
  const address = params?.address as string;
  const contractName = params?.contractName as string;
  
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [modelUrl, setModelUrl] = useState<string>('');
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchNFTData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Try to fetch from an API endpoint that queries the contract
        const contractResponse = await fetch(`/api/nft/${address}/${contractName}`);
        if (contractResponse.ok) {
          const contractData = await contractResponse.json();
          if (contractData.success && contractData.metadataCid) {
            // Fetch metadata from IPFS using the CID and gateway URL from contract response
            const gatewayUrl = contractData.gatewayUrl || 'https://gateway.pinata.cloud';
            const metadataUrl = `${gatewayUrl}/ipfs/${contractData.metadataCid}`;
            
            const response = await fetch(metadataUrl);
            
            if (response.ok) {
              const nftData: NFTMetadata = await response.json();
              setMetadata(nftData);
              
              if (nftData.animation_url) {
                setModelUrl(nftData.animation_url);
              }
              return;
            }
          }
        }
        
        // If we get here, contract was not found or has no metadata
        setError('NFT contract not found or has no metadata available.');
        
      } catch (err) {
        console.error('Error fetching NFT data:', err);
        setError('Failed to load NFT data. Contract may not exist or be inaccessible.');
      } finally {
        setLoading(false);
      }
    };

    if (address && contractName) {
      fetchNFTData();
    }
  }, [address, contractName]);

  // Type guard for checking if location exists and is truthy
  const hasLocation = (location?: string | Record<string, unknown>): location is string | Record<string, unknown> => {
    return Boolean(location);
  };

  // Helper function to check if customization data is valid
  const hasValidCustomizationData = (customData?: Record<string, unknown>): customData is Record<string, unknown> => {
    return Boolean(
      customData &&
      typeof customData === 'object' &&
      customData !== null &&
      !Array.isArray(customData) &&
      Object.keys(customData).length > 0
    );
  };

  // Helper function to parse location string
  const parseLocationString = (locationData?: string | Record<string, unknown>) => {
    if (!locationData) return null;
    // If it's already an object, try to extract lat/lng or lat/lon
    if (typeof locationData === 'object') {
      let lat: number | undefined;
      let lng: number | undefined;
      if ('lat' in locationData) {
        lat = Number(locationData.lat);
        if ('lng' in locationData) {
          lng = Number(locationData.lng);
        } else if ('lon' in locationData) {
          lng = Number(locationData.lon);
        } else if ('longitude' in locationData) {
          lng = Number(locationData.longitude);
        }
        if (
          typeof lat === 'number' && typeof lng === 'number' &&
          !isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
        ) {
          return { lat, lng };
        }
      }
    }
    // Convert to string if it's not already
    const locationStr = typeof locationData === 'string' ? locationData : String(locationData);
    // Try to match the "lat: X, lon: Y" or "lat: X, lng: Y" format
    const match = locationStr.match(/lat:\s*(-?\d+\.?\d*),?\s*(lng|lon|longitude):\s*(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[3]);
      if (
        typeof lat === 'number' && typeof lng === 'number' &&
        !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ) {
        return { lat, lng };
      }
    }
    // Try to parse if it's a JSON object string
    try {
      const parsed = JSON.parse(locationStr);
      if (parsed && typeof parsed === 'object' && 'lat' in parsed) {
        const lat = parseFloat(parsed.lat);
        let lng: number | undefined;
        if ('lng' in parsed) {
          lng = parseFloat(parsed.lng);
        } else if ('lon' in parsed) {
          lng = parseFloat(parsed.lon);
        } else if ('longitude' in parsed) {
          lng = parseFloat(parsed.longitude);
        }
        if (
          typeof lat === 'number' && typeof lng === 'number' &&
          !isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
        ) {
          return { lat, lng };
        }
      }
    } catch (error) {
      console.warn('Failed to parse location JSON:', error);
    }
    console.warn('Unable to parse location data:', locationData);
    return null;
  };

  const shareNFT = async () => {
    if (!metadata) return;
    
    const shareData = {
      title: metadata.name || 'Check out this NFT!',
      text: metadata.description || 'View this amazing 3D NFT',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        navigator.clipboard.writeText(window.location.href);
        toast('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast('Link copied to clipboard!');
    }
  };

  // Loading component
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen dotted-grid-background">
        <Card className='border-[#333] shadow-lg text-white bg-[#000] p-8'>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
            <p>Loading NFT data...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Error component
  if (error || !metadata) {
    return (
      <div className="flex items-center justify-center h-screen dotted-grid-background">
        <Card className='border-[#333] shadow-lg text-white bg-[#000] mt-16 p-0 max-w-md'>
          <div className="text-center">
            <div className="text-3xl my-8">🚫</div>
            <h2 className="text-xl font-bold mb-4">NFT Not Found</h2>
            <p className="text-red-400 mb-4">{error || 'NFT contract not found'}</p>
            <p className="text-gray-400 text-sm mb-6 break-all">
              The contract {address}.{contractName} does not exist or has no accessible metadata.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => router.back()} 
                variant="outline" 
                className="w-full border-[#333]"
              >
                Go Back
              </Button>
              <Button 
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen dotted-grid-background p-4">
      <div className="max-w-7xl mx-auto py-24">

        <div className="grid grid-cols-1 gap-8">
          {/* 3D Model Viewer */}
          <Card className='border-[#333] shadow-lg text-white bg-[#000] p-0'>
            <CardContent className='p-0'>
              <div className="h-[80vh] w-full rounded-lg overflow-hidden flex items-center justify-center">
                {modelUrl ? (
                  <div className="w-full h-full">
                    <CenterPanel
                      background="#000000"
                      secondaryColor="#ffffff"
                      modelUrl={modelUrl}
                      lightIntensity={11}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full bg-[#111] rounded-lg">
                    <p className="text-gray-400">No 3D model available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* NFT Details */}
          <div className="space-y-6">
            <Card className='border-[#333] shadow-lg text-white bg-[#000]'>
              <CardContent className='p-6'>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                    {metadata.name}
                  </CardTitle>
                  {metadata.soulbound && (
                    <Badge variant="outline" className="border-purple-500 text-purple-400">
                      Avatar NFT
                    </Badge>
                  )}
                </div>
                
                <p className="text-gray-300 text-lg mb-6">{metadata.description}</p>

                {/* Action Buttons Row */}
                {(metadata.external_url) && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <Button 
                      onClick={() => window.open(metadata.external_url, '_blank')}
                      variant="outline" 
                      className="w-full border-[#333] cursor-pointer hover:text-white"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit External URL
                    </Button>
                    <Button 
                      onClick={shareNFT} 
                      variant="outline" 
                      className="w-full border-[#333] cursor-pointer hover:text-white"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share NFT
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Attributes */}
            {metadata?.attributes && Object.keys(metadata.attributes).length > 0 && (
              <Card className='border-[#333] shadow-lg text-white bg-[#000]'>
                <CardContent className='p-6'>
                  <h3 className="text-lg font-semibold mb-4">Attributes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(metadata.attributes).map(([key, value]) => (
                      <div key={key} className="bg-[#111] p-3 rounded-lg">
                        <p className="text-sm text-gray-400 capitalize">{key}</p>
                        <p className="font-medium">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            
            {/* Customization Data */}
            {hasValidCustomizationData(metadata?.customizationData) && (
              <Card className='border-[#333] shadow-lg text-white bg-[#000]'>
                <CardContent className='p-6'>
                  <h3 className="text-lg font-semibold mb-4">Customization</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(metadata.customizationData).map(([key, value]) => (
                      <div key={key} className="bg-[#111] p-3 rounded-lg">
                        <p className="text-sm text-gray-400 capitalize">{key}</p>
                        <p className="font-medium">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            {metadata.location && (
              <Card className='border-[#333] shadow-lg text-white bg-[#000]'>
                <CardContent className='p-6'>
                  <h3 className="text-lg font-semibold mb-4">Location</h3>
                  <div className="bg-[#111] p-4 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Coordinates</p>
                    <p className="font-mono text-sm mb-4">
                      {(() => {
                        const parsed = parseLocationString(metadata.location);
                        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
                          return `Latitude: ${parsed.lat}, Longitude: ${parsed.lng}`;
                        }
                        if (typeof metadata.location === 'string') {
                          return metadata.location;
                        }
                        return JSON.stringify(metadata.location);
                      })()}
                    </p>
                    <Button 
                      onClick={() => {
                        const parsedLocation = parseLocationString(metadata.location);
                        if (parsedLocation && typeof parsedLocation.lat === 'number' && typeof parsedLocation.lng === 'number') {
                          setShowLocationModal(true);
                        } else {
                          toast('Location data is invalid or missing coordinates.');
                        }
                      }}
                      variant="outline" 
                      className="w-full border-[#333] cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      View on Map
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className='border-[#333] shadow-lg text-white bg-[#000]'>
              <CardContent className='p-6'>
                <h3 className="text-lg font-semibold mb-4">Technical Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Edition */}
                  {metadata.edition && (
                    <div>
                      <p className="text-sm text-gray-400">Edition</p>
                      <p className="font-medium">{metadata.edition}</p>
                    </div>
                  )}
                  {/* Royalties */}
                  {metadata.royalties && (
                    <div>
                      <p className="text-sm text-gray-400">Royalties</p>
                      <p className="font-medium">{metadata.royalties}</p>
                    </div>
                  )}
                  {/* Model Format */}
                  {metadata.interoperabilityFormats && metadata.interoperabilityFormats.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400">Model Format</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {metadata.interoperabilityFormats.map((format, index) => (
                          <Badge key={index} variant="outline" className="border-[#333]">
                            {format}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Properties */}
                  {metadata.properties && Object.keys(metadata.properties).length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400">Properties</p>
                      <div className="bg-[#111] p-3 rounded-lg mt-1">
                        {Object.entries(metadata.properties).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Location Map Modal */}
      {hasLocation(metadata?.location) && (
        <LocationMapModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          initialLocation={parseLocationString(metadata.location) || undefined}
        />
      )}
    </div>
  );
}
