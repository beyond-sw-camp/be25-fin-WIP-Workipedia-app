import { create } from 'zustand';
import type { Role } from '@/constants/roles';
import { clearStoredAuth, loadAuth, saveAuth } from '@/lib/secureStore';

interface AuthState {
  accessToken: string | null;
  role: Role | null;
  userId: number | null;
  nickname: string | null;
  team: string | null;
  hydrated: boolean; // SecureStore 로부터 초기 복원 완료 여부

  hydrate: () => Promise<void>;
  setAuth: (token: string, role: Role, userId: number, nickname: string, team?: string | null) => void;
  setToken: (token: string) => void; // 토큰 리프레시 후 교체
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  role: null,
  userId: null,
  nickname: null,
  team: null,
  hydrated: false,

  hydrate: async () => {
    const saved = await loadAuth();
    if (saved) {
      set({
        accessToken: saved.token,
        role: saved.role,
        userId: saved.userId,
        nickname: saved.nickname,
        team: saved.team,
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },

  setAuth: (token, role, userId, nickname, team = null) => {
    set({ accessToken: token, role, userId, nickname, team });
    void saveAuth({ token, role, userId, nickname, team });
  },

  setToken: (token) => {
    set({ accessToken: token });
    const { role, userId, nickname, team } = get();
    if (role && userId != null && nickname) {
      void saveAuth({ token, role, userId, nickname, team });
    }
  },

  clearAuth: () => {
    set({ accessToken: null, role: null, userId: null, nickname: null, team: null });
    void clearStoredAuth();
  },
}));

// 컴포넌트 외부(인터셉터 등)에서 현재 토큰을 동기적으로 읽기 위한 헬퍼
export const getAccessToken = () => useAuthStore.getState().accessToken;
