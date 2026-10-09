import axios from 'axios';
import axiosInstance from '@/api/AxiosInstance';
import AuthService from '@/lib/auth/authService';
import { CommonResponse } from '@/lib/auth/authTypes';
import { DriveItemType, DriveList } from '@/lib/drive/driveTypes';

/** Samakan dengan mailbox: upload langsung ke BE (hindari rewrite Vercel → 413). */
const DEFAULT_PROD_API = 'https://project-management-mje5.onrender.com';

function isFrontendHost(hostname: string): boolean {
  return (
    hostname === 'cloud.amscorp.id' ||
    hostname === 'workspace.amscorp.id' ||
    hostname.endsWith('.vercel.app')
  );
}

function resolveApiOrigin(): string {
  const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

  // Jangan pernah pakai host FE sebagai target upload (rewrite Vercel → 413).
  if (envUrl) {
    try {
      const host = new URL(envUrl).hostname;
      if (!isFrontendHost(host)) return envUrl;
    } catch {
      /* fall through */
    }
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
      return 'http://localhost:1000';
    }
    if (process.env.NODE_ENV === 'development' && !isFrontendHost(host)) {
      return `http://${host}:1000`;
    }
  }

  return DEFAULT_PROD_API;
}

function driveUploadUrl(): string {
  return `${resolveApiOrigin()}/api/cloud/drive/upload`;
}

function isCrossOriginUpload(url: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return true;
  }
}

async function fetchUploadBearer(): Promise<string | undefined> {
  const res = await AuthService.getUploadTicket();
  const token = res?.data?.token;
  return typeof token === 'string' && token.trim() ? token.trim() : undefined;
}

const DriveService = {
  list: async (folderId?: string | null): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/cloud/drive/list', {
      params: folderId ? { folderId } : undefined,
    });
    return data.data;
  },
  shared: async (): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/cloud/drive/shared');
    return data.data;
  },
  recent: async (): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/cloud/drive/recent');
    return data.data;
  },
  starred: async (): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/cloud/drive/starred');
    return data.data;
  },
  trash: async (): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/cloud/drive/trash');
    return data.data;
  },
  breadcrumb: async (folderId?: string | null) => {
    const { data } = await axiosInstance.get<
      CommonResponse<{ id: string | null; name: string }[]>
    >('/api/cloud/drive/breadcrumb', { params: folderId ? { folderId } : undefined });
    return data.data;
  },
  quota: async () => {
    const { data } = await axiosInstance.get<
      CommonResponse<{ limitBytes: string; usedBytes: string }>
    >('/api/cloud/drive/quota');
    return data.data;
  },
  getItem: async (itemType: DriveItemType, id: string) => {
    const { data } = await axiosInstance.get(`/api/cloud/drive/item/${itemType}/${id}`);
    return data.data;
  },
  createFolder: async (name: string, parentId?: string | null) => {
    const { data } = await axiosInstance.post('/api/cloud/drive/folders', { name, parentId });
    return data.data;
  },
  upload: async (
    file: File,
    folderId?: string | null,
    onProgress?: (pct: number, loaded: number, total: number) => void,
    signal?: AbortSignal,
  ) => {
    const form = new FormData();
    form.append('file', file);
    const url = driveUploadUrl();
    const headers: Record<string, string> = {};

    // Cross-origin (prod FE → Render BE): cookie httpOnly tidak ikut → Bearer singkat
    if (isCrossOriginUpload(url)) {
      const bearer = await fetchUploadBearer();
      if (!bearer) {
        throw new Error('Gagal mendapat tiket upload. Silakan login ulang.');
      }
      headers.Authorization = `Bearer ${bearer}`;
    }

    try {
      const { data } = await axios.post(url, form, {
        params: folderId ? { folderId } : undefined,
        timeout: 15 * 60_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        withCredentials: !headers.Authorization,
        signal,
        headers,
        onUploadProgress: (e) => {
          if (!onProgress) return;
          const total = e.total || file.size || 0;
          const loaded = e.loaded || 0;
          const pct = total ? Math.round((loaded / total) * 100) : 0;
          onProgress(pct, loaded, total);
        },
      });
      return data.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 413) {
        throw new Error('File terlalu besar untuk proxy/server. Coba lagi setelah deploy BE terbaru.');
      }
      throw err;
    }
  },
  download: async (id: string) => {
    const { data } = await axiosInstance.get(`/api/cloud/drive/download/${id}`);
    return data.data as { url: string; name: string; mimeType?: string };
  },
  /** Fetch file as blob for inline Quick View (no browser download). */
  previewBlob: async (id: string) => {
    const { data, headers } = await axiosInstance.get(`/api/cloud/drive/preview/${id}`, {
      responseType: 'blob',
    });
    const mime =
      (headers['content-type'] as string | undefined)?.split(';')[0] ||
      data.type ||
      'application/octet-stream';
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    return { blob: blob.type ? blob : new Blob([blob], { type: mime }), mimeType: mime };
  },
  rename: async (itemType: DriveItemType, id: string, name: string) => {
    const { data } = await axiosInstance.patch(`/api/cloud/drive/${itemType}/${id}/rename`, {
      name,
    });
    return data.data;
  },
  move: async (itemType: DriveItemType, id: string, folderId?: string | null) => {
    const { data } = await axiosInstance.patch(`/api/cloud/drive/${itemType}/${id}/move`, {
      folderId,
    });
    return data.data;
  },
  star: async (itemType: DriveItemType, id: string, starred: boolean) => {
    const { data } = await axiosInstance.patch(`/api/cloud/drive/${itemType}/${id}/star`, {
      starred,
    });
    return data.data;
  },
  description: async (itemType: DriveItemType, id: string, description?: string) => {
    const { data } = await axiosInstance.patch(`/api/cloud/drive/${itemType}/${id}/description`, {
      description,
    });
    return data.data;
  },
  copy: async (id: string) => {
    const { data } = await axiosInstance.post(`/api/cloud/drive/files/${id}/copy`);
    return data.data;
  },
  trashItem: async (itemType: DriveItemType, id: string) => {
    const { data } = await axiosInstance.post(`/api/cloud/drive/${itemType}/${id}/trash`);
    return data.data;
  },
  restore: async (itemType: DriveItemType, id: string) => {
    const { data } = await axiosInstance.post(`/api/cloud/drive/${itemType}/${id}/restore`);
    return data.data;
  },
  permanentDelete: async (itemType: DriveItemType, id: string) => {
    const { data } = await axiosInstance.delete(`/api/cloud/drive/${itemType}/${id}`);
    return data.data;
  },
};

export default DriveService;
