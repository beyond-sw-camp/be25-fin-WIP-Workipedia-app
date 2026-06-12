import type { Role } from '@/constants/roles';

export interface LoginRequest {
  employeeId: string;
  password: string;
}

export interface LoginData {
  accessToken: string;
  userId: number;
  departmentId: number;
  departmentName: string;
  role: Role;
  nickname: string;
  status: 'ACTIVE' | 'INACTIVE';
  // BE 협의: 리프레시 토큰을 쿠키 대신 바디로 내려주면 SecureStore 에 저장한다.
  refreshToken?: string;
}
