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
  verifyOtp: async (otp: string): Promise<CommonResponse<{ nik: string; valid: boolean }>> => {
    const { data } = await axiosInstance.post(`${baseURL}/verify-otp`, { otp });
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
  /** Short-lived Bearer for direct BE upload (bypass Vercel/proxy 413). */
  getUploadTicket: async (): Promise<CommonResponse<{ token: string; expiresIn: number }>> => {
    const { data } = await axiosInstance.get(`${baseURL}/upload-ticket`);
    return data;
  },
};

export default AuthService;

/** Custom protocol registered by AMS Workspace Electron shell */
export const WORKSPACE_PROTOCOL = 'ams-workspace';

export function getWorkspaceHttpsReturnUrl(handoffToken: string): string {
  const base = (
    process.env.NEXT_PUBLIC_WORKSPACE_URL ||
    'https://workspace.amscorp.id'
  ).replace(/\/$/, '');
  return `${base}/dashboard/user-settings?cloudHandoff=${encodeURIComponent(handoffToken)}#connected-cloud`;
}

/** Opens installed Electron app (falls back to HTTPS if protocol not handled). */
export function getWorkspaceDeepLinkUrl(handoffToken: string): string {
  return `${WORKSPACE_PROTOCOL}://handoff?cloudHandoff=${encodeURIComponent(handoffToken)}`;
}

/** @deprecated Prefer deep link + HTTPS fallback in UI */
export function getWorkspaceReturnUrl(handoffToken: string): string {
  return getWorkspaceDeepLinkUrl(handoffToken);
}
