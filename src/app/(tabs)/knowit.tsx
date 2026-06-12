import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, HelpCircle, Send, Ticket, User } from 'lucide-react-native';

import { SourceCard, type Source } from '@/components/SourceCard';
import { createSession, sendMessage, type ApiReference } from '@/api/chatbotApi';

type Mode = 'none' | 'question' | 'request';

interface Msg {
  id: string;
  kind: 'user' | 'mode' | 'answer' | 'sources' | 'actions' | 'loading';
  text?: string;
  sources?: Source[];
  hint?: string;
}

let seq = 0;
const uid = () => `m${seq++}`;

function mapReferences(refs: ApiReference[]): Source[] {
  const config: Record<string, { label: string; cls: Source['cls'] }> = {
    MANUAL: { label: '매뉴얼', cls: 'green' },
    TICKET: { label: '티켓 답변', cls: 'blue' },
    CHAT: { label: '채팅 답변', cls: 'gray' },
  };
  return refs.map((r) => {
    const cfg = config[r.type] ?? { label: r.type, cls: 'gray' as const };
    return { type: cfg.label, cls: cfg.cls, meta: r.title, link: '문서에서 보기', url: r.url };
  });
}

export default function KnowItScreen() {
  const [mode, setMode] = useState<Mode>('none');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToEnd = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  function selectMode(m: 'question' | 'request') {
    setMode(m);
    setMsgs([
      { id: uid(), kind: 'user', text: m === 'question' ? '질문' : '요청' },
      {
        id: uid(),
        kind: 'mode',
        text:
          m === 'question'
            ? '사내 위키와 문서를 검색해 답변을 찾아드릴게요.\n예: 5층 카페테리아 언제 열어요? / 연말정산 서류는 어디서 확인해요?'
            : '담당 부서에 전달할 요청 내용을 정리해드릴게요.\n예: 노트북 반납 신청합니다 / VPN 접속 오류 처리 요청합니다',
      },
    ]);
    scrollToEnd();
  }

  function changeMode() {
    setMode('none');
    setMsgs([]);
    sessionId.current = null;
  }

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMsgs((prev) => [
      ...prev,
      { id: uid(), kind: 'user', text: q },
      { id: uid(), kind: 'loading' },
    ]);
    setLoading(true);
    scrollToEnd();

    try {
      if (sessionId.current == null) {
        const s = await createSession();
        sessionId.current = s.data.data.sessionId;
      }
      const res = await sendMessage(sessionId.current, q);
      const { answer, references, nextAction, draftTicket } = res.data.data;

      setMsgs((prev) => {
        const cleaned = prev.filter((m) => m.kind !== 'loading');
        const next: Msg[] = [...cleaned];

        if (mode === 'request') {
          // 티켓 발행 채널은 v1 비범위 → 정리된 초안을 안내 메시지로 표시
          next.push({
            id: uid(),
            kind: 'answer',
            text: draftTicket
              ? `요청 내용을 정리했어요.\n\n제목: ${draftTicket.title}\n내용: ${draftTicket.content}`
              : answer,
          });
          next.push({
            id: uid(),
            kind: 'actions',
            hint: '티켓 발행은 현재 웹에서 가능합니다. 모바일에서는 곧 지원될 예정이에요.',
          });
          return next;
        }

        next.push({ id: uid(), kind: 'answer', text: answer });
        if (nextAction === 'SHOW_SOURCES' && references.length) {
          next.push({ id: uid(), kind: 'sources', sources: mapReferences(references) });
        }
        if (nextAction === 'CREATE_WORKI') {
          next.push({
            id: uid(),
            kind: 'actions',
            hint: '이 내용은 워키 게시판 질문으로 등록할 수 있어요. (현재 웹에서 지원)',
          });
        } else if (nextAction === 'CREATE_TICKET') {
          next.push({
            id: uid(),
            kind: 'actions',
            hint: '담당 부서 티켓으로 요청할 수 있어요. (현재 웹에서 지원)',
          });
        }
        return next;
      });
      scrollToEnd();
    } catch {
      setMsgs((prev) => prev.filter((m) => m.kind !== 'loading'));
    } finally {
      setLoading(false);
    }
  }

  // 모드 선택 화면
  if (mode === 'none') {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="border-b border-stone-100 px-5 py-4">
          <Text className="text-xl font-bold text-ink">KnowIt</Text>
          <Text className="mt-0.5 text-sm text-muted">무엇을 도와드릴까요?</Text>
        </View>
        <View className="flex-1 justify-center gap-4 px-5">
          <Pressable
            onPress={() => selectMode('question')}
            className="flex-row items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 active:opacity-70">
            <View className="rounded-xl bg-[#e8f1ff] p-3">
              <HelpCircle color="#208AEF" size={24} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink">질문하기</Text>
              <Text className="mt-0.5 text-sm text-muted">사내 위키·문서에서 답을 찾아드려요</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => selectMode('request')}
            className="flex-row items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 active:opacity-70">
            <View className="rounded-xl bg-[#fff0e8] p-3">
              <Ticket color="#f97316" size={24} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink">요청하기</Text>
              <Text className="mt-0.5 text-sm text-muted">담당 부서에 전달할 요청을 정리해요</Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 채팅 화면
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <View className="flex-row items-center justify-between border-b border-stone-100 px-5 py-3">
          <Text className="text-lg font-bold text-ink">
            KnowIt · {mode === 'question' ? '질문' : '요청'}
          </Text>
          <Pressable onPress={changeMode} className="active:opacity-60">
            <Text className="text-sm font-medium text-[#208AEF]">모드 변경</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="px-4 py-4 gap-3"
          keyboardShouldPersistTaps="handled">
          {msgs.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
        </ScrollView>

        <View className="flex-row items-end gap-2 border-t border-stone-100 px-4 py-2.5">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={mode === 'question' ? '궁금한 점을 입력하세요' : '요청 내용을 입력하세요'}
            placeholderTextColor="#a8a29e"
            multiline
            className="max-h-28 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[15px] text-ink"
          />
          <Pressable
            onPress={send}
            disabled={loading || !input.trim()}
            className={`h-11 w-11 items-center justify-center rounded-full bg-[#208AEF] ${
              loading || !input.trim() ? 'opacity-40' : ''
            }`}>
            <Send color="#fff" size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.kind === 'user') {
    return (
      <View className="flex-row items-end justify-end gap-2">
        <View className="max-w-[80%] rounded-2xl rounded-br-md bg-[#208AEF] px-4 py-2.5">
          <Text className="text-[15px] text-white">{msg.text}</Text>
        </View>
        <View className="mb-0.5 rounded-full bg-stone-200 p-1.5">
          <User size={16} color="#57534e" />
        </View>
      </View>
    );
  }

  if (msg.kind === 'loading') {
    return (
      <View className="flex-row items-center gap-2">
        <View className="mb-0.5 rounded-full bg-[#e8f1ff] p-1.5">
          <Bot size={16} color="#208AEF" />
        </View>
        <View className="rounded-2xl rounded-bl-md bg-stone-100 px-4 py-3">
          <ActivityIndicator size="small" color="#208AEF" />
        </View>
      </View>
    );
  }

  if (msg.kind === 'sources') {
    return (
      <View className="gap-2 pl-9">
        {msg.sources?.map((s, i) => (
          <SourceCard key={i} source={s} />
        ))}
      </View>
    );
  }

  if (msg.kind === 'actions') {
    return (
      <View className="ml-9 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
        <Text className="text-[13px] leading-5 text-amber-700">{msg.hint}</Text>
      </View>
    );
  }

  // answer / mode (봇 말풍선)
  return (
    <View className="flex-row items-end gap-2">
      <View className="mb-0.5 rounded-full bg-[#e8f1ff] p-1.5">
        <Bot size={16} color="#208AEF" />
      </View>
      <View className="max-w-[80%] rounded-2xl rounded-bl-md bg-stone-100 px-4 py-2.5">
        <Text className="text-[15px] leading-6 text-stone-800">{msg.text}</Text>
      </View>
    </View>
  );
}
