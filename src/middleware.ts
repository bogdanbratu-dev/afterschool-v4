import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Subdomenii rezervate care NU sunt micro-site-uri
const RESERVED = new Set(['www', 'app', 'admin', 'api', 'mail', 'ftp', '']);
const ROOT_DOMAIN = 'activkids.ro';

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  const { pathname } = request.nextUrl;

  const isSubdomain =
    host.endsWith('.' + ROOT_DOMAIN) &&
    (() => {
      const sub = host.slice(0, host.length - ROOT_DOMAIN.length - 1);
      return sub && !sub.includes('.') && !RESERVED.has(sub);
    })();

  // Blocheaza accesul direct la /site/* de pe domeniul principal (anti duplicate-content);
  // paginile micro-site sunt servite doar prin rewrite intern de pe subdomenii.
  if (!isSubdomain && pathname.startsWith('/site/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isSubdomain) {
    return NextResponse.next();
  }

  const sub = host.slice(0, host.length - ROOT_DOMAIN.length - 1);
  const url = request.nextUrl.clone();
  url.pathname = `/site/${sub}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/((?!_next/|api/|uploads/|photos/|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)',
  ],
};
