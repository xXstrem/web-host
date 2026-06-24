'use client';

import { useCallback, useEffect, useState } from 'react';

export type FolderRow = {
  id: number;
  name: string;
  parent_id: number | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: number;
  name: string;
  folder_id: number | null;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
};

export type Item =
  | ({ kind: 'folder' } & FolderRow)
  | ({ kind: 'file' } & FileRow);

export function useFiles(parentId: number | null) {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/files?folderId=${parentId ?? 'null'}`);
    const data = await res.json();
    setFolders(data.folders ?? []);
    setFiles(data.files ?? []);
    setLoading(false);
  }, [parentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function apiPost(body: Record<string, unknown>) {
    const res = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function createFolder(name: string) {
    const data = await apiPost({ action: 'mkdir', name, parentId });
    if (data.error) return { error: data.error };
    refresh();
    return { error: null };
  }

  async function createFile(name: string, content: string) {
    const data = await apiPost({ action: 'createFile', name, content, parentId });
    if (data.error) return { error: data.error };
    refresh();
    return { error: null };
  }

  async function uploadFiles(fileList: File[]) {
    const formData = new FormData();
    formData.append('folderId', String(parentId ?? 'null'));
    for (const f of fileList) formData.append('files', f);
    const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
    const data = await res.json();
    refresh();
    return (data.results ?? []) as { name: string; error: string | null }[];
  }

  async function renameFolder(id: number, name: string) {
    await apiPost({ action: 'rename', id, name, kind: 'folder' });
    refresh();
    return { error: null };
  }

  async function renameFile(id: number, name: string) {
    await apiPost({ action: 'rename', id, name, kind: 'file' });
    refresh();
    return { error: null };
  }

  async function deleteFolder(row: FolderRow) {
    await apiPost({ action: 'deleteFolder', id: row.id });
    refresh();
  }

  async function deleteFile(id: number) {
    await apiPost({ action: 'deleteFile', id });
    refresh();
  }

  async function moveFile(id: number, targetFolderId: number | null) {
    await apiPost({ action: 'move', id, targetFolderId });
    refresh();
    return { error: null };
  }

  async function downloadFile(row: FileRow) {
    const a = document.createElement('a');
    a.href = `/api/files/download?id=${row.id}`;
    a.download = row.name;
    a.click();
  }

  async function getFileContent(row: FileRow): Promise<string> {
    const res = await fetch(`/api/files/content?id=${row.id}`);
    const data = await res.json();
    return data.content ?? '';
  }

  async function saveFileContent(row: FileRow, content: string) {
    await fetch('/api/files/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, content }),
    });
    refresh();
  }

  async function getAllFolders(): Promise<FolderRow[]> {
    const data = await apiPost({ action: 'allFolders' });
    return data.folders ?? [];
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
    downloadFile,
    getFileContent,
    saveFileContent,
    getAllFolders,
  };
}
