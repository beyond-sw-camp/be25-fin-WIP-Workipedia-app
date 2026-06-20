# Workipedia App
### AI 기반 노잇을 통한 사내 지식 공유 플랫폼 — 모바일 앱 (React Native · Expo)

> Workipedia 웹(Vue 3 SPA)의 모바일 동반 앱입니다. 임직원이 휴대폰에서 AI 어시스턴트 **노잇**에게 질문하고, 실시간 플래시 챗으로 소통할 수 있도록 핵심 기능을 모바일에 최적화하여 제공합니다.

<br>


## 🤝 팀원 소개
<table>
  <tr>
    <td align="center" width="20%">
      <b>김진혁</b><br><br>
      <a href="https://github.com/jin605"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a>
    </td>
    <td align="center" width="20%">
      <b>김가영</b><br><br>
      <a href="https://github.com/gahyoung920-eng"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a>
    </td>
    <td align="center" width="20%">
      <b>민정기</b><br><br>
      <a href="https://github.com/calendar3450"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a>
    </td>
    <td align="center" width="20%">
      <b>이슬이</b><br><br>
      <a href="https://github.com/0lthree"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a>
    </td>
    <td align="center" width="20%">
      <b>황희수</b><br><br>
      <a href="https://github.com/huisu73"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a>
    </td>
  </tr>
</table>

<br>


## 🚩 목차

