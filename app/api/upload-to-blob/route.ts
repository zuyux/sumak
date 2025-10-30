import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This endpoint creates presigned URLs for direct blob uploads (bypasses body size limits)
export async function POST(request: NextRequest) {
  try {
    console.log('Blob presigned URL API called');
    
    // Check if blob storage is properly configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable not set');
      return NextResponse.json({ 
        error: "Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN to environment variables." 
      }, { status: 500 });
    }

    const body = (await request.json()) as HandleUploadBody;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          console.log('Generating presigned URL for:', {
            pathname,
            clientPayload
          });

          // Validate file type and size from client payload
          if (clientPayload && typeof clientPayload === 'object') {
            const payload = clientPayload as Record<string, unknown>;
            const { fileType, fileSize, fileName } = payload as {
              fileType: string;
              fileSize: number;
              fileName: string;
            };

            // Validate file size limits
            const maxAudioSize = 50 * 1024 * 1024; // 50MB for audio
            const maxImageSize = 20 * 1024 * 1024; // 20MB for images
            const maxSize = fileType === 'audio' ? maxAudioSize : maxImageSize;

            if (fileSize > maxSize) {
              const sizeMB = (fileSize / 1024 / 1024).toFixed(2);
              const limitMB = (maxSize / 1024 / 1024).toFixed(0);
              throw new Error(`${fileType} file too large. Size: ${sizeMB}MB, Limit: ${limitMB}MB`);
            }

            console.log('File validation passed:', {
              fileName,
              fileType,
              sizeMB: (fileSize / 1024 / 1024).toFixed(2)
            });
          }

          // Return any additional metadata you want to store with the blob
          return {
            allowedContentTypes: [
              'audio/mpeg',
              'audio/mp3', 
              'audio/wav',
              'audio/m4a',
              'audio/aac',
              'audio/ogg',
              'audio/flac',
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/webp'
            ],
            maximumSizeInBytes: 50 * 1024 * 1024, // 50MB max
            allowOverwrite: true, // Allow overwriting existing blobs with same pathname
            tokenPayload: JSON.stringify({
              uploadedAt: new Date().toISOString(),
              ...(typeof clientPayload === 'object' && clientPayload ? clientPayload : {})
            })
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('Blob upload completed:', {
            url: blob.url,
            downloadUrl: blob.downloadUrl,
            pathname: blob.pathname,
            tokenPayload
          });
          
          // Here you could save blob info to your database if needed
          // await saveBlobToDatabase(blob, tokenPayload);
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (error) {
      console.error('Blob upload error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Upload failed' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Blob presigned URL error:', error);
    
    let errorMessage = "Failed to create blob upload URL";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('size') || error.message.includes('large')) {
        errorMessage = error.message;
        statusCode = 413;
      } else if (error.message.includes('rate') || error.message.includes('limit')) {
        errorMessage = "Rate limit exceeded. Please wait and try again.";
        statusCode = 429;
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