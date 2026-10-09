'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AuthService from '@/lib/auth/authService';
import { LoginPayload } from '@/lib/auth/authTypes';
import { useAuthStore } from '@/lib/stores/useAuthStore';

export function useAuthActions() {
  const router = useRouter();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  const userInfo = useQuery({
    queryKey: ['user-info'],
    queryFn: async () => {
      const res = await AuthService.userInfo();
      if (res.statusCode !== 200) throw new Error(res.message);
      setUser(res.data);
      return res.data;
    },
    retry: false,
  });

  const login = useMutation({
    mutationFn: async (payload: LoginPayload & { callbackUrl?: string }) => {
      const res = await AuthService.login({ nik: payload.nik, password: payload.password });
      if (res.statusCode !== 200) throw new Error(res.message || 'Login failed');
      return {
        callbackUrl: payload.callbackUrl || '/drive',
        mustChangePassword: !!res.data?.mustChangePassword,
      };
    },
    onSuccess: async ({ callbackUrl, mustChangePassword }) => {
      await qc.invalidateQueries({ queryKey: ['user-info'] });
      if (mustChangePassword) {
        toast.message('Silakan buat password baru sebelum melanjutkan');
        router.push('/change-password');
        return;
      }
      toast.success('Login berhasil');
      router.push(callbackUrl);
    },
    onError: (err: Error) => toast.error(err.message || 'Login gagal'),
  });

  const changePassword = useMutation({
    mutationFn: async (payload: { newPassword: string; currentPassword?: string }) => {
      const res = await AuthService.changePassword(payload);
      if (res.statusCode !== 200) throw new Error(res.message || 'Gagal mengubah password');
      return res;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['user-info'] });
      toast.success('Password berhasil diubah');
      router.push('/drive');
    },
    onError: (err: Error) => toast.error(err.message || 'Gagal mengubah password'),
  });

  const logout = useMutation({
    mutationFn: () => AuthService.logout(),
    onSettled: () => {
      clearUser();
      qc.clear();
      router.push('/login');
    },
  });

  return { userInfo, login, logout, changePassword };
}
