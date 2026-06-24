import http from './index';

// 티켓 컨트롤러는 ApiResponse 래퍼 없이 DTO를 직접 반환한다 (BE 컨벤션, res.data 가 곧 결과).
// 작성자는 토큰(@AuthenticationPrincipal)에서 식별하므로 별도 헤더가 필요 없다.

export interface CreateTicketRequest {
  title: string;
  content: string;
  sourceChatbotMessageId?: number | null;
}

export interface TicketResponse {
  ticketId: number;
  status: string;
  assignedDepartmentId: number | null;
  assignedDepartmentName: string | null;
  sourceChatbotMessageId: number | null;
  title: string;
  content: string;
  fileUrl?: string | null;
  files?: TicketFileResponse[];
}

export interface TicketFileResponse {
  fileId?: number | null;
  fileKey: string;
  fileUrl: string | null;
  fileName: string | null;
  fileContentType: string | null;
  fileSize: number | null;
}

// 담당 부서 티켓 발송. 챗봇 경유 시 sourceChatbotMessageId 로 출처 메시지를 연결한다.
// priority 는 선택값이라 생략하면 BE 에서 null 로 처리된다 (웹과 동일).
export function createTicket(data: CreateTicketRequest) {
  return http.post<TicketResponse>('/tickets', data);
}

function imageName(uri: string, index: number) {
  const name = uri.split('/').pop()?.split('?')[0];
  return name && /\.(jpg|jpeg|png)$/i.test(name) ? name : `ticket-image-${index + 1}.jpg`;
}

function imageType(uri: string) {
  return uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
}

export function createTicketWithFiles(data: CreateTicketRequest, imageUris: string[]) {
  const formData = new FormData();
  if (data.sourceChatbotMessageId != null) {
    formData.append('sourceChatbotMessageId', String(data.sourceChatbotMessageId));
  }
  formData.append('title', data.title);
  formData.append('content', data.content);
  imageUris.forEach((uri, index) => {
    formData.append('files', {
      uri,
      name: imageName(uri, index),
      type: imageType(uri),
    } as unknown as Blob);
  });
  return http.post<TicketResponse>('/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
