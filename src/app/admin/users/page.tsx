'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  IdentificationCard,
  User as UserIcon,
  Buildings,
  EnvelopeSimple,
  ShieldCheck,
  Pulse,
  Check,
  X,
  CaretDown,
  MagnifyingGlass,
  Trash,
  HardDrives,
  ArrowsClockwise,
  Key,
} from '@phosphor-icons/react';
import AdminService from '@/lib/admin/adminService';
import { useAuthActions } from '@/lib/auth/useAuthAction';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';
import { DriveSidebar } from '@/components/drive/DriveSidebar';
import { cn, formatBytes } from '@/lib/utils';
import AddMemberDialog from './AddMemberDialog';

type AdminUser = {
  nik: string;
  nama: string;
  noTelp?: string | null;
  email?: string | null;
  roleId: string;
  statusActive?: boolean;
  photo?: string | null;
  departement?: string | null;
  quota?: { limitBytes: string; usedBytes: string } | null;
};

const ROLE_CONFIG: Record<string, { label: string; iconClass: string }> = {
  SUPER: { label: 'SUPER', iconClass: 'text-[#DC2626]' },
  ADMIN: { label: 'ADMIN', iconClass: 'text-[#2563EB]' },
  STAFF: { label: 'STAFF', iconClass: 'text-[#8898AA]' },
};

const DEPT_PALETTE = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#F43F5E',
  '#06B6D4',
  '#F59E0B',
  '#6366F1',
  '#14B8A6',
  '#EC4899',
  '#F97316',
];

function getDeptDotColor(dept?: string | null): string {
  if (!dept) return '#94A3B8';
  const key = dept.trim().toLowerCase();
  if (key.includes('audit') || key.includes('compliance')) return '#10B981';
  if (key.includes('information tech') || /\b(it|tech|software|developer|engineer|system)\b/i.test(key))
    return '#3B82F6';
  if (/\b(hr|human)\b/i.test(key) || key.includes('people')) return '#F59E0B';
  if (key.includes('finan') || key.includes('account') || key.includes('tax')) return '#14B8A6';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_PALETTE[Math.abs(hash) % DEPT_PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function avatarColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];
  return colors[Math.abs(hash) % colors.length];
}

function Th({
  icon: Icon,
  children,
}: {
  icon?: ComponentType<{ size?: number; className?: string; weight?: 'bold' | 'fill' | 'regular' }>;
  children: ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-medium text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-muted-foreground/80" weight="bold" />}
        {children}
      </span>
    </th>
  );
}

