'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { HardDrive } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthService, {
  getWorkspaceDeepLinkUrl,
  getWorkspaceHttpsReturnUrl,
} from '@/lib/auth/authService';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';
import { cn } from '@/lib/utils';

type Step = 'nik' | 'otp' | 'password' | 'done';

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

const nikSchema = Yup.object({
  nik: Yup.string().length(8, 'NIK 8 digit').required('NIK wajib diisi'),
});

const otpSchema = Yup.object({
  otp: Yup.string().length(6, 'OTP 6 digit').required('OTP wajib diisi'),
});

const passwordSchema = Yup.object({
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

function StepDots({ step }: { step: Step }) {
  const active =
    step === 'nik' ? 0 : step === 'otp' ? 1 : step === 'password' || step === 'done' ? 2 : 0;
  return (
    <div className="mb-5 flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-8 rounded-full transition-colors',
            i <= active ? 'bg-primary' : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromWorkspace = searchParams.get('from') === 'workspace';
  const initialNik = searchParams.get('nik')?.slice(0, 8) || '';
  const otpFromLink = useMemo(
    () => decodeOtpFromLink(searchParams.get('verifylink')),
    [searchParams],
  );

  const [step, setStep] = useState<Step>(() => (otpFromLink ? 'otp' : 'nik'));
  const [nik, setNik] = useState(initialNik);
  const [otp, setOtp] = useState(otpFromLink);
  const [newPassword, setNewPassword] = useState('');
  const [handoffToken, setHandoffToken] = useState<string | undefined>();
  const [busy, setBusy] = useState<'workspace' | 'cloud' | null>(null);

  const title =
    step === 'nik'
      ? 'Lupa Password'
      : step === 'otp'
        ? 'Verifikasi OTP'
        : step === 'password'
          ? 'Password Baru'
          : 'Berhasil';

  const subtitle =
    step === 'nik'
      ? 'Masukkan NIK. OTP akan dikirim ke email terdaftar.'
      : step === 'otp'
        ? `Masukkan kode 6 digit yang dikirim ke email${nik ? ` untuk NIK ${nik}` : ''}.`
        : step === 'password'
          ? 'OTP terverifikasi. Buat password baru Anda.'
          : 'Password berhasil diubah. Pilih langkah berikutnya.';

  const goWorkspace = () => {
    if (!handoffToken) {
      toast.error('Token handoff tidak tersedia. Hubungkan manual di Workspace.');
      return;
    }
    setBusy('workspace');
    // Prefer Electron deep link so desktop app redeems handoff (not the browser).
    // Do NOT auto-open HTTPS — handoff token is one-time; browser redeem would
    // burn it and Electron stays disconnected.
    const deep = getWorkspaceDeepLinkUrl(handoffToken);

    let appLikelyOpened = false;
    const markOpened = () => {
      appLikelyOpened = true;
    };
    window.addEventListener('blur', markOpened);
    const onVis = () => {
      if (document.hidden) markOpened();
    };
    document.addEventListener('visibilitychange', onVis);

    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deep;
      document.body.appendChild(iframe);
      window.setTimeout(() => {
        try {
          iframe.remove();
        } catch {
          /* ignore */
        }
      }, 2500);
    } catch {
      /* ignore */
    }

    try {
      window.location.href = deep;
    } catch {
      /* protocol navigation can throw in some browsers — ignore */
    }

    window.setTimeout(() => {
      window.removeEventListener('blur', markOpened);
      document.removeEventListener('visibilitychange', onVis);
      setBusy(null);
      if (appLikelyOpened) {
        toast.success('AMS Workspace dibuka — Cloud terhubung di jendela desktop.');
      } else {
        toast.message(
          'Jika app tidak terbuka: install AMS Workspace terbaru, atau pakai tombol "Buka di browser Workspace" (hanya untuk web).',
        );
      }
    }, 1800);
  };

  const stayOnCloud = async () => {
    setBusy('cloud');
    try {
      const res = await AuthService.login({ nik, password: newPassword });
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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_var(--background)_55%)] p-4">
      <div className="absolute right-4 top-4">
        <DarkModeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-2 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HardDrive className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {fromWorkspace && step !== 'done' && (
            <p className="mt-2 rounded-lg bg-sky-500/10 px-2 py-1 text-xs text-sky-700 dark:text-sky-300">
              Dari Workspace — setelah selesai bisa kembali ke connector
            </p>
          )}
        </div>

        {step !== 'done' && <StepDots step={step} />}

        {step === 'nik' && (
          <Formik
            initialValues={{ nik: nik || initialNik }}
            validationSchema={nikSchema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              try {
                const res = await AuthService.forgotPassword(
                  values.nik,
                  fromWorkspace ? 'workspace' : undefined,
                );
                if (res.statusCode !== 200) throw new Error(res.message);
                setNik(values.nik);
                toast.success('OTP terkirim ke email');
                setStep('otp');
              } catch (err) {
                const ax = err as { response?: { data?: { message?: string } }; message?: string };
                toast.error(ax?.response?.data?.message || ax?.message || 'Gagal mengirim OTP');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK</Label>
                  <Field as={Input} id="nik" name="nik" placeholder="14118309" maxLength={8} />
                  {touched.nik && errors.nik && (
                    <p className="text-xs text-destructive">{errors.nik}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Mengirim…' : 'Kirim OTP ke email'}
                </Button>
                <Button asChild type="button" variant="ghost" className="w-full">
                  <Link href="/login">Kembali ke login</Link>
                </Button>
              </Form>
            )}
          </Formik>
        )}

        {step === 'otp' && (
          <Formik
            initialValues={{ otp }}
            validationSchema={otpSchema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              try {
                const res = await AuthService.verifyOtp(values.otp);
                if (res.statusCode !== 200) throw new Error(res.message);
                setOtp(values.otp);
                if (res.data?.nik) setNik(res.data.nik);
                toast.success('OTP valid');
                setStep('password');
              } catch (err) {
                const ax = err as { response?: { data?: { message?: string } }; message?: string };
                toast.error(ax?.response?.data?.message || ax?.message || 'OTP tidak valid');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Kode OTP</Label>
                  <Field
                    as={Input}
                    id="otp"
                    name="otp"
                    placeholder="123456"
                    maxLength={6}
                    inputMode="numeric"
                    autoFocus
                    className="tracking-[0.35em] text-center text-lg font-semibold"
                  />
                  {touched.otp && errors.otp && (
                    <p className="text-xs text-destructive">{errors.otp}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Memverifikasi…' : 'Verifikasi OTP'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={isSubmitting || !nik}
                  onClick={async () => {
                    if (!nik) return;
                    try {
                      const res = await AuthService.forgotPassword(
                        nik,
                        fromWorkspace ? 'workspace' : undefined,
                      );
                      if (res.statusCode !== 200) throw new Error(res.message);
                      toast.success('OTP baru dikirim');
                    } catch (err) {
                      const ax = err as {
                        response?: { data?: { message?: string } };
                        message?: string;
                      };
                      toast.error(ax?.response?.data?.message || ax?.message || 'Gagal kirim ulang');
                    }
                  }}
                >
                  Kirim ulang OTP
                </Button>
                <Button asChild type="button" variant="ghost" className="w-full">
                  <Link href="/login">Kembali ke login</Link>
                </Button>
              </Form>
            )}
          </Formik>
        )}

        {step === 'password' && (
          <Formik
            initialValues={{ newPassword: '', confirmPassword: '' }}
            validationSchema={passwordSchema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                const res = await AuthService.resetPassword({
                  otp,
                  newPassword: values.newPassword,
                  issueHandoff: fromWorkspace,
                });
                if (res.statusCode !== 200) throw new Error(res.message);
                setNewPassword(values.newPassword);
                setHandoffToken(res.data?.handoffToken);
                toast.success(res.data?.message || res.message || 'Password berhasil diubah');

                if (fromWorkspace) {
                  setStep('done');
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
                  <Label htmlFor="newPassword">Password baru</Label>
                  <Field
                    as={Input}
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                  />
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
        )}

        {step === 'done' && (
          <div className="space-y-3">
            <Button
              className="w-full"
              disabled={busy !== null || !handoffToken}
              onClick={goWorkspace}
            >
              {busy === 'workspace'
                ? 'Membuka AMS Workspace…'
                : 'Kembali ke AMS Workspace (app) & hubungkan'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy !== null || !handoffToken}
              onClick={() => {
                if (!handoffToken) return;
                setBusy('workspace');
                window.location.href = getWorkspaceHttpsReturnUrl(handoffToken);
              }}
            >
              Buka di browser Workspace
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
              Dari Electron: pilih tombol app agar Cloud terhubung di jendela desktop. Browser
              Workspace hanya untuk pemakaian web.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
