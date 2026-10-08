'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
        checked ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-600',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}
