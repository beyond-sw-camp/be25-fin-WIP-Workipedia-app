import http from './index';
import type { MyProfileResponse } from '@/types/mypage';

// 프로필 + 포인트 + ESG + 알림설정 + 티켓수 통합 조회 (res.data 가 MyProfileResponse).
export function getMyProfile() {
  return http.get<MyProfileResponse>('/me/profile');
}
