import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { router } from 'expo-router';
import { API_BASE_URL } from '@/constants/config';
import { getAccessToken, useAuthStore } from '@/stores/authStore';
import { loadRefreshToken, saveRefreshToken } from '@/lib/secureStore';

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

if (__DEV__) {
  console.log('[API] baseURL:', API_BASE_URL);
}

// 요청 인터셉터: Bearer 주입 (토큰은 store 에서 동기 조회)
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (__DEV__) {
    console.log('[API] request:', config.method?.toUpperCase(), `${config.baseURL ?? ''}${config.url ?? ''}`);
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

// 리프레시 실패 → 인증 정리 후 로그인 화면으로 리셋
function forceLogout() {
  useAuthStore.getState().clearAuth();
  router.replace('/login');
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (__DEV__) {
      console.warn('[API] error:', {
        method: originalRequest?.method?.toUpperCase(),
        url: `${originalRequest?.baseURL ?? ''}${originalRequest?.url ?? ''}`,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return http(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // BE 협의: 리프레시 토큰을 바디로 전송 (쿠키 미사용). 저장된 토큰이 없으면 빈 바디.
      const refreshToken = await loadRefreshToken();
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/token/refresh`,
        refreshToken ? { refreshToken } : {},
      );

      const newToken: string = data.accessToken;
      if (data.refreshToken) {
        await saveRefreshToken(data.refreshToken);
      }
      useAuthStore.getState().setToken(newToken);

      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return http(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default http;

export interface ApiResponse<T> {
  code: number;
  status: string;
  message: string;
  data: T;
}
