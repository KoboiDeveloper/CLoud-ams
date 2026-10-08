'use client';

import { useState } from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { toast } from 'sonner';
import ShareService from '@/lib/drive/shareService';
import { DriveItem } from '@/lib/drive/driveTypes';
import { cn } from '@/lib/utils';

export function ShareFolderDialog({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: DriveItem | null;
  onClose: () => void;
}) {
  const [nik, setNik] = useState('');
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('EDIT');
  const [permOpen, setPermOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open || !item) return null;

  const canShare = nik.trim().length === 8;

  async function share() {
    if (!canShare) return;
    setSaving(true);
    try {
      await ShareService.addPeople({
        itemId: item!.id,
        itemType: item!.type,
        targetNik: nik.trim(),
        permission,
      });
      toast.success('Invitation sent');
      setNik('');
      setMessage('');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || 'Share failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 dark:bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1c1c1c] p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-xl font-semibold">
            Share {item.type === 'FOLDER' ? 'folder' : 'file'}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-white/50">
            {item.type === 'FOLDER' && (
              <Folder className="h-4 w-4 text-[#a7c4fa]" fill="currentColor" />
            )}
            <span className="truncate">
              {item.name}
              {item.type === 'FOLDER' && typeof (item as any).itemCount === 'number'
                ? ` · ${(item as any).itemCount} items`
                : ''}
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <input
            value={nik}
            onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="Add an email or name (NIK 8 digit)"
            className="h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-[#141414] px-3 text-sm outline-none placeholder:text-white/40 focus:border-[#70a1ff]"
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setPermOpen((v) => !v)}
              className="inline-flex h-11 items-center gap-1 rounded-lg border border-white/15 bg-[#2a2a2a] px-3 text-sm font-medium"
            >
              {permission === 'EDIT' ? 'can edit' : 'can view'}
              <ChevronDown className="h-4 w-4 opacity-70" />
            </button>
            {permOpen && (
              <div className="absolute right-0 top-12 z-10 min-w-[140px] overflow-hidden rounded-xl border border-white/10 bg-[#2a2a2a] py-1 shadow-xl">
                {(['EDIT', 'VIEW'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                    onClick={() => {
                      setPermission(p);
                      setPermOpen(false);
                    }}
                  >
                    {p === 'EDIT' ? 'can edit' : 'can view'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add message (optional)"
          rows={4}
          className="mt-3 w-full resize-none rounded-lg border border-white/15 bg-[#141414] px-3 py-2.5 text-sm outline-none placeholder:text-white/40 focus:border-[#70a1ff]"
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-full border border-white/25 px-5 text-sm font-medium hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canShare || saving}
            onClick={share}
            className={cn(
              'h-10 rounded-full px-5 text-sm font-semibold transition',
              canShare
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'cursor-not-allowed bg-[#3a3a3a] text-white/40',
            )}
          >
            {saving ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
