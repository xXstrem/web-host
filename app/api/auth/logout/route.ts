import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession, logActivity } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST() {
  const user = getSession();
  if (user) logActivity(user.id, 'Signed out');
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
