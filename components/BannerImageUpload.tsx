import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { getIPFSUrl } from '@/lib/pinataUpload';
import SafariOptimizedImage from './SafariOptimizedImage';

interface BannerImageUploadProps {
  currentBannerUrl?: string;
  currentBannerCid?: string;
  address: string;
  onUploadSuccess: (bannerUrl: string, bannerCid: string) => void;
  onRemoveSuccess: () => void;
}

export function BannerImageUpload({
  currentBannerUrl,
  currentBannerCid,
  address,
  onUploadSuccess,
  onRemoveSuccess
}: BannerImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setError(null);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !address) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('address', address);

      const response = await fetch('/api/upload-banner', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      const bannerUrl = getIPFSUrl(result.cid);
      
      onUploadSuccess(bannerUrl, result.cid);
      setPreviewUrl(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Banner upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(`Upload failed: ${errorMessage}. Please check your internet connection and try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentBannerCid || !address) return;

    setIsRemoving(true);
    setError(null);

    try {
      const response = await fetch('/api/remove-banner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cid: currentBannerCid,
          address: address
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Remove failed');
      }

      onRemoveSuccess();
    } catch (error) {
      console.error('Banner remove error:', error);
      setError(error instanceof Error ? error.message : 'Remove failed');
    } finally {
      setIsRemoving(false);
    }
  };

  const cancelPreview = () => {
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentImageUrl = currentBannerCid ? getIPFSUrl(currentBannerCid) : currentBannerUrl;
  const displayImageUrl = previewUrl || currentImageUrl;

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-accent-foreground">Banner Image</div>
      
      {/* Banner Preview/Display */}
      <div className="relative w-full h-40 bg-white/10 rounded-xl overflow-hidden">
        {displayImageUrl ? (
          <div className="relative w-full h-full">
            {currentBannerCid ? (
              // Use SafariOptimizedImage for IPFS URLs
              <SafariOptimizedImage
                src={displayImageUrl}
                alt="Banner Preview"
                className="w-full h-full object-cover"
                fill
                filename="banner-preview.jpg"
                onError={() => setError('Failed to load banner image')}
              />
            ) : (
              // Use Next.js Image for regular URLs
              <Image
                src={displayImageUrl}
                alt="Banner Preview"
                fill
                className="object-cover"
                onError={() => setError('Failed to load banner image')}
              />
            )}
            
            {/* Remove button */}
            {(currentBannerCid || currentBannerUrl) && !previewUrl && (
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-accent-background disabled:bg-red-600/50 rounded-lg transition-colors"
                title="Remove banner"
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 text-accent-background animate-spin" />
                ) : (
                  <X className="w-4 h-4 text-white" />
                )}
              </button>
            )}
            
            {/* Cancel preview button */}
            {previewUrl && (
              <button
                onClick={cancelPreview}
                className="absolute top-2 right-2 p-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4 text-accent-foreground" />
              </button>
            )}
          </div>
        ) : (
          /* Upload area when no image */
          <div className="flex flex-col items-center justify-center h-full text-accent-foreground/60">
            <ImageIcon className="w-12 h-12 mb-2" />
            <p className="text-sm">No banner image</p>
            <p className="text-xs text-accent-foreground/40">Recommended: 1200x400px</p>
          </div>
        )}
      </div>

      {/* Upload controls */}
      <div className="flex gap-3">
        <label className="flex-1">
          <input  
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-accent-foreground rounded-lg border border-foreground/20 transition-colors text-center text-sm cursor-pointer">
            <Upload className="w-4 h-4 inline mr-2" />
            Choose Banner Image
          </div>
        </label>
        
        {previewUrl && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-background rounded-lg transition-colors text-sm cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/30">
          {error}
        </div>
      )}

      <div className="text-xs text-accent-foreground/60">
        Upload a banner image for your profile. Recommended size: 1200x400 pixels. Max file size: 10MB.
      </div>
    </div>
  );
}
