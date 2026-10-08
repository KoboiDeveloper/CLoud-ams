'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Folder, Link2, X } from 'lucide-react';
import DriveService from '@/lib/drive/driveService';
import { DriveItem } from '@/lib/drive/driveTypes';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';

function previewKind(mime?: string, name?: string) {
  const m = (mime || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return 'image';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (m.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/.test(n)) return 'video';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/.test(n)) return 'audio';
  if (
    m.includes('word') ||
    m.includes('officedocument.wordprocessing') ||
    m.includes('msword') ||
    m.includes('excel') ||
    m.includes('spreadsheet') ||
    m.includes('powerpoint') ||
    m.includes('presentation') ||
    /\.(docx?|xlsx?|pptx?)$/.test(n)
  ) {
    return 'office';
  }
  if (
    m.startsWith('text/') ||
    m.includes('json') ||
    /\.(txt|md|csv|json|log|xml|html|css|js|ts)$/.test(n)
  ) {
    return 'text';
  }
  return 'unsupported';
}

function officeEmbedUrl(publicUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;
}

async function loadPreviewObjectUrl(item: DriveItem, kind: string) {
  if (kind === 'folder' || kind === 'empty') {
    return { url: null as string | null, downloadUrl: null as string | null, revoke: false as const };
  }
  // Always resolve download URL for the Download button; never use it as iframe src for preview.
  const dl = await DriveService.download(item.id);
  if (kind === 'unsupported') {
    return { url: null as string | null, downloadUrl: dl.url, revoke: false as const };
  }
  if (kind === 'office') {
    return {
      url: officeEmbedUrl(dl.url),
      downloadUrl: dl.url,
      revoke: false as const,
    };
  }
  const { blob } = await DriveService.previewBlob(item.id);
  const objectUrl = URL.createObjectURL(blob);
  return { url: objectUrl, downloadUrl: dl.url, revoke: true as const };
}

