import { NextResponse } from 'next/server';
import { db, STORAGE_DIR } from '@/lib/db';
import {
  hashPassword,
  setSessionCookie,
  isSetupComplete,
  completeSetup,
  userCount,
  logActivity,
} from '@/lib/auth-server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (isSetupComplete()) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 400 });
  }

  const body = await req.json();
  const { name, email, password } = body as { name?: string; email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = db.prepare('select id from users where email = ?').get(email);
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
  }

  const isFirst = userCount() === 0;
  const role = isFirst ? 'admin' : 'user';
  const hash = hashPassword(password);

  const result = db
    .prepare('insert into users (email, name, password_hash, role) values (?, ?, ?, ?)')
    .run(email, name ?? null, hash, role);

  const userId = result.lastInsertRowid as number;

  // Create user storage directory
  const userDir = path.join(STORAGE_DIR, String(userId));
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  if (isFirst) completeSetup();

  logActivity(userId, 'Setup completed', email);

  setSessionCookie({
    id: userId,
    email,
    name: name ?? null,
    role: role as 'admin' | 'user',
  });

  return NextResponse.json({ ok: true, role });
}
