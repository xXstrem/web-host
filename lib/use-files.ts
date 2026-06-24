'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { FileRow, FolderRow, Item } from '@/lib/files';

async function logActivity(userId: string, action: string, target?: string) {
  await supabase.from('activity_logs').insert({ user_id: userId, action, target: target ?? null });
}

export function useFiles(parentId: string | null) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [f, fl] = await Promise.all([
      supabase.from('folders').select('*').eq('owner_id', user.id).eq('parent_id', parentId),
      supabase.from('files').select('*').eq('owner_id', user.id).eq('folder_id', parentId),
    ]);
    setFolders((f.data as FolderRow[]) ?? []);
    setFiles((fl.data as FileRow[]) ?? []);
    setLoading(false);
  }, [user, parentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createFolder(name: string) {
    if (!user) return { error: null };
    const { error } = await supabase
      .from('folders')
      .insert({ owner_id: user.id, parent_id: parentId, name });
    if (!error) {
      await logActivity(user.id, 'Created folder', name);
      refresh();
    }
    return { error: error?.message ?? null };
  }

  async function createFile(name: string, content: string) {
    if (!user) return { error: null };
    const path = `${user.id}/${Date.now()}-${name}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { upsert: true });
    if (upErr) return { error: upErr.message };
    const { error } = await supabase.from('files').insert({
      owner_id: user.id,
      folder_id: parentId,
      name,
      storage_path: path,
      mime_type: 'text/plain',
      size_bytes: blob.size,
    });
    if (!error) {
      await logActivity(user.id, 'Created file', name);
      refresh();
    }
    return { error: error?.message ?? null };
  }

  async function uploadFiles(fileList: File[]) {
    if (!user) return [];
    const results: { name: string; error: string | null }[] = [];
    for (const file of fileList) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
      if (upErr) {
        results.push({ name: file.name, error: upErr.message });
        continue;
      }
      const { error } = await supabase.from('files').insert({
        owner_id: user.id,
        folder_id: parentId,
        name: file.name,
        storage_path: path,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      });
      if (error) {
        results.push({ name: file.name, error: error.message });
      } else {
        results.push({ name: file.name, error: null });
        await logActivity(user.id, 'Uploaded', file.name);
      }
    }
    refresh();
    return results;
  }

  async function renameFolder(id: string, name: string) {
    if (!user) return { error: null };
    const { error } = await supabase.from('folders').update({ name }).eq('id', id);
    if (!error) {
      await logActivity(user.id, 'Renamed folder', name);
      refresh();
    }
    return { error: error?.message ?? null };
  }

  async function renameFile(id: string, name: string) {
    if (!user) return { error: null };
    const { error } = await supabase.from('files').update({ name }).eq('id', id);
    if (!error) {
      await logActivity(user.id, 'Renamed file', name);
      refresh();
    }
    return { error: error?.message ?? null };
  }

  async function deleteFolder(row: FolderRow) {
    if (!user) return;
    // delete child files (storage + rows) recursively, then folder
    const { data: childFolders } = await supabase.from('folders').select('*').eq('parent_id', row.id);
    for (const cf of childFolders ?? []) await deleteFolder(cf as FolderRow);
    const { data: childFiles } = await supabase.from('files').select('*').eq('folder_id', row.id);
    for (const cf of childFiles ?? []) await deleteFileRow(cf as FileRow);
    await supabase.from('folders').delete().eq('id', row.id);
    await logActivity(user.id, 'Deleted folder', row.name);
    refresh();
  }

  async function deleteFileRow(row: FileRow) {
    await supabase.storage.from(STORAGE_BUCKET).remove([row.storage_path]);
    await supabase.from('files').delete().eq('id', row.id);
    if (user) await logActivity(user.id, 'Deleted file', row.name);
  }

  async function deleteFile(id: string) {
    const row = files.find((f) => f.id === id);
    if (row) await deleteFileRow(row);
    refresh();
  }

  async function moveFile(id: string, targetFolderId: string | null) {
    if (!user) return { error: null };
    const { error } = await supabase.from('files').update({ folder_id: targetFolderId }).eq('id', id);
    if (!error) {
      await logActivity(user.id, 'Moved file');
      refresh();
    }
    return { error: error?.message ?? null };
  }

  async function getPublicUrl(row: FileRow): Promise<string> {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(row.storage_path);
    return data.publicUrl;
  }

  async function downloadFile(row: FileRow) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(row.storage_path);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = row.name;
    a.click();
    URL.revokeObjectURL(url);
    if (user) await logActivity(user.id, 'Downloaded', row.name);
  }

  async function getFileContent(row: FileRow): Promise<string> {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(row.storage_path);
    if (error || !data) return '';
    return await data.text();
  }

  async function saveFileContent(row: FileRow, content: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    await supabase.storage.from(STORAGE_BUCKET).upload(row.storage_path, blob, { upsert: true });
    await supabase.from('files').update({ size_bytes: blob.size }).eq('id', row.id);
    if (user) await logActivity(user.id, 'Edited file', row.name);
    refresh();
  }

  return {
    folders,
    files,
    loading,
    refresh,
    createFolder,
    createFile,
    uploadFiles,
    renameFolder,
    renameFile,
    deleteFolder,
    deleteFile,
    moveFile,
    getPublicUrl,
    downloadFile,
    getFileContent,
    saveFileContent,
  };
}
