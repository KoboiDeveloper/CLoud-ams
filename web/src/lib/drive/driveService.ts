import axiosInstance from '@/api/AxiosInstance';
import { CommonResponse } from '@/lib/auth/authTypes';
import { DriveItemType, DriveList } from '@/lib/drive/driveTypes';

const DriveService = {
  list: async (folderId?: string | null): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/drive/list', {
      params: folderId ? { folderId } : undefined,
    });
    return data.data;
  },
  shared: async (): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/drive/shared');
    return data.data;
  },
  recent: async (): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/drive/recent');
    return data.data;
  },
  starred: async (): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/drive/starred');
    return data.data;
  },
  trash: async (): Promise<DriveList> => {
    const { data } = await axiosInstance.get<CommonResponse<DriveList>>('/api/drive/trash');
    return data.data;
  },
  breadcrumb: async (folderId?: string | null) => {
    const { data } = await axiosInstance.get<
      CommonResponse<{ id: string | null; name: string }[]>
    >('/api/drive/breadcrumb', { params: folderId ? { folderId } : undefined });
    return data.data;
  },
  quota: async () => {
    const { data } = await axiosInstance.get<
      CommonResponse<{ limitBytes: string; usedBytes: string }>
    >('/api/drive/quota');
    return data.data;
  },
  getItem: async (itemType: DriveItemType, id: string) => {
    const { data } = await axiosInstance.get(`/api/drive/item/${itemType}/${id}`);
    return data.data;
  },
  createFolder: async (name: string, parentId?: string | null) => {
    const { data } = await axiosInstance.post('/api/drive/folders', { name, parentId });
    return data.data;
  },
  upload: async (file: File, folderId?: string | null, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await axiosInstance.post('/api/drive/upload', form, {
      params: folderId ? { folderId } : undefined,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data.data;
  },
  download: async (id: string) => {
    const { data } = await axiosInstance.get(`/api/drive/download/${id}`);
    return data.data as { url: string; name: string; mimeType?: string };
  },
  /** Fetch file as blob for inline Quick View (no browser download). */
  previewBlob: async (id: string) => {
    const { data, headers } = await axiosInstance.get(`/api/drive/preview/${id}`, {
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
    const { data } = await axiosInstance.patch(`/api/drive/${itemType}/${id}/rename`, { name });
    return data.data;
  },
  move: async (itemType: DriveItemType, id: string, folderId?: string | null) => {
    const { data } = await axiosInstance.patch(`/api/drive/${itemType}/${id}/move`, { folderId });
    return data.data;
  },
  star: async (itemType: DriveItemType, id: string, starred: boolean) => {
    const { data } = await axiosInstance.patch(`/api/drive/${itemType}/${id}/star`, { starred });
    return data.data;
  },
  description: async (itemType: DriveItemType, id: string, description?: string) => {
    const { data } = await axiosInstance.patch(`/api/drive/${itemType}/${id}/description`, {
      description,
    });
    return data.data;
  },
  copy: async (id: string) => {
    const { data } = await axiosInstance.post(`/api/drive/files/${id}/copy`);
    return data.data;
  },
  trashItem: async (itemType: DriveItemType, id: string) => {
    const { data } = await axiosInstance.post(`/api/drive/${itemType}/${id}/trash`);
    return data.data;
  },
  restore: async (itemType: DriveItemType, id: string) => {
    const { data } = await axiosInstance.post(`/api/drive/${itemType}/${id}/restore`);
    return data.data;
  },
  permanentDelete: async (itemType: DriveItemType, id: string) => {
    const { data } = await axiosInstance.delete(`/api/drive/${itemType}/${id}`);
    return data.data;
  },
};

export default DriveService;
