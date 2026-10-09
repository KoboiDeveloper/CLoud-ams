export interface CommonResponse<T> {
  message: string;
  statusCode: number;
  data: T;
}

export interface UserInfo {
  nik: string;
  nama: string;
  roleId: string;
  photo: string | null;
  mustChangePassword?: boolean;
  quota?: {
    limitBytes: string;
    usedBytes: string;
  };
}

export interface LoginPayload {
  nik: string;
  password: string;
}
