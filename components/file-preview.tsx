'use client';

import { useEffect, useState } from 'react';
import { FileRow, fileKind, formatBytes, relativeTime } from '@/lib/files';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText } from 'lucide-react';

export function FilePreview({ file, onClose, onDownload }: { file: FileRow; onClose: () => void; onDownload: () => void }) {
  const [url, setUrl] = useState<string>('');
  const [text, setText] = useState<string | null>(null);
  const kind = fileKind(file.mime_type, file.name);

  useEffect(() => {
    if (kind === 'code') {
      fetch(`/api/files/content?id=${file.id}`)
        .then((r) => r.json())
        .then((d) => setText(d.content ?? ''));
    } else if (kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'pdf') {
      setUrl(`/api/files/download?id=${file.id}`);
    }
  }, [file, kind]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">{file.name}</DialogTitle>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size_bytes)} · {relativeTime(file.updated_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" /> Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-auto max-h-[70vh] bg-neutral-50 flex items-center justify-center p-4">
          {kind === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={file.name} className="max-w-full max-h-[65vh] object-contain rounded" />
          )}
          {kind === 'video' && <video src={url} controls className="max-w-full max-h-[65vh] rounded" />}
          {kind === 'audio' && (
            <div className="w-full max-w-md text-center">
              <div className="h-32 w-32 mx-auto rounded-full bg-neutral-200 flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-neutral-500" />
              </div>
              <audio src={url} controls className="w-full" />
            </div>
          )}
          {kind === 'pdf' && <iframe src={url} className="w-full h-[65vh] rounded border-0" title={file.name} />}
          {kind === 'code' && (
            <pre className="w-full text-xs font-mono whitespace-pre-wrap p-4 bg-white rounded border max-h-[65vh] overflow-auto">
              {text ?? 'Loading…'}
            </pre>
          )}
          {kind !== 'image' && kind !== 'video' && kind !== 'audio' && kind !== 'pdf' && kind !== 'code' && (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-medium">No preview available</p>
              <p className="text-xs text-muted-foreground mt-1">Download the file to view it.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
