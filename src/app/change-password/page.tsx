'use client';

import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthActions } from '@/lib/auth/useAuthAction';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';

const schema = Yup.object({
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

export default function ChangePasswordPage() {
  const { changePassword } = useAuthActions();

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
          <h1 className="text-2xl font-semibold">Buat Password Baru</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Password sementara harus diganti sebelum mengakses Cloud Storage
          </p>
        </div>

        <Formik
          initialValues={{ newPassword: '', confirmPassword: '' }}
          validationSchema={schema}
          onSubmit={(values) => changePassword.mutate({ newPassword: values.newPassword })}
        >
          {({ errors, touched }) => (
            <Form className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Menyimpan…' : 'Simpan password'}
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
