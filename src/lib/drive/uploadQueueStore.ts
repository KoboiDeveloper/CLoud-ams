'use client';

import { create } from 'zustand';

export type UploadStatus = 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';
export type UploadFilter = 'all' | 'completed' | 'cancelled' | 'failed';

export type UploadJob = {
  id: string;
  file: File;
  name: string;
  size: number;
  folderId: string | null;
  destLabel: string;
  status: UploadStatus;
  progress: number;
  loaded: number;
  total: number;
  error?: string;
  startedAt?: number;
  etaSeconds?: number | null;
  controller?: AbortController;
};

export type UploadFn = (
  file: File,
  folderId: string | null,
  onProgress: (pct: number, loaded: number, total: number) => void,
  signal: AbortSignal,
) => Promise<unknown>;

type State = {
  jobs: UploadJob[];
  expanded: boolean;
  filter: UploadFilter;
  enqueue: (
    files: File[],
    opts: {
      folderId: string | null;
      destLabel: string;
      upload: UploadFn;
      onItemDone?: () => void;
    },
  ) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
  clearFinished: () => void;
  setExpanded: (v: boolean) => void;
  setFilter: (f: UploadFilter) => void;
};

const MAX_PARALLEL = 2;

const uploadMeta = new Map<string, { upload: UploadFn; onItemDone?: () => void }>();

export function extOf(name: string) {
  const i = name.lastIndexOf('.');
  if (i < 0 || i === name.length - 1) return 'FILE';
  return name.slice(i + 1).toUpperCase().slice(0, 6);
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatEta(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  if (sec < 60) return `${sec} second${sec === 1 ? '' : 's'} left`;
  const m = Math.ceil(sec / 60);
  return `${m} minute${m === 1 ? '' : 's'} left`;
}

export { formatEta };

async function pump(
  get: () => State,
  set: (partial: Partial<State> | ((s: State) => Partial<State>)) => void,
) {
  const uploading = get().jobs.filter((j) => j.status === 'uploading').length;
  const slots = MAX_PARALLEL - uploading;
  if (slots <= 0) return;

  const next = get().jobs.filter((j) => j.status === 'queued').slice(0, slots);
  for (const job of next) {
    const meta = uploadMeta.get(job.id);
    if (!meta) continue;
    const controller = new AbortController();

    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === job.id
          ? { ...j, status: 'uploading' as const, startedAt: Date.now(), controller }
          : j,
      ),
      expanded: true,
    }));

    void (async () => {
      try {
        await meta.upload(
          job.file,
          job.folderId,
          (pct, loaded, total) => {
            const started = get().jobs.find((j) => j.id === job.id)?.startedAt || Date.now();
            const elapsed = (Date.now() - started) / 1000;
            const speed = elapsed > 0.25 ? loaded / elapsed : 0;
            const remain = Math.max(0, total - loaded);
            const eta = speed > 0 ? Math.ceil(remain / speed) : null;
            set((s) => ({
              jobs: s.jobs.map((j) =>
                j.id === job.id ? { ...j, progress: pct, loaded, total, etaSeconds: eta } : j,
              ),
            }));
          },
          controller.signal,
        );
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'completed' as const,
                  progress: 100,
                  loaded: j.total || j.size,
                  etaSeconds: 0,
                  controller: undefined,
                }
              : j,
          ),
        }));
        meta.onItemDone?.();
      } catch (err: unknown) {
        const aborted =
          controller.signal.aborted ||
          (err as { code?: string; name?: string })?.code === 'ERR_CANCELED' ||
          (err as { name?: string })?.name === 'CanceledError' ||
          /abort|cancel/i.test((err as Error)?.message || '');
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: (aborted ? 'cancelled' : 'failed') as UploadStatus,
                  error: aborted
                    ? undefined
                    : (err as { response?: { data?: { message?: string } }; message?: string })
                        ?.response?.data?.message ||
                      (err as Error)?.message ||
                      'Upload failed',
                  controller: undefined,
                  etaSeconds: null,
                }
              : j,
          ),
        }));
      } finally {
        uploadMeta.delete(job.id);
        void pump(get, set);
      }
    })();
  }
}

export const useUploadQueueStore = create<State>((set, get) => ({
  jobs: [],
  expanded: false,
  filter: 'all',

  enqueue: (files, opts) => {
    if (!files.length) return;
    const jobs: UploadJob[] = files.map((file) => {
      const id = uid();
      uploadMeta.set(id, { upload: opts.upload, onItemDone: opts.onItemDone });
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        folderId: opts.folderId,
        destLabel: opts.destLabel,
        status: 'queued',
        progress: 0,
        loaded: 0,
        total: file.size,
      };
    });
    set((s) => ({
      jobs: [...s.jobs, ...jobs],
      expanded: true,
      filter: 'all',
    }));
    void pump(get, set);
  },

  cancel: (id) => {
    const job = get().jobs.find((j) => j.id === id);
    job?.controller?.abort();
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === id && (j.status === 'queued' || j.status === 'uploading')
          ? { ...j, status: 'cancelled', controller: undefined, etaSeconds: null }
          : j,
      ),
    }));
    uploadMeta.delete(id);
    void pump(get, set);
  },

  cancelAll: () => {
    for (const j of get().jobs) {
      if (j.status === 'queued' || j.status === 'uploading') j.controller?.abort();
    }
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.status === 'queued' || j.status === 'uploading'
          ? { ...j, status: 'cancelled', controller: undefined, etaSeconds: null }
          : j,
      ),
    }));
    uploadMeta.clear();
  },

  clearFinished: () => {
    set((s) => ({
      jobs: s.jobs.filter((j) => j.status === 'queued' || j.status === 'uploading'),
    }));
  },

  setExpanded: (v) => set({ expanded: v }),
  setFilter: (f) => set({ filter: f }),
}));
