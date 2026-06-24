export type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  name: string;
  folder_id: string | null;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
};

export type Item =
  | ({ kind: 'folder' } & FolderRow)
  | ({ kind: 'file' } & FileRow);

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}

export function fileKind(mime: string, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (['html', 'css', 'js', 'php', 'py', 'json', 'txt', 'md', 'ts', 'tsx'].includes(ext))
    return 'code';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'file';
}

export function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}
