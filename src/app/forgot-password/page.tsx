'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { HardDrive } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthService from '@/lib/auth/authService';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';

const schema = Yup.object({
  nik: Yup.string().length(8, 'NIK 8 digit').required('Required'),
});

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialNik = searchParams.get('nik')?.slice(0, 8) || '';
  const [sent, setSent] = useState(false);

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
          <h1 className="text-2xl font-semibold">Lupa Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan NIK Cloud Storage. OTP akan dikirim ke email terdaftar.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Jika NIK terdaftar dan memiliki email, OTP sudah dikirim. Cek inbox Anda.
            </p>
            <Button asChild className="w-full">
              <Link href="/reset-password">Lanjut isi OTP</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">Kembali ke login</Link>
            </Button>
          </div>
        ) : (
          <Formik
            initialValues={{ nik: initialNik }}
            validationSchema={schema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              try {
                const res = await AuthService.forgotPassword(values.nik);
                if (res.statusCode !== 200) throw new Error(res.message);
                toast.success(res.message || 'OTP terkirim');
                setSent(true);
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
