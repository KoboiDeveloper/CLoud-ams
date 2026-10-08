'use client';

import { FileCode2, FileText, FolderPlus, Upload } from 'lucide-react';

export function EmptyFolderState({
  onUpload,
  onNewFolder,
}: {
  onUpload: () => void;
  onNewFolder: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-transparent px-6 py-16">
      <div className="relative mb-6 h-28 w-40">
        <div className="absolute left-2 top-4 rotate-[-8deg] rounded-xl bg-[#3d2a45] p-3 shadow-lg">
          <FileCode2 className="h-10 w-10 text-pink-300" />
        </div>
        <div className="absolute right-2 top-2 rotate-[6deg] rounded-xl bg-[#2a3a55] p-3 shadow-lg">
          <FileText className="h-10 w-10 text-sky-300" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-xl bg-[#333] p-3 shadow-xl">
          <Upload className="h-8 w-8 text-white/80" />
        </div>
      </div>

      <button
        type="button"
        onClick={onUpload}
        className="text-base font-medium text-foreground hover:underline"
      >
        Drop anything here to{' '}
        <span className="inline-flex items-center gap-1 font-semibold">
          upload
          <span className="text-xs opacity-60">▾</span>
        </span>
      </button>

      <div className="mt-10 w-full max-w-xl">
        <div className="mb-3 text-center text-sm text-muted-foreground">
          Other ways to get started
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onNewFolder}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-muted"
          >
            <FolderPlus className="h-4 w-4" />
            Create a folder
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            Upload files
          </button>
        </div>
      </div>
    </div>
  );
}
