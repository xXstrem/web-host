import { NextResponse } from 'next/server';
import { getSession, clearCookieValue } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookieValue());
  return res;
}

export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
