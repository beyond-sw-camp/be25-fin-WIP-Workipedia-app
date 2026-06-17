import http from './index';

// ChatbotController(BE)는 ApiResponse 래퍼 없이 DTO를 직접 반환한다 (BE 컨벤션, 웹 FE와 동일).
// 따라서 http 제네릭에 DTO를 바로 넣고, res.data 가 곧 결과다.
// base path: /api/v1/chatbot/sessions (EXPO_PUBLIC_API_BASE_URL 에 /api/v1 포함)

export type NextAction = 'SHOW_SOURCES' | 'CREATE_WORKI' | 'CREATE_TICKET';
export type SenderType = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface ChatbotSessionResponse {
  sessionId: number;
  title: string | null;
  createdAt: string;
}

// referencesJson 을 파싱하면 나오는 단위.
// BE SourceItem 이 @JsonNaming(SnakeCase)로 직렬화하므로 키는 snake_case 그대로다.
export interface SourceItem {
  candidate_id: string;
  source_type: string; // 'MANUAL' | 'WORKI' | 'TICKET' | 'KNOWLEDGE_DATA' | 'CHAT' ...
  source_id: string;
  chunk_index: number | null;
  title: string;
  score: number;
  link: string | null;
}

export interface ChatbotMessageResponse {
  messageId: number;
  senderType: SenderType;
  content: string; // ASSISTANT 답변 본문
  answerable: boolean; // CREATE_TICKET 이면 false
  nextAction: NextAction | null;
  referencesJson: string | null; // SourceItem[] 가 JSON 문자열로 직렬화되어 옴
  createdAt: string;
}

// 새 세션 생성. title 은 선택값(query param), 본문은 null.
export function createSession(title?: string) {
  return http.post<ChatbotSessionResponse>('/chatbot/sessions', null, {
    params: title ? { title } : undefined,
  });
}

// 질문 전송 → ASSISTANT 응답 저장 후 반환. 본문 필드명은 BE 규약상 question.
// LLM 답변 생성은 기본 10s 타임아웃을 넘기기 쉬우므로 이 요청만 60s 로 늘린다.
export function sendMessage(sessionId: number, question: string) {
  return http.post<ChatbotMessageResponse>(
    `/chatbot/sessions/${sessionId}/messages`,
    { question },
    { timeout: 60000 },
  );
}

// referencesJson(문자열)을 SourceItem[] 로 파싱한다. null/파싱 실패 시 빈 배열.
export function parseReferences(referencesJson: string | null): SourceItem[] {
  if (!referencesJson) return [];
  try {
    const parsed = JSON.parse(referencesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
