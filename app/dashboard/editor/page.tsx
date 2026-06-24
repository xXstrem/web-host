'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useFiles, FileRow } from '@/lib/use-files';
import { fileKind, extOf } from '@/lib/files';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, FileCode, Sun, Moon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANG_MAP: Record<string, string> = {
  html: 'html', css: 'css', js: 'javascript', php: 'php', py: 'python',
  json: 'json', txt: 'plaintext', md: 'markdown', ts: 'typescript', tsx: 'typescript',
};

export default function EditorPage() {
  const { files, getFileContent, saveFileContent } = useFiles(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const editableFiles = useMemo(
    () => files.filter((f) => fileKind(f.mime_type, f.name) === 'code'),
    [files]
  );

  const active = editableFiles.find((f) => f.id === activeId) ?? null;
  const language = active ? LANG_MAP[extOf(active.name)] ?? 'plaintext' : 'plaintext';
  const dirty = content !== original;

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    const row = editableFiles.find((f) => f.id === activeId);
    if (!row) return;
    getFileContent(row).then((c) => {
      setContent(c);
      setOriginal(c);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const save = useCallback(async () => {
    if (!active || !dirty) return;
    setSaving(true);
    await saveFileContent(active, content);
    setOriginal(content);
    setSaving(false);
    toast.success('Saved');
  }, [active, content, dirty, saveFileContent]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Code Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit text files with syntax highlighting. Press Ctrl/Cmd+S to save.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button onClick={save} disabled={!active || !dirty || saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 flex-1 min-h-0">
        <Card className="border-neutral-200 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100">
            <p className="text-sm font-medium flex items-center gap-2"><FileCode className="h-4 w-4" /> Editable files</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {editableFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">No text files yet. Create one in the Files tab.</p>
            ) : (
              editableFiles.map((f) => (
                <button key={f.id} onClick={() => setActiveId(f.id)}
                  className={cn('w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors', activeId === f.id ? 'bg-black text-white' : 'hover:bg-neutral-100')}>
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="border-neutral-200 overflow-hidden min-h-0">
          {active ? (
            <div className="h-full flex flex-col">
              <div className="px-4 py-2 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-sm font-medium">{active.name}</span>
                {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={language}
                  value={loading ? '' : content}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  onChange={(v) => setContent(v ?? '')}
                  loading="Loading editor…"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                <FileCode className="h-6 w-6 text-neutral-400" />
              </div>
              <p className="text-sm font-medium">Select a file to edit</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a text file from the list, or create one in the Files tab.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
