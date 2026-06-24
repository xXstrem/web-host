import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'toncloud_session';
const JWT_SECRET = process.env.JWT_SECRET || 'ton-cloud-dev-secret-change-in-production';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  let user: any = null;
  if (token) {
    try {
      user = jwt.verify(token, JWT_SECRET);
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
