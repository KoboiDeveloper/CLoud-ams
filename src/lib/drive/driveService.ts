import axiosInstance from '@/api/AxiosInstance';
import { CommonResponse } from '@/lib/auth/authTypes';
import { DriveItemType, DriveList } from '@/lib/drive/driveTypes';

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
    const { data } = await axiosInstance.post('/api/cloud/drive/upload', form, {
      params: folderId ? { folderId } : undefined,
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
      onUploadProgress: (e) => {
        if (!onProgress) return;
        const total = e.total || file.size || 0;
        const loaded = e.loaded || 0;
        const pct = total ? Math.round((loaded / total) * 100) : 0;
        onProgress(pct, loaded, total);
      },
    });
    return data.data;
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
    const { data } = await axiosInstance.patch(`/api/cloud/drive/${itemType}/${id}/rename`, { name });
    return data.data;
  },
  move: async (itemType: DriveItemType, id: string, folderId?: string | null) => {
    const { data } = await axiosInstance.patch(`/api/cloud/drive/${itemType}/${id}/move`, { folderId });
    return data.data;
  },
  star: async (itemType: DriveItemType, id: string, starred: boolean) => {
    const { data } = await axiosInstance.patch(`/api/cloud/drive/${itemType}/${id}/star`, { starred });
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
