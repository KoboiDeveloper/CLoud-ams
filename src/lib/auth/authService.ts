import axiosInstance from '@/api/AxiosInstance';
import { CommonResponse, LoginPayload, UserInfo } from '@/lib/auth/authTypes';

const baseURL = '/api/cloud/auth';

export type LoginResult = {
  token?: string;
  refreshToken?: string;
  mustChangePassword?: boolean;
};

export type ResetPasswordResult = {
  message: string;
  nik: string;
  handoffToken?: string;
  mustChangePassword?: boolean;
};

const AuthService = {
  login: async (user: LoginPayload): Promise<CommonResponse<LoginResult>> => {
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
  changePassword: async (payload: {
    newPassword: string;
    currentPassword?: string;
  }): Promise<CommonResponse<{ mustChangePassword: boolean }>> => {
    const { data } = await axiosInstance.patch(`${baseURL}/change-password`, payload);
    return data;
  },
  forgotPassword: async (
    nik: string,
    from?: 'workspace',
  ): Promise<CommonResponse<string>> => {
    const { data } = await axiosInstance.post(`${baseURL}/forgot-password`, {
      nik,
      ...(from ? { from } : {}),
    });
    return data;
  },
  resetPassword: async (payload: {
    otp: string;
    newPassword: string;
    issueHandoff?: boolean;
    autoLogin?: boolean;
  }): Promise<CommonResponse<ResetPasswordResult>> => {
    const { data } = await axiosInstance.post(`${baseURL}/reset-password`, payload);
    return data;
  },
};

export default AuthService;

export function getWorkspaceReturnUrl(handoffToken: string): string {
  const base = (
    process.env.NEXT_PUBLIC_WORKSPACE_URL ||
    'https://task-manager-fe-lyart.vercel.app'
  ).replace(/\/$/, '');
  return `${base}/dashboard/user-settings?cloudHandoff=${encodeURIComponent(handoffToken)}#connected-apps`;
}
