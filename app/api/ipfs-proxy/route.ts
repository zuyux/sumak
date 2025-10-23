import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ipfsHash = searchParams.get('hash');
  const filename = searchParams.get('filename') || 'image.png';
  
  if (!ipfsHash) {
    return NextResponse.json({ error: 'IPFS hash is required' }, { status: 400 });
  }

  // Comprehensive list of IPFS gateways with high compatibility
  const gateways = [
    'https://ipfs.io/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://nftstorage.link/ipfs/'
  ];

  // Headers for maximum compatibility
  const commonHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
  };

  for (const gateway of gateways) {
    try {
      const imageUrl = `${gateway}${ipfsHash}`;
      console.log(`Trying gateway: ${imageUrl}`);
      
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'Accept': 'image/*, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; SBTC-ImageProxy/1.0)',
          'Cache-Control': 'max-age=31536000',
        },
        // Add timeout for faster fallback
        signal: AbortSignal.timeout(5000), // 5 second timeout per gateway
      });

      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer();
        
        // Detect content type from response or fallback to common image types
        let contentType = imageResponse.headers.get('content-type');
        
        if (!contentType || !contentType.startsWith('image/')) {
          // Try to determine content type from filename or default to image/png
          const extension = filename.split('.').pop()?.toLowerCase();
          switch (extension) {
            case 'jpg':
            case 'jpeg':
              contentType = 'image/jpeg';
              break;
            case 'png':
              contentType = 'image/png';
              break;
            case 'gif':
              contentType = 'image/gif';
              break;
            case 'webp':
              contentType = 'image/webp';
              break;
            case 'svg':
              contentType = 'image/svg+xml';
              break;
            default:
              contentType = 'image/png';
          }
        }

        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': imageBuffer.byteLength.toString(),
            'Content-Disposition': `inline; filename="${filename}"`,
            'Accept-Ranges': 'bytes',
            ...commonHeaders,
          },
        });
      } else {
        console.warn(`Gateway ${gateway} returned status: ${imageResponse.status}`);
      }
    } catch (error) {
      console.warn(`Gateway ${gateway} failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }

  // If all gateways fail, return a placeholder or error
  return new NextResponse(
    JSON.stringify({ 
      error: 'Failed to load image from all gateways',
      hash: ipfsHash,
      attempted_gateways: gateways.length 
    }),
    { 
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...commonHeaders,
      }
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}