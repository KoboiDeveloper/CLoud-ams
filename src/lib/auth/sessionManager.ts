import { useAuthStore } from '@/lib/stores/useAuthStore';
import { queryClient } from '@/lib/queryClient';

let handlingExpiry = false;

async function revokeCloudCookies() {
  try {
    await fetch('/api/cloud/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch {
    // ignore — still redirect to login
  }
}

export async function handleSessionExpired(message?: string) {
  if (typeof window === 'undefined') return;
  if (handlingExpiry) return;
  handlingExpiry = true;

  useAuthStore.getState().clearUser();
  queryClient.clear();

  // Clear httpOnly cloud_* cookies so middleware won't bounce login → /drive again
  await revokeCloudCookies();

  // Redirect to clean /login — no session-expired banner
  void message;
  const url = new URL('/login', window.location.origin);

  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = url.toString();
  } else {
    window.history.replaceState({}, '', url.toString());
    handlingExpiry = false;
  }
}
