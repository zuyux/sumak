'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLocation?: { lat: number; lng: number };
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
}

export default function LocationMapModal({
  isOpen,
  onClose,
  initialLocation,
  onLocationSelect
}: LocationMapModalProps) {
  const [mapLoading, setMapLoading] = useState<boolean>(true);
  const [currentLat, setCurrentLat] = useState<string>('');
  const [currentLng, setCurrentLng] = useState<string>('');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [marker, setMarker] = useState<L.Marker | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Default to Peru coordinates
  const defaultLocation = { lat: -12.72596, lng: -77.89962 };

  useEffect(() => {
    if (isOpen) {
      if (initialLocation) {
        setCurrentLat(initialLocation.lat.toString());
        setCurrentLng(initialLocation.lng.toString());
      } else {
        setCurrentLat(defaultLocation.lat.toString());
        setCurrentLng(defaultLocation.lng.toString());
      }
    }
  }, [isOpen, initialLocation, defaultLocation.lat, defaultLocation.lng]);

  // Initialize Leaflet map when modal opens
  useEffect(() => {
    if (!isOpen || !mapRef.current || mapInstance) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix for default markers in Leaflet with webpack
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      } catch {
        // Ignore icon fix errors
      }

      const lat = parseFloat(currentLat) || defaultLocation.lat;
      const lng = parseFloat(currentLng) || defaultLocation.lng;

      // Initialize map
      const map = L.map(mapRef.current!).setView([lat, lng], 13);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add draggable marker
      const newMarker = L.marker([lat, lng], { draggable: true }).addTo(map);

      // Handle marker drag events
      newMarker.on('dragend', (e: L.LeafletEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const position = (e.target as any).getLatLng();
        setCurrentLat(position.lat.toFixed(6));
        setCurrentLng(position.lng.toFixed(6));
      });

      // Handle map clicks to move marker
      map.on('click', (e: L.LeafletEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { lat: clickLat, lng: clickLng } = (e as any).latlng;
        newMarker.setLatLng([clickLat, clickLng]);
        setCurrentLat(clickLat.toFixed(6));
        setCurrentLng(clickLng.toFixed(6));
      });

      setMapInstance(map);
      setMarker(newMarker);
      setMapLoading(false);
    }).catch(() => {
      setMapLoading(false);
    });

    // Cleanup function
    return () => {
      if (mapInstance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstance as any).remove();
        setMapInstance(null);
        setMarker(null);
      }
    };
  }, [isOpen, mapInstance, currentLat, currentLng, defaultLocation.lat, defaultLocation.lng]);

  // Update marker position when coordinates change manually
  useEffect(() => {
    if (marker && currentLat && currentLng) {
      const lat = parseFloat(currentLat);
      const lng = parseFloat(currentLng);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        marker.setLatLng([lat, lng]);
        if (mapInstance) {
          mapInstance.setView([lat, lng]);
        }
      }
    }
  }, [currentLat, currentLng, marker, mapInstance]);

  // Handle current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLat(lat.toFixed(6));
        setCurrentLng(lng.toFixed(6));
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Error getting your current location. Please enter coordinates manually.');
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#000] border border-[#333] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <h2 className="text-xl font-semibold text-white">Select NFT Location</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:bg-transparent hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Map Content */}
        <div className="p-4">
          {/* Manual coordinate input and current location */}
          {onLocationSelect && (
            <div className="mb-4 p-4 bg-[#111] border border-[#333] rounded-lg">
              <h3 className="text-white font-semibold mb-3">Set Location Coordinates</h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={currentLat}
                    onChange={(e) => setCurrentLat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222] border border-[#555] rounded text-white text-sm"
                    placeholder="e.g., -12.72596"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={currentLng}
                    onChange={(e) => setCurrentLng(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222] border border-[#555] rounded text-white text-sm"
                    placeholder="e.g., -77.89962"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleGetCurrentLocation}
                  variant="outline"
                  className="flex-1 border-[#333] text-white bg-transparent hover:bg-[#222] cursor-pointer"
                >
                  <Target className="mr-2 h-4 w-4" />
                  Use Current Location
                </Button>
                <Button
                  onClick={() => {
                    const lat = parseFloat(currentLat);
                    const lng = parseFloat(currentLng);
                    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                      onLocationSelect({ lat, lng });
                      onClose();
                    }
                  }}
                  disabled={!currentLat || !currentLng || isNaN(parseFloat(currentLat)) || isNaN(parseFloat(currentLng))}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set Location
                </Button>
              </div>
            </div>
          )}

          {/* Current coordinates display */}
          {currentLat && currentLng && !onLocationSelect && (
            <div className="mb-4 p-3 bg-[#111] border border-[#333] rounded-lg">
              <p className="text-gray-400 text-sm mb-1">NFT Coordinates:</p>
              <p className="text-white font-mono text-sm">
                Lat: {parseFloat(currentLat).toFixed(6)}, Lng: {parseFloat(currentLng).toFixed(6)}
              </p>
            </div>
          )}

          {/* Interactive Map */}
          <div className="w-full h-96 rounded-lg overflow-hidden border border-[#333] relative">
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#111] text-gray-400 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Loading interactive map...</p>
                </div>
              </div>
            )}
            
            {/* Leaflet CSS */}
            <link 
              rel="stylesheet" 
              href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
            />
            
            {/* Map container */}
            <div 
              ref={mapRef} 
              className="w-full h-full"
              style={{ zIndex: 1 }}
            />
            
            {/* Instructions overlay */}
            {!mapLoading && onLocationSelect && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-[1000] max-w-48">
                💡 Click on the map or drag the marker to set location
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            {currentLat && currentLng && !isNaN(parseFloat(currentLat)) && !isNaN(parseFloat(currentLng)) && (
              <Button
                variant="outline"
                onClick={() => {
                  const lat = parseFloat(currentLat);
                  const lng = parseFloat(currentLng);
                  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
                  window.open(osmUrl, '_blank');
                }}
                className="border-[#333] text-white bg-black hover:bg-[#222] cursor-pointer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in OSM
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}