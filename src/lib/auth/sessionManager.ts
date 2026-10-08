import { useAuthStore } from '@/lib/stores/useAuthStore';
import { queryClient } from '@/lib/queryClient';

export function handleSessionExpired(message?: string) {
  useAuthStore.getState().clearUser();
  queryClient.clear();
  if (typeof window !== 'undefined') {
    const url = new URL('/login', window.location.origin);
    if (message) url.searchParams.set('msg', message);
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = url.toString();
    }
  }
}
