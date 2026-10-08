'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FolderAccess = 'only-me' | 'people';

export function NewFolderDialog({
  open,
  name,
  onNameChange,
  access,
  onAccessChange,
  creating,
  onClose,
  onCreate,
}: {
  open: boolean;
  name: string;
  onNameChange: (v: string) => void;
  access: FolderAccess;
  onAccessChange: (v: FolderAccess) => void;
  creating?: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 dark:bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1c1c1c] p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold">Folder name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) onCreate();
            }}
            placeholder="New Folder"
            className="h-11 w-full rounded-lg border border-white/15 bg-[#141414] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#70a1ff]"
          />
        </div>

        <div className="mt-6 space-y-2">
          <div className="text-sm font-semibold">Who will have access</div>
          <p className="text-sm text-white/50">Choose who you want to access this folder.</p>

          <button
            type="button"
            onClick={() => onAccessChange('only-me')}
            className={cn(
              'mt-3 flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition',
              access === 'only-me'
                ? 'border-white bg-white/5'
                : 'border-white/15 hover:border-white/30',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border',
                access === 'only-me' ? 'border-white bg-white text-black' : 'border-white/40',
              )}
            >
              {access === 'only-me' && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="font-semibold">Only me</span>
          </button>

          <button
            type="button"
            onClick={() => onAccessChange('people')}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition',
              access === 'people'
                ? 'border-white bg-white/5'
                : 'border-white/15 hover:border-white/30',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border',
                access === 'people' ? 'border-white bg-white text-black' : 'border-white/40',
              )}
            >
              {access === 'people' && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="font-semibold">Only specific people</span>
          </button>
        </div>

        <div className="mt-8 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-white hover:text-white/70"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || creating}
            onClick={onCreate}
            className={cn(
              'h-10 rounded-full px-5 text-sm font-semibold transition',
              name.trim()
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'cursor-not-allowed bg-[#3a3a3a] text-white/40',
            )}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
