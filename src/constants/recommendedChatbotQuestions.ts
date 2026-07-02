export type RecommendedChatbotQuestionMode = "question" | "request";

export interface RecommendedChatbotQuestion {
  mode: RecommendedChatbotQuestionMode;
  text: string;
}

// 데모용 추천 질문 목록. 웹(be25-fin-WIP-Workipedia-fe)과 동일하게 한 곳에 모아두어
// 추후 관리자 설정이나 DB 기반 추천 API로 교체하기 쉽도록 한다.
export const RECOMMENDED_CHATBOT_QUESTIONS: RecommendedChatbotQuestion[] = [
  { mode: "question", text: "010-4899-8954 누구야?" },
  { mode: "question", text: "010-3092-3138 누구야?" },
  { mode: "question", text: "010-7558-7807 누구야?" },
  { mode: "question", text: "여의도 날씨 알려줘" },
  { mode: "question", text: "SA001 사번 누구야?" },
  { mode: "question", text: "SA002 사번 누구야?" },
  { mode: "question", text: "SA003 사번 누구야?" },
  { mode: "question", text: "내 남은 연차 알려줘" },
  { mode: "question", text: "영업 자료 외부 공유 승인 문의 처리 기준이 뭐야?" },
  { mode: "question", text: "환급계좌는 내 명의 계좌가 아니어도 돼?" },
  { mode: "question", text: "오늘 서울 날씨 알려줘" },
  { mode: "question", text: "한화 에어로스페이스가 뭐야?" },
  { mode: "question", text: "사내 VPN 접속 방법 알려줘" },
  {
    mode: "question",
    text: "한화푸드테크는 기존 사업과 무엇이 달라진 건가요?",
  },
  { mode: "question", text: "연차 신청 어떻게 해?" },
  { mode: "question", text: "기업지배구조헌장은 어떤 역할을 하는 거야?" },
  {
    mode: "question",
    text: "정기주차 차량도 지정된 주차구역을 위반하면 일반요금이 적용되는 거야?",
  },
  {
    mode: "question",
    text: "5년 이상 근속한 직원이 월 중에 면직되면 그 달 보수는 어떻게 되나요?",
  },
  { mode: "question", text: "호봉 승급에 필요한 기간은 몇 년인가요?" },
  {
    mode: "question",
    text: "총연봉 대비 성과연봉 비중은 급수별로 어떻게 다른가요? ",
  },
  { mode: "question", text: "퇴직금은 퇴직일로부터 며칠 이내에 지급하나요?" },
  { mode: "question", text: "프린터 드라이버 설치 방법 알려줘" },
  { mode: "question", text: "노트북 비밀번호 분실했는데 어떻게 해?" },
  { mode: "question", text: "ERP 로그인이 안돼" },
  { mode: "question", text: "주차요금 정산 기준 시간은 언제부터 언제까지야?" },
  { mode: "question", text: "전기차 충전시설 이용 차량은 몇 시간까지 무료야?" },
];
