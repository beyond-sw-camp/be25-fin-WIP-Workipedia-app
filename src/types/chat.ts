export interface FlashChatMessageResponse {
  id: string;
  userId: number;
  nickname: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  replyToId?: string | null;
}
