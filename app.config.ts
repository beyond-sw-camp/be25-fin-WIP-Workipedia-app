import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json 을 베이스로 받아 extra.apiBaseUrl 만 주입한다.
// 실기기 테스트 시 localhost 는 폰에서 도달 불가 → .env 의 EXPO_PUBLIC_API_BASE_URL 을
// 개발 PC 의 LAN IP (예: http://192.168.0.10:8080) 로 지정할 것.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'WIP-Workipedia-app',
  slug: config.slug ?? 'WIP-Workipedia-app',
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  },
});
