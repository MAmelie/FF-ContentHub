import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'ff_auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const responseHeaders = {
    // Tell search engines not to index or keep cached copies.
    'X-Robots-Tag': 'noindex, noarchive, nosnippet, noimageindex',
    // Avoid browser/proxy storage of authenticated portal pages.
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  // Redirect /tile to /tiles/tile so content-series tile with link_to_single_type works
  if (pathname === '/tile') {
    const redirectResponse = NextResponse.redirect(new URL('/tiles/tile', request.url));
    Object.entries(responseHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth/login',
    '/connect/discord/redirect',
    '/auth/callback',
    '/auth/error',
    '/auth/success'
  ];

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    const publicResponse = NextResponse.next();
    Object.entries(responseHeaders).forEach(([key, value]) => {
      publicResponse.headers.set(key, value);
    });
    return publicResponse;
  }

  const isBypassEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  const isLocalhost = request.nextUrl.hostname === 'localhost';
  const hasAuthCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (!isBypassEnabled && !isLocalhost && !hasAuthCookie) {
    const loginUrl = new URL('/auth/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    Object.entries(responseHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  const protectedResponse = NextResponse.next();
  Object.entries(responseHeaders).forEach(([key, value]) => {
    protectedResponse.headers.set(key, value);
  });
  return protectedResponse;
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