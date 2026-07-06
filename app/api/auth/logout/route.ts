import { NextResponse } from 'next/server';
import { getSession, clearCookieValue, logActivity } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST() {
  const user = getSession();
  if (user) logActivity(user.id, 'Signed out');
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookieValue());
  return res;
}
