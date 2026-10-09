import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { handleSessionExpired } from '@/lib/auth/sessionManager';

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const axiosInstance: AxiosInstance = axios.create({
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve();
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomRequestConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    const isAuthEndpoint =
      url.includes('/api/cloud/auth/login') ||
      url.includes('/api/cloud/auth/refresh') ||
      url.includes('/api/cloud/auth/forgot-password') ||
      url.includes('/api/cloud/auth/reset-password');

    if (!originalRequest || status !== 401 || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (url.includes('/api/cloud/auth/refresh') || originalRequest._retry) {
      void handleSessionExpired('Sesi Anda telah kedaluwarsa. Silakan login kembali.');
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => axiosInstance(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await axios.post('/api/cloud/auth/refresh', {}, { withCredentials: true });
      processQueue(null);
      return axiosInstance(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr);
      void handleSessionExpired('Sesi Anda telah kedaluwarsa. Silakan login kembali.');
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
