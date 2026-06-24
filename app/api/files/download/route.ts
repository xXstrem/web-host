import { NextResponse } from 'next/server';
import { db, STORAGE_DIR } from '@/lib/db';
import { getSession, logActivity } from '@/lib/auth-server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const row = db.prepare('select * from files where id = ? and owner_id = ?').get(Number(id), user.id) as any;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filePath = path.join(STORAGE_DIR, row.storage_path);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File missing on disk' }, { status: 404 });

  const buffer = fs.readFileSync(filePath);
  logActivity(user.id, 'Downloaded', row.name);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': row.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(row.name)}"`,
    },
  });
}
