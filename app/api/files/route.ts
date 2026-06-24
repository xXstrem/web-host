import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, logActivity } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const folderId = url.searchParams.get('folderId');
  const fid = folderId && folderId !== 'null' ? Number(folderId) : null;

  const folders = db
    .prepare('select * from folders where owner_id = ? and parent_id is ?')
    .all(user.id, fid) as any[];

  const files = db
    .prepare('select * from files where owner_id = ? and folder_id is ?')
    .all(user.id, fid) as any[];

  return NextResponse.json({ folders, files });
}

export async function POST(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'mkdir') {
    const { name, parentId } = body;
    const pid = parentId && parentId !== 'null' ? Number(parentId) : null;
    try {
      const result = db
        .prepare('insert into folders (owner_id, parent_id, name) values (?, ?, ?)')
        .run(user.id, pid, name);
      logActivity(user.id, 'Created folder', name);
      return NextResponse.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      return NextResponse.json({ error: 'Folder already exists' }, { status: 400 });
    }
  }

  if (action === 'createFile') {
    const { name, content, parentId } = body;
    const pid = parentId && parentId !== 'null' ? Number(parentId) : null;
    const storagePath = `${user.id}/${Date.now()}-${name}`;
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'data', 'storage', storagePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content ?? '');
    const size = Buffer.byteLength(content ?? '');
    const result = db
      .prepare(
        'insert into files (owner_id, folder_id, name, storage_path, mime_type, size_bytes) values (?, ?, ?, ?, ?, ?)'
      )
      .run(user.id, pid, name, storagePath, 'text/plain', size);
    logActivity(user.id, 'Created file', name);
    return NextResponse.json({ id: result.lastInsertRowid });
  }

  if (action === 'rename') {
    const { id, name, kind } = body;
    if (kind === 'folder') {
      db.prepare('update folders set name = ?, updated_at = datetime(\'now\') where id = ? and owner_id = ?').run(name, id, user.id);
      logActivity(user.id, 'Renamed folder', name);
    } else {
      db.prepare('update files set name = ?, updated_at = datetime(\'now\') where id = ? and owner_id = ?').run(name, id, user.id);
      logActivity(user.id, 'Renamed file', name);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'move') {
    const { id, targetFolderId } = body;
    const tid = targetFolderId && targetFolderId !== 'null' ? Number(targetFolderId) : null;
    db.prepare('update files set folder_id = ?, updated_at = datetime(\'now\') where id = ? and owner_id = ?').run(tid, id, user.id);
    logActivity(user.id, 'Moved file');
    return NextResponse.json({ ok: true });
  }

  if (action === 'deleteFolder') {
    const { id } = body;
    await deleteFolderRecursive(Number(id), user.id);
    logActivity(user.id, 'Deleted folder');
    return NextResponse.json({ ok: true });
  }

  if (action === 'deleteFile') {
    const { id } = body;
    const row = db.prepare('select * from files where id = ? and owner_id = ?').get(id, user.id) as any;
    if (row) {
      const fs = await import('fs');
      const path = await import('path');
      const fp = path.join(process.cwd(), 'data', 'storage', row.storage_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      db.prepare('delete from files where id = ? and owner_id = ?').run(id, user.id);
      logActivity(user.id, 'Deleted file', row.name);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'allFolders') {
    const folders = db.prepare('select * from folders where owner_id = ?').all(user.id) as any[];
    return NextResponse.json({ folders });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

async function deleteFolderRecursive(folderId: number, ownerId: number) {
  const fs = await import('fs');
  const path = await import('path');
  const childFolders = db.prepare('select id from folders where parent_id = ? and owner_id = ?').all(folderId, ownerId) as any[];
  for (const cf of childFolders) await deleteFolderRecursive(cf.id, ownerId);
  const childFiles = db.prepare('select * from files where folder_id = ? and owner_id = ?').all(folderId, ownerId) as any[];
  for (const cf of childFiles) {
    const fp = path.join(process.cwd(), 'data', 'storage', cf.storage_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.prepare('delete from files where id = ?').run(cf.id);
  }
  db.prepare('delete from folders where id = ? and owner_id = ?').run(folderId, ownerId);
}
