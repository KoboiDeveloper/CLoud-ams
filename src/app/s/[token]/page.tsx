'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ShareService from '@/lib/drive/shareService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatBytes } from '@/lib/utils';
import { Download, FileText, Folder, Lock } from 'lucide-react';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';

export default function PublicSharePage() {
  const params = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load(pw?: string) {
    setLoading(true);
    try {
      const res = await ShareService.publicResolve(params.token, pw);
      if (res.statusCode !== 200) {
        const msg = res.message || 'Failed';
        if (String(msg).toLowerCase().includes('password')) setNeedPassword(true);
        toast.error(msg);
        return;
      }
      setData(res.data);
      setNeedPassword(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message;
      if (String(msg).toLowerCase().includes('password')) setNeedPassword(true);
      toast.error(msg || 'Failed to open link');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  if (needPassword && !data) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <div className="absolute right-4 top-4">
          <DarkModeToggle />
        </div>
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4" /> Password required
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-3"
          />
          <Button className="w-full" disabled={loading} onClick={() => load(password)}>
            Unlock
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {loading ? 'Loading…' : 'Unable to open share link'}
      </div>
    );
  }

  const item = data.item;
  const isFile = data.itemType === 'FILE';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_var(--background)_55%)] p-4">
      <div className="absolute right-4 top-4">
        <DarkModeToggle />
      </div>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          {isFile ? (
            <FileText className="mb-3 h-16 w-16 text-sky-500" />
          ) : (
            <Folder className="mb-3 h-16 w-16 text-amber-400" fill="currentColor" />
          )}
          <h1 className="text-xl font-semibold">{item.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared by {item.owner?.nama || 'Unknown'}
          </p>
          {isFile && (
            <p className="mt-1 text-xs text-muted-foreground">
              {item.mimeType} · {formatBytes(item.bytes)}
            </p>
          )}
        </div>
        {isFile && item.url && (
          <Button className="w-full" asChild>
            <a href={item.url} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        )}
        {!isFile && (
          <p className="text-center text-sm text-muted-foreground">
            Folder shared. Sign in to browse contents in Cloud Storage.
          </p>
        )}
      </div>
    </div>
  );
}
