import * as SecureStore from 'expo-secure-store';
import type { Role } from '@/constants/roles';

const AUTH_KEY = 'workipedia_auth';
const REFRESH_KEY = 'workipedia_refresh';

export interface StoredAuth {
  token: string;
  role: Role;
  userId: number;
  nickname: string;
  team: string | null;
}

export async function loadAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export async function saveAuth(data: StoredAuth): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(data));
  } catch {
    // 저장 실패는 무시 (다음 로그인에서 복구)
  }
}

export async function clearStoredAuth(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  } catch {
    // ignore
  }
}

// 리프레시 토큰 (BE 협의: 쿠키→응답 바디 반환 방식). 로그인 응답에 포함되면 저장한다.
export async function saveRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  } catch {
    // ignore
  }
}

export async function loadRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}
