import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Common scraper bot user agents to block at the edge if flooding requests
const BLOCKED_BOT_REGEX = /bytespider|gptbot|claudebot|ccbot|semrushbot|ahrefsbot|dotbot/i;

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';

  // Block aggressive crawling bots that consume high volume edge requests
  if (BLOCKED_BOT_REGEX.test(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static assets/chunks)
     * - _next/image (image optimization routes)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Static asset file extensions (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico, .css, .js, .woff, .woff2)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
