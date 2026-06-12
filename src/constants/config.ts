import Constants from 'expo-constants';

const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;

// app.config.ts 의 extra.apiBaseUrl (EXPO_PUBLIC_API_BASE_URL 주입) → 없으면 localhost.
// BE 는 /api/v1 컨텍스트 경로를 쓰므로 기본값에도 포함한다.
export const API_BASE_URL: string =
  fromExtra ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

// STOMP 브로커 origin (http→ws). API_BASE_URL 의 경로(/api/v1)는 제외하고 호스트만 사용.
// 예: http://192.168.0.10:8080/api/v1 → ws://192.168.0.10:8080
export function wsOrigin(): string {
  try {
    const u = new URL(API_BASE_URL);
    return `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`;
  } catch {
    return API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
}
