'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  CloudUpload,
  FolderPlus,
  HardDrive,
  Share2,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { useAuthActions } from '@/lib/auth/useAuthAction';
import AdminService from '@/lib/admin/adminService';

const NAV = [
  { href: '/drive', label: 'My Drive', icon: HardDrive },
  { href: '/shared', label: 'Shared with me', icon: Share2 },
  { href: '/recent', label: 'Recent', icon: Clock },
  { href: '/starred', label: 'Starred', icon: Star },
  { href: '/trash', label: 'Trash', icon: Trash2 },
];

export function DriveSidebar({
  onUpload,
  onNewFolder,
}: {
  onUpload?: () => void;
  onNewFolder?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout, userInfo } = useAuthActions();
  void userInfo;
  const used = Number(user?.quota?.usedBytes || 0);
  const limit = Number(user?.quota?.limitBytes || 1);
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const isAdmin = user?.roleId === 'SUPER' || user?.roleId === 'ADMIN';

  const dropboxQuery = useQuery({
    queryKey: ['admin-dropbox-quota'],
    queryFn: () => AdminService.dropboxQuota(),
    enabled: isAdmin,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const dropboxUsed = Number(dropboxQuery.data?.usedBytes || 0);
  const dropboxTotal = Number(dropboxQuery.data?.allocatedBytes || 0);
  const dropboxRemaining = Number(
    dropboxQuery.data?.remainingBytes || Math.max(0, dropboxTotal - dropboxUsed),
  );
  const dropboxPct =
    dropboxTotal > 0 ? Math.min(100, Math.round((dropboxUsed / dropboxTotal) * 100)) : 0;

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HardDrive className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">Cloud Storage</div>
          <div className="text-xs text-muted-foreground">AMS Drive</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <Button
          className="w-full justify-start"
          onClick={() => (onUpload ? onUpload() : router.push('/drive'))}
        >
          <CloudUpload className="h-4 w-4" />
          Upload
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => (onNewFolder ? onNewFolder() : router.push('/drive'))}
        >
          <FolderPlus className="h-4 w-4" />
          New Folder
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href || (item.href === '/drive' && pathname.startsWith('/drive'));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="mx-2 my-2 border-t border-sidebar-border" />
            <div className="px-4 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </div>
            <Link
              href="/admin/users"
              className={cn(
                'flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Users className="h-4 w-4" />
              Users
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {isAdmin && (
          <div className="mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Dropbox</span>
              <span className="font-normal normal-case tracking-normal">
                {dropboxQuery.isLoading ? '…' : `${dropboxPct}%`}
              </span>
            </div>
            <Progress value={dropboxPct} className="mb-2 h-1.5" />
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              <div className="flex justify-between gap-2">
                <span>Total quota</span>
                <span className="font-medium text-foreground">
                  {dropboxQuery.isError ? '—' : formatBytes(dropboxTotal)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Terpakai</span>
                <span className="font-medium text-foreground">
                  {dropboxQuery.isError ? '—' : formatBytes(dropboxUsed)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Sisa</span>
                <span className="font-medium text-foreground">
                  {dropboxQuery.isError ? '—' : formatBytes(dropboxRemaining)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Storage</span>
          <span>
            {formatBytes(used)} / {formatBytes(limit)}
          </span>
        </div>
        <Progress value={pct} className="mb-3" />
        <div className="mb-2 truncate text-sm font-medium">{user?.nama || '—'}</div>
        <div className="mb-3 truncate text-xs text-muted-foreground">
          {user?.nik} · {user?.roleId}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => logout.mutate()}
        >
          Logout
        </Button>
      </div>
    </aside>
  );
}
