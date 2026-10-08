'use client';

import { FolderInput, Link2, MoreHorizontal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RowHoverActions({
  visible,
  starred,
  onShare,
  onLink,
  onOrganize,
  onStar,
  onMore,
}: {
  visible: boolean;
  starred?: boolean;
  onShare: () => void;
  onLink: () => void;
  onOrganize: () => void;
  onStar: () => void;
  onMore: (e: React.MouseEvent) => void;
  compact?: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center">
      {/* Soft fade into row bg — no hard black cut */}
      <div
        aria-hidden
        className="h-full w-12 bg-gradient-to-r from-transparent to-muted"
      />
      <div className="pointer-events-auto flex h-full items-center gap-1 bg-muted pl-1 pr-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="h-8 rounded-full bg-white px-3.5 text-sm font-semibold text-black shadow-sm transition hover:bg-zinc-100 dark:bg-white dark:hover:bg-zinc-200"
        >
          Share
        </button>

        <IconBtn title="Copy link" onClick={onLink}>
          <Link2 className="h-4 w-4" />
        </IconBtn>

        <IconBtn title="Organize" onClick={onOrganize} muted>
          <FolderInput className="h-4 w-4" />
        </IconBtn>

        <IconBtn title={starred ? 'Unstar' : 'Star'} onClick={onStar}>
          <Star
            className={cn('h-4 w-4', starred && 'fill-amber-400 text-amber-400')}
          />
        </IconBtn>

        <div className="relative">
          <button
            type="button"
            aria-label="More"
            onClick={(e) => {
              e.stopPropagation();
              onMore(e);
            }}
            className="group/more relative flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-foreground transition hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-xs font-medium text-[#1a56db] opacity-0 shadow-md transition group-hover/more:opacity-100">
              More
              <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  muted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition hover:bg-black/5 dark:hover:bg-white/10',
        muted
          ? 'text-muted-foreground dark:text-white/45 dark:hover:text-white/70'
          : 'dark:text-white/90',
      )}
    >
      {children}
    </button>
  );
}
