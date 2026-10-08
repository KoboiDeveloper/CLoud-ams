'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Check,
  ChevronDown,
  Clock,
  Disc3,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  Grid2X2,
  Grid3X3,
  Image as ImageIcon,
  LayoutList,
  Presentation,
  Play,
  Shapes,
  Star,
  PanelRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, LucideIcon> = {
  Folders: Folder,
  Audio: AudioLines,
  'Disk images': Disc3,
  Images: ImageIcon,
  Videos: Play,
  PDFs: FileText,
  Documents: FileText,
  Spreadsheets: FileSpreadsheet,
  Presentations: Presentation,
  Other: File,
};

export type ListFilter = 'all' | 'recent' | 'starred';
export type LayoutMode = 'grid' | 'large-grid' | 'list';

export type DetailColumns = {
  lastModified: boolean;
  type: boolean;
  extension: boolean;
  size: boolean;
  whoCanAccess: boolean;
};

function FilterByMenu({
  label,
  options,
  selected,
  onChange,
  formatOption,
  showIcons,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  formatOption?: (v: string) => string;
  showIcons?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allSelected = options.length > 0 && selected.length === options.length;
  const hasFilter = selected.length > 0 && !allSelected;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition',
          open || hasFilter
            ? 'bg-foreground text-background'
            : 'bg-secondary text-secondary-foreground hover:bg-muted',
        )}
      >
        {label}
        {hasFilter ? ` (${selected.length})` : ''}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 min-w-[240px] rounded-2xl border border-white/10 bg-[#262524] p-4 text-white shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-sm text-white/50">Filter by</span>
            <button
              type="button"
              className="text-sm font-medium text-white underline underline-offset-2 hover:text-white/80"
              onClick={() => onChange(allSelected ? [] : [...options])}
            >
              {allSelected ? 'Clear' : 'Select all'}
            </button>
          </div>

          {options.length === 0 ? (
            <div className="py-2 text-sm text-white/40">No options</div>
          ) : (
            <div className="flex max-h-64 flex-col gap-0.5 overflow-auto">
              {options.map((opt) => {
                const checked = selected.includes(opt);
                const Icon = showIcons ? TYPE_ICONS[opt] || File : null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left text-sm font-medium hover:bg-white/5"
                  >
                    <span
                      className={cn(
                        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border',
                        checked
                          ? 'border-white bg-white text-black'
                          : 'border-white/35 bg-[#3a3938]',
                      )}
                    >
                      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      {formatOption ? formatOption(opt) : opt}
                    </span>
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-white/55" strokeWidth={1.75} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ListToolbar({
  filter,
  onFilterChange,
  layout,
  onLayoutChange,
  showQuickView,
  onToggleQuickView,
  columns,
  onColumnsChange,
  typeFilter,
  onTypeFilter,
  extensionFilter,
  onExtensionFilter,
  availableTypes,
  availableExtensions,
}: {
  filter: ListFilter;
  onFilterChange: (f: ListFilter) => void;
  layout: LayoutMode;
  onLayoutChange: (v: LayoutMode) => void;
  showQuickView: boolean;
  onToggleQuickView: () => void;
  columns: DetailColumns;
  onColumnsChange: (next: DetailColumns) => void;
  typeFilter: string[];
  onTypeFilter: (v: string[]) => void;
  extensionFilter: string[];
  onExtensionFilter: (v: string[]) => void;
  availableTypes: string[];
  availableExtensions: string[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (layout !== 'list') setDetailsOpen(false);
  }, [layout]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (detailsRef.current && !detailsRef.current.contains(t)) setDetailsOpen(false);
      if (layoutRef.current && !layoutRef.current.contains(t)) setLayoutOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const layoutIcon =
    layout === 'list' ? (
      <LayoutList className="h-4 w-4" />
    ) : layout === 'large-grid' ? (
      <Grid2X2 className="h-4 w-4" />
    ) : (
      <Grid3X3 className="h-4 w-4" />
    );

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onFilterChange(filter === 'recent' ? 'all' : 'recent')}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition',
            filter === 'recent'
              ? 'bg-foreground text-background shadow-sm'
              : 'bg-secondary text-secondary-foreground hover:bg-muted',
          )}
        >
          <Clock className="h-4 w-4" />
          Recents
        </button>
        <button
          type="button"
          onClick={() => onFilterChange(filter === 'starred' ? 'all' : 'starred')}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition',
            filter === 'starred'
              ? 'bg-foreground text-background shadow-sm'
              : 'bg-secondary text-secondary-foreground hover:bg-muted',
          )}
        >
          <Star className="h-4 w-4" />
          Starred
        </button>

        <FilterByMenu
          label="Type"
          options={availableTypes}
          selected={typeFilter}
          onChange={onTypeFilter}
          showIcons
        />
        <FilterByMenu
          label="Extension"
          options={availableExtensions}
          selected={extensionFilter}
          onChange={onExtensionFilter}
          formatOption={(ext) => `.${ext}`}
        />
      </div>

      <div className="flex items-center gap-1">
        {layout === 'list' && (
          <div className="relative" ref={detailsRef}>
            <button
              type="button"
              title="Details"
              onClick={() => {
                setDetailsOpen((v) => !v);
                setLayoutOpen(false);
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground',
                detailsOpen && 'bg-muted text-foreground',
              )}
            >
              <Shapes className="h-4 w-4" />
            </button>
            {detailsOpen && (
              <div className="absolute right-0 top-10 z-40 min-w-[200px] rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
                <div className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">Details</div>
                {(
                  [
                    ['lastModified', 'Last modified'],
                    ['type', 'Type'],
                    ['extension', 'Extension'],
                    ['size', 'Size'],
                    ['whoCanAccess', 'Who can access'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={() =>
                      onColumnsChange({ ...columns, [key]: !columns[key] })
                    }
                  >
                    <span className="flex h-4 w-4 items-center justify-center">
                      {columns[key] ? <Check className="h-4 w-4" /> : null}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative" ref={layoutRef}>
          <button
            type="button"
            title="Layout"
            onClick={() => {
              setLayoutOpen((v) => !v);
              setDetailsOpen(false);
            }}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground',
              layoutOpen && 'bg-muted text-foreground',
            )}
          >
            {layoutIcon}
          </button>
          {layoutOpen && (
            <div className="absolute right-0 top-10 z-40 min-w-[200px] rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
              <div className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">Layout</div>
              {(
                [
                  { id: 'grid' as const, label: 'Grid', icon: <Grid3X3 className="h-4 w-4" /> },
                  {
                    id: 'large-grid' as const,
                    label: 'Large grid',
                    icon: <Grid2X2 className="h-4 w-4" />,
                  },
                  { id: 'list' as const, label: 'List', icon: <LayoutList className="h-4 w-4" /> },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onLayoutChange(opt.id);
                    setLayoutOpen(false);
                  }}
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    {layout === opt.id ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span className="flex-1">{opt.label}</span>
                  <span className="text-muted-foreground">{opt.icon}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          title="Quick view"
          onClick={onToggleQuickView}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground',
            showQuickView && 'bg-muted text-foreground',
          )}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
