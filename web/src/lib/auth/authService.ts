import axiosInstance from '@/api/AxiosInstance';
import { CommonResponse, LoginPayload, UserInfo } from '@/lib/auth/authTypes';

const baseURL = '/api/auth';

const AuthService = {
  login: async (user: LoginPayload): Promise<CommonResponse<unknown>> => {
    const { data } = await axiosInstance.post(`${baseURL}/login`, user);
    return data;
  },
  logout: async (): Promise<CommonResponse<string>> => {
    const { data } = await axiosInstance.post(`${baseURL}/logout`);
    return data;
  },
  userInfo: async (): Promise<CommonResponse<UserInfo>> => {
    const { data } = await axiosInstance.get(`${baseURL}/user-info`);
    return data;
  },
};

export default AuthService;
