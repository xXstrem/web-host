import { NextResponse } from 'next/server';
import { db, STORAGE_DIR } from '@/lib/db';
import { getSession, logActivity } from '@/lib/auth-server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  const folderIdRaw = formData.get('folderId') as string | null;
  const folderId = folderIdRaw && folderIdRaw !== 'null' ? Number(folderIdRaw) : null;

  const userDir = path.join(STORAGE_DIR, String(user.id));
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  const results: { name: string; error: string | null }[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;
    const filePath = path.join(STORAGE_DIR, storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const result = db
      .prepare(
        'insert into files (owner_id, folder_id, name, storage_path, mime_type, size_bytes) values (?, ?, ?, ?, ?, ?)'
      )
      .run(user.id, folderId, file.name, storagePath, file.type || 'application/octet-stream', file.size);

    if (result.lastInsertRowid) {
      results.push({ name: file.name, error: null });
      logActivity(user.id, 'Uploaded', file.name);
    } else {
      results.push({ name: file.name, error: 'Insert failed' });
    }
  }

  return NextResponse.json({ results });
}
