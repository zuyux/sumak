import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract the dynamic path from the incoming request URL.
    // We avoid using the typed context parameter to prevent TypeScript
    // incompatibilities with Next's route handler signature.
  const reqUrl = new URL(request.url);
    // The route is mounted at /api/stacks-proxy/, so remove that prefix.
    const prefix = '/api/stacks-proxy/';
  let pathString = reqUrl.pathname.replace(prefix, '');
    // Trim leading/trailing slashes
    pathString = pathString.replace(/^\/+|\/+$/g, '');
    
    // Determine the correct API URL based on network
    const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
    const baseUrl = networkEnv === "mainnet" 
      ? "https://stacks-node-api.mainnet.stacks.co"
      : "https://stacks-node-api.testnet.stacks.co";
    
  const targetUrl = `${baseUrl}/${pathString}`;
  console.log('Proxying request to:', targetUrl);
    
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Stacks proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Stacks API' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}