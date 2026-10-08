'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CaretDown,
  Check,
  HardDrives,
  Lock,
  EnvelopeSimple,
  Phone,
  ShieldCheck,
} from '@phosphor-icons/react';
import { AlertCircle, ArrowRight, Loader2, Search, UserSearch, X } from 'lucide-react';
import AdminService, { type EmpHRIS } from '@/lib/admin/adminService';
import { cn } from '@/lib/utils';
import { generateColorFromString, initials } from '@/lib/utils/color';
import { useDebounce } from '@/lib/utils/useDebounce';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROLE_OPTIONS = [
  { value: 'STAFF', label: 'STAFF', iconClass: 'text-[#8898AA]' },
  { value: 'ADMIN', label: 'ADMIN', iconClass: 'text-[#2563EB]' },
  { value: 'SUPER', label: 'SUPER', iconClass: 'text-[#DC2626]' },
] as const;

type FormState = {
  nik: string;
  nama: string;
  departement: string;
  noTelp: string;
  email: string;
  password: string;
  roleId: string;
  photo: string;
  quotaGb: string;
};

const emptyForm: FormState = {
  nik: '',
  nama: '',
  departement: '',
  noTelp: '',
  email: '',
  password: '',
  roleId: 'STAFF',
  photo: '',
  quotaGb: '5',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AddMemberDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedEmp, setSelectedEmp] = useState<EmpHRIS | null>(null);
  const [nikQuery, setNikQuery] = useState('');
  const [showHrisMenu, setShowHrisMenu] = useState(false);
  const nikContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedNik = useDebounce(nikQuery, 400);

  const hrisQuery = useInfiniteQuery({
    queryKey: ['hris', debouncedNik],
    initialPageParam: 1,
    enabled: open && !selectedEmp && debouncedNik.trim().length >= 2,
    queryFn: ({ pageParam }) => AdminService.searchHris(debouncedNik, pageParam as number, 10),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
  });

  const hrisEmployees = useMemo(
    () => hrisQuery.data?.pages.flatMap((p) => p?.data ?? []).filter(Boolean) ?? [],
    [hrisQuery.data],
  );

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hrisQuery.hasNextPage && !hrisQuery.isFetchingNextPage) {
        hrisQuery.fetchNextPage();
      }
    },
    [hrisQuery],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root || !hrisQuery.hasNextPage) return;
    const observer = new IntersectionObserver(handleObserver, {
      root,
      threshold: 0,
      rootMargin: '0px 0px 40px 0px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver, hrisQuery.hasNextPage]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nikContainerRef.current && !nikContainerRef.current.contains(e.target as Node)) {
        setShowHrisMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setSelectedEmp(null);
      setNikQuery('');
      setShowHrisMenu(false);
    }
  }, [open]);

  const addMut = useMutation({
    mutationFn: () => {
      const gb = Math.max(1, Number(form.quotaGb) || 5);
      const limitBytes = String(Math.round(gb * 1024 * 1024 * 1024));
      return AdminService.addUser({
        nik: form.nik.trim(),
        nama: form.nama.trim(),
        departement: form.departement.trim() || undefined,
        noTelp: form.noTelp.trim() || undefined,
        email: form.email.trim() || undefined,
        password: form.password || undefined,
        roleId: form.roleId,
        statusActive: true,
        photo: form.photo || undefined,
        limitBytes,
      });
    },
    onSuccess: () => {
      toast.success('Member berhasil ditambahkan');
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      qc.invalidateQueries({ queryKey: ['hris'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  const roleCfg = ROLE_OPTIONS.find((r) => r.value === form.roleId) || ROLE_OPTIONS[0];
  const canSubmit =
    !!selectedEmp &&
    form.nik.trim().length === 8 &&
    form.nama.trim().length > 0 &&
    Number(form.quotaGb) > 0;

  const fieldClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-all placeholder:text-muted-foreground/60';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-md flex-col overflow-hidden rounded-2xl pt-4 px-6 pb-6">
        <DialogHeader className="gap-0.5 pb-1 text-left">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold tracking-tight">Add New Member</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-sm opacity-60 transition-opacity hover:opacity-100"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedEmp
              ? 'Lengkapi data akun dan kuota storage untuk karyawan yang dipilih.'
              : 'Masukkan NIK atau Nama karyawan untuk verifikasi data HRIS.'}
          </p>
        </DialogHeader>

        <div className="mt-1 flex flex-1 flex-col gap-3 overflow-hidden">
          {!selectedEmp && (
            <div className="relative px-1" ref={nikContainerRef}>
              <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <UserSearch className="size-3.5 text-muted-foreground" />
                  Cari Karyawan dari HRIS
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">Minimal 2 karakter</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  autoComplete="off"
                  value={nikQuery}
                  placeholder="Ketik NIK atau Nama karyawan..."
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-8 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                  onChange={(e) => {
                    setNikQuery(e.target.value);
                    setShowHrisMenu(true);
                  }}
                  onFocus={() => {
                    if (nikQuery.trim().length >= 2) setShowHrisMenu(true);
                  }}
                />
                {hrisQuery.isFetching && (
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {nikQuery.trim().length < 2 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Data nama dan departement akan otomatis terisi setelah karyawan dipilih.
                </p>
              )}

              {showHrisMenu && debouncedNik.trim().length >= 2 && (
                <div
                  ref={scrollContainerRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
                >
                  {hrisQuery.isFetching && hrisEmployees.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      <span>Mencari di database HRIS...</span>
                    </div>
                  ) : hrisEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1 py-6 text-center text-xs text-muted-foreground">
                      <AlertCircle className="size-5 text-muted-foreground/60" />
                      <p className="font-medium text-foreground">Tidak ditemukan</p>
                      <p className="text-[11px]">Karyawan dengan NIK/Nama tersebut tidak ada di HRIS.</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Hasil Pencarian ({hrisEmployees.length})
                      </div>
                      {hrisEmployees.map((emp, idx) => (
                        <button
                          key={`${emp.nik}-${idx}`}
                          type="button"
                          disabled={emp.status}
                          onClick={() => {
                            setSelectedEmp(emp);
                            setForm({
                              ...emptyForm,
                              nik: emp.nik,
                              nama: emp.name,
                              departement: emp.department || '',
                              photo: generateColorFromString(emp.nik),
                              roleId: 'STAFF',
                              quotaGb: '5',
                            });
                            setShowHrisMenu(false);
                          }}
                          className={cn(
                            'group flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-all',
                            emp.status
                              ? 'cursor-not-allowed bg-muted/40 opacity-55'
                              : 'cursor-pointer hover:border-border hover:bg-muted/80',
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="size-7 shrink-0 ring-1 ring-border/50">
                              <AvatarFallback
                                style={{ backgroundColor: generateColorFromString(emp.nik) }}
                                className="text-[10px] font-semibold text-white"
                              >
                                {initials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-xs font-medium text-foreground group-hover:text-primary">
                                {emp.name}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="font-mono">{emp.nik}</span>
                                {emp.department && <span>• {emp.department}</span>}
                              </div>
                            </div>
                          </div>
                          {emp.status ? (
                            <span className="shrink-0 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
                              Sudah Terdaftar
                            </span>
                          ) : (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                              Pilih <ArrowRight className="size-3.5" />
                            </span>
                          )}
                        </button>
                      ))}
                      <div ref={sentinelRef} className="py-1">
                        {hrisQuery.isFetchingNextPage && (
                          <div className="flex justify-center py-2">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedEmp && (
            <div className="max-h-[calc(85vh-160px)] flex-1 space-y-4 overflow-y-auto px-1">
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 dark:bg-emerald-950/20">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-10 shrink-0 ring-1 ring-emerald-500/30">
                    <AvatarFallback
                      style={{ backgroundColor: form.photo || generateColorFromString(selectedEmp.nik) }}
                      className="text-xs font-bold text-white"
                    >
                      {initials(selectedEmp.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-foreground">{selectedEmp.name}</span>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">NIK: {selectedEmp.nik}</span>
                      {selectedEmp.department && <span>• {selectedEmp.department}</span>}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => {
                    setSelectedEmp(null);
                    setForm(emptyForm);
                    setNikQuery('');
                  }}
                >
                  Ganti
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <ShieldCheck size={14} weight="bold" className="text-muted-foreground" />
                    Role
                  </label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-[38px] w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm font-medium hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30"
                      >
                        <ShieldCheck size={16} weight="fill" className={cn('shrink-0', roleCfg.iconClass)} />
                        <span>{roleCfg.label}</span>
                        <CaretDown size={12} weight="bold" className="ml-auto shrink-0 text-muted-foreground/70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[145px] rounded-2xl p-1.5">
                      {ROLE_OPTIONS.map((opt) => (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => setForm({ ...form, roleId: opt.value })}
                          className={cn(
                            'cursor-pointer rounded-xl px-3 py-2',
                            form.roleId === opt.value && 'bg-neutral-100/80 font-semibold dark:bg-neutral-800/60',
                          )}
                        >
                          <ShieldCheck size={17} weight="fill" className={cn('shrink-0', opt.iconClass)} />
                          {opt.label}
                          {form.roleId === opt.value && <Check size={14} weight="bold" className="ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <EnvelopeSimple size={14} className="text-muted-foreground" />
                    Email <span className="font-normal text-muted-foreground">(Opsional)</span>
                  </label>
                  <input
                    className={fieldClass}
                    type="email"
                    value={form.email}
                    placeholder="email@example.com"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Phone size={14} className="text-muted-foreground" />
                    No Telepon <span className="font-normal text-muted-foreground">(Opsional)</span>
                  </label>
                  <input
                    className={fieldClass}
                    value={form.noTelp}
                    placeholder="0812xxxxxxx"
                    onChange={(e) => setForm({ ...form, noTelp: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Lock size={14} className="text-muted-foreground" />
                    Password <span className="font-normal text-muted-foreground">(Opsional)</span>
                  </label>
                  <input
                    className={fieldClass}
                    type="password"
                    value={form.password}
                    placeholder="Kosongkan untuk pakai default"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <HardDrives size={14} weight="bold" className="text-muted-foreground" />
                    Storage Quota (GB)
                  </label>
                  <input
                    className={fieldClass}
                    type="number"
                    min={1}
                    value={form.quotaGb}
                    placeholder="5"
                    onChange={(e) => setForm({ ...form, quotaGb: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Default 5 GB jika tidak diubah.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border/50 pt-3">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            {selectedEmp && (
              <Button
                type="button"
                disabled={!canSubmit || addMut.isPending}
                className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                onClick={() => addMut.mutate()}
              >
                {addMut.isPending ? 'Menyimpan...' : 'Tambah Member'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
