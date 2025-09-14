import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  if (!isAdminPath) return NextResponse.next();

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

export const config = { matcher: ['/admin/:path*'] };


