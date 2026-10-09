'use client';

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  extOf,
  formatEta,
  useUploadQueueStore,
  type UploadFilter,
  type UploadJob,
} from '@/lib/drive/uploadQueueStore';

const FILTERS: { id: UploadFilter; label: string }[] = [
  { id: 'all', label: 'All uploads' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Skipped' },
  { id: 'failed', label: 'Failed' },
];

function statusLine(job: UploadJob) {
  if (job.status === 'completed') return 'Upload complete';
  if (job.status === 'cancelled') return 'Cancelled';
  if (job.status === 'failed') return job.error || 'Upload failed';
  if (job.status === 'queued') return 'Waiting…';
  const eta = formatEta(job.etaSeconds);
  return `Uploading ${formatBytes(job.loaded)} / ${formatBytes(job.total || job.size)}${
    eta ? ` — ${eta}` : '…'
  }`;
}

function JobIcon({ job }: { job: UploadJob }) {
  if (job.status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  }
  if (job.status === 'failed') {
    return <XCircle className="h-4 w-4 shrink-0 text-rose-500" />;
  }
  if (job.status === 'cancelled') {
    return <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0061ff]" />;
}

export function UploadDock({ onAddFiles }: { onAddFiles?: () => void }) {
  const jobs = useUploadQueueStore((s) => s.jobs);
  const expanded = useUploadQueueStore((s) => s.expanded);
  const filter = useUploadQueueStore((s) => s.filter);
  const cancel = useUploadQueueStore((s) => s.cancel);
  const cancelAll = useUploadQueueStore((s) => s.cancelAll);
  const setExpanded = useUploadQueueStore((s) => s.setExpanded);
  const setFilter = useUploadQueueStore((s) => s.setFilter);

  if (!jobs.length) return null;

  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'uploading');
  const uploading = jobs.filter((j) => j.status === 'uploading');
  const filtered =
    filter === 'all'
      ? jobs
      : filter === 'cancelled'
        ? jobs.filter((j) => j.status === 'cancelled')
        : jobs.filter((j) => j.status === filter);

  const destLabel = jobs[jobs.length - 1]?.destLabel || 'Files';
  const worstEta = uploading.reduce<number | null>((acc, j) => {
    if (j.etaSeconds == null) return acc;
    return acc == null ? j.etaSeconds : Math.max(acc, j.etaSeconds);
  }, null);

  const summary =
    active.length > 0
      ? `Uploading ${active.length} item${active.length === 1 ? '' : 's'}`
      : `${jobs.filter((j) => j.status === 'completed').length} completed`;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(420px,calc(100vw-1.5rem))] flex-col items-stretch gap-2">
      {expanded && (
        <div className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl shadow-black/30 dark:border-white/10 dark:bg-[#1a1b1e]">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 dark:border-white/10">
            <h3 className="text-sm font-semibold">Uploads</h3>
            <div className="flex items-center gap-1.5">
              {active.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg px-2.5 text-xs"
                  onClick={() => cancelAll()}
                >
                  Cancel all
                </Button>
              )}
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setExpanded(false)}
                aria-label="Collapse uploads"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  filter === f.id
                    ? 'border-foreground/40 bg-muted text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted/60',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="px-4 pt-2.5 text-xs text-muted-foreground">
            Uploading to{' '}
            <span className="font-medium text-foreground underline underline-offset-2">
              {destLabel}
            </span>
          </p>

          <ul className="max-h-[min(320px,45vh)] space-y-3 overflow-y-auto px-3 py-3">
            {filtered.length === 0 ? (
              <li className="px-1 py-6 text-center text-xs text-muted-foreground">
                No uploads in this filter
              </li>
            ) : (
              filtered.map((job) => (
                <li key={job.id} className="rounded-lg px-1 py-0.5">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <JobIcon job={job} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{job.name}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          {extOf(job.name)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'mt-0.5 text-[11px]',
                          job.status === 'failed' ? 'text-rose-500' : 'text-muted-foreground',
                        )}
                      >
                        {statusLine(job)}
                      </p>
                      {(job.status === 'uploading' || job.status === 'queued') && (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-[#0061ff] transition-[width] duration-200"
                            style={{ width: `${Math.max(2, job.progress)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {(job.status === 'uploading' || job.status === 'queued') && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 rounded-lg px-2 text-xs"
                        onClick={() => cancel(job.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <div className="pointer-events-auto flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-[#0061ff] px-3 py-2.5 text-left text-white shadow-lg shadow-[#0061ff]/30"
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{summary}</span>
            {active.length > 0 && (
              <span className="block truncate text-[11px] text-white/80">
                {formatEta(worstEta) || 'Working…'}
              </span>
            )}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
          ) : (
            <ChevronUp className="h-4 w-4 shrink-0 opacity-80" />
          )}
        </button>
        {onAddFiles && (
          <Button
            type="button"
            variant="secondary"
            className="h-auto rounded-xl px-3 text-xs font-semibold"
            onClick={onAddFiles}
          >
            Add
            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
          </Button>
        )}
      </div>
    </div>
  );
}
