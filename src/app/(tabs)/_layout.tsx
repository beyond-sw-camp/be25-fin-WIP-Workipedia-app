import { Redirect, Tabs } from 'expo-router';
import { MessageCircle, User, Zap } from 'lucide-react-native';

import { useAuthStore } from '@/stores/authStore';

export default function TabsLayout() {
  const isLoggedIn = useAuthStore((s) => !!s.accessToken);

  // 미로그인 가드: 토큰이 없으면(리프레시 실패 포함) 로그인으로.
  if (!isLoggedIn) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#208AEF',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      <Tabs.Screen
        name="knowit"
        options={{
          title: 'KnowIt',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Flash Chat',
          tabBarIcon: ({ color, size }) => <Zap color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
