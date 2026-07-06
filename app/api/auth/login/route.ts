import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyPassword,
  getUserByEmail,
  sessionCookieValue,
  logActivity,
} from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'admin' | 'user',
  };

  logActivity(user.id, 'Signed in');

  const res = NextResponse.json({
    ok: true,
    user: sessionUser,
  });
  res.headers.set('Set-Cookie', sessionCookieValue(sessionUser));
  return res;
}
