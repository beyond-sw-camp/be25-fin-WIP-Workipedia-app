import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isAxiosError } from 'axios';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Bot, FileText, HelpCircle, ImagePlus, Send, Ticket, User, X } from 'lucide-react-native';

import { SourceCard, type Source } from '@/components/SourceCard';
import {
  createSession,
  sendMessage,
  parseReferences,
  type SourceItem,
  type NextAction,
} from '@/api/chatbotApi';
import { createQuestion } from '@/api/workiApi';
import { createTicket } from '@/api/ticketApi';
import { useKeyboardSpacing } from '@/lib/useKeyboardSpacing';
import { pickFromCamera, pickFromLibrary } from '@/lib/pickImage';

type Mode = 'none' | 'question' | 'request';

interface Msg {
  id: string;
  kind: 'user' | 'mode' | 'answer' | 'sources' | 'actions' | 'loading';
  text?: string;
  sources?: Source[];
  hint?: string;
  imageUris?: string[];
  // actions 버블에서 노출할 후속 동작과, 폼 초안에 쓸 사용자 질문 텍스트
  action?: Extract<NextAction, 'CREATE_WORKI' | 'CREATE_TICKET'>;
  userText?: string;
}

type FormKind = 'worki' | 'ticket';

let seq = 0;
const uid = () => `m${seq++}`;

// 실패 원인을 화면에 드러낸다 (조용히 사라지지 않도록). 타임아웃/네트워크/HTTP 상태 구분.
function errorText(err: unknown): string {
  console.warn('[KnowIt] chatbot request failed:', err);
  if (isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') {
      return '답변 생성이 시간 내에 끝나지 않았어요. 잠시 후 다시 시도해 주세요.';
    }
    const status = err.response?.status;
    if (status != null) {
      return `답변을 가져오지 못했어요. (오류 ${status}) 잠시 후 다시 시도해 주세요.`;
    }
    return '서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.';
  }
  return '답변을 가져오는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
}

function mapReferences(refs: SourceItem[]): Source[] {
  const config: Record<string, { label: string; cls: Source['cls'] }> = {
    MANUAL: { label: '매뉴얼', cls: 'green' },
    KNOWLEDGE_DATA: { label: '지식 데이터', cls: 'green' },
    TICKET: { label: '티켓 답변', cls: 'blue' },
    WORKI: { label: '워키 답변', cls: 'blue' },
    CHAT: { label: '채팅 답변', cls: 'gray' },
  };
  return refs.map((r) => {
    const cfg = config[r.source_type] ?? { label: r.source_type, cls: 'gray' as const };
    return { type: cfg.label, cls: cfg.cls, meta: r.title, link: '문서에서 보기', url: r.link ?? undefined };
  });
}

