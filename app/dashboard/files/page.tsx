'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFiles, FolderRow, FileRow } from '@/lib/use-files';
import { Item, formatBytes, relativeTime, fileKind, extOf } from '@/lib/files';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Upload, FolderPlus, FilePlus, Search, Grid3x3, List, ChevronRight, Home,
  Download, Trash2, Pencil, Folder as FolderIcon, File as FileIcon, Image, Music, Video, FileCode,
  ArrowLeft, MoreVertical, Move, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilePreview } from '@/components/file-preview';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function iconFor(item: Item) {
  if (item.kind === 'folder') return FolderIcon;
  const k = fileKind(item.mime_type, item.name);
  if (k === 'image') return Image;
  if (k === 'audio') return Music;
  if (k === 'video') return Video;
  if (k === 'code') return FileCode;
  return FileIcon;
}

export default function FilesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get('folder') ? Number(searchParams.get('folder')) : null;

  const {
    folders, files, loading, refresh, createFolder, createFile, uploadFiles,
    renameFolder, renameFile, deleteFolder, deleteFile, downloadFile, moveFile, getAllFolders,
  } = useFiles(parentId);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [crumbs, setCrumbs] = useState<FolderRow[]>([]);
  const [allFolders, setAllFolders] = useState<FolderRow[]>([]);

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string; kind: 'folder' | 'file' } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [preview, setPreview] = useState<FileRow | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileRow | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<number | null>(null);

  useEffect(() => {
    getAllFolders().then(setAllFolders);
  }, [getAllFolders, refresh]);

  useEffect(() => {
    if (!parentId) { setCrumbs([]); return; }
    const path: FolderRow[] = [];
    let cur = allFolders.find((f) => f.id === parentId);
    while (cur) {
      path.unshift(cur);
      const next = cur.parent_id ? allFolders.find((f) => f.id === cur!.parent_id) : undefined;
      cur = next;
    }
    setCrumbs(path);
  }, [parentId, allFolders]);

  const items: Item[] = [
    ...folders.map((f) => ({ kind: 'folder' as const, ...f })),
    ...files.map((f) => ({ kind: 'file' as const, ...f })),
  ];
  const filtered = items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));

  const openFolder = (id: number) => router.push(`/dashboard/files?folder=${id}`);

  function toggleSelect(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const results = await uploadFiles(Array.from(fileList));
    setUploading(false);
    const ok = results.filter((r) => !r.error).length;
    const fail = results.filter((r) => r.error);
    if (ok) toast.success(`Uploaded ${ok} file${ok > 1 ? 's' : ''}`);
    fail.forEach((f) => toast.error(`${f.name}: ${f.error}`));
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    await handleUpload(e.dataTransfer.files);
  }

  async function doCreateFolder() {
    if (!newFolderName.trim()) return;
    const { error } = await createFolder(newFolderName.trim());
    if (error) toast.error(error);
    else { toast.success('Folder created'); setNewFolderOpen(false); setNewFolderName(''); }
  }

  async function doCreateFile() {
    if (!newFileName.trim()) return;
    const { error } = await createFile(newFileName.trim(), newFileContent);
    if (error) toast.error(error);
    else { toast.success('File created'); setNewFileOpen(false); setNewFileName(''); setNewFileContent(''); }
  }

  async function doRename() {
    if (!renameTarget || !renameValue.trim()) return;
    const fn = renameTarget.kind === 'folder' ? renameFolder : renameFile;
    await fn(renameTarget.id, renameValue.trim());
    toast.success('Renamed');
    setRenameTarget(null);
  }

  async function doDelete(item: Item) {
    if (item.kind === 'folder') await deleteFolder(item);
    else await deleteFile(item.id);
    toast.success('Deleted');
    setSelected(new Set());
  }

  async function deleteSelected() {
    for (const id of Array.from(selected)) {
      const f = files.find((x) => x.id === id);
      const fo = folders.find((x) => x.id === id);
      if (f) await deleteFile(f.id);
      else if (fo) await deleteFolder(fo);
    }
    setSelected(new Set());
    toast.success(`Deleted ${selected.size} item${selected.size > 1 ? 's' : ''}`);
  }

  async function doMove() {
    if (!moveTarget) return;
    await moveFile(moveTarget.id, moveFolderId);
    toast.success('File moved');
    setMoveTarget(null);
    setMoveFolderId(null);
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse, upload, and manage your files.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
          <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" /> New folder
          </Button>
          <Button size="sm" onClick={() => setNewFileOpen(true)}>
            <FilePlus className="h-4 w-4 mr-2" /> New file
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search files…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 bg-white" />
        </div>
        {parentId && (
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/files')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center border rounded-md bg-white">
          <Button variant="ghost" size="icon" className={cn(view === 'grid' && 'bg-neutral-100')} onClick={() => setView('grid')}>
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className={cn(view === 'list' && 'bg-neutral-100')} onClick={() => setView('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        <button onClick={() => router.push('/dashboard/files')} className="flex items-center gap-1 hover:text-foreground">
          <Home className="h-3.5 w-3.5" /> Home
        </button>
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            <button onClick={() => openFolder(c.id)} className="hover:text-foreground">{c.name}</button>
          </span>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-black text-white rounded-lg px-4 py-2.5 text-sm animate-in fade-in slide-in-from-top-2">
          <span>{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4" /> Clear
            </Button>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn('rounded-xl border-2 border-dashed transition-colors min-h-[400px] p-4', dragOver ? 'border-black bg-neutral-50' : 'border-neutral-200 bg-white')}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <FolderIcon className="h-6 w-6 text-neutral-400" />
            </div>
            <p className="text-sm font-medium">No files here yet</p>
            <p className="text-xs text-muted-foreground mt-1">Drag and drop files to upload, or use the Upload button.</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} selected={selected.has(item.id)}
                onSelect={(e) => toggleSelect(item.id, e)}
                onOpen={() => (item.kind === 'folder' ? openFolder(item.id) : setPreview(item))}
                onRename={() => { setRenameTarget({ id: item.id, name: item.name, kind: item.kind }); setRenameValue(item.name); }}
                onDelete={() => doDelete(item)}
                onDownload={() => item.kind === 'file' && downloadFile(item)}
                onMove={() => item.kind === 'file' && setMoveTarget(item)}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((item) => (
              <ItemRow key={item.id} item={item} selected={selected.has(item.id)}
                onSelect={(e) => toggleSelect(item.id, e)}
                onOpen={() => (item.kind === 'folder' ? openFolder(item.id) : setPreview(item))}
                onRename={() => { setRenameTarget({ id: item.id, name: item.name, kind: item.kind }); setRenameValue(item.name); }}
                onDelete={() => doDelete(item)}
                onDownload={() => item.kind === 'file' && downloadFile(item)}
                onMove={() => item.kind === 'file' && setMoveTarget(item)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New folder</DialogTitle><DialogDescription>Give your folder a name.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input id="folder-name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="My folder" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={doCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFileOpen} onOpenChange={setNewFileOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New file</DialogTitle><DialogDescription>Create a text-based file (e.g. notes.txt, snippet.json).</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="file-name">File name</Label>
            <Input id="file-name" value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="notes.txt" autoFocus />
            <Label htmlFor="file-content">Content</Label>
            <Textarea id="file-content" value={newFileContent} onChange={(e) => setNewFileContent(e.target.value)} rows={8} className="font-mono text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileOpen(false)}>Cancel</Button>
            <Button onClick={doCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={doRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveTarget} onOpenChange={(o) => !o && setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move file</DialogTitle><DialogDescription>Choose a destination folder.</DialogDescription></DialogHeader>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button className={cn('w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100', moveFolderId === null && 'bg-neutral-100 font-medium')} onClick={() => setMoveFolderId(null)}>
              <Home className="h-4 w-4 inline mr-2" /> Home
            </button>
            {allFolders.filter((f) => f.id !== moveTarget?.id).map((f) => (
              <button key={f.id} className={cn('w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100', moveFolderId === f.id && 'bg-neutral-100 font-medium')} onClick={() => setMoveFolderId(f.id)}>
                <FolderIcon className="h-4 w-4 inline mr-2" /> {f.name}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTarget(null)}>Cancel</Button>
            <Button onClick={doMove}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} onDownload={() => downloadFile(preview)} />}
    </div>
  );
}

function ItemCard(props: {
  item: Item; selected: boolean; onSelect: (e: React.MouseEvent) => void; onOpen: () => void;
  onRename: () => void; onDelete: () => void; onDownload: () => void; onMove: () => void;
}) {
  const { item, selected, onSelect, onOpen, onRename, onDelete, onDownload, onMove } = props;
  const Icon = iconFor(item);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onClick={onOpen} className={cn('group relative rounded-xl border bg-white p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5', selected ? 'border-black ring-1 ring-black' : 'border-neutral-200')}>
          <div className="absolute top-2 left-2 z-10">
            <button onClick={onSelect} className={cn('h-4 w-4 rounded border flex items-center justify-center transition-colors', selected ? 'bg-black border-black' : 'bg-white border-neutral-300 opacity-0 group-hover:opacity-100')}>
              {selected && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>
          </div>
          <div className="flex items-center justify-center h-16 mb-2">
            <Icon className={cn('h-10 w-10', item.kind === 'folder' ? 'text-neutral-800' : 'text-neutral-500')} />
          </div>
          <p className="text-xs font-medium truncate text-center" title={item.name}>{item.name}</p>
          <p className="text-[10px] text-muted-foreground text-center mt-0.5">{item.kind === 'file' ? formatBytes(item.size_bytes) : 'Folder'}</p>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onOpen}>Open</ContextMenuItem>
        {item.kind === 'file' && <ContextMenuItem onClick={onDownload}><Download className="h-4 w-4 mr-2" /> Download</ContextMenuItem>}
        {item.kind === 'file' && <ContextMenuItem onClick={onMove}><Move className="h-4 w-4 mr-2" /> Move</ContextMenuItem>}
        <ContextMenuItem onClick={onRename}><Pencil className="h-4 w-4 mr-2" /> Rename</ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ItemRow(props: {
  item: Item; selected: boolean; onSelect: (e: React.MouseEvent) => void; onOpen: () => void;
  onRename: () => void; onDelete: () => void; onDownload: () => void; onMove: () => void;
}) {
  const { item, selected, onSelect, onOpen, onRename, onDelete, onDownload, onMove } = props;
  const Icon = iconFor(item);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onClick={onOpen} className={cn('flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-neutral-50', selected && 'bg-neutral-100')}>
          <button onClick={onSelect} className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0', selected ? 'bg-black border-black' : 'border-neutral-300')}>
            {selected && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </button>
          <Icon className={cn('h-5 w-5 shrink-0', item.kind === 'folder' ? 'text-neutral-800' : 'text-neutral-500')} />
          <span className="text-sm font-medium truncate flex-1">{item.name}</span>
          <span className="text-xs text-muted-foreground hidden sm:block">{item.kind === 'file' ? formatBytes(item.size_bytes) : '—'}</span>
          <span className="text-xs text-muted-foreground hidden md:block w-24 text-right">{relativeTime(item.updated_at)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button onClick={(e) => e.stopPropagation()} className="h-7 w-7 rounded-md hover:bg-neutral-200 flex items-center justify-center">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem>
              {item.kind === 'file' && <DropdownMenuItem onClick={onDownload}><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>}
              {item.kind === 'file' && <DropdownMenuItem onClick={onMove}><Move className="h-4 w-4 mr-2" /> Move</DropdownMenuItem>}
              <DropdownMenuItem onClick={onRename}><Pencil className="h-4 w-4 mr-2" /> Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onOpen}>Open</ContextMenuItem>
        {item.kind === 'file' && <ContextMenuItem onClick={onDownload}><Download className="h-4 w-4 mr-2" /> Download</ContextMenuItem>}
        {item.kind === 'file' && <ContextMenuItem onClick={onMove}><Move className="h-4 w-4 mr-2" /> Move</ContextMenuItem>}
        <ContextMenuItem onClick={onRename}><Pencil className="h-4 w-4 mr-2" /> Rename</ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
