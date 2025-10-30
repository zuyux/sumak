import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";
import axios from 'axios';

export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('Files API called');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Check content-length header first for early 413 detection
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      console.log(`Request body size: ${sizeInMB.toFixed(2)}MB`);
      
      // Pre-check against our limits before parsing
      if (parseInt(contentLength) > 30 * 1024 * 1024) { // 30MB total limit
        return NextResponse.json({ 
          error: `Request too large. Total size: ${sizeInMB.toFixed(2)}MB. Maximum allowed: 30MB` 
        }, { status: 413 });
      }
    }
    
    const data = await request.formData();
    const mintFile = data.get("file") as File | null;
    const imageFile = data.get("imageFile") as File | null;

    console.log('Received files:', {
      mintFile: mintFile ? { name: mintFile.name, size: mintFile.size, type: mintFile.type } : null,
      imageFile: imageFile ? { name: imageFile.name, size: imageFile.size, type: imageFile.type } : null
    });

    if (!mintFile) {
      return NextResponse.json({ error: "No mint file provided" }, { status: 400 });
    }

    // Validate file sizes with reasonable limits for audio/image uploads
    const maxMintSize = 25 * 1024 * 1024; // 25MB for audio files
    const maxImageSize = 10 * 1024 * 1024;  // 10MB for images
    
    if (mintFile.size > maxMintSize) {
      return NextResponse.json({ 
        error: `Audio file too large. Maximum size is 25MB, received ${Math.round(mintFile.size / 1024 / 1024)}MB. Please compress your audio file.` 
      }, { status: 413 });
    }

    if (imageFile && imageFile.size > maxImageSize) {
      return NextResponse.json({ 
        error: `Image file too large. Maximum size is 10MB, received ${Math.round(imageFile.size / 1024 / 1024)}MB` 
      }, { status: 413 });
    }

    console.log('Uploading mint file to Pinata:', mintFile.name);

    // Check environment variables with better production logging
    if (!process.env.PINATA_JWT) {
      console.error('PINATA_JWT environment variable not set');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('PINATA')));
      return NextResponse.json({ error: "Server configuration error - missing Pinata credentials" }, { status: 500 });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    console.log('Environment:', { 
      isProduction, 
      hasJWT: !!process.env.PINATA_JWT,
      jwtLength: process.env.PINATA_JWT?.length || 0 
    });

    console.log('Pinata configuration check passed');
    console.log('Upload starting for:', {
      fileName: mintFile.name,
      fileSize: `${(mintFile.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: mintFile.type
    });

    // Upload the mint file to Pinata with enhanced error handling
    let mintResult;
    try {
      console.log('Starting Pinata upload with enhanced error handling...');
      mintResult = await pinata.upload.public.file(mintFile);
    } catch (error) {
      console.error('Pinata mint upload error details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        isAxiosError: axios.isAxiosError(error)
      });
      
      if (axios.isAxiosError(error)) {
        console.error('Axios error response:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
        
        if (error.response?.status === 413) {
          return NextResponse.json({ 
            error: "File too large for IPFS upload. Try compressing your audio file to under 20MB." 
          }, { status: 413 });
        }
        if (error.response?.status === 429) {
          return NextResponse.json({ 
            error: "Pinata rate limit exceeded. Please wait 60 seconds and try again." 
          }, { status: 429 });
        }
        if (error.response?.status === 401) {
          return NextResponse.json({ 
            error: "IPFS authentication failed. Please contact support if this persists." 
          }, { status: 500 });
        }
        if (error.response?.status === 402) {
          return NextResponse.json({ 
            error: "IPFS storage limit exceeded. Please try with a smaller file." 
          }, { status: 413 });
        }
        if (error.code === 'ECONNABORTED') {
          return NextResponse.json({ 
            error: "Upload timeout. Please check your connection and try again with a smaller file." 
          }, { status: 408 });
        }
      }
      return NextResponse.json({ 
        error: "Failed to upload file to IPFS. Please try again with a smaller file or contact support." 
      }, { status: 500 });
    }
    
    if (!mintResult || !mintResult.IpfsHash) {
      throw new Error("Failed to upload mint file to Pinata");
    }
    const mintCid = mintResult.IpfsHash;
    const mintUrl = `https://gateway.pinata.cloud/ipfs/${mintCid}`;
    console.log('Mint File CID:', mintCid);

    let imageCid = null;
    let imageUrl = null;

    // Upload the image file to Pinata (if provided) with enhanced error handling
    if (imageFile) {
      console.log('Uploading image file to Pinata:', imageFile.name);
      let imageResult;
      try {
        imageResult = await pinata.upload.public.file(imageFile);
      } catch (error) {
        console.error('Pinata image upload error details:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          isAxiosError: axios.isAxiosError(error)
        });
        
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 413) {
            return NextResponse.json({ 
              error: "Image file too large for IPFS upload. Please compress to under 8MB." 
            }, { status: 413 });
          }
          if (error.response?.status === 429) {
            return NextResponse.json({ 
              error: "Pinata rate limit exceeded. Please wait and try again." 
            }, { status: 429 });
          }
          if (error.response?.status === 401) {
            return NextResponse.json({ 
              error: "IPFS authentication failed. Please contact support." 
            }, { status: 500 });
          }
        }
        return NextResponse.json({ 
          error: "Failed to upload image to IPFS. Please try again with a smaller image." 
        }, { status: 500 });
      }
      
      if (!imageResult || !imageResult.IpfsHash) {
        throw new Error("Failed to upload image file to Pinata");
      }
      imageCid = imageResult.IpfsHash;
      imageUrl = `https://gateway.pinata.cloud/ipfs/${imageCid}`;
      console.log('Image File CID:', imageCid);
    }

    // Debugging raw values before parsing
    console.log('Raw attributes:', data.get("attributes"));
    console.log('Raw interoperabilityFormats:', data.get("interoperabilityFormats"));
    console.log('Raw customizationData:', data.get("customizationData"));
    console.log('Raw properties:', data.get("properties"));
    console.log('Raw location:', data.get("location"));

    const parseJSON = (value: string | null) => {
      try {
        if (!value || value.trim() === '') return {};
        return JSON.parse(value);
      } catch (error) {
        console.error('Invalid JSON:', value, 'Error:', error);
        throw new Error(`Invalid JSON format in field: ${value}`);
      }
    };

    const parseJSONOrArray = (value: string | null) => {
      try {
        if (!value || value.trim() === '') return [];
        // Try parsing as JSON first
        const parsed = JSON.parse(value);
        // If it's already an array, return it
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item && item.trim && item.trim().length > 0);
        }
        // If it's not an array, wrap it in one
        return [parsed];
      } catch {
        // If parsing fails, treat it as a comma-separated string
        return value ? value.split(',').map((item) => item.trim()).filter(item => item.length > 0) : [];
      }
    };

    const parseLocation = (value: string | null) => {
      try {
        if (!value || value.trim() === '') return null;
        
        // Try parsing as JSON object first (for direct object format)
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object' && 'lat' in parsed && 'lon' in parsed) {
            return {
              lat: parseFloat(parsed.lat),
              lon: parseFloat(parsed.lon),
            };
          }
        } catch {
          // If JSON parsing fails, try string format
        }
        
        // Try parsing string format: "lat: X, lon: Y"
        const match = value.match(/lat:\s*(-?\d+(\.\d+)?),?\s*lon:\s*(-?\d+(\.\d+)?)/);
        if (match) {
          return {
            lat: parseFloat(match[1]),
            lon: parseFloat(match[3]),
          };
        }
        
        console.warn('Location format not recognized, skipping location:', value);
        return null; // Return null to exclude from metadata
      } catch (error) {
        console.warn('Error parsing location, skipping location:', value, error);
        return null; // Return null to exclude from metadata
      }
    };

    // Generate metadata
    console.log('Generating metadata...');
    
    const locationData = parseLocation(data.get("location") as string | null);
    
    const metadata = {
      name: data.get("name") as string,
      description: data.get("description") as string,
      external_url: data.get("externalUrl") as string,
      attributes: parseJSON(data.get("attributes") as string | null),
      animation_url: mintUrl, // Link to the mint file
      image: imageUrl, // Link to the image file (null if no image)
      interoperabilityFormats: parseJSONOrArray(data.get("interoperabilityFormats") as string | null),
      customizationData: parseJSON(data.get("customizationData") as string | null),
      edition: data.get("edition") as string,
      royalties: data.get("royalties") as string,
      properties: parseJSON(data.get("properties") as string | null),
      soulbound: data.get("soulbound") === "true",
      ...(locationData && { location: locationData }), // Only include location if valid
    };

    console.log('Parsed location:', locationData);
    console.log('Generated Metadata:', JSON.stringify(metadata, null, 2));
    
    // Debug: Log form data received
    console.log('Form data received:');
    for (const [key, value] of data.entries()) {
      if (typeof value === 'string') {
        console.log(`${key}: ${value}`);
      } else {
        console.log(`${key}: [File object]`);
      }
    }

    // Upload metadata JSON to Pinata
    console.log('Uploading metadata to Pinata...');
    const metadataResult = await pinata.upload.public.json(metadata);
    if (!metadataResult || !metadataResult.IpfsHash) {
      throw new Error("Failed to upload metadata to Pinata");
    }
    const metadataCid = metadataResult.IpfsHash;

    // Return comprehensive response with all URLs and metadata
    return NextResponse.json({ 
      success: true,
      metadataCid,
      imageUrl,
      imageCid,
      audioUrl: mintUrl,
      audioCid: mintCid,
      audioFormat: mintFile.type.split('/')[1],
      durationSeconds: null, // Could be extracted if needed
      fileSizeBytes: mintFile.size,
      attributes: metadata.attributes,
      metadata
    }, { status: 200 });
  } catch (error) {
    console.error('Error in files API route:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Improved error handling with more specific error messages
    let errorMessage = "Internal Server Error";
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 401) {
        errorMessage = "Pinata authentication failed - check API credentials";
        statusCode = 500; // Don't expose auth details to client
      } else if (error.response?.status === 413) {
        errorMessage = "File too large for upload";
        statusCode = 413;
      } else {
        errorMessage = error.response?.data?.error || error.response?.data || error.message || "Upload service error";
      }
    } else if (error instanceof Error) {
      if (error.message.includes('Invalid JSON format')) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes('Invalid location format')) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes('Failed to upload')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
