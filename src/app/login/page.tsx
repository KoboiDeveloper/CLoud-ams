'use client';

import { Suspense } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { HardDrive } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthActions } from '@/lib/auth/useAuthAction';
import { DarkModeToggle } from '@/components/shared/DarkModeToggle';

const schema = Yup.object({
  nik: Yup.string().length(8, 'NIK 8 digit').required('Required'),
  password: Yup.string().required('Required'),
});

function LoginForm() {
  const { login } = useAuthActions();
  const searchParams = useSearchParams();
  const msg = searchParams.get('msg');

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
          <h1 className="text-2xl font-semibold">Cloud Storage</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your NIK</p>
        </div>

        {msg && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {msg}
          </div>
        )}

        <Formik
          initialValues={{ nik: '', password: '' }}
          validationSchema={schema}
          onSubmit={(values) => login.mutate({ ...values, callbackUrl: '/drive' })}
        >
          {({ errors, touched }) => (
            <Form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nik">NIK</Label>
                <Field as={Input} id="nik" name="nik" placeholder="14118309" maxLength={8} />
                {touched.nik && errors.nik && (
                  <p className="text-xs text-destructive">{errors.nik}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Field as={Input} id="password" name="password" type="password" />
                {touched.password && errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
