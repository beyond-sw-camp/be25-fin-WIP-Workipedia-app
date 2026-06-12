import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

// 진입 디스패처: 로그인 상태면 탭 셸로, 아니면 로그인으로.
export default function Index() {
  const isLoggedIn = useAuthStore((s) => !!s.accessToken);
  return <Redirect href={isLoggedIn ? '/knowit' : '/login'} />;
}
