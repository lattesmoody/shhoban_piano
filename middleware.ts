import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  // 허용 경로는 통과 (루트, 로그인 페이지 등)
  const path = request.nextUrl.pathname;
  const allow = (
    path === '/' ||
    path.startsWith('/member_login') ||
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path === '/favicon.ico'
  );
  if (allow) return NextResponse.next();

  const auth = request.cookies.get('auth_token');
  if (!auth) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('unauthorized', '1');
    return NextResponse.redirect(url);
  }
  try {
    const secretKey = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev_secret_change_me');
    await jwtVerify(auth.value, secretKey);
    return NextResponse.next();
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('unauthorized', '1');
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    // 모든 경로를 대상으로 하되, 정적/로그인/루트 등은 제외
    '/((?!$|member_login|api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


