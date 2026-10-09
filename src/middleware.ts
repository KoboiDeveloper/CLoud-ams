import { NextRequest, NextResponse } from 'next/server';

function decodeJwtPayload(token: string): { exp?: number; roleId?: string } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token?: string): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now() + 5000;
}

/** Strip leftover Task Manager / pre-isolation cookies so they cannot fake a Cloud session. */
function clearLegacyAuthCookies(res: NextResponse) {
  const expired = {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax' as const,
  };
  res.cookies.set('access_token', '', expired);
  res.cookies.set('refresh_token', '', expired);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Cloud-only — never treat Task Manager access_token / refresh_token as Cloud session
  const access = req.cookies.get('cloud_access_token')?.value;
  const refresh = req.cookies.get('cloud_refresh_token')?.value;
  const hasSession = (!!access && !isTokenExpired(access)) || (!!refresh && !isTokenExpired(refresh));
  const hasLegacyCookies =
    !!req.cookies.get('access_token')?.value || !!req.cookies.get('refresh_token')?.value;

  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  if (pathname.startsWith('/api/cloud/auth/login') || pathname.startsWith('/api/cloud/auth/refresh')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/cloud/share/public')) {
    return NextResponse.next();
  }

  if (!isPublic && !hasSession) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    const res = NextResponse.redirect(url);
    if (hasLegacyCookies) clearLegacyAuthCookies(res);
    return res;
  }

  if (pathname === '/login' && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/drive';
    url.search = ''; // do not carry ?msg= onto /drive (was causing the stuck URL)
    return NextResponse.redirect(url);
  }

  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = hasSession ? '/drive' : '/login';
    url.search = '';
    const res = NextResponse.redirect(url);
    if (!hasSession && hasLegacyCookies) clearLegacyAuthCookies(res);
    return res;
  }

  if (hasLegacyCookies) {
    const res = NextResponse.next();
    clearLegacyAuthCookies(res);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