export function QuickViewPanel({
  item,
  onClose,
  onShare,
  onLink,
  onOpenFullscreen,
}: {
  item: DriveItem | null;
  onClose: () => void;
  onShare?: () => void;
  onLink?: () => void;
  onOpenFullscreen?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const kind = useMemo(() => {
    if (!item) return 'empty';
    if (item.type === 'FOLDER') return 'folder';
    return previewKind(item.mimeType, item.name);
  }, [item]);

  useEffect(() => {
    if (!item || item.type !== 'FILE') {
      setUrl(null);
      setTextContent(null);
      setDownloadUrl(null);
      setFailed(false);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    (async () => {
      setLoading(true);
      setFailed(false);
      setTextContent(null);
      setUrl(null);
      setDownloadUrl(null);
      try {
        const loaded = await loadPreviewObjectUrl(item, kind);
        if (cancelled) {
          if (loaded.revoke && loaded.url) URL.revokeObjectURL(loaded.url);
          return;
        }
        if (loaded.revoke) createdUrl = loaded.url;
        setUrl(loaded.url);
        setDownloadUrl(loaded.downloadUrl);

        if (kind === 'text' && loaded.url) {
          const res = await fetch(loaded.url);
          const text = await res.text();
          if (!cancelled) setTextContent(text.slice(0, 120_000));
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [item, kind]);

  if (!item) {
    return (
      <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">Quick view</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Select a file to preview
        </div>
      </aside>
    );
  }

  const showUnsupported =
    !loading &&
    item.type === 'FILE' &&
    (failed ||
      kind === 'unsupported' ||
      (kind === 'image' && !url) ||
      (kind === 'pdf' && !url) ||
      (kind === 'office' && !url) ||
      (kind === 'video' && !url) ||
      (kind === 'audio' && !url) ||
      (kind === 'text' && textContent === null && !url));

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{item.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {item.type === 'FILE'
              ? `${item.mimeType} · ${formatBytes(item.bytes)}`
              : 'Folder'}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {item.type === 'FILE' && (
          <>
            <Button size="sm" variant="outline" onClick={onShare}>
              Share
            </Button>
            <Button size="icon" variant="ghost" title="Copy link" onClick={onLink}>
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Open"
              onClick={() => onOpenFullscreen?.()}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            {downloadUrl && (
              <Button
                size="icon"
                variant="ghost"
                title="Download"
                onClick={() => window.open(downloadUrl, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <div className="flex min-h-[240px] items-center justify-center bg-[#1a1a1a] p-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : kind === 'folder' ? (
            <Folder className="h-24 w-24 text-amber-400" fill="currentColor" />
          ) : showUnsupported ? (
            <UnsupportedPreview compact />
          ) : kind === 'image' && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={item.name}
              className="max-h-[280px] max-w-full cursor-zoom-in rounded-lg object-contain shadow"
              onClick={() => onOpenFullscreen?.()}
            />
          ) : kind === 'pdf' && url ? (
            <iframe title={item.name} src={url} className="h-[280px] w-full rounded-lg bg-background" />
          ) : kind === 'office' && url ? (
            <iframe title={item.name} src={url} className="h-[280px] w-full rounded-lg bg-background" />
          ) : kind === 'video' && url ? (
            <video src={url} controls className="max-h-[280px] w-full rounded-lg" />
          ) : kind === 'audio' && url ? (
            <audio src={url} controls className="w-full" />
          ) : kind === 'text' && textContent !== null ? (
            <pre className="max-h-[280px] w-full overflow-auto rounded-lg border border-border bg-background p-3 text-left text-xs whitespace-pre-wrap">
              {textContent}
            </pre>
          ) : (
            <UnsupportedPreview compact />
          )}
        </div>

        <dl className="space-y-3 p-4 text-sm">
          <Row label="Type" value={item.type === 'FOLDER' ? 'Folder' : item.mimeType} />
          {item.type === 'FILE' && <Row label="Size" value={formatBytes(item.bytes)} />}
          <Row label="Owner" value={item.owner?.nama || item.ownerNik} />
          <Row label="Modified" value={format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm')} />
          <Row label="Created" value={format(new Date(item.createdAt), 'dd MMM yyyy')} />
          {item.description && <Row label="Description" value={item.description} />}
        </dl>
      </div>
    </aside>
  );
}

/** Fullscreen overlay when opening from side panel */
export function QuickViewFullscreen({
  open,
  item,
  onClose,
  onShare,
}: {
  open: boolean;
  item: DriveItem | null;
  onClose: () => void;
  onShare?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const kind = useMemo(() => {
    if (!item || item.type !== 'FILE') return 'unsupported';
    return previewKind(item.mimeType, item.name);
  }, [item]);

  useEffect(() => {
    if (!open || !item || item.type !== 'FILE') {
      setUrl(null);
      setDownloadUrl(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const loaded = await loadPreviewObjectUrl(item, kind);
        if (cancelled) {
          if (loaded.revoke && loaded.url) URL.revokeObjectURL(loaded.url);
          return;
        }
        if (loaded.revoke) createdUrl = loaded.url;
        setUrl(loaded.url);
        setDownloadUrl(loaded.downloadUrl);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, item, kind]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !item || item.type !== 'FILE') return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.name}</div>
            <div className="text-xs text-muted-foreground">
              {item.mimeType.split('/').pop()?.toUpperCase()} · {formatBytes(item.bytes)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onShare}>
            Share
          </Button>
          {downloadUrl && (
            <Button size="sm" variant="outline" onClick={() => window.open(downloadUrl, '_blank')}>
              Download
            </Button>
          )}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#1a1a1a] p-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : kind === 'image' && url && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={item.name} className="max-h-full max-w-full object-contain shadow-2xl" />
        ) : (kind === 'pdf' || kind === 'office') && url && !failed ? (
          <iframe title={item.name} src={url} className="h-full w-full max-w-5xl rounded-lg bg-card" />
        ) : kind === 'video' && url && !failed ? (
          <video src={url} controls className="max-h-full max-w-full" />
        ) : (
          <UnsupportedPreview />
        )}
      </div>
    </div>
  );
}

function UnsupportedPreview({ compact }: { compact?: boolean }) {
  const [src, setSrc] = useState('/unsupported-preview.png');
  const [showCaption, setShowCaption] = useState(false);

  return (
    <div
      className={
        compact
          ? 'flex w-full max-w-[300px] flex-col items-center overflow-hidden rounded-xl bg-[#222221]'
          : 'flex w-full max-w-md flex-col items-center overflow-hidden rounded-2xl bg-[#222221]'
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Can't load this file type"
        className="h-auto w-full object-contain"
        onError={() => {
          if (src !== '/unsupported-illustration.jpg') {
            setSrc('/unsupported-illustration.jpg');
            setShowCaption(true);
          }
        }}
      />
      {showCaption && (
        <div className="px-4 pb-5 pt-2 text-center text-white">
          <div className={compact ? 'text-[15px] font-semibold' : 'text-lg font-semibold'}>
            Can&apos;t load this file type
          </div>
          <div className={compact ? 'mt-1 text-xs text-white/80' : 'mt-1 text-sm text-white/80'}>
            This file type is unsupported here.
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{value}</dd>
    </div>
  );
}
