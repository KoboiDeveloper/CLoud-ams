import axiosInstance from '@/api/AxiosInstance';

const ShareService = {
  listPeople: async (itemId: string, itemType: 'FILE' | 'FOLDER') => {
    const { data } = await axiosInstance.get('/api/cloud/share/people', {
      params: { itemId, itemType },
    });
    return data.data;
  },
  addPeople: async (payload: {
    itemId: string;
    itemType: 'FILE' | 'FOLDER';
    targetNik: string;
    permission: 'VIEW' | 'EDIT';
  }) => {
    const { data } = await axiosInstance.post('/api/cloud/share/people', payload);
    return data.data;
  },
  removePeople: async (id: string) => {
    const { data } = await axiosInstance.delete(`/api/cloud/share/people/${id}`);
    return data.data;
  },
  listLinks: async (itemId: string, itemType: 'FILE' | 'FOLDER') => {
    const { data } = await axiosInstance.get('/api/cloud/share/links', {
      params: { itemId, itemType },
    });
    return data.data;
  },
  createLink: async (payload: {
    itemId: string;
    itemType: 'FILE' | 'FOLDER';
    permission?: 'VIEW' | 'EDIT';
    password?: string;
    expiresAt?: string;
  }) => {
    const { data } = await axiosInstance.post('/api/cloud/share/links', payload);
    return data.data;
  },
  revokeLink: async (id: string) => {
    const { data } = await axiosInstance.delete(`/api/cloud/share/links/${id}`);
    return data.data;
  },
  publicResolve: async (token: string, password?: string) => {
    const { data } = await axiosInstance.post(`/api/cloud/share/public/${token}`, { password });
    return data;
  },
};

export default ShareService;
