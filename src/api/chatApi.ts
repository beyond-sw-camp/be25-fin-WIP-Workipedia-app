import http from './index';
import type { FlashChatMessageResponse } from '@/types/chat';

// 현재 활성(만료 전) 메시지 목록.
export function getActiveMessages() {
  return http.get<{ messages: FlashChatMessageResponse[] }>('/flash-chat/messages');
}
