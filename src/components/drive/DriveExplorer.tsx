'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Copy,
  Download,
  FolderInput,
  FolderPlus,
  Link2,
  Pencil,
  Star,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import DriveService from '@/lib/drive/driveService';
import { DriveItem } from '@/lib/drive/driveTypes';
import { DriveSidebar } from '@/components/drive/DriveSidebar';
import { ItemIcon, fileTypeLabel } from '@/components/drive/ItemIcon';
import { RowHoverActions } from '@/components/drive/RowHoverActions';
import { GridHoverActions } from '@/components/drive/GridHoverActions';
import {
  ListToolbar,
  ListFilter,
  LayoutMode,
  DetailColumns,
} from '@/components/drive/ListToolbar';
import { ShareLinkPopover } from '@/components/drive/ShareLinkPopover';
import { ShareLinkSettings } from '@/components/drive/ShareLinkSettings';
import { QuickViewFullscreen, QuickViewPanel } from '@/components/drive/QuickView';
import { NewFolderDialog, FolderAccess } from '@/components/drive/NewFolderDialog';
import { ShareFolderDialog } from '@/components/drive/ShareFolderDialog';
import { EmptyFolderState } from '@/components/drive/EmptyFolderState';
import { UploadDock } from '@/components/drive/UploadDock';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn, formatBytes } from '@/lib/utils';
import { useAuthActions } from '@/lib/auth/useAuthAction';
import { useUploadQueueStore } from '@/lib/drive/uploadQueueStore';
import { format } from 'date-fns';

type ViewMode = 'my' | 'shared' | 'recent' | 'starred' | 'trash';

function mimeCategory(mime?: string, name?: string) {
  const m = (mime || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return 'Images';
  if (m.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/.test(n)) return 'Videos';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/.test(n)) return 'Audio';
  if (
    m.includes('iso') ||
    m.includes('diskimage') ||
    /\.(iso|dmg|img|vhd|vmdk)$/.test(n)
  ) {
    return 'Disk images';
  }
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'PDFs';
  if (m.includes('word') || m.includes('msword') || m.includes('document') || /\.docx?$/.test(n)) {
    return 'Documents';
  }
  if (
    m.includes('sheet') ||
    m.includes('excel') ||
    m.includes('csv') ||
    /\.(xlsx?|csv)$/.test(n)
  ) {
    return 'Spreadsheets';
  }
  if (m.includes('presentation') || m.includes('powerpoint') || /\.pptx?$/.test(n)) {
    return 'Presentations';
  }
  return 'Other';
}

function fileExt(name: string) {
  const i = name.lastIndexOf('.');
  if (i < 0) return '';
  return name.slice(i + 1).toLowerCase();
}

