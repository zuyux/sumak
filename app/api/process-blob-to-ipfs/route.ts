import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";
import axios from 'axios';
import crypto from 'crypto';

// Function to check if file already exists in IPFS by calculating hash
async function calculateFileHash(buffer: ArrayBuffer): Promise<string> {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from(buffer));
  return hash.digest('hex');
}

// Function to check if a file with this hash already exists in our Pinata account
async function checkExistingFile(fileHash: string, fileName: string): Promise<string | null> {
  try {
    // Search for files with similar names or metadata
    // Note: This is a simplified check - you might want to store file hashes in your database
    console.log(`Checking for existing file with hash: ${fileHash.substring(0, 16)}..., name: ${fileName}`);
    return null; // For now, always upload - we can implement database hash checking later
  } catch (error) {
    console.log('Error checking existing file:', error);
    return null;
  }
}

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This endpoint processes files from Vercel Blob and uploads them to Pinata IPFS
export async function POST(request: NextRequest) {
  try {
    console.log('Blob to IPFS processing API called');
    
    const body = await request.json();
    const { audioBlob, imageBlob, metadata } = body;

    if (!audioBlob || !audioBlob.downloadUrl) {
      return NextResponse.json({ 
        error: "Audio blob information is required" 
      }, { status: 400 });
    }

    // Check Pinata configuration
    if (!process.env.PINATA_JWT) {
      console.error('PINATA_JWT environment variable not set');
      return NextResponse.json({ 
        error: "IPFS service not configured" 
      }, { status: 500 });
    }

    console.log('Processing files from blob storage:', {
      audioBlob: audioBlob.pathname,
      imageBlob: imageBlob?.pathname || 'none',
      hasMetadata: !!metadata,
      imageBlobData: imageBlob ? {
        url: imageBlob.url,
        downloadUrl: imageBlob.downloadUrl,
        pathname: imageBlob.pathname,
        originalName: imageBlob.originalName,
        type: imageBlob.type
      } : null
    });

        // Download and process audio file from blob storage
    console.log('Downloading audio from blob storage:', audioBlob.downloadUrl);
    const audioResponse = await fetch(audioBlob.downloadUrl);
    if (!audioResponse.ok) {
      console.error('Failed to download audio from blob storage:', {
        status: audioResponse.status,
        statusText: audioResponse.statusText,
        url: audioBlob.downloadUrl
      });
      return NextResponse.json({ 
        error: "Failed to download audio from blob storage. Please try again." 
      }, { status: 500 });
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    console.log('Audio buffer downloaded:', {
      size: audioBuffer.byteLength,
      originalName: audioBlob.originalName,
      type: audioBlob.type
    });

    // Calculate audio file hash
    const audioFileHash = await calculateFileHash(audioBuffer);
    console.log('Audio file hash:', audioFileHash.substring(0, 16) + '...');

    // Check if audio already exists (for future implementation)
    const existingAudioCid = await checkExistingFile(audioFileHash, audioBlob.originalName);
    
    let audioCid: string;
    let audioUrl: string;

    if (existingAudioCid) {
      console.log('Audio already exists in IPFS, using existing CID:', existingAudioCid);
      audioCid = existingAudioCid;
      audioUrl = `https://gateway.pinata.cloud/ipfs/${audioCid}`;
    } else {
      // Convert to File for Pinata upload
      const audioFile = new File([audioBuffer], audioBlob.originalName, {
        type: audioBlob.type,
      });

      console.log('Uploading audio to IPFS:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      });

      // Upload audio to Pinata with retry logic
      let audioResult;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          audioResult = await pinata.upload.public.file(audioFile);
          break;
        } catch (uploadError: unknown) {
          retryCount++;
          const errorMsg = uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
          console.warn(`Audio upload attempt ${retryCount} failed:`, errorMsg);
          
          if (retryCount >= maxRetries) {
            console.error('All audio upload attempts failed:', errorMsg);
            return NextResponse.json({ 
              error: "Failed to upload audio to IPFS after multiple attempts. Please try again." 
            }, { status: 500 });
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      if (!audioResult || !audioResult.IpfsHash) {
        console.error('Audio upload failed - no IPFS hash returned');
        return NextResponse.json({ 
          error: "Failed to upload audio to IPFS. Please try again." 
        }, { status: 500 });
      }

      audioCid = audioResult.IpfsHash;
      audioUrl = `https://gateway.pinata.cloud/ipfs/${audioCid}`;
      console.log('Audio uploaded to IPFS successfully:', {
        cid: audioCid,
        attempt: retryCount + 1
      });
    }

    // Process image if provided
    let imageIpfsHash = null;
    if (imageBlob) {
      try {
        console.log('Attempting to download image from blob storage:', {
          downloadUrl: imageBlob.downloadUrl,
          type: imageBlob.type,
          originalName: imageBlob.originalName
        });
        
        // Download with timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const imageResponse = await fetch(imageBlob.downloadUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Sumak-IPFS-Processor/1.0'
          }
        });
        clearTimeout(timeoutId);
        
        console.log('Image blob download response:', {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          contentType: imageResponse.headers.get('content-type'),
          contentLength: imageResponse.headers.get('content-length')
        });
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image from blob: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        console.log('Downloaded image buffer:', {
          size: imageBuffer.byteLength,
          type: 'ArrayBuffer',
          expectedType: imageBlob.type
        });
        
        if (imageBuffer.byteLength === 0) {
          throw new Error('Downloaded image buffer is empty');
        }
        
        // Calculate file hash to check for duplicates
        const fileHash = await calculateFileHash(imageBuffer);
        console.log('Image file hash:', fileHash.substring(0, 16) + '...');
        
        // Check if file already exists (for future implementation)
        const existingCid = await checkExistingFile(fileHash, imageBlob.originalName);
        if (existingCid) {
          console.log('Image already exists in IPFS, using existing CID:', existingCid);
          imageIpfsHash = existingCid;
        } else {
          // Convert to File for Pinata upload with proper MIME type detection
          const mimeType = imageBlob.type || 'application/octet-stream';
          const imageFile = new File([imageBuffer], imageBlob.originalName, {
            type: mimeType,
          });
          
          console.log('Created image file for IPFS:', {
            name: imageFile.name,
            size: imageFile.size,
            type: imageFile.type,
            lastModified: imageFile.lastModified
          });

          // Upload to Pinata with retry logic
          console.log('Starting image upload to IPFS...');
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              const imageResult = await pinata.upload.public.file(imageFile);
              imageIpfsHash = imageResult.IpfsHash;
              console.log('Image uploaded to IPFS successfully:', {
                hash: imageIpfsHash,
                name: imageFile.name,
                attempt: retryCount + 1
              });
              break;
            } catch (uploadError: unknown) {
              retryCount++;
              const errorMsg = uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
              console.warn(`Image upload attempt ${retryCount} failed:`, errorMsg);
              
              if (retryCount >= maxRetries) {
                throw uploadError;
              }
              
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
          }
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        console.error('Error processing image blob to IPFS:', {
          error: errorMsg,
          stack: errorStack,
          imageBlob: {
            downloadUrl: imageBlob.downloadUrl,
            type: imageBlob.type,
            originalName: imageBlob.originalName
          }
        });
        
        // Instead of continuing without image, let's try a different approach
        console.log('Attempting alternative image processing method...');
        try {
          // Try direct upload without File constructor
          const imageResponse = await fetch(imageBlob.downloadUrl);
          if (imageResponse.ok) {
            const blob = await imageResponse.blob();
            console.log('Alternative method - blob created:', {
              size: blob.size,
              type: blob.type
            });
            
            // Create a more basic file object
            const simpleFile = new File([blob], imageBlob.originalName || 'image', {
              type: blob.type || imageBlob.type || 'image/jpeg',
            });
            
            const imageResult = await pinata.upload.public.file(simpleFile);
            imageIpfsHash = imageResult.IpfsHash;
            console.log('Alternative method succeeded - Image uploaded to IPFS:', imageIpfsHash);
          }
        } catch (altError: unknown) {
          const altErrorMsg = altError instanceof Error ? altError.message : 'Unknown alternative error';
          console.error('Alternative image processing also failed:', altErrorMsg);
          // Continue without image as final fallback
          imageIpfsHash = null;
        }
      }
    } else {
      console.log('No image blob provided for processing');
    }

    // Generate URLs for the uploaded files
    const imageUrl = imageIpfsHash ? `https://gateway.pinata.cloud/ipfs/${imageIpfsHash}` : null;

    // Generate complete metadata
    const completeMetadata = {
      ...metadata,
      animation_url: audioUrl,
      image: imageUrl
    };

    console.log('Uploading metadata to IPFS...');
    const metadataResult = await pinata.upload.public.json(completeMetadata);
    if (!metadataResult || !metadataResult.IpfsHash) {
      throw new Error("Failed to upload metadata to IPFS");
    }
    const metadataCid = metadataResult.IpfsHash;

    // Clean up blob storage (optional - blobs will auto-expire)
    // We could implement cleanup here if needed

    console.log('Blob to IPFS processing complete:', {
      audioCid,
      imageCid: imageIpfsHash,
      metadataCid
    });

    // CRITICAL VALIDATION: Ensure all required CIDs are present
    const validationErrors = [];
    
    if (!audioCid) {
      validationErrors.push('Audio CID is missing');
    }
    
    if (!metadataCid) {
      validationErrors.push('Metadata CID is missing');
    }
    
    // Note: Image CID is optional - some NFTs may not have images
    // But if an image was provided initially, it should have been processed
    if (imageBlob && !imageIpfsHash) {
      validationErrors.push('Image was provided but failed to upload to IPFS');
    }
    
    if (validationErrors.length > 0) {
      console.error('Critical validation failed - preventing contract upload:', {
        errors: validationErrors,
        audioCid: audioCid || 'MISSING',
        imageCid: imageIpfsHash || 'MISSING/OPTIONAL',
        metadataCid: metadataCid || 'MISSING',
        imageWasProvided: !!imageBlob
      });
      
      return NextResponse.json({
        success: false,
        error: "Upload validation failed: " + validationErrors.join(', '),
        validationErrors,
        preventContractUpload: true,
        details: {
          audioCid: !!audioCid,
          imageCid: !!imageIpfsHash,
          metadataCid: !!metadataCid,
          imageWasProvided: !!imageBlob
        }
      }, { status: 400 });
    }
    
    console.log('All required CIDs validated successfully - safe to proceed with contract upload');

    // Return comprehensive response
    return NextResponse.json({
      success: true,
      metadataCid,
      audioUrl,
      audioCid,
      imageUrl,
      imageCid: imageIpfsHash,
      audioFormat: audioBlob.type.split('/')[1],
      fileSizeBytes: audioBuffer.byteLength,
      attributes: completeMetadata.attributes,
      metadata: completeMetadata
    });

  } catch (error) {
    console.error('Blob to IPFS processing error:', error);
    
    let errorMessage = "Failed to process files from blob storage";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 413) {
        errorMessage = "File too large for IPFS upload";
        statusCode = 413;
      } else if (error.response?.status === 429) {
        errorMessage = "IPFS rate limit exceeded";
        statusCode = 429;
      } else if (error.response?.status === 401) {
        errorMessage = "IPFS authentication failed";
        statusCode = 500;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}