import axiosInstance from '@/api/AxiosInstance';

export type AdminUserPayload = {
  nik: string;
  nama: string;
  roleId: string;
  email?: string;
  password?: string;
  noTelp?: string;
  departement?: string;
  handleWeb?: boolean;
  statusActive?: boolean;
  photo?: string;
  limitBytes?: string;
};

export type UpdateUserPayload = {
  roleId?: string;
  handleWeb?: boolean;
  statusActive?: boolean;
  noTelp?: string;
  email?: string;
  departement?: string;
  nama?: string;
};

export type EmpHRIS = {
  nik: string;
  name: string;
  department?: string | null;
  status: boolean;
};

export type HrisPage = {
  data: EmpHRIS[];
  hasMore: boolean;
};

const AdminService = {
  overview: async () => {
    const { data } = await axiosInstance.get('/api/admin/overview');
    return data.data;
  },
  dropboxQuota: async (): Promise<{
    usedBytes: string;
    allocatedBytes: string;
    remainingBytes: string;
  }> => {
    const { data } = await axiosInstance.get('/api/admin/dropbox-quota');
    return data.data;
  },
  listUsers: async (search?: string) => {
    const { data } = await axiosInstance.get('/api/users', { params: { search } });
    return data.data;
  },
  searchHris: async (search?: string, page = 1, limit = 10): Promise<HrisPage> => {
    const { data } = await axiosInstance.get('/api/users/hris', {
      params: { ...(search ? { search } : {}), page, limit },
    });
    return data.data ?? { data: [], hasMore: false };
  },
  syncFromPm: async () => {
    const { data } = await axiosInstance.post('/api/users/sync-from-pm');
    return data as { message: string; data: { total: number; created: number; updated: number; skipped: number } };
  },
  addUser: async (payload: AdminUserPayload) => {
    const { data } = await axiosInstance.post('/api/users/add', payload);
    return data.data;
  },
  updateUser: async (nik: string, payload: UpdateUserPayload) => {
    const { data } = await axiosInstance.patch(`/api/users/${nik}`, payload);
    return data.data;
  },
  updateQuota: async (nik: string, limitBytes: string) => {
    const { data } = await axiosInstance.patch(`/api/users/${nik}/quota`, { limitBytes });
    return data.data;
  },
  deleteUser: async (nik: string, withData = false) => {
    const { data } = await axiosInstance.delete(`/api/users/${nik}`, {
      params: { withData: withData ? 'true' : 'false' },
    });
    return data.data;
  },
};

export default AdminService;
