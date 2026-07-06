import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'toncloud_session';
const JWT_SECRET = process.env.JWT_SECRET || 'ton-cloud-dev-secret-change-in-production';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  let user: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      user = payload;
    } catch {
      user = null;
    }
  }

  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (user && (pathname === '/' || pathname.startsWith('/setup'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/', '/setup'],
};
