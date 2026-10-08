'use client';

import { useEffect, useState } from 'react';
import { Link2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * - grid (normal): hover → ⋮ only
 * - large-grid: hover → ⋮, diam 1s → slide Share | Link | More
 */
export function GridHoverActions({
  visible,
  large,
  onShare,
  onLink,
  onMore,
}: {
  visible: boolean;
  large?: boolean;
  onShare: () => void;
  onLink: () => void;
  onMore: (e: React.MouseEvent) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!visible || !large) {
      setExpanded(false);
      return;
    }
    const t = window.setTimeout(() => setExpanded(true), 1000);
    return () => window.clearTimeout(t);
  }, [visible, large]);

  if (!visible) return null;

  // Normal grid: ⋮ only
  if (!large) {
    return (
      <div
        className="pointer-events-auto absolute right-2 top-2 z-10"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          title="More"
          aria-label="More"
          onClick={onMore}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2a2a2a] text-white shadow-md transition hover:bg-[#333]"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Large grid: ⋮ → expand after 1s
  return (
    <div
      className="pointer-events-auto absolute right-2 top-2 z-10"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          'absolute right-0 top-0 transition-all duration-300 ease-out',
          expanded ? 'pointer-events-none translate-x-2 scale-90 opacity-0' : 'translate-x-0 opacity-100',
        )}
      >
        <button
          type="button"
          title="More"
          aria-label="More"
          onClick={onMore}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2a2a2a] text-white shadow-md transition hover:bg-[#333]"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div
        className={cn(
          'flex h-9 origin-right overflow-hidden rounded-xl border border-white/10 bg-[#2a2a2a] shadow-lg transition-all duration-300 ease-out',
          expanded
            ? 'w-[148px] translate-x-0 scale-100 opacity-100'
            : 'pointer-events-none w-9 translate-x-3 scale-95 opacity-0',
        )}
      >
        <button
          type="button"
          onClick={onShare}
          className="flex h-9 shrink-0 items-center bg-[#f2f0ea] px-3.5 text-sm font-semibold text-[#1a1a1a] transition hover:bg-white"
        >
          Share
        </button>
        <button
          type="button"
          title="Copy link"
          onClick={onLink}
          className="flex h-9 w-9 shrink-0 items-center justify-center border-l border-white/10 text-white/90 transition hover:bg-white/10"
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="More"
          aria-label="More"
          onClick={onMore}
          className="flex h-9 w-9 shrink-0 items-center justify-center border-l border-white/10 text-white transition hover:bg-white/10"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
