'use client';

import { useEffect, useState } from 'react';
import { Folder, FileText, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import ShareService from '@/lib/drive/shareService';
import { DriveItem } from '@/lib/drive/driveTypes';
import { cn } from '@/lib/utils';

export function ShareLinkPopover({
  open,
  item,
  onClose,
  onManage,
}: {
  open: boolean;
  item: DriveItem | null;
  onClose: () => void;
  onManage: () => void;
}) {
  const [url, setUrl] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('EDIT');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const links = await ShareService.listLinks(item.id, item.type);
        let link =
          links.find((l: any) => l.permission === 'EDIT' && !l.revokedAt) ||
          links.find((l: any) => !l.revokedAt) ||
          null;
        if (!link) {
          link = await ShareService.createLink({
            itemId: item.id,
            itemType: item.type,
            permission: 'EDIT',
          });
        }
        if (cancelled) return;
        const full = `${window.location.origin}${link.url}`;
        setUrl(full);
        setPermission((link.permission as 'VIEW' | 'EDIT') || 'EDIT');
      } catch (e: any) {
        toast.error(e?.response?.data?.message || e.message || 'Failed to create link');
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, item, onClose]);

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[12vh] dark:bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-white p-5 text-foreground shadow-2xl dark:bg-[#1c1c1c] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Copy link to</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {item.type === 'FOLDER' ? (
                <Folder className="h-4 w-4 text-amber-400" fill="currentColor" />
              ) : (
                <FileText className="h-4 w-4 text-sky-500" />
              )}
              <span className="truncate">{item.name} • 1 item</span>
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

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-1.5 pl-3">
          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {loading ? 'Preparing link…' : url}
          </div>
          <button
            type="button"
            disabled={loading || !url}
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              toast.success('Link copied');
            }}
            className="shrink-0 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
          >
            Copy link
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span>
              Anyone with this link can {permission === 'EDIT' ? 'edit' : 'view'}
            </span>
          </div>
          <button
            type="button"
            onClick={onManage}
            className={cn('font-medium text-foreground underline underline-offset-2 hover:text-muted-foreground')}
          >
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