export function DriveExplorer({ mode }: { mode: ViewMode }) {
  useAuthActions();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DriveItem | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showQuickView, setShowQuickView] = useState(true);
  const [layout, setLayout] = useState<LayoutMode>('list');
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [extensionFilter, setExtensionFilter] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [columns, setColumns] = useState<DetailColumns>({
    lastModified: true,
    type: false,
    extension: false,
    size: true,
    whoCanAccess: true,
  });
  const [menu, setMenu] = useState<{ x: number; y: number; item: DriveItem } | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderAccess, setFolderAccess] = useState<FolderAccess>('only-me');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [shareInviteOpen, setShareInviteOpen] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkSettingsOpen, setLinkSettingsOpen] = useState(false);
  const [actionItem, setActionItem] = useState<DriveItem | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizeItem, setOrganizeItem] = useState<DriveItem | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string>('');

  useEffect(() => {
    setFolderId(null);
    setSelected(null);
    setListFilter(mode === 'recent' ? 'recent' : mode === 'starred' ? 'starred' : 'all');
  }, [mode]);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const effectiveMode: ViewMode =
    mode === 'my' && listFilter === 'recent'
      ? 'recent'
      : mode === 'my' && listFilter === 'starred'
        ? 'starred'
        : mode;

  const listQuery = useQuery({
    queryKey: ['drive', effectiveMode, folderId],
    queryFn: async () => {
      if (effectiveMode === 'shared') return DriveService.shared();
      if (effectiveMode === 'recent') return DriveService.recent();
      if (effectiveMode === 'starred') return DriveService.starred();
      if (effectiveMode === 'trash') return DriveService.trash();
      return DriveService.list(folderId);
    },
  });

  const crumbsQuery = useQuery({
    queryKey: ['breadcrumb', folderId],
    queryFn: () => DriveService.breadcrumb(folderId),
    enabled: mode === 'my' && listFilter === 'all',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['drive'] });
    qc.invalidateQueries({ queryKey: ['user-info'] });
  };

  const createFolder = useMutation({
    mutationFn: () => DriveService.createFolder(folderName.trim(), folderId),
    onSuccess: (created) => {
      toast.success('Folder created');
      const shouldInvite = folderAccess === 'people';
      setNewFolderOpen(false);
      setFolderName('');
      setFolderAccess('only-me');
      invalidate();
      if (created?.id) {
        const folder = { ...created, itemCount: 0 };
        setFolderId(created.id);
        setSelected(folder);
        setListFilter('all');
        if (shouldInvite) {
          setActionItem(folder);
          setShareInviteOpen(true);
        }
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  const enqueueUploads = useUploadQueueStore((s) => s.enqueue);

  const uploadDestLabel = useMemo(() => {
    const crumbs = crumbsQuery.data || [];
    if (crumbs.length) return crumbs[crumbs.length - 1]?.name || 'Files';
    return 'Files';
  }, [crumbsQuery.data]);

  const startUploads = (fileList: FileList | File[] | null | undefined) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    enqueueUploads(files, {
      folderId,
      destLabel: uploadDestLabel,
      upload: (file, destFolderId, onProgress, signal) =>
        DriveService.upload(file, destFolderId, onProgress, signal),
      onItemDone: () => invalidate(),
    });
  };

  const renameMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('No item');
      return DriveService.rename(selected.type, selected.id, renameValue);
    },
    onSuccess: (data) => {
      toast.success('Renamed');
      setRenameOpen(false);
      setSelected(data);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || 'Rename failed'),
  });

  const rawItems = useMemo(() => {
    const folders = listQuery.data?.folders || [];
    const files = listQuery.data?.files || [];
    return [...folders, ...files] as DriveItem[];
  }, [listQuery.data]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    rawItems.forEach((i) => {
      if (i.type === 'FOLDER') set.add('Folders');
      else set.add(mimeCategory(i.mimeType, i.name));
    });
    return Array.from(set).sort();
  }, [rawItems]);

  const availableExtensions = useMemo(() => {
    const set = new Set<string>();
    rawItems.forEach((i) => {
      if (i.type === 'FILE') {
        const ext = fileExt(i.name);
        if (ext) set.add(ext);
      }
    });
    return Array.from(set).sort();
  }, [rawItems]);

  const items = useMemo(() => {
    let list = [...rawItems];
    if (typeFilter.length > 0) {
      list = list.filter((i) => {
        if (i.type === 'FOLDER') return typeFilter.includes('Folders');
        return typeFilter.includes(mimeCategory(i.mimeType, i.name));
      });
    }
    if (extensionFilter.length > 0) {
      list = list.filter(
        (i) => i.type === 'FILE' && extensionFilter.includes(fileExt(i.name)),
      );
    }
    list.sort((a, b) => {
      const cmp =
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [rawItems, typeFilter, extensionFilter, sortAsc]);

  const title =
    mode === 'shared'
      ? 'Shared with me'
      : mode === 'recent' || listFilter === 'recent'
        ? 'Recent'
        : mode === 'starred' || listFilter === 'starred'
          ? 'Starred'
          : mode === 'trash'
            ? 'Trash'
            : 'My Drive';

  async function runAction(action: string, item: DriveItem) {
    try {
      if (action === 'open' && item.type === 'FOLDER' && mode === 'my') {
        setFolderId(item.id);
        setSelected(item);
        setListFilter('all');
        return;
      }
      if (action === 'preview') {
        setSelected(item);
        setShowQuickView(true);
        return;
      }
      if (action === 'open-fullscreen' && item.type === 'FILE') {
        setSelected(item);
        setShowQuickView(true);
        setFullscreenOpen(true);
        return;
      }
      if (action === 'download' && item.type === 'FILE') {
        const d = await DriveService.download(item.id);
        window.open(d.url, '_blank');
        return;
      }
      if (action === 'star') {
        await DriveService.star(item.type, item.id, !item.starred);
        invalidate();
        return;
      }
      if (action === 'rename') {
        setSelected(item);
        setRenameValue(item.name);
        setRenameOpen(true);
        return;
      }
      if (action === 'copy' && item.type === 'FILE') {
        await DriveService.copy(item.id);
        toast.success('Copied');
        invalidate();
        return;
      }
      if (action === 'trash') {
        await DriveService.trashItem(item.type, item.id);
        toast.success('Moved to trash');
        setSelected(null);
        invalidate();
        return;
      }
      if (action === 'restore') {
        await DriveService.restore(item.type, item.id);
        toast.success('Restored');
        invalidate();
        return;
      }
      if (action === 'delete') {
        await DriveService.permanentDelete(item.type, item.id);
        toast.success('Deleted');
        setSelected(null);
        invalidate();
        return;
      }
      if (action === 'share') {
        setActionItem(item);
        setSelected(item);
        setShareInviteOpen(true);
        return;
      }
      if (action === 'link') {
        setActionItem(item);
        setSelected(item);
        setLinkSettingsOpen(false);
        setLinkPopoverOpen(true);
        return;
      }
      if (action === 'organize') {
        setOrganizeItem(item);
        setMoveTargetId('');
        setOrganizeOpen(true);
        return;
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || 'Action failed');
    }
  }

  const folderTargets = useMemo(
    () => (listQuery.data?.folders || []).filter((f) => f.id !== organizeItem?.id),
    [listQuery.data?.folders, organizeItem?.id],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <DriveSidebar
        onUpload={() => fileInputRef.current?.click()}
        onNewFolder={() => {
          setFolderName('');
          setFolderAccess('only-me');
          setNewFolderOpen(true);
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold">{title}</div>
            {mode === 'my' && listFilter === 'all' && (
              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {(crumbsQuery.data || []).map((c, i) => (
                  <button
                    key={`${c.id}-${i}`}
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setFolderId(c.id)}
                  >
                    {i > 0 && <span className="mx-1 text-muted-foreground/50">/</span>}
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DarkModeToggle />
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto p-4">
            {mode !== 'trash' && (
              <ListToolbar
                filter={listFilter}
                onFilterChange={setListFilter}
                layout={layout}
                onLayoutChange={setLayout}
                showQuickView={showQuickView}
                onToggleQuickView={() => setShowQuickView((v) => !v)}
                columns={columns}
                onColumnsChange={setColumns}
                typeFilter={typeFilter}
                onTypeFilter={setTypeFilter}
                extensionFilter={extensionFilter}
                onExtensionFilter={setExtensionFilter}
                availableTypes={availableTypes}
                availableExtensions={availableExtensions}
              />
            )}

            {listQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : items.length === 0 ? (
              mode === 'trash' ? (
                <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm">Trash is empty</p>
                </div>
              ) : (
                <EmptyFolderState
                  onUpload={() => fileInputRef.current?.click()}
                  onNewFolder={() => {
                    setFolderName('');
                    setFolderAccess('only-me');
                    setNewFolderOpen(true);
                  }}
                />
              )
            ) : layout !== 'list' ? (
              <div
                className={cn(
                  'grid gap-3',
                  layout === 'large-grid'
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6',
                )}
              >
                {items.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    role="button"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => {
                      setSelected(item);
                      if (showQuickView) setShowQuickView(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(item);
                      }
                    }}
                    onDoubleClick={() =>
                      runAction(
                        item.type === 'FOLDER' ? 'open' : 'open-fullscreen',
                        item,
                      )
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelected(item);
                      setMenu({ x: e.clientX, y: e.clientY, item });
                    }}
                    className="group relative flex cursor-pointer flex-col bg-transparent"
                  >
                    <div
                      className={cn(
                        'absolute left-3 top-3 z-[1] flex h-5 w-5 items-center justify-center rounded border transition',
                        selected?.id === item.id
                          ? 'border-white bg-white text-black'
                          : 'border-white/30 bg-transparent',
                      )}
                    >
                      {selected?.id === item.id && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                          <path
                            d="M2.5 6.2 4.8 8.5 9.5 3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    {mode !== 'trash' && (
                      <GridHoverActions
                        visible={hoveredId === item.id}
                        large={layout === 'large-grid'}
                        onShare={() => runAction('share', item)}
                        onLink={() => runAction('link', item)}
                        onMore={(e) => {
                          setSelected(item);
                          setMenu({ x: e.clientX, y: e.clientY, item });
                        }}
                      />
                    )}

                    {/* Preview box — ukuran sama folder & file biar sejajar */}
                    <div
                      className={cn(
                        'relative flex w-full items-center justify-center rounded-xl bg-[#2e2d2c] transition',
                        layout === 'large-grid' ? 'aspect-square' : 'aspect-[4/3]',
                        selected?.id === item.id && 'bg-[#3a3938]',
                        hoveredId === item.id && selected?.id !== item.id && 'bg-[#343332]',
                      )}
                    >
                      <ItemIcon
                        item={item}
                        className={layout === 'large-grid' ? 'h-20 w-20' : 'h-16 w-16'}
                      />
                    </div>

                    {/* Meta di bawah preview — layout sama */}
                    <div className="mt-2 flex min-w-0 items-start gap-2">
                      <ItemIcon item={item} className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="min-w-0 flex-1 text-left">
                        <div
                          className="truncate text-sm font-medium text-foreground transition-colors hover:underline"
                          title={item.name}
                        >
                          {item.name}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.type === 'FOLDER'
                            ? `Folder • ${
                                typeof item.itemCount === 'number'
                                  ? `${item.itemCount} item${item.itemCount === 1 ? '' : 's'}`
                                  : '—'
                              }`
                            : `${fileTypeLabel(item)} • ${formatBytes(item.bytes)}`}
                        </div>
                      </div>
                      {item.starred && (
                        <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-xs text-muted-foreground">
                  <span className="min-w-0 flex-1 font-medium text-foreground/80">Name</span>
                  {columns.lastModified && (
                    <button
                      type="button"
                      className="hidden w-[148px] shrink-0 items-center gap-1 text-left font-medium text-foreground sm:inline-flex"
                      onClick={() => setSortAsc((v) => !v)}
                    >
                      Last modified
                      <span className="text-[10px]">{sortAsc ? '↑' : '↓'}</span>
                    </button>
                  )}
                  {columns.type && (
                    <span className="hidden w-24 shrink-0 text-left md:inline">Type</span>
                  )}
                  {columns.extension && (
                    <span className="hidden w-16 shrink-0 text-left md:inline">Ext</span>
                  )}
                  {columns.size && (
                    <span className="hidden w-20 shrink-0 text-left sm:inline">Size</span>
                  )}
                  {columns.whoCanAccess && (
                    <span className="hidden w-28 shrink-0 text-left lg:inline">Access</span>
                  )}
                </div>
                <div>
                  {items.map((item) => {
                    const hovered = hoveredId === item.id;
                    const isSelected = selected?.id === item.id;
                    const accessLabel =
                      item.permission === 'EDIT'
                        ? 'Can edit'
                        : item.permission === 'VIEW'
                          ? 'Can view'
                          : 'Only you';
                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={cn(
                          'group flex min-h-[52px] cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-3',
                          isSelected || hovered ? 'bg-muted' : 'hover:bg-muted/60',
                        )}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setSelected(item)}
                        onDoubleClick={() =>
                          runAction(
                            item.type === 'FOLDER' ? 'open' : 'open-fullscreen',
                            item,
                          )
                        }
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelected(item);
                          setMenu({ x: e.clientX, y: e.clientY, item });
                        }}
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border/80" />
                        <ItemIcon item={item} className="h-6 w-6 shrink-0" />

                        {/* Name + overlay actions — tidak geser kolom lain */}
                        <div className="relative min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2 pr-2 text-[15px] font-medium">
                            <span
                              className="truncate transition-colors hover:text-primary hover:underline"
                              title={item.name}
                            >
                              {item.name}
                            </span>
                            {item.starred && !(hovered || isSelected) && (
                              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                            )}
                          </div>
                          {mode !== 'trash' ? (
                            <RowHoverActions
                              visible={hovered || isSelected}
                              starred={item.starred}
                              onShare={() => runAction('share', item)}
                              onLink={() => runAction('link', item)}
                              onOrganize={() => runAction('organize', item)}
                              onStar={() => runAction('star', item)}
                              onMore={(e) => {
                                setSelected(item);
                                setMenu({ x: e.clientX, y: e.clientY, item });
                              }}
                            />
                          ) : hovered || isSelected ? (
                            <div className="absolute inset-y-0 right-0 flex items-center bg-muted pl-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runAction('restore', item);
                                }}
                              >
                                Restore
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {columns.lastModified && (
                          <div className="hidden w-[148px] shrink-0 text-left text-sm text-muted-foreground sm:block">
                            {format(new Date(item.updatedAt), 'd/M/yyyy h:mm aaa')}
                          </div>
                        )}
                        {columns.type && (
                          <div className="hidden w-24 shrink-0 truncate text-left text-sm text-muted-foreground md:block">
                            {item.type === 'FOLDER' ? 'Folder' : mimeCategory(item.mimeType, item.name)}
                          </div>
                        )}
                        {columns.extension && (
                          <div className="hidden w-16 shrink-0 truncate text-left text-sm text-muted-foreground uppercase md:block">
                            {item.type === 'FILE' ? fileExt(item.name) || '—' : '—'}
                          </div>
                        )}
                        {columns.size && (
                          <div className="hidden w-20 shrink-0 text-left text-sm text-muted-foreground tabular-nums sm:block">
                            {item.type === 'FILE' ? formatBytes(item.bytes) : '—'}
                          </div>
                        )}
                        {columns.whoCanAccess && (
                          <div className="hidden w-28 shrink-0 truncate text-left text-sm text-muted-foreground lg:block">
                            {accessLabel}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {showQuickView && (
            <div className="hidden lg:block">
              <QuickViewPanel
                item={selected}
                onClose={() => setShowQuickView(false)}
                onShare={() => selected && runAction('share', selected)}
                onLink={() => selected && runAction('link', selected)}
                onOpenFullscreen={() =>
                  selected?.type === 'FILE' && setFullscreenOpen(true)
                }
              />
            </div>
          )}
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          startUploads(e.target.files);
          e.target.value = '';
        }}
      />

      <UploadDock onAddFiles={() => fileInputRef.current?.click()} />

      {menu && (
        <div
          className="fixed z-50 min-w-[240px] overflow-hidden rounded-xl border border-border bg-popover py-1.5 text-popover-foreground shadow-xl"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {mode === 'trash' ? (
            <>
              <MenuItem label="Restore" onClick={() => { runAction('restore', menu.item); setMenu(null); }} />
              <div className="my-1 border-t border-border" />
              <MenuItem
                icon={Trash2}
                label="Delete forever"
                danger
                onClick={() => { runAction('delete', menu.item); setMenu(null); }}
              />
            </>
          ) : (
            <>
              <MenuItem
                icon={UserPlus}
                label="Manage People"
                onClick={() => { runAction('share', menu.item); setMenu(null); }}
              />
              <MenuItem
                icon={Link2}
                label="Get shareable link"
                onClick={() => { runAction('link', menu.item); setMenu(null); }}
              />
              <MenuItem
                icon={Star}
                label={menu.item.starred ? 'Remove star' : 'Add a star'}
                onClick={() => { runAction('star', menu.item); setMenu(null); }}
              />
              <MenuItem
                icon={FolderPlus}
                label="New Folder"
                onClick={() => {
                  setMenu(null);
                  setFolderName('');
                  setFolderAccess('only-me');
                  setNewFolderOpen(true);
                }}
              />
              <MenuItem
                icon={FolderInput}
                label="Move to"
                onClick={() => { runAction('organize', menu.item); setMenu(null); }}
              />
              <MenuItem
                icon={Pencil}
                label="Rename"
                onClick={() => { runAction('rename', menu.item); setMenu(null); }}
              />
              <MenuItem
                icon={Copy}
                label="Make a copy"
                disabled={menu.item.type !== 'FILE'}
                onClick={() => { runAction('copy', menu.item); setMenu(null); }}
              />
              <MenuItem
                icon={Download}
                label="Download"
                disabled={menu.item.type !== 'FILE'}
                onClick={() => { runAction('download', menu.item); setMenu(null); }}
              />
              <div className="my-1 border-t border-border" />
              <MenuItem
                icon={Trash2}
                label="Delete"
                danger
                onClick={() => { runAction('trash', menu.item); setMenu(null); }}
              />
            </>
          )}
        </div>
      )}

      <QuickViewFullscreen
        open={fullscreenOpen}
        item={selected?.type === 'FILE' ? selected : null}
        onClose={() => setFullscreenOpen(false)}
        onShare={() => selected && runAction('share', selected)}
      />

      <ShareLinkPopover
        open={linkPopoverOpen}
        item={actionItem}
        onClose={() => setLinkPopoverOpen(false)}
        onManage={() => {
          setLinkPopoverOpen(false);
          setLinkSettingsOpen(true);
        }}
      />

      <ShareLinkSettings
        open={linkSettingsOpen}
        item={actionItem}
        onClose={() => setLinkSettingsOpen(false)}
        onBack={() => {
          setLinkSettingsOpen(false);
          setLinkPopoverOpen(true);
        }}
      />

      <NewFolderDialog
        open={newFolderOpen}
        name={folderName}
        onNameChange={setFolderName}
        access={folderAccess}
        onAccessChange={setFolderAccess}
        creating={createFolder.isPending}
        onClose={() => setNewFolderOpen(false)}
        onCreate={() => createFolder.mutate()}
      />

      <ShareFolderDialog
        open={shareInviteOpen}
        item={actionItem}
        onClose={() => setShareInviteOpen(false)}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            <Button className="w-full" onClick={() => renameMut.mutate()} disabled={!renameValue.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={organizeOpen} onOpenChange={setOrganizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organize — {organizeItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Move to folder</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={moveTargetId}
              onChange={(e) => setMoveTargetId(e.target.value)}
            >
              <option value="">My Drive (root)</option>
              {folderTargets.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <Button
              className="w-full"
              disabled={!organizeItem}
              onClick={async () => {
                if (!organizeItem) return;
                try {
                  await DriveService.move(
                    organizeItem.type,
                    organizeItem.id,
                    moveTargetId || null,
                  );
                  toast.success('Moved');
                  setOrganizeOpen(false);
                  invalidate();
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || e.message);
                }
              }}
            >
              Move here
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
  icon: Icon,
  disabled,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-accent',
        danger && 'text-destructive',
        disabled && 'pointer-events-none opacity-40',
      )}
      onClick={onClick}
    >
      {Icon ? (
        <Icon className={cn('h-4 w-4 shrink-0', danger ? 'text-destructive' : 'text-muted-foreground')} />
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
}