export default function KnowItScreen() {
  const [mode, setMode] = useState<Mode>('none');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const sessionId = useRef<number | null>(null);
  const lastMessageId = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const keyboardSpacing = useKeyboardSpacing(tabBarHeight);

  // 워키 질문 등록 / 티켓 발송 입력 폼(모달) 상태
  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const scrollToEnd = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  function openForm(kind: FormKind, draftContent?: string) {
    setFormKind(kind);
    setFormTitle('');
    setFormContent(draftContent ?? '');
    setFormError('');
  }

  function closeForm() {
    setFormKind(null);
    setFormTitle('');
    setFormContent('');
    setFormError('');
  }

  async function submitForm() {
    if (submitting || !formKind) return;
    const title = formTitle.trim();
    const content = formContent.trim();
    if (!title) {
      setFormError('제목을 입력해주세요.');
      return;
    }
    if (content.length < 10) {
      setFormError('내용을 10자 이상 작성해주세요.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    const sourceChatbotMessageId = lastMessageId.current ?? undefined;
    try {
      let done: string;
      if (formKind === 'worki') {
        await createQuestion({ title, content, sourceChatbotMessageId });
        done = '워키 게시판에 질문을 등록했어요. (10P 적립)';
      } else {
        const res = await createTicket({ title, content, sourceChatbotMessageId });
        const dept = res.data.assignedDepartmentName;
        done = dept
          ? `티켓을 발행했어요. 노잇이 ${dept} 부서로 전달했어요.`
          : '티켓을 발행했어요. 담당자가 빠르게 처리해드릴게요.';
      }
      closeForm();
      setMsgs((prev) => [...prev, { id: uid(), kind: 'answer', text: done }]);
      scrollToEnd();
    } catch (err) {
      console.warn('[KnowIt] submit form failed:', err);
      setFormError(
        isAxiosError(err) && err.response?.status
          ? `등록에 실패했어요. (오류 ${err.response.status}) 잠시 후 다시 시도해 주세요.`
          : '등록 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }

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
    setAttachedImages([]);
    sessionId.current = null;
  }

  // 사진 첨부: 카메라/갤러리 선택 → 미리보기에 누적, 전송 시 메시지와 함께 보냄
  function openAttach() {
    Alert.alert('사진 첨부', '사진을 어떻게 추가할까요?', [
      {
        text: '카메라로 촬영',
        onPress: async () => {
          const uris = await pickFromCamera();
          if (uris.length) setAttachedImages((prev) => [...prev, ...uris]);
        },
      },
      {
        text: '갤러리에서 선택',
        onPress: async () => {
          const uris = await pickFromLibrary();
          if (uris.length) setAttachedImages((prev) => [...prev, ...uris]);
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  }

  async function send() {
    const q = input.trim();
    const images = attachedImages;
    if ((!q && images.length === 0) || loading) return;
    setInput('');
    setAttachedImages([]);

    // 사용자 말풍선 (텍스트/사진)
    setMsgs((prev) => [
      ...prev,
      { id: uid(), kind: 'user', text: q || undefined, imageUris: images.length ? images : undefined },
    ]);

    // 요청 모드: 사진 첨부 가능. BE 업로드 엔드포인트가 없어 사진은 로컬 표시 + 안내.
    // (TODO: BE 멀티파트 업로드 준비되면 images 를 함께 전송)
    if (mode === 'request') {
      setLoading(true);
      if (q) setMsgs((prev) => [...prev, { id: uid(), kind: 'loading' }]);
      scrollToEnd();
      try {
        let answer: string | undefined;
        if (q) {
          if (sessionId.current == null) {
            const s = await createSession();
            sessionId.current = s.data.sessionId;
          }
          const res = await sendMessage(sessionId.current, q);
          answer = res.data.content;
          lastMessageId.current = res.data.messageId;
        }
        setMsgs((prev) => {
          const next = prev.filter((m) => m.kind !== 'loading');
          if (answer) {
            next.push({ id: uid(), kind: 'answer', text: answer });
          } else if (q) {
            next.push({ id: uid(), kind: 'answer', text: '요청을 접수했어요.' });
          }
          // 사진 업로드는 아직 BE 미준비라 텍스트만 전달됨을 안내한다.
          const imgNote = images.length
            ? `사진 ${images.length}장은 현재 업로드 준비 중이라 텍스트 내용만 전달돼요.`
            : undefined;
          if (q) {
            next.push({
              id: uid(),
              kind: 'actions',
              action: 'CREATE_TICKET',
              userText: q,
              hint: imgNote,
            });
          } else if (imgNote) {
            next.push({ id: uid(), kind: 'actions', hint: imgNote });
          }
          return next;
        });
        scrollToEnd();
      } catch (err) {
        setMsgs((prev) => [
          ...prev.filter((m) => m.kind !== 'loading'),
          { id: uid(), kind: 'answer', text: errorText(err) },
        ]);
        scrollToEnd();
      } finally {
        setLoading(false);
      }
      return;
    }

    // 질문 모드: 텍스트만
    setMsgs((prev) => [...prev, { id: uid(), kind: 'loading' }]);
    setLoading(true);
    scrollToEnd();

    try {
      if (sessionId.current == null) {
        const s = await createSession();
        sessionId.current = s.data.sessionId;
      }
      const res = await sendMessage(sessionId.current, q);
      const { content, referencesJson, nextAction, messageId } = res.data;
      const references = parseReferences(referencesJson);
      lastMessageId.current = messageId;

      setMsgs((prev) => {
        const cleaned = prev.filter((m) => m.kind !== 'loading');
        const next: Msg[] = [...cleaned];

        next.push({ id: uid(), kind: 'answer', text: content });
        // 출처는 nextAction과 무관하게 1개 이상이면 항상 표시한다 (성공 응답은 action=null로 옴).
        if (references.length) {
          next.push({ id: uid(), kind: 'sources', sources: mapReferences(references) });
        }
        if (nextAction === 'CREATE_WORKI') {
          next.push({ id: uid(), kind: 'actions', action: 'CREATE_WORKI', userText: q });
        } else if (nextAction === 'CREATE_TICKET') {
          next.push({ id: uid(), kind: 'actions', action: 'CREATE_TICKET', userText: q });
        }
        return next;
      });
      scrollToEnd();
    } catch (err) {
      setMsgs((prev) => [
        ...prev.filter((m) => m.kind !== 'loading'),
        { id: uid(), kind: 'answer', text: errorText(err) },
      ]);
      scrollToEnd();
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
      <View className="flex-1" style={{ paddingBottom: keyboardSpacing }}>
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
            <MessageBubble
              key={m.id}
              msg={m}
              onCreateWorki={() => openForm('worki', m.userText)}
              onCreateTicket={() => openForm('ticket', m.userText)}
            />
          ))}
        </ScrollView>

        <View className="border-t border-stone-100">
          {/* 첨부 사진 미리보기 (여러 장, 전송 시 메시지와 함께 보냄) */}
          {attachedImages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="px-4 pt-2.5"
              contentContainerClassName="gap-2"
              keyboardShouldPersistTaps="handled">
              {attachedImages.map((uri, i) => (
                <View key={`${uri}-${i}`}>
                  <Image source={{ uri }} className="h-16 w-16 rounded-lg" />
                  <Pressable
                    onPress={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-stone-700">
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View className="flex-row items-end gap-2 px-4 py-2.5">
            {mode === 'request' ? (
              <Pressable
                onPress={openAttach}
                className="h-11 w-11 items-center justify-center rounded-full bg-stone-100 active:opacity-70">
                <ImagePlus color="#57534e" size={20} />
              </Pressable>
            ) : null}
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={mode === 'question' ? '궁금한 점을 입력하세요' : '요청 내용을 입력하세요'}
              placeholderTextColor="#a8a29e"
              multiline
              onFocus={scrollToEnd}
              className="max-h-28 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[15px] text-ink"
            />
            <Pressable
              onPress={send}
              disabled={loading || (!input.trim() && attachedImages.length === 0)}
              className={`h-11 w-11 items-center justify-center rounded-full bg-[#208AEF] ${
                loading || (!input.trim() && attachedImages.length === 0) ? 'opacity-40' : ''
              }`}>
              <Send color="#fff" size={20} />
            </Pressable>
          </View>
        </View>
      </View>

      <CreateFormModal
        kind={formKind}
        title={formTitle}
        content={formContent}
        error={formError}
        submitting={submitting}
        onChangeTitle={setFormTitle}
        onChangeContent={setFormContent}
        onCancel={closeForm}
        onSubmit={submitForm}
      />
    </SafeAreaView>
  );
}

function CreateFormModal({
  kind,
  title,
  content,
  error,
  submitting,
  onChangeTitle,
  onChangeContent,
  onCancel,
  onSubmit,
}: {
  kind: FormKind | null;
  title: string;
  content: string;
  error: string;
  submitting: boolean;
  onChangeTitle: (v: string) => void;
  onChangeContent: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const isWorki = kind === 'worki';
  return (
    <Modal visible={kind !== null} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onCancel}>
        <Pressable className="rounded-t-3xl bg-white px-5 pb-8 pt-5" onPress={(e) => e.stopPropagation()}>
          <View className="mb-4 flex-row items-center gap-2">
            <View className={`rounded-xl p-2 ${isWorki ? 'bg-[#e8f1ff]' : 'bg-[#fff0e8]'}`}>
              {isWorki ? (
                <FileText color="#208AEF" size={20} />
              ) : (
                <Ticket color="#f97316" size={20} />
              )}
            </View>
            <Text className="text-lg font-bold text-ink">
              {isWorki ? '워키 질문 등록' : '티켓 발송'}
            </Text>
          </View>

          <Text className="mb-1 text-sm font-medium text-stone-600">제목</Text>
          <TextInput
            value={title}
            onChangeText={onChangeTitle}
            placeholder={isWorki ? '질문 제목을 입력하세요' : '요청 제목을 입력하세요'}
            placeholderTextColor="#a8a29e"
            className="mb-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[15px] text-ink"
          />

          <Text className="mb-1 text-sm font-medium text-stone-600">내용</Text>
          <TextInput
            value={content}
            onChangeText={onChangeContent}
            placeholder="내용을 10자 이상 작성하세요"
            placeholderTextColor="#a8a29e"
            multiline
            className="mb-2 h-28 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[15px] text-ink"
            textAlignVertical="top"
          />

          {error ? <Text className="mb-2 text-sm text-red-500">{error}</Text> : null}

          <View className="mt-2 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className="flex-1 items-center justify-center rounded-xl border border-stone-200 py-3 active:opacity-70">
              <Text className="text-base font-semibold text-stone-600">취소</Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              className={`flex-1 items-center justify-center rounded-xl py-3 ${
                isWorki ? 'bg-[#208AEF]' : 'bg-[#f97316]'
              } ${submitting ? 'opacity-50' : 'active:opacity-80'}`}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  {isWorki ? '등록하기' : '발송하기'}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MessageBubble({
  msg,
  onCreateWorki,
  onCreateTicket,
}: {
  msg: Msg;
  onCreateWorki: () => void;
  onCreateTicket: () => void;
}) {
  if (msg.kind === 'user') {
    return (
      <View className="flex-row items-end justify-end gap-2">
        <View className="max-w-[80%] gap-1.5">
          {msg.imageUris?.length ? (
            <View className="flex-row flex-wrap justify-end gap-1.5">
              {msg.imageUris.map((uri, i) => (
                <Image
                  key={`${uri}-${i}`}
                  source={{ uri }}
                  resizeMode="cover"
                  className={
                    msg.imageUris!.length === 1 ? 'h-44 w-44 rounded-2xl' : 'h-24 w-24 rounded-xl'
                  }
                />
              ))}
            </View>
          ) : null}
          {msg.text ? (
            <View className="self-end rounded-2xl rounded-br-md bg-[#208AEF] px-4 py-2.5">
              <Text className="text-[15px] text-white">{msg.text}</Text>
            </View>
          ) : null}
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
      <View className="ml-9 gap-2">
        {msg.hint ? (
          <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
            <Text className="text-[13px] leading-5 text-amber-700">{msg.hint}</Text>
          </View>
        ) : null}
        {msg.action === 'CREATE_WORKI' ? (
          <Pressable
            onPress={onCreateWorki}
            className="flex-row items-center gap-2 self-start rounded-xl border border-[#208AEF] bg-[#e8f1ff] px-4 py-2.5 active:opacity-70">
            <FileText size={16} color="#208AEF" />
            <Text className="text-sm font-semibold text-[#208AEF]">워키 질문으로 등록</Text>
          </Pressable>
        ) : null}
        {msg.action === 'CREATE_TICKET' ? (
          <Pressable
            onPress={onCreateTicket}
            className="flex-row items-center gap-2 self-start rounded-xl border border-[#f97316] bg-[#fff0e8] px-4 py-2.5 active:opacity-70">
            <Ticket size={16} color="#f97316" />
            <Text className="text-sm font-semibold text-[#f97316]">티켓 발송하기</Text>
          </Pressable>
        ) : null}
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
