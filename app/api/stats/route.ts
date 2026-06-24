import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const files = db.prepare('select size_bytes from files where owner_id = ?').all(user.id) as { size_bytes: number }[];
  const folderCount = (db.prepare('select count(*) as c from folders where owner_id = ?').get(user.id) as { c: number }).c;
  const used = files.reduce((s, f) => s + (f.size_bytes ?? 0), 0);

  const recent = db
    .prepare('select * from files where owner_id = ? order by created_at desc limit 6')
    .all(user.id) as any[];

  const logs = db
    .prepare('select * from activity_logs where user_id = ? order by created_at desc limit 8')
    .all(user.id) as any[];

  return NextResponse.json({
    used,
    fileCount: files.length,
    folderCount,
    recent,
    logs,
  });
}