export default function AdminUsersPage() {
  useAuthActions();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [deleteMode, setDeleteMode] = useState<'user' | 'withData' | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [quotaGb, setQuotaGb] = useState('5');

  const isAdmin = user?.roleId === 'SUPER' || user?.roleId === 'ADMIN';
  const isSuper = user?.roleId === 'SUPER';

  const usersQuery = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => AdminService.listUsers(search || undefined),
    enabled: isAdmin,
  });

  const updateMut = useMutation({
    mutationFn: ({ nik, data }: { nik: string; data: Parameters<typeof AdminService.updateUser>[1] }) =>
      AdminService.updateUser(nik, data),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  const quotaMut = useMutation({
    mutationFn: () => {
      const bytes = String(Math.round(Number(quotaGb) * 1024 * 1024 * 1024));
      return AdminService.updateQuota(selected!.nik, bytes);
    },
    onSuccess: () => {
      toast.success('Quota updated');
      setQuotaOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  const deleteMut = useMutation({
    mutationFn: ({ nik, withData }: { nik: string; withData: boolean }) =>
      AdminService.deleteUser(nik, withData),
    onSuccess: (_data, vars) => {
      toast.success(vars.withData ? 'User dan datanya dihapus' : 'User dinonaktifkan');
      setDeleteOpen(false);
      setSelected(null);
      setDeleteMode(null);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  const resetMut = useMutation({
    mutationFn: () =>
      AdminService.resetPassword(selected!.nik, {
        password: resetPassword,
        requirePasswordChange,
      }),
    onSuccess: () => {
      toast.success(
        requirePasswordChange
          ? 'Password direset. User wajib ganti password saat login di cloud.amscorp.id'
          : 'Password direset',
      );
      setResetOpen(false);
      setResetPassword('');
      setResetConfirm('');
      setRequirePasswordChange(true);
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  const syncMut = useMutation({
    mutationFn: () => AdminService.syncFromPm(),
    onSuccess: (res) => {
      const r = res.data;
      toast.success(
        res.message ||
          `Synced: ${r.created} baru, ${r.updated} diupdate (total ${r.total})`,
      );
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  const users: AdminUser[] = usersQuery.data || [];

  if (user && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-3">Access denied</p>
          <Button asChild>
            <Link href="/drive">Back to Drive</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <DriveSidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold">Members</h1>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {users.length}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Kelola daftar anggota tim, informasi akun, dan hak akses pengguna.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={syncMut.isPending}
              onClick={() => {
                if (confirm('Tarik semua member dari Task Manager ke Cloud Storage?')) {
                  syncMut.mutate();
                }
              }}
            >
              <ArrowsClockwise size={14} className={cn('mr-1.5', syncMut.isPending && 'animate-spin')} />
              {syncMut.isPending ? 'Syncing...' : 'Sync'}
            </Button>
            <Button
              size="sm"
              className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              onClick={() => setAddOpen(true)}
            >
              Add New Member
            </Button>
            <DarkModeToggle />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-[#fafafa] p-4 dark:bg-[#121316] sm:p-6">
          <div className="relative max-w-xs">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-9 pl-9"
              placeholder="Cari NIK / nama / email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <Th icon={IdentificationCard}>NIK</Th>
                    <Th icon={UserIcon}>Nama</Th>
                    <Th icon={Buildings}>Departement</Th>
                    <Th icon={EnvelopeSimple}>Email</Th>
                    <Th icon={ShieldCheck}>Role</Th>
                    <Th icon={Pulse}>Status</Th>
                    <Th icon={HardDrives}>Storage</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const used = Number(u.quota?.usedBytes || 0);
                    const limit = Number(u.quota?.limitBytes || 1);
                    const pct = Math.min(100, Math.round((used / limit) * 100));
                    const roleCfg = ROLE_CONFIG[u.roleId];
                    const isActive = Boolean(u.statusActive);
                    const deptColor = getDeptDotColor(u.departement);
                    const photo = u.photo;
                    const isHex = Boolean(photo && /^#([0-9A-F]{3}){1,2}$/i.test(photo.trim()));
                    const isImage = Boolean(photo && !isHex);

                    return (
                      <tr key={u.nik} className="border-t border-border hover:bg-muted/20">
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-[13px] text-muted-foreground">
                          {u.nik}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar className="h-7 w-7 ring-1 ring-border/60">
                              {isImage && <AvatarImage src={photo!} alt={u.nama} className="object-cover" />}
                              <AvatarFallback
                                style={{ backgroundColor: isHex ? photo! : avatarColor(u.nik) }}
                                className="text-[10px] font-semibold text-white"
                              >
                                {initials(u.nama)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm font-medium uppercase tracking-wide">{u.nama}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {u.departement ? (
                            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-[13px] font-medium uppercase dark:bg-muted/30">
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: deptColor, boxShadow: `0 0 6px ${deptColor}55` }}
                              />
                              {u.departement}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">{u.email || '-'}</td>
                        <td className="px-3 py-3">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-left text-sm font-medium hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                              >
                                <ShieldCheck
                                  size={16}
                                  weight="fill"
                                  className={cn('shrink-0', roleCfg?.iconClass || 'text-muted-foreground')}
                                />
                                <span>{roleCfg?.label || u.roleId}</span>
                                <CaretDown size={11} weight="bold" className="ml-auto text-muted-foreground/70" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[145px] rounded-2xl p-1.5">
                              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                                <DropdownMenuItem
                                  key={key}
                                  className={cn(
                                    'cursor-pointer rounded-xl px-3 py-2',
                                    u.roleId === key && 'bg-neutral-100/80 font-semibold dark:bg-neutral-800/60',
                                  )}
                                  onClick={() => {
                                    if (u.roleId !== key) updateMut.mutate({ nik: u.nik, data: { roleId: key } });
                                  }}
                                >
                                  <ShieldCheck size={17} weight="fill" className={cn('shrink-0', cfg.iconClass)} />
                                  {cfg.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="px-3 py-3">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-left text-sm font-medium hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                              >
                                {isActive ? (
                                  <Check size={15} weight="bold" className="shrink-0 text-[#16a34a]" />
                                ) : (
                                  <X size={14} weight="bold" className="shrink-0 text-[#ef4444]" />
                                )}
                                <span>{isActive ? 'Active' : 'Inactive'}</span>
                                <CaretDown size={11} weight="bold" className="ml-auto text-muted-foreground/70" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[135px] rounded-2xl p-1.5">
                              {[
                                { value: true, label: 'Active' },
                                { value: false, label: 'Inactive' },
                              ].map((opt) => (
                                <DropdownMenuItem
                                  key={String(opt.value)}
                                  className={cn(
                                    'cursor-pointer rounded-xl px-3 py-2',
                                    isActive === opt.value &&
                                      'bg-neutral-100/80 font-semibold dark:bg-neutral-800/60',
                                  )}
                                  onClick={() => {
                                    if (u.statusActive !== opt.value)
                                      updateMut.mutate({ nik: u.nik, data: { statusActive: opt.value } });
                                  }}
                                >
                                  {opt.value ? (
                                    <Check size={16} weight="bold" className="text-[#16a34a]" />
                                  ) : (
                                    <X size={15} weight="bold" className="text-[#ef4444]" />
                                  )}
                                  {opt.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            className="min-w-[140px] cursor-pointer text-left"
                            title="Set storage quota"
                            onClick={() => {
                              setSelected(u);
                              setQuotaGb(String(Math.max(1, Math.round(limit / (1024 * 1024 * 1024))) || 5));
                              setQuotaOpen(true);
                            }}
                          >
                            <div className="mb-1 text-xs text-muted-foreground">
                              {formatBytes(used)} / {formatBytes(limit)}
                            </div>
                            <Progress value={pct} className="h-1.5 w-36" />
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Set storage quota"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 transition-colors hover:bg-sky-500/25 dark:text-sky-400"
                              onClick={() => {
                                setSelected(u);
                                setQuotaGb(String(Math.max(1, Math.round(limit / (1024 * 1024 * 1024))) || 5));
                                setQuotaOpen(true);
                              }}
                            >
                              <HardDrives size={16} weight="bold" />
                            </button>
                            <button
                              type="button"
                              title="Reset password"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-400"
                              onClick={() => {
                                setSelected(u);
                                setResetPassword('');
                                setResetConfirm('');
                                setRequirePasswordChange(true);
                                setResetOpen(true);
                              }}
                            >
                              <Key size={16} weight="bold" />
                            </button>
                            {isSuper && (
                              <button
                                type="button"
                                title="Hapus user"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                                onClick={() => {
                                  setSelected(u);
                                  setDeleteMode(null);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash size={16} weight="bold" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {usersQuery.isLoading ? 'Loading...' : 'Belum ada member.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={quotaOpen} onOpenChange={setQuotaOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Set Storage Quota — {selected?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Limit (GB)</Label>
            <Input type="number" min={1} value={quotaGb} onChange={(e) => setQuotaGb(e.target.value)} />
            <Button className="w-full" onClick={() => quotaMut.mutate()} disabled={quotaMut.isPending}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) {
            setResetPassword('');
            setResetConfirm('');
            setRequirePasswordChange(true);
            setSelected(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reset Password — {selected?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-mono">{selected?.nik}</p>
            <div className="space-y-2">
              <Label htmlFor="reset-pw">Password baru</Label>
              <Input
                id="reset-pw"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Contoh: abc"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-pw-confirm">Konfirmasi password</Label>
              <Input
                id="reset-pw-confirm"
                type="password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-1"
                checked={requirePasswordChange}
                onChange={(e) => setRequirePasswordChange(e.target.checked)}
              />
              <span className="text-sm leading-snug">
                Minta user memasukan password baru saat login di cloud.amscorp.id
              </span>
            </label>
            <Button
              className="w-full"
              disabled={
                resetMut.isPending ||
                !resetPassword ||
                resetPassword !== resetConfirm
              }
              onClick={() => {
                if (resetPassword !== resetConfirm) {
                  toast.error('Konfirmasi password tidak cocok');
                  return;
                }
                resetMut.mutate();
              }}
            >
              {resetMut.isPending ? 'Menyimpan…' : 'Reset Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setSelected(null);
            setDeleteMode(null);
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>Hapus user?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selected?.nama}</span>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className="font-mono text-xs">{selected?.nik}</span>
            </p>

            <div className="space-y-2" role="radiogroup" aria-label="Opsi hapus">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  deleteMode === 'user'
                    ? 'border-foreground/30 bg-muted/40'
                    : 'border-border hover:bg-muted/20',
                )}
              >
                <input
                  type="radio"
                  name="delete-mode"
                  className="mt-1"
                  checked={deleteMode === 'user'}
                  onChange={() => setDeleteMode('user')}
                  disabled={deleteMut.isPending}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">User saja</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Nonaktifkan akun. File tetap tersimpan.
                  </span>
                </span>
              </label>

              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  deleteMode === 'withData'
                    ? 'border-foreground/30 bg-muted/40'
                    : 'border-border hover:bg-muted/20',
                )}
              >
                <input
                  type="radio"
                  name="delete-mode"
                  className="mt-1"
                  checked={deleteMode === 'withData'}
                  onChange={() => setDeleteMode('withData')}
                  disabled={deleteMut.isPending}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">User + data</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Hapus akun dan semua file/folder. Tidak bisa dibatalkan.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                disabled={deleteMut.isPending}
                onClick={() => {
                  setDeleteOpen(false);
                  setSelected(null);
                  setDeleteMode(null);
                }}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={!deleteMode || deleteMut.isPending || !selected}
                onClick={() => {
                  if (!selected || !deleteMode) return;
                  deleteMut.mutate({
                    nik: selected.nik,
                    withData: deleteMode === 'withData',
                  });
                }}
              >
                {deleteMut.isPending ? 'Menghapus…' : 'Hapus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
