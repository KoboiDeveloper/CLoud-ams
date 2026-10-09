import { NextRequest, NextResponse } from 'next/server';

function decodeJwtPayload(token: string): {
  exp?: number;
  roleId?: string;
  mustChangePassword?: boolean;
} | null {
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
  const access = req.cookies.get('cloud_access_token')?.value;
  const refresh = req.cookies.get('cloud_refresh_token')?.value;
  const accessPayload = access && !isTokenExpired(access) ? decodeJwtPayload(access) : null;
  const hasSession =
    (!!access && !isTokenExpired(access)) || (!!refresh && !isTokenExpired(refresh));
  const mustChangePassword = accessPayload?.mustChangePassword === true;
  const hasLegacyCookies =
    !!req.cookies.get('access_token')?.value || !!req.cookies.get('refresh_token')?.value;

  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  const isPublicAuthApi =
    pathname.startsWith('/api/cloud/auth/login') ||
    pathname.startsWith('/api/cloud/auth/refresh') ||
    pathname.startsWith('/api/cloud/auth/forgot-password') ||
    pathname.startsWith('/api/cloud/auth/reset-password') ||
    pathname.startsWith('/api/cloud/auth/workspace-handoff');

  if (isPublicAuthApi || pathname.startsWith('/api/cloud/share/public')) {
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

  // Force change password gate (cloud.amscorp.id only — JWT claim)
  const changeAllowed =
    pathname.startsWith('/change-password') ||
    pathname.startsWith('/api/cloud/auth/change-password') ||
    pathname.startsWith('/api/cloud/auth/logout') ||
    pathname.startsWith('/api/cloud/auth/user-info') ||
    pathname.startsWith('/api/cloud/auth/refresh');

  if (hasSession && mustChangePassword && !changeAllowed && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { message: 'Password change required', mustChangePassword: true },
        { status: 403 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = '/change-password';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = mustChangePassword ? '/change-password' : '/drive';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (pathname === '/change-password' && hasSession && !mustChangePassword) {
    const url = req.nextUrl.clone();
    url.pathname = '/drive';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = !hasSession
      ? '/login'
      : mustChangePassword
        ? '/change-password'
        : '/drive';
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
