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
      return payload.callbackUrl || '/drive';
    },
    onSuccess: async (url) => {
      await qc.invalidateQueries({ queryKey: ['user-info'] });
      toast.success('Login berhasil');
      router.push(url);
    },
    onError: (err: Error) => toast.error(err.message || 'Login gagal'),
  });

  const logout = useMutation({
    mutationFn: () => AuthService.logout(),
    onSettled: () => {
      clearUser();
      qc.clear();
      router.push('/login');
    },
  });

  return { userInfo, login, logout };
}
