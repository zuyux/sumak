import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    console.log('Files API called');
    
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

    // Validate file sizes with appropriate limits
    const maxMintSize = 300 * 1024 * 1024; // 300MB for mints
    const maxImageSize = 10 * 1024 * 1024;  // 10MB for images
    
    if (mintFile.size > maxMintSize) {
      return NextResponse.json({ 
        error: `Mint file too large. Maximum size is 300MB, received ${Math.round(mintFile.size / 1024 / 1024)}MB` 
      }, { status: 413 });
    }

    if (imageFile && imageFile.size > maxImageSize) {
      return NextResponse.json({ 
        error: `Image file too large. Maximum size is 10MB, received ${Math.round(imageFile.size / 1024 / 1024)}MB` 
      }, { status: 413 });
    }

    console.log('Uploading mint file to Pinata:', mintFile.name);

    // Check environment variables
    if (!process.env.PINATA_JWT) {
      console.error('PINATA_JWT environment variable not set');
      return NextResponse.json({ error: "Server configuration error - missing Pinata credentials" }, { status: 500 });
    }

    // Upload the mint file to Pinata with error handling
    let mintResult;
    try {
      mintResult = await pinata.upload.public.file(mintFile);
    } catch (error) {
      console.error('Pinata mint upload error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) {
          return NextResponse.json({ 
            error: "Mint file too large for IPFS upload. Please reduce file size." 
          }, { status: 413 });
        }
        if (error.response?.status === 429) {
          return NextResponse.json({ 
            error: "Too many upload requests. Please wait and try again." 
          }, { status: 429 });
        }
      }
      return NextResponse.json({ 
        error: "Failed to upload mint file to IPFS. Please try again." 
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

    // Upload the image file to Pinata (if provided) with error handling
    if (imageFile) {
      console.log('Uploading image file to Pinata:', imageFile.name);
      let imageResult;
      try {
        imageResult = await pinata.upload.public.file(imageFile);
      } catch (error) {
        console.error('Pinata image upload error:', error);
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 413) {
            return NextResponse.json({ 
              error: "Image file too large for IPFS upload. Please reduce file size." 
            }, { status: 413 });
          }
          if (error.response?.status === 429) {
            return NextResponse.json({ 
              error: "Too many upload requests. Please wait and try again." 
            }, { status: 429 });
          }
        }
        return NextResponse.json({ 
          error: "Failed to upload image file to IPFS. Please try again." 
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

    return NextResponse.json({ metadataCid }, { status: 200 });
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
