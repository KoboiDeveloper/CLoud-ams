'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Email links still point here — forward to unified forgot-password flow */
function RedirectToForgot() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = new URLSearchParams();
    const from = searchParams.get('from');
    const nik = searchParams.get('nik');
    const verifylink = searchParams.get('verifylink');
    if (from) qs.set('from', from);
    if (nik) qs.set('nik', nik);
    if (verifylink) qs.set('verifylink', verifylink);
    const q = qs.toString();
    router.replace(`/forgot-password${q ? `?${q}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Mengalihkan…
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <RedirectToForgot />
    </Suspense>
  );
}
