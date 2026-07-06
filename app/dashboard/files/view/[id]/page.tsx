'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileRow, fileKind, formatBytes, relativeTime } from '@/lib/files';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText, Link2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function FileViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [file, setFile] = useState<FileRow | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Fetch file metadata from stats-like approach: we get it from the files API
    // by listing root + searching. Simpler: fetch download endpoint headers via a HEAD-like.
    // Instead, fetch all folders+files in root and nested — too heavy.
    // Best: add a simple endpoint. For now, derive from the download endpoint.
    // We'll fetch the download URL and get info from a dedicated endpoint.
    fetch(`/api/files/view?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          setLoading(false);
          return;
        }
        setFile(data.file);
        setLoading(false);
        const kind = fileKind(data.file.mime_type, data.file.name);
        if (kind === 'code') {
          fetch(`/api/files/content?id=${id}`)
            .then((r) => r.json())
            .then((d) => setText(d.content ?? ''));
        } else {
          setUrl(`/api/files/download?id=${id}`);
        }
      })
      .catch(() => {
        toast.error('Failed to load file');
        setLoading(false);
      });
  }, [id]);

  function copyLink() {
    const link = `${window.location.origin}/dashboard/files/view/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-6 w-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <FileText className="h-12 w-12 text-neutral-300 mb-3" />
        <p className="text-sm font-medium">File not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/files')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to files
        </Button>
      </div>
    );
  }

  const kind = fileKind(file.mime_type, file.name);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/files')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">{file.name}</h1>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size_bytes)} · {relativeTime(file.updated_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button size="sm" asChild>
            <a href={`/api/files/download?id=${id}`} download={file.name}>
              <Download className="h-4 w-4 mr-2" /> Download
            </a>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-center min-h-[50vh] p-6 bg-neutral-50">
          {kind === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={file.name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
          )}
          {kind === 'video' && <video src={url} controls className="max-w-full max-h-[70vh] rounded-lg" />}
          {kind === 'audio' && (
            <div className="w-full max-w-md text-center">
              <div className="h-32 w-32 mx-auto rounded-full bg-neutral-200 flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-neutral-500" />
              </div>
              <audio src={url} controls className="w-full" />
            </div>
          )}
          {kind === 'pdf' && <iframe src={url} className="w-full h-[70vh] rounded-lg border-0" title={file.name} />}
          {kind === 'code' && (
            <pre className="w-full text-xs font-mono whitespace-pre-wrap p-4 bg-white rounded-lg border max-h-[70vh] overflow-auto">
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
      </div>
    </div>
  );
}
