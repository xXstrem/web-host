import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
