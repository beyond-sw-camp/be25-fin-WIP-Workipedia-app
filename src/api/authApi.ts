import http, { type ApiResponse } from './index';
import type { LoginData, LoginRequest } from '@/types/auth';

// 로그인 응답은 LoginData 를 data 로 직접 반환 (res.data.accessToken).
export function login(data: LoginRequest) {
  return http.post<LoginData>('/auth/login', data);
}

export function logout() {
  return http.post<ApiResponse<null>>('/auth/logout');
}
