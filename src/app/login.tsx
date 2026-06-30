import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import type { AxiosError } from 'axios';
import { ShieldCheck, User, Users } from 'lucide-react-native';

import { Logo } from '@/components/Logo';
import { login } from '@/api/authApi';
import { useAuthStore } from '@/stores/authStore';
import { saveRefreshToken } from '@/lib/secureStore';

const QUICK_ACCOUNTS = [
  { label: '일반 사용자', employeeId: 'SA003', password: 'Test1234', Icon: User },
  { label: '팀 관리자', employeeId: 'SA002', password: 'Test1234', Icon: Users },
  { label: '시스템 관리자', employeeId: 'SA001', password: 'Test1234', Icon: ShieldCheck },
] as const;

export default function LoginScreen() {
  const isLoggedIn = useAuthStore((s) => !!s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ employeeId?: string; password?: string }>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // 이미 로그인된 상태면 탭으로 (하이드레이트 후 자동 로그인 경로).
  if (isLoggedIn) return <Redirect href="/knowit" />;

  function validate(): boolean {
    const next: { employeeId?: string; password?: string } = {};
    if (!employeeId.trim()) next.employeeId = '사번을 입력해주세요.';
    if (!password) next.password = '비밀번호를 입력해주세요.';
    else if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password))
      next.password = '영문+숫자 조합 8자 이상이어야 합니다.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function quickLogin(id: string, pw: string) {
    if (loading) return;
    setLoading(true);
    setServerError('');
    setErrors({});
    try {
      const res = await login({ employeeId: id, password: pw });
      const { accessToken, userId, role, nickname, departmentName, status, refreshToken } = res.data;

      if (status === 'INACTIVE') {
        setServerError('비활성화된 계정입니다. 관리자에게 문의해주세요.');
        return;
      }

      setAuth(accessToken, role, userId, nickname, departmentName);
      if (refreshToken) await saveRefreshToken(refreshToken);

      router.replace('/knowit');
    } catch (e) {
      const err = e as AxiosError<{ message: string }>;
      setServerError(err.response?.data?.message ?? '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (loading || !validate()) return;
    setLoading(true);
    setServerError('');
    try {
      const res = await login({ employeeId, password });
      const { accessToken, userId, role, nickname, departmentName, status, refreshToken } = res.data;

      if (status === 'INACTIVE') {
        setServerError('비활성화된 계정입니다. 관리자에게 문의해주세요.');
        return;
      }

      setAuth(accessToken, role, userId, nickname, departmentName);
      if (refreshToken) await saveRefreshToken(refreshToken);

      router.replace('/knowit');
    } catch (e) {
      const err = e as AxiosError<{ message: string }>;
      setServerError(err.response?.data?.message ?? '사번 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-brandDark">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView className="flex-1">
          <ScrollView
            contentContainerClassName="flex-grow justify-center px-5 py-10"
            keyboardShouldPersistTaps="handled">
            <View className="rounded-3xl bg-stone-100 p-7 shadow-2xl">
              {/* 헤더 */}
              <View className="mb-7 items-center">
                <Logo size={56} />
                <Text className="mt-3 text-2xl font-bold text-ink">Workipedia</Text>
                <Text className="mt-1 text-base text-stone-500">로그인</Text>
              </View>

              {/* 사번 */}
              <View className="mb-4">
                <Text className="mb-1.5 text-sm font-medium text-stone-700">사번</Text>
                <TextInput
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  placeholder="사번을 입력하세요"
                  placeholderTextColor="#a8a29e"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className={`h-11 rounded-xl border bg-white px-3.5 text-[15px] text-ink ${
                    errors.employeeId ? 'border-red-400' : 'border-stone-300'
                  }`}
                />
                {errors.employeeId ? (
                  <Text className="mt-1 text-xs text-red-500">{errors.employeeId}</Text>
                ) : null}
              </View>

              {/* 비밀번호 */}
              <View className="mb-5">
                <Text className="mb-1.5 text-sm font-medium text-stone-700">비밀번호</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호를 입력하세요"
                  placeholderTextColor="#a8a29e"
                  secureTextEntry
                  autoCapitalize="none"
                  onSubmitEditing={handleLogin}
                  className={`h-11 rounded-xl border bg-white px-3.5 text-[15px] text-ink ${
                    errors.password || serverError ? 'border-red-400' : 'border-stone-300'
                  }`}
                />
                {errors.password ? (
                  <Text className="mt-1 text-xs text-red-500">{errors.password}</Text>
                ) : serverError ? (
                  <Text className="mt-1 text-xs text-red-500">{serverError}</Text>
                ) : null}
              </View>

              {/* 버튼 */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                className={`h-11 flex-row items-center justify-center gap-2 rounded-xl bg-ink ${
                  loading ? 'opacity-60' : ''
                }`}>
                {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text className="text-[15px] font-medium text-white">
                  {loading ? '로그인 중...' : '로그인'}
                </Text>
              </Pressable>

              <Text className="mt-6 text-center text-xs text-stone-400">
                회원가입·비밀번호 재설정은 웹에서 진행해주세요.
              </Text>

              {/* Quick Login */}
              <View className="mt-6 border-t border-stone-200 pt-5">
                <Text className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Quick Login
                </Text>
                <View className="flex-row gap-2">
                  {QUICK_ACCOUNTS.map(({ label, employeeId: id, password: pw, Icon }) => (
                    <Pressable
                      key={id}
                      onPress={() => quickLogin(id, pw)}
                      disabled={loading}
                      className={`flex-1 items-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 ${
                        loading ? 'opacity-50' : ''
                      }`}>
                      <Icon size={15} color="#44403c" />
                      <Text className="text-center text-[11px] font-medium text-stone-700">
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
