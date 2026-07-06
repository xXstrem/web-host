import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'ton-cloud-dev-secret-change-in-production';
const COOKIE_NAME = 'toncloud_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: number;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
};

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionUser;
    return payload;
  } catch {
    return null;
  }
}

export function getSession(): SessionUser | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function sessionCookieValue(user: SessionUser): string {
  const token = createToken(user);
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${SESSION_MAX_AGE}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export function clearCookieValue(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Legacy helpers for server components (not for route handlers that return NextResponse)
export function setSessionCookie(user: SessionUser) {
  const token = createToken(user);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function getUserByEmail(email: string) {
  return db.prepare('select * from users where email = ?').get(email) as
    | { id: number; email: string; name: string; password_hash: string; role: string }
    | undefined;
}

export function getUserById(id: number) {
  return db.prepare('select id, email, name, role, created_at from users where id = ?').get(id) as
    | SessionUser & { created_at: string }
    | undefined;
}

export function isSetupComplete(): boolean {
  const row = db.prepare('select completed from setup_state where id = 1').get() as
    | { completed: number }
    | undefined;
  return (row?.completed ?? 0) === 1;
}

export function completeSetup() {
  db.prepare('update setup_state set completed = 1, completed_at = datetime(\'now\') where id = 1').run();
}

export function userCount(): number {
  const row = db.prepare('select count(*) as c from users').get() as { c: number };
  return row.c;
}

export function logActivity(userId: number, action: string, target?: string) {
  db.prepare('insert into activity_logs (user_id, action, target) values (?, ?, ?)').run(
    userId,
    action,
    target ?? null
  );
}
