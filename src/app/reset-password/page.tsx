'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { HardDrive } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthService, { getWorkspaceReturnUrl } from '@/lib/auth/authService';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';

function decodeOtpFromLink(token: string | null): string {
  if (!token) return '';
  try {
    const part = token.split('.')[1];
    if (!part) return '';
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json?.otp === 'string' ? json.otp : '';
  } catch {
    return '';
  }
}

const schema = Yup.object({
  otp: Yup.string().length(6, 'OTP 6 digit').required('Required'),
  newPassword: Yup.string()
    .min(8, 'Minimal 8 karakter')
    .matches(/[a-z]/, 'Harus ada huruf kecil')
    .matches(/[A-Z]/, 'Harus ada huruf besar')
    .matches(/[0-9]/, 'Harus ada angka')
    .required('Required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Konfirmasi tidak cocok')
    .required('Required'),
});

type DoneState = {
  nik: string;
  newPassword: string;
  handoffToken?: string;
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromWorkspace = searchParams.get('from') === 'workspace';
  const otpFromLink = decodeOtpFromLink(searchParams.get('verifylink'));
  const [done, setDone] = useState<DoneState | null>(null);
  const [busy, setBusy] = useState<'workspace' | 'cloud' | null>(null);

  const goWorkspace = () => {
    if (!done?.handoffToken) {
      toast.error('Token handoff tidak tersedia. Hubungkan manual di Workspace.');
      return;
    }
    setBusy('workspace');
    window.location.href = getWorkspaceReturnUrl(done.handoffToken);
  };

  const stayOnCloud = async () => {
    if (!done) return;
    setBusy('cloud');
    try {
      const res = await AuthService.login({
        nik: done.nik,
        password: done.newPassword,
      });
      if (res.statusCode !== 200) throw new Error(res.message);
      toast.success('Login Cloud berhasil');
      router.push('/drive');
    } catch (err) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(ax?.response?.data?.message || ax?.message || 'Gagal login ke Cloud');
      router.push('/login');
    } finally {
      setBusy(null);
    }
  };

  if (done && fromWorkspace) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_var(--background)_55%)] p-4">
        <div className="absolute right-4 top-4">
          <DarkModeToggle />
        </div>
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HardDrive className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold">Password berhasil diubah</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Anda datang dari Workspace. Pilih langkah berikutnya:
            </p>
          </div>
          <div className="space-y-3">
            <Button
              className="w-full"
              disabled={busy !== null || !done.handoffToken}
              onClick={goWorkspace}
            >
              {busy === 'workspace' ? 'Mengarahkan…' : 'Kembali ke Workspace & hubungkan'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy !== null}
              onClick={() => void stayOnCloud()}
            >
              {busy === 'cloud' ? 'Masuk…' : 'Lanjut di Cloud Storage'}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Jika tetap di Cloud, connector Workspace belum terhubung sampai Anda hubungkan
              manual.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_var(--background)_55%)] p-4">
      <div className="absolute right-4 top-4">
        <DarkModeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HardDrive className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">Reset Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masukkan OTP dari email dan password baru</p>
        </div>

        <Formik
          initialValues={{
            otp: otpFromLink,
            newPassword: '',
            confirmPassword: '',
          }}
          enableReinitialize
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const res = await AuthService.resetPassword({
                otp: values.otp,
                newPassword: values.newPassword,
                issueHandoff: fromWorkspace,
                autoLogin: false,
              });
              if (res.statusCode !== 200) throw new Error(res.message);
              toast.success(res.data?.message || res.message || 'Password berhasil diubah');

              if (fromWorkspace) {
                setDone({
                  nik: res.data.nik,
                  newPassword: values.newPassword,
                  handoffToken: res.data.handoffToken,
                });
                return;
              }

              router.push('/login');
            } catch (err) {
              const ax = err as { response?: { data?: { message?: string } }; message?: string };
              toast.error(ax?.response?.data?.message || ax?.message || 'Gagal reset password');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Field as={Input} id="otp" name="otp" placeholder="123456" maxLength={6} />
                {touched.otp && errors.otp && (
                  <p className="text-xs text-destructive">{errors.otp}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password baru</Label>
                <Field as={Input} id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
                {touched.newPassword && errors.newPassword && (
                  <p className="text-xs text-destructive">{errors.newPassword}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi password</Label>
                <Field
                  as={Input}
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan…' : 'Simpan password baru'}
              </Button>
              <Button asChild type="button" variant="ghost" className="w-full">
                <Link href="/login">Kembali ke login</Link>
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
