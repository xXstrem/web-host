import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_DIR = path.join(DATA_DIR, 'storage');
const DB_PATH = path.join(DATA_DIR, 'toncloud.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  create table if not exists users (
    id integer primary key autoincrement,
    email text not null unique,
    name text,
    password_hash text not null,
    role text not null default 'user' check (role in ('admin','user')),
    created_at text not null default (datetime('now'))
  );

  create table if not exists folders (
    id integer primary key autoincrement,
    owner_id integer not null references users(id) on delete cascade,
    parent_id integer references folders(id) on delete cascade,
    name text not null,
    created_at text not null default (datetime('now')),
    updated_at text not null default (datetime('now')),
    unique (parent_id, name, owner_id)
  );

  create table if not exists files (
    id integer primary key autoincrement,
    owner_id integer not null references users(id) on delete cascade,
    folder_id integer references folders(id) on delete set null,
    name text not null,
    storage_path text not null,
    mime_type text not null default 'application/octet-stream',
    size_bytes integer not null default 0,
    created_at text not null default (datetime('now')),
    updated_at text not null default (datetime('now'))
  );

  create table if not exists activity_logs (
    id integer primary key autoincrement,
    user_id integer not null references users(id) on delete cascade,
    action text not null,
    target text,
    created_at text not null default (datetime('now'))
  );

  create table if not exists setup_state (
    id integer primary key default 1,
    completed integer not null default 0,
    completed_at text,
    check (id = 1)
  );

  insert or ignore into setup_state (id, completed) values (1, 0);
`);

export { db, STORAGE_DIR, DATA_DIR };
