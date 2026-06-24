import { FolderRow, FileRow } from './files';

export type { FolderRow, FileRow };

export type ActivityLogRow = {
  id: string;
  user_id: string;
  action: string;
  target: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};
