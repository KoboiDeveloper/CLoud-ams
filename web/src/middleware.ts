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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const access = req.cookies.get('access_token')?.value;
  const refresh = req.cookies.get('refresh_token')?.value;
  const hasSession = (!!access && !isTokenExpired(access)) || (!!refresh && !isTokenExpired(refresh));

  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/refresh')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/share/public')) {
    return NextResponse.next();
  }

  if (!isPublic && !hasSession) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/drive';
    return NextResponse.redirect(url);
  }

  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = hasSession ? '/drive' : '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
