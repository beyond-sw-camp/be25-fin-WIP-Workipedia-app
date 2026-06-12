import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, Tabs } from 'expo-router';
import { MessageCircle, User, Zap, type LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useAuthStore } from '@/stores/authStore';

const ACTIVE = '#208AEF';
const INACTIVE = '#9ca3af';

const ICONS: Record<string, LucideIcon> = {
  knowit: MessageCircle,
  chat: Zap,
  mypage: User,
};
const LABELS: Record<string, string> = {
  knowit: 'KnowIt',
  chat: 'Flash Chat',
  mypage: '마이페이지',
};

// 커스텀 탭바: 활성 표시(알약)가 이전 탭→새 탭으로 부드럽게 미끄러져 이동
function AnimatedTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);

  const tabCount = state.routes.length;
  const tabWidth = width / tabCount;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      translateX.value = withTiming(state.index * tabWidth, { duration: 280 });
    }
  }, [state.index, tabWidth, translateX]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 8,
        paddingBottom: insets.bottom,
      }}>
      {/* 미끄러지는 알약 (아이콘 뒤) */}
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 8,
              left: 0,
              width: tabWidth,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pillStyle,
          ]}>
          <View style={{ width: 64, height: 34, borderRadius: 999, backgroundColor: '#e8f1ff' }} />
        </Animated.View>
      ) : null}

      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? MessageCircle;
        const label = LABELS[route.name] ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <View style={{ height: 34, alignItems: 'center', justifyContent: 'center' }}>
              <Icon color={focused ? ACTIVE : INACTIVE} size={22} />
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: focused ? '700' : '500',
                color: focused ? ACTIVE : INACTIVE,
              }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const isLoggedIn = useAuthStore((s) => !!s.accessToken);

  // 미로그인 가드: 토큰이 없으면(리프레시 실패 포함) 로그인으로.
  if (!isLoggedIn) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AnimatedTabBar {...props} />}>
      <Tabs.Screen name="knowit" options={{ title: 'KnowIt' }} />
      <Tabs.Screen name="chat" options={{ title: 'Flash Chat' }} />
      <Tabs.Screen name="mypage" options={{ title: '마이페이지' }} />
    </Tabs>
  );
}
