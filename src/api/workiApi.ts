import http from './index';

// worki 컨트롤러는 ApiResponse 래퍼 없이 DTO를 직접 반환한다 (BE 컨벤션, res.data 가 곧 결과).
// 작성자는 토큰(@AuthenticationPrincipal)에서 식별하므로 별도 헤더가 필요 없다.

export interface QuestionCreateRequest {
  title: string;
  content: string;
  sourceChatbotMessageId?: number | null;
}

export interface QuestionResponse {
  questionId: number;
  authorId: number;
  title: string;
  authorNickname: string;
}

// 워키 게시판 질문 등록. 챗봇 경유 시 sourceChatbotMessageId 로 출처 메시지를 연결한다.
export function createQuestion(data: QuestionCreateRequest) {
  return http.post<QuestionResponse>('/worki/questions', data);
}
