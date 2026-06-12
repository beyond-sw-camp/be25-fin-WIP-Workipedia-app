import http, { type ApiResponse } from './index';

export interface ApiReference {
  type: string; // 'MANUAL' | 'TICKET' | 'CHAT'
  sourceId: number;
  title: string;
  url: string;
  chunkId: number;
}

export interface MessageData {
  messageId: number;
  answer: string;
  answerable: boolean;
  references: ApiReference[];
  nextAction: 'SHOW_SOURCES' | 'CREATE_WORKI' | 'CREATE_TICKET';
  draftQuestion?: { title: string; content: string };
  draftTicket?: { title: string; content: string };
}

export function createSession() {
  return http.post<ApiResponse<{ sessionId: number }>>('/chatbot/sessions');
}

export function sendMessage(sessionId: number, content: string) {
  return http.post<ApiResponse<MessageData>>(
    `/chatbot/sessions/${sessionId}/messages`,
    { content },
  );
}
