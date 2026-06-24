import { FolderRow, FileRow } from './use-files';

export type { FolderRow, FileRow };

export type ActivityLogRow = {
  id: number;
  user_id: number;
  action: string;
  target: string | null;
  created_at: string;
};
