import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const file = db.prepare('select * from files where id = ? and owner_id = ?').get(Number(id), user.id) as any;
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ file });
}
