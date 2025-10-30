import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 30;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('Test upload limits API called');
    
    // Log environment info
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      hasJWT: !!process.env.PINATA_JWT,
      jwtLength: process.env.PINATA_JWT?.length || 0
    });
    
    // Check content-length header
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      console.log(`Request body size: ${sizeInMB.toFixed(2)}MB`);
    }
    
    // Log all headers
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    try {
      const data = await request.formData();
      const file = data.get("file") as File | null;
      
      if (!file) {
        return NextResponse.json({ 
          error: "No file provided",
          details: "File field missing from FormData"
        }, { status: 400 });
      }
      
      const fileInfo = {
        name: file.name,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2),
        type: file.type,
        lastModified: file.lastModified
      };
      
      console.log('File info:', fileInfo);
      
      return NextResponse.json({ 
        success: true,
        message: "File received successfully",
        fileInfo,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          isVercel: !!process.env.VERCEL,
          region: process.env.VERCEL_REGION,
          hasJWT: !!process.env.PINATA_JWT
        }
      });
      
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      return NextResponse.json({ 
        error: "Failed to parse FormData",
        details: formError instanceof Error ? formError.message : 'Unknown error'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Test upload limits error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Upload limits test endpoint",
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      region: process.env.VERCEL_REGION,
      hasJWT: !!process.env.PINATA_JWT,
      jwtLength: process.env.PINATA_JWT?.length || 0
    }
  });
}