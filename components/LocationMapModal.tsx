'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
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
  const [mapUrl, setMapUrl] = useState<string>('');
  const [mapLoading, setMapLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<boolean>(false);
  const [currentLat, setCurrentLat] = useState<string>('');
  const [currentLng, setCurrentLng] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialLocation) {
        setCurrentLat(initialLocation.lat.toString());
        setCurrentLng(initialLocation.lng.toString());
      } else {
        setCurrentLat('');
        setCurrentLng('');
      }
    }
  }, [isOpen, initialLocation]);

  useEffect(() => {
    if (isOpen && currentLat && currentLng) {
      setMapLoading(true);
      setMapError(false);
      const lat = parseFloat(currentLat);
      const lng = parseFloat(currentLng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setMapError(true);
        setMapLoading(false);
        return;
      }
      const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`;
      setMapUrl(osmUrl);
      const loadTimeout = setTimeout(() => {
        setMapLoading(false);
      }, 3000);
      return () => clearTimeout(loadTimeout);
    } else if (isOpen) {
      setMapUrl('');
      setMapLoading(false);
      setMapError(false);
    }
  }, [isOpen, currentLat, currentLng]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#000] border border-[#333] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <h2 className="text-xl font-semibold text-white">NFT Location</h2>
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
          {/* Manual coordinate input for selection (only show if onLocationSelect is provided) */}
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
                className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Set Location
              </Button>
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

          {/* Map Iframe */}
          <div className="w-full h-96 rounded-lg overflow-hidden border border-[#333]">
            {!currentLat || !currentLng ? (
              <div className="flex items-center justify-center h-full bg-[#111] text-gray-400">
                <div className="text-center">
                  <p className="mb-2">No coordinates available for this NFT</p>
                </div>
              </div>
            ) : mapError ? (
              <div className="flex items-center justify-center h-full bg-[#111] text-gray-400">
                <div className="text-center">
                  <p className="mb-2">Failed to load map</p>
                  <p className="text-sm">Invalid coordinates or network error</p>
                </div>
              </div>
            ) : mapUrl ? (
              <div className="relative w-full h-full">
                {mapLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#111] text-gray-400 z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Loading map...</p>
                    </div>
                  </div>
                )}
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="NFT Location Map"
                  onLoad={() => setMapLoading(false)}
                  onError={() => {
                    setMapLoading(false);
                    setMapError(true);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-[#111] text-gray-400">
                Preparing map...
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
                className="border-[#333] text-white bg-black cursor-pointer"
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