0. [프로젝트 배경](#0-프로젝트-배경)
1. [주요 기능](#1-주요-기능)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [시작하기](#4-시작하기)
5. [환경 변수](#5-환경-변수)
6. [백엔드 연동](#6-백엔드-연동)
7. [관련 레포지토리 · 산출물](#7-관련-레포지토리--산출물)

<br>


## <a id="0-프로젝트-배경"></a> 0. 프로젝트 배경

임직원은 업무를 수행하는 과정에서 사내 규정, 업무 매뉴얼, 시스템 사용법, 부서별 처리 기준 등 다양한 정보를 빠르게 확인해야 한다. 하지만 관련 정보가 메일·게시판·메신저·PDF 매뉴얼·부서별 문서 등 여러 채널에 분산되어 있어 필요한 내용을 찾기 어렵고, 담당 부서는 동일한 질문에 반복적으로 응답해야 하는 문제가 발생한다.

**Workipedia**는 이러한 문제를 해결하기 위해 사내 규정·업무 매뉴얼·FAQ·부서별 노하우·채택 답변을 통합 관리하는 **AI 기반 사내 지식 공유 플랫폼**이다. 사용자가 자연어로 질문하면 RAG 기반 AI 챗봇 **노잇**이 출처가 포함된 요약 답변을 제공하고, AI 답변으로 해결되지 않는 질문은 워키 질문 등록 또는 담당 부서 티켓 발행으로 연결된다.

```text
검색 → AI 답변 → 미해결 질문 등록/티켓 발행 → 담당자 답변 → 답변 채택 → 지식 축적 → 재검색
```

본 레포지토리는 이 플랫폼의 **모바일 앱**으로, 임직원이 언제 어디서나 휴대폰으로 노잇에게 질문하고 실시간으로 소통할 수 있도록 핵심 기능을 제공한다.

<br>


## <a id="1-주요-기능"></a> 1. 주요 기능

모바일 앱 v1은 임직원이 이동 중에도 즉시 활용할 수 있는 핵심 기능에 집중한다.

| 기능 | 설명 |
| --- | --- |
| 🔐 **로그인** | 사번/비밀번호 기반 로그인, 토큰 자동 갱신, 안전한 토큰 저장(SecureStore) |
| 🤖 **KnowIt 챗봇** | AI 어시스턴트 노잇과의 대화. RAG 기반 답변과 함께 출처 문서 카드 제공, 미해결 시 워키 등록·티켓 발송 연결 |
| 💬 **Flash Chat** | STOMP(WebSocket) 기반 실시간 채팅 |
| 👤 **마이페이지** | 프로필 조회, 프로필 이미지 변경 |

> v1 비범위: 워키 Q&A·티켓 상세·알림·매뉴얼·FAQ·포인트 리더보드·관리자·회원가입·비밀번호 재설정 (웹에서 제공).

<br>


## <a id="2-기술-스택"></a> 2. 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| **Framework** | React Native 0.81, Expo SDK 54 |
| **Language** | TypeScript |
| **Routing** | Expo Router (파일 기반 라우팅, 인증 가드) |
| **State** | Zustand |
| **Styling** | NativeWind (Tailwind CSS) |
| **Network** | axios (401 리프레시 큐) |
| **Realtime** | @stomp/stompjs (raw WebSocket) |
| **Storage** | expo-secure-store |
| **Icons** | lucide-react-native |

<br>


## <a id="3-프로젝트-구조"></a> 3. 프로젝트 구조

```text
src/
├── app/                  # Expo Router 화면 (파일 기반 라우팅)
│   ├── _layout.tsx       # 루트 레이아웃 · 인증 가드
│   ├── index.tsx         # 진입점
│   ├── login.tsx         # 로그인
│   └── (tabs)/           # 탭 내비게이션
│       ├── knowit.tsx    #   KnowIt 챗봇
│       ├── chat.tsx      #   Flash Chat
│       └── mypage.tsx    #   마이페이지
├── api/                  # API 클라이언트 (auth, chatbot, chat, mypage, worki, ticket)
├── stores/               # Zustand 스토어 (authStore)
├── components/           # 공용 컴포넌트 (Logo, SourceCard)
├── lib/                  # 유틸 (secureStore, pickImage, useKeyboardSpacing)
├── constants/            # 설정 · 권한 상수
└── types/                # 타입 정의 (auth, chat, mypage)
```

<br>


## <a id="4-시작하기"></a> 4. 시작하기

### 사전 요구사항

- Node.js 18+
- 휴대폰의 **Expo Go (SDK 54)** 또는 iOS 시뮬레이터 / Android 에뮬레이터
- 실행 중인 [Workipedia 백엔드](#6-백엔드-연동)

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 의 EXPO_PUBLIC_API_BASE_URL 을 백엔드 주소로 수정

# 3. 개발 서버 실행
npm start
```

실행 후 터미널/QR 코드를 통해 앱을 열 수 있다.

```bash
npm run ios       # iOS 시뮬레이터
npm run android   # Android 에뮬레이터
npm run web       # 웹 브라우저
```

<br>


## <a id="5-환경-변수"></a> 5. 환경 변수

`.env` 파일에 백엔드 주소를 지정한다. **BE는 `/api/v1` 컨텍스트 경로를 사용하므로 경로까지 포함**해야 한다.

```bash
# iOS 시뮬레이터
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1

# Android 에뮬레이터
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1

# 실기기 (localhost 도달 불가 → 개발 PC 의 LAN IP 사용)
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080/api/v1
```

> 값은 `app.config.ts` → `extra.apiBaseUrl` 로 주입된다. STOMP 연결은 이 주소에서 `/api/v1` 경로를 제외한 호스트만 사용한다.

<br>


## <a id="6-백엔드-연동"></a> 6. 백엔드 연동

본 앱은 [Workipedia 백엔드](https://github.com/beyond-sw-camp/be25-fin-WIP-Workipedia-be)(Spring Boot)와 [AI 서버](https://github.com/beyond-sw-camp/be25-fin-WIP-Workipedia-ai)에 의존한다.

- **인증**: 로그인 응답으로 액세스 토큰을 받아 SecureStore에 저장하고, 401 발생 시 리프레시 토큰으로 자동 갱신한다.
- **Flash Chat**: raw WebSocket 엔드포인트에 STOMP로 연결하며, CONNECT 헤더로 Bearer 인증한다.

<br>


## <a id="7-관련-레포지토리--산출물"></a> 7. 관련 레포지토리 · 산출물

### 레포지토리

| 레포 | 설명 |
| --- | --- |
| [Workipedia-be](https://github.com/beyond-sw-camp/be25-fin-WIP-Workipedia-be) | 백엔드 (Spring Boot) |
| [Workipedia-fe](https://github.com/beyond-sw-camp/be25-fin-WIP-Workipedia-fe) | 웹 프론트엔드 (Vue 3) |
| [Workipedia-ai](https://github.com/beyond-sw-camp/be25-fin-WIP-Workipedia-ai) | AI / RAG 서버 |
| **Workipedia-app** | 모바일 앱 (React Native · Expo) — 본 레포 |

### 산출물

<details>
<summary>세부사항</summary>

- [🗒️ 요구사항명세서](https://docs.google.com/spreadsheets/d/1UwKgzHGSBpIbeOFRVJ_3B759vdDhf5sKBs9VNqmtCpI/edit?gid=0#gid=0)
- [📅 WBS](https://playdatacademy.notion.site/358d943bcac281f39953cef849482b81?v=35ed943bcac280338131000cb1fc378e)
- [📅 ERD](https://www.erdcloud.com/d/RrGgjDNdgqAvsg8sZ)
- [📐 화면설계서](https://www.figma.com/design/jleHnh9qzkjeduukiUuJws/%ED%99%94%EB%A9%B4%EA%B8%B0%EB%8A%A5%EC%84%A4%EA%B3%84%EC%84%9C?node-id=0-1&t=Y0yJvaReqcKLiOyK-1)
- [📚 API명세서](https://www.notion.so/playdatacademy/367d943bcac28064b9b6c422491d86bd?v=367d943bcac280189fc1000ce027a418&source=copy_link)

</details>

<br>
