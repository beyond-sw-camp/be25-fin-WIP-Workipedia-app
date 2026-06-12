import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Award, LogOut, Ticket, TrendingUp } from 'lucide-react-native';

import { getMyProfile } from '@/api/mypageApi';
import { logout as logoutApi } from '@/api/authApi';
import { useAuthStore } from '@/stores/authStore';
import type { MyProfileResponse } from '@/types/mypage';

export default function MyPageScreen() {
  const nickname = useAuthStore((s) => s.nickname);
  const team = useAuthStore((s) => s.team);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getMyProfile();
        if (active) setProfile(res.data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function confirmLogout() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutApi();
          } catch {
            // 서버 로그아웃 실패해도 로컬 정리는 진행
          }
          clearAuth();
          router.replace('/login');
        },
      },
    ]);
  }

  const displayNick = profile?.user.nickname ?? nickname ?? '사용자';
  const point = profile?.point.currentPoint;
  const esg = profile?.point.esgScore;
  const tickets = profile?.ticket.createdTicketCount;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 py-4">
        <Text className="mb-4 text-xl font-bold text-ink">마이페이지</Text>

        {/* 프로필 카드 */}
        <View className="mb-5 flex-row items-center gap-4 rounded-2xl bg-brandDark p-5">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#208AEF]">
            <Text className="text-2xl font-bold text-white">{displayNick.slice(0, 1)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-white">{displayNick}</Text>
            {team ? <Text className="mt-0.5 text-sm text-stone-300">{team}</Text> : null}
          </View>
        </View>

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="large" color="#208AEF" />
          </View>
        ) : error ? (
          <Text className="py-6 text-center text-sm text-stone-400">
            프로필 정보를 불러오지 못했어요.
          </Text>
        ) : (
          <View className="mb-5 flex-row gap-3">
            <StatCard icon={<Award color="#208AEF" size={20} />} label="포인트" value={`${point ?? 0}P`} />
            <StatCard icon={<TrendingUp color="#00a63e" size={20} />} label="ESG 점수" value={`${esg ?? 0}`} />
            <StatCard icon={<Ticket color="#f97316" size={20} />} label="발행 티켓" value={`${tickets ?? 0}`} />
          </View>
        )}

        {/* 로그아웃 */}
        <Pressable
          onPress={confirmLogout}
          className="mt-2 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5 active:opacity-70">
          <LogOut color="#ef4444" size={18} />
          <Text className="text-[15px] font-semibold text-red-500">로그아웃</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50 py-4">
      {icon}
      <Text className="text-lg font-bold text-ink">{value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}
