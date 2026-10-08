'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Folder,
  Globe,
  Info,
  Link2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import ShareService from '@/lib/drive/shareService';
import { DriveItem } from '@/lib/drive/driveTypes';
import { cn } from '@/lib/utils';

type LinkTab = 'edit' | 'view';

type LinkState = {
  id?: string;
  token?: string;
  url: string;
  who: 'anyone' | 'off';
  expiration: 'never' | '1d' | '7d' | '30d';
  password: string;
  passwordApplied: boolean;
  downloadsAllowed: boolean;
  dirty: boolean;
};

const emptyState = (): LinkState => ({
  url: '',
  who: 'anyone',
  expiration: 'never',
  password: '',
  passwordApplied: false,
  downloadsAllowed: true,
  dirty: false,
});

function expirationToDate(value: LinkState['expiration']): string | undefined {
  if (value === 'never') return undefined;
  const days = value === '1d' ? 1 : value === '7d' ? 7 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function ShareLinkSettings({
  open,
  item,
  onClose,
  onBack,
}: {
  open: boolean;
  item: DriveItem | null;
  onClose: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<LinkTab>('edit');
  const [editLink, setEditLink] = useState<LinkState>(emptyState());
  const [viewLink, setViewLink] = useState<LinkState>(emptyState());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = tab === 'edit' ? editLink : viewLink;
  const setCurrent = tab === 'edit' ? setEditLink : setViewLink;
  const permission = tab === 'edit' ? 'EDIT' : 'VIEW';

  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const links = await ShareService.listLinks(item.id, item.type);
        if (cancelled) return;

        const mapLink = (perm: 'EDIT' | 'VIEW'): LinkState => {
          const found = links.find((l: any) => l.permission === perm);
          if (!found) return emptyState();
          return {
            id: found.id,
            token: found.token,
            url: `${window.location.origin}${found.url}`,
            who: 'anyone',
            expiration: found.expiresAt ? '7d' : 'never',
            password: '',
            passwordApplied: Boolean(found.hasPassword),
            downloadsAllowed: true,
            dirty: false,
          };
        };

        setEditLink(mapLink('EDIT'));
        setViewLink(mapLink('VIEW'));
      } catch (e: any) {
        toast.error(e?.response?.data?.message || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, item]);

  const subtitle = useMemo(() => {
    if (!item) return '';
    return `${item.name} • 1 item`;
  }, [item]);

  async function ensureLink() {
    if (!item) return null;
    if (current.id && current.url) return current;

    const created = await ShareService.createLink({
      itemId: item.id,
      itemType: item.type,
      permission,
      password: current.passwordApplied && current.password ? current.password : undefined,
      expiresAt: expirationToDate(current.expiration),
    });
    const next: LinkState = {
      ...current,
      id: created.id,
      token: created.token,
      url: `${window.location.origin}${created.url}`,
      dirty: false,
    };
    setCurrent(next);
    return next;
  }

  async function saveSettings() {
    if (!item) return;
    setSaving(true);
    try {
      if (current.id) {
        await ShareService.revokeLink(current.id);
      }
      if (current.who === 'off') {
        setCurrent(emptyState());
        toast.success('Link disabled');
        return;
      }
      const created = await ShareService.createLink({
        itemId: item.id,
        itemType: item.type,
        permission,
        password: current.passwordApplied && current.password ? current.password : undefined,
        expiresAt: expirationToDate(current.expiration),
      });
      setCurrent({
        ...current,
        id: created.id,
        token: created.token,
        url: `${window.location.origin}${created.url}`,
        dirty: false,
      });
      toast.success('Settings saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLink() {
    if (!current.id) {
      setCurrent(emptyState());
      return;
    }
    try {
      await ShareService.revokeLink(current.id);
      setCurrent(emptyState());
      toast.success('Link deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[8vh] dark:bg-black/80"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-white text-foreground shadow-2xl dark:bg-[#1c1c1c] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4">
          <div className="mb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <div className="ml-7 flex items-center gap-2 text-sm text-muted-foreground">
            {item.type === 'FOLDER' ? (
              <Folder className="h-4 w-4 text-amber-400" fill="currentColor" />
            ) : (
              <FileText className="h-4 w-4 text-sky-500" />
            )}
            <span className="truncate">{subtitle}</span>
          </div>
        </div>

        <div className="flex gap-6 border-b border-border px-5">
          {(
            [
              { id: 'edit' as const, label: 'Link for editing' },
              { id: 'view' as const, label: 'Link for viewing' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'relative py-3 text-sm font-medium transition',
                tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <SettingRow
                icon={<Globe className="h-4 w-4" />}
                label={tab === 'edit' ? 'Who can edit' : 'Who can view'}
                control={
                  <select
                    className="rounded-md bg-transparent px-2 py-1 text-right text-sm text-muted-foreground outline-none"
                    value={current.who}
                    onChange={(e) =>
                      setCurrent({
                        ...current,
                        who: e.target.value as LinkState['who'],
                        dirty: true,
                      })
                    }
                  >
                    <option value="anyone">anyone with link</option>
                    <option value="off">only people invited</option>
                  </select>
                }
              />
              <SettingRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Link expiration"
                info
                control={
                  <select
                    className="rounded-md bg-transparent px-2 py-1 text-right text-sm text-muted-foreground outline-none"
                    value={current.expiration}
                    onChange={(e) =>
                      setCurrent({
                        ...current,
                        expiration: e.target.value as LinkState['expiration'],
                        dirty: true,
                      })
                    }
                  >
                    <option value="never">never</option>
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                  </select>
                }
              />
              <SettingRow
                icon={<Lock className="h-4 w-4" />}
                label="Password protection"
                info
                control={
                  <select
                    className="rounded-md bg-transparent px-2 py-1 text-right text-sm text-muted-foreground outline-none"
                    value={current.passwordApplied ? 'on' : 'off'}
                    onChange={(e) => {
                      const on = e.target.value === 'on';
                      setCurrent({
                        ...current,
                        passwordApplied: on,
                        password: on ? current.password || '' : '',
                        dirty: true,
                      });
                    }}
                  >
                    <option value="off">not applied</option>
                    <option value="on">apply password</option>
                  </select>
                }
              />
              {current.passwordApplied && (
                <div className="px-3 pb-2">
                  <input
                    type="password"
                    placeholder="Set password"
                    value={current.password}
                    onChange={(e) =>
                      setCurrent({ ...current, password: e.target.value, dirty: true })
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
              <SettingRow
                icon={<Download className="h-4 w-4" />}
                label="Downloads allowed"
                info
                control={
                  <button
                    type="button"
                    role="switch"
                    aria-checked={current.downloadsAllowed}
                    onClick={() =>
                      setCurrent({
                        ...current,
                        downloadsAllowed: !current.downloadsAllowed,
                        dirty: true,
                      })
                    }
                    className={cn(
                      'relative h-6 w-11 rounded-full transition',
                      current.downloadsAllowed ? 'bg-sky-500' : 'bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
                        current.downloadsAllowed ? 'left-5' : 'left-0.5',
                      )}
                    />
                  </button>
                }
              />

              <div className="mx-3 mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between px-1 text-sm">
                  <span className="text-foreground/80">Link management</span>
                  <button
                    type="button"
                    onClick={deleteLink}
                    className="text-foreground underline underline-offset-2 hover:text-muted-foreground"
                  >
                    Delete link
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              try {
                const link = await ensureLink();
                if (!link?.url) return;
                await navigator.clipboard.writeText(link.url);
                toast.success('Link copied');
              } catch (e: any) {
                toast.error(e?.response?.data?.message || e.message);
              }
            }}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted"
          >
            <Link2 className="h-4 w-4" />
            Copy link
          </button>
          <button
            type="button"
            disabled={!current.dirty || saving}
            onClick={saveSettings}
            className={cn(
              'h-10 rounded-full px-5 text-sm font-semibold transition',
              current.dirty
                ? 'bg-foreground text-background hover:opacity-90'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        <button type="button" className="sr-only" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  info,
  control,
}: {
  icon: React.ReactNode;
  label: string;
  info?: boolean;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/60">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <span>{label}</span>
        {info && <Info className="h-3.5 w-3.5 text-muted-foreground/60" />}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
