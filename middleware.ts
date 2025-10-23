import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Agregar cabeceras CORS para todas las respuestas
  const response = NextResponse.next();
  
  // Cabeceras CORS específicas para Safari/iOS
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Cabeceras de cache para imágenes
  if (request.nextUrl.pathname.startsWith('/_next/image') || 
      request.nextUrl.pathname.includes('ipfs') ||
      request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
  
  // Cabeceras específicas para Safari
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};