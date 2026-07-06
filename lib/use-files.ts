'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

async function safeFetch(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error ?? `Request failed (${res.status})`, data: null };
    }
    const data = await res.json();
    return { error: null, data };
  } catch (e: any) {
    return { error: e?.message ?? 'Network error', data: null };
  }
}

export function useFiles(parentId: number | null) {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep parentId in a ref so refresh() identity stays stable
  const parentIdRef = useRef(parentId);
  parentIdRef.current = parentId;

  const refresh = useCallback(async () => {
    setLoading(true);
    const pid = parentIdRef.current;
    const { error, data } = await safeFetch(`/api/files?folderId=${pid ?? 'null'}`);
    if (error) {
      setLoading(false);
      return;
    }
    setFolders(data?.folders ?? []);
    setFiles(data?.files ?? []);
    setLoading(false);
  }, []); // stable identity — never recreated

  useEffect(() => {
    refresh();
  }, [refresh, parentId]); // refetch when folder changes

  const apiPost = useCallback(async (body: Record<string, unknown>) => {
    return safeFetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }, []); // stable identity

  const createFolder = useCallback(async (name: string) => {
    const { error } = await apiPost({ action: 'mkdir', name, parentId: parentIdRef.current });
    if (error) return { error };
    await refresh();
    return { error: null as string | null };
  }, [apiPost, refresh]);

  const createFile = useCallback(async (name: string, content: string) => {
    const { error } = await apiPost({ action: 'createFile', name, content, parentId: parentIdRef.current });
    if (error) return { error };
    await refresh();
    return { error: null as string | null };
  }, [apiPost, refresh]);

  const uploadFiles = useCallback(async (fileList: File[]) => {
    const formData = new FormData();
    formData.append('folderId', String(parentIdRef.current ?? 'null'));
    for (const f of fileList) formData.append('files', f);
    const { error, data } = await safeFetch('/api/files/upload', { method: 'POST', body: formData });
    await refresh();
    if (error) return [{ name: 'upload', error }];
    return (data?.results ?? []) as { name: string; error: string | null }[];
  }, [refresh]);

  const renameFolder = useCallback(async (id: number, name: string) => {
    await apiPost({ action: 'rename', id, name, kind: 'folder' });
    await refresh();
    return { error: null as string | null };
  }, [apiPost, refresh]);

  const renameFile = useCallback(async (id: number, name: string) => {
    await apiPost({ action: 'rename', id, name, kind: 'file' });
    await refresh();
    return { error: null as string | null };
  }, [apiPost, refresh]);

  const deleteFolder = useCallback(async (row: FolderRow) => {
    await apiPost({ action: 'deleteFolder', id: row.id });
    await refresh();
  }, [apiPost, refresh]);

  const deleteFile = useCallback(async (id: number) => {
    await apiPost({ action: 'deleteFile', id });
    await refresh();
  }, [apiPost, refresh]);

  const moveFile = useCallback(async (id: number, targetFolderId: number | null) => {
    await apiPost({ action: 'move', id, targetFolderId });
    await refresh();
    return { error: null as string | null };
  }, [apiPost, refresh]);

  const downloadFile = useCallback(async (row: FileRow) => {
    const a = document.createElement('a');
    a.href = `/api/files/download?id=${row.id}`;
    a.download = row.name;
    a.click();
  }, []);

  const getFileContent = useCallback(async (row: FileRow): Promise<string> => {
    const { data } = await safeFetch(`/api/files/content?id=${row.id}`);
    return data?.content ?? '';
  }, []);

  const saveFileContent = useCallback(async (row: FileRow, content: string) => {
    await safeFetch('/api/files/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, content }),
    });
    await refresh();
  }, [refresh]);

  const getAllFolders = useCallback(async (): Promise<FolderRow[]> => {
    const { data } = await apiPost({ action: 'allFolders' });
    return data?.folders ?? [];
  }, [apiPost]); // stable — doesn't depend on refresh

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
