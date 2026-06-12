// GET /me/profile 응답 (nested 구조). v1 은 프로필/포인트 표시까지만 사용.
export interface MyProfileResponse {
  user: {
    userId: number;
    nickname: string;
    role: string;
    status: string;
  };
  ticket: {
    createdTicketCount: number;
  };
  point: {
    currentPoint: number;
    esgScore: number;
  };
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  allEnabled: boolean;
  ticketEnabled: boolean;
  workiEnabled: boolean;
  manualEnabled: boolean;
}
