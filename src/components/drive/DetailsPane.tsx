'use client';

import { DriveItem } from '@/lib/drive/driveTypes';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import { FileText, Folder } from 'lucide-react';

export function DetailsPane({
  item,
  onClose,
}: {
  item: DriveItem | null;
  onClose: () => void;
}) {
  if (!item) {
    return (
      <aside className="hidden h-full w-[300px] shrink-0 p-6 text-sm text-muted-foreground lg:block">
        Select an item to see details
      </aside>
    );
  }

  const isFolder = item.type === 'FOLDER';

  return (
    <aside className="hidden h-full w-[300px] shrink-0 overflow-y-auto lg:block">
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">{isFolder ? 'Folder' : 'File'}</div>
        </div>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="flex justify-center py-8">
        {isFolder ? (
          <Folder className="h-20 w-20 text-amber-400" fill="currentColor" />
        ) : (
          <FileText className="h-20 w-20 text-sky-500" />
        )}
      </div>

      <dl className="space-y-3 px-4 pb-6 text-sm">
        <Row label="Type" value={isFolder ? 'Folder' : item.mimeType} />
        <Row
          label="Size"
          value={isFolder ? formatBytes((item as any).sizeBytes || 0) : formatBytes(item.bytes)}
        />
        <Row label="Location" value="My Drive" />
        <Row label="Owner" value={item.owner?.nama || item.ownerNik} />
        <Row label="Last Updated" value={format(new Date(item.updatedAt), 'yyyy-MM-dd')} />
        <Row label="Created" value={format(new Date(item.createdAt), 'yyyy-MM-dd')} />
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </div>
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {item.description || 'No description'}
          </div>
        </div>
      </dl>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{value}</dd>
    </div>
  );
}
