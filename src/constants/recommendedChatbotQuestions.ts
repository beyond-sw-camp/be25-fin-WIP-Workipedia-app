export type RecommendedChatbotQuestionMode = 'question' | 'request';

export interface RecommendedChatbotQuestion {
  mode: RecommendedChatbotQuestionMode;
  text: string;
}

// 데모용 추천 질문 목록. 웹(be25-fin-WIP-Workipedia-fe)과 동일하게 한 곳에 모아두어
// 추후 관리자 설정이나 DB 기반 추천 API로 교체하기 쉽도록 한다.
export const RECOMMENDED_CHATBOT_QUESTIONS: RecommendedChatbotQuestion[] = [
  { mode: 'question', text: '010-0000-0000 누구야?' },
  { mode: 'question', text: '재택근무 신청 규정이 궁금해' },
  { mode: 'question', text: '법인카드 사용 규정 알려줘' },
  { mode: 'question', text: '프린트 드라이버 설치하는 거 알려줘' },
  { mode: 'question', text: '설치해야할 필수 OS가 뭐야?' },
  { mode: 'question', text: '오늘 서울 날씨 알려줘' },
  { mode: 'question', text: '한화 에어로스페이스가 뭐야?' },
  { mode: 'question', text: '내 남은 연차 알려줘' },
  { mode: 'question', text: '사내 VPN 접속 방법 알려줘' },
  { mode: 'question', text: '한화푸드테크는 기존 사업과 무엇이 달라진 건가요?' },
  { mode: 'question', text: '프린터 드라이버 설치 방법 알려줘' },
  { mode: 'question', text: '노트북 비밀번호 분실했는데 어떻게 해?' },
  { mode: 'question', text: 'ERP 로그인이 안돼' },
  { mode: 'question', text: '연차 신청 어떻게 해?' },
  { mode: 'question', text: '기업지배구조헌장은 어떤 역할을 하는 거야?' },
  { mode: 'question', text: '주차요금은 입차 후 몇 분까지 무료야?' },
  { mode: 'question', text: '정기주차 차량도 지정된 주차구역을 위반하면 일반요금이 적용되는 거야?' },
];
