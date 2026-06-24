'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { FileRow, formatBytes, relativeTime, fileKind } from '@/lib/files';
import { ActivityLogRow } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Files as FilesIcon, Folder, Activity, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

const STORAGE_QUOTA = 1024 * 1024 * 1024;

export default function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ used: 0, fileCount: 0, folderCount: 0 });
  const [recent, setRecent] = useState<FileRow[]>([]);
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats({ used: data.used, fileCount: data.fileCount, folderCount: data.folderCount });
        setRecent(data.recent ?? []);
        setLogs(data.logs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const usedPct = Math.min(100, (stats.used / STORAGE_QUOTA) * 100);
  const cards = [
    { label: 'Storage used', value: formatBytes(stats.used), sub: `${usedPct.toFixed(1)}% of ${formatBytes(STORAGE_QUOTA)}`, icon: HardDrive },
    { label: 'Files', value: stats.fileCount.toString(), sub: 'uploaded', icon: FilesIcon },
    { label: 'Folders', value: stats.folderCount.toString(), sub: 'created', icon: Folder },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">A snapshot of your cloud storage.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-neutral-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-neutral-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">{c.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="border-neutral-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Storage usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div className="h-full bg-black rounded-full transition-all duration-700" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{formatBytes(stats.used)} used</span>
            <span>{formatBytes(Math.max(0, STORAGE_QUOTA - stats.used))} free</span>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Recent files</CardTitle>
            <Link href="/dashboard/files" className="text-xs text-neutral-500 hover:text-black">View all</Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
             recent.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No files yet.</p> :
             recent.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-neutral-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(f.size_bytes)} · {fileKind(f.mime_type, f.name)}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">{relativeTime(f.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Activity log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
             logs.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p> :
             logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-neutral-50">
                <div className="min-w-0">
                  <p className="text-sm truncate"><span className="font-medium">{l.action}</span>{l.target ? ` · ${l.target}` : ''}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">{relativeTime(l.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
