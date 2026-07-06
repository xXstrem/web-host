import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'toncloud_session';
const JWT_SECRET = process.env.JWT_SECRET || 'ton-cloud-dev-secret-change-in-production';

// Web Crypto API HS256 verification — works in Edge Runtime (unlike jose/jsonwebtoken)
async function verifyJwt(token: string): Promise<any | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const keyData = new TextEncoder().encode(JWT_SECRET);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // base64url -> Uint8Array
  const sigBytes = base64UrlToBytes(sigB64);
  const dataBytes = new TextEncoder().encode(signingInput);

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, dataBytes);
  if (!valid) return null;

  const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
  const payload = JSON.parse(payloadJson);

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  let user: any = null;
  if (token) {
    try {
      user = await verifyJwt(token);
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
