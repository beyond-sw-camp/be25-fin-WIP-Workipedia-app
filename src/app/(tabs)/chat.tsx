import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Client } from '@stomp/stompjs';
import { Send, X } from 'lucide-react-native';

import { getActiveMessages } from '@/api/chatApi';
import { wsOrigin } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';
import { useKeyboardSpacing } from '@/lib/useKeyboardSpacing';
import type { FlashChatMessageResponse } from '@/types/chat';

interface ReplyRef {
  id: string;
  name: string | null;
  content: string | null;
}

interface ChatMsg {
  id: string;
  userId: number;
  me: boolean;
  name: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  replyTo?: ReplyRef | null;
}

// 메시지 만료 시간. 웹과 동일하게 서버 expiresAt 을 신뢰하지 않고
// createdAt + TTL 로 클라이언트에서 만료를 계산한다(웹 기본값 600초와 일치).
const TTL_MS = 10 * 60 * 1000;

export default function ChatScreen() {
  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);
  const token = useAuthStore((s) => s.accessToken);
  const tabBarHeight = useBottomTabBarHeight();
  const keyboardSpacing = useKeyboardSpacing(tabBarHeight);

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChatMsg>>(null);
  const stompRef = useRef<Client | null>(null);
  const timeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeMsg = useCallback((id: string) => {
    setMsgs((prev) => prev.filter((m) => m.id !== id));
    const h = timeouts.current.get(id);
    if (h) {
      clearTimeout(h);
      timeouts.current.delete(id);
    }
  }, []);

  const scheduleDelete = useCallback(
    (msg: ChatMsg) => {
      const delay = new Date(msg.expiresAt).getTime() - Date.now();
      if (delay <= 0) {
        removeMsg(msg.id);
        return;
      }
      const handle = setTimeout(() => removeMsg(msg.id), delay);
      timeouts.current.set(msg.id, handle);
    },
    [removeMsg],
  );

  const scrollToEnd = () =>
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));

  // 활성(미만료) 메시지를 REST 로 다시 받아와 목록을 동기화한다.
  // 최초 진입·STOMP 재연결·당겨서 새로고침에서 공통으로 사용한다.
  const loadActiveMessages = useCallback(async () => {
    try {
      const res = await getActiveMessages();
      const list: ChatMsg[] = res.data.messages.map((raw) =>
        mapIncoming(raw, res.data.messages, userId),
      );
      setMsgs(list);
      list.forEach(scheduleDelete);
    } catch {
      // 로드 실패해도 실시간 연결은 유지
    }
  }, [userId, scheduleDelete]);

  // 상대시간("방금")을 실제 시간으로 전환하기 위한 30초 틱
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // 초기 로드 + STOMP 연결
  useEffect(() => {
    const localTimeouts = timeouts.current;

    // 실제 접속 대상 호스트를 로그로 남겨 IP 설정 오류(연결 실패)를 빠르게 식별한다.
    console.log('[FlashChat] STOMP 대상:', `${wsOrigin()}/ws/flash-chat-native`);

    void loadActiveMessages();

    const client = new Client({
      // raw WebSocket(STOMP) 은 SockJS 가 아니므로 BE 의 native 엔드포인트에 붙어야 한다.
      // /ws/flash-chat 은 .withSockJS() 전용(웹 브라우저용)이라 raw 연결 시 핸드셰이크가 실패한다.
      brokerURL: `${wsOrigin()}/ws/flash-chat-native`,
      reconnectDelay: 5000,
      // React Native 의 WebSocket 은 STOMP 프레임 끝 NULL(\0) 처리가 표준과 달라
      // 서버의 CONNECTED 프레임을 완성된 프레임으로 인식하지 못하고 CONNECT 직후 멈춘다.
      // (동일 토큰·서버라도 Node 의 ws 에선 정상.) 아래 두 플래그가 RN 표준 우회책.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      beforeConnect: () => {
        client.connectHeaders = { Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ''}` };
      },
      // 실패를 조용히 묻지 않도록 로깅한다 (연결 진단용).
      debug: (msg) => console.log('[FlashChat][STOMP]', msg),
      onStompError: (frame) => {
        console.warn('[FlashChat] STOMP error:', frame.headers['message'], frame.body);
      },
      onWebSocketError: (event) => {
        console.warn('[FlashChat] WebSocket error:', event);
      },
      onWebSocketClose: (event) => {
        console.warn('[FlashChat] WebSocket closed:', event?.code, event?.reason);
      },
      onConnect: () => {
        // (재)연결될 때마다 히스토리를 다시 받아 그동안 놓친 메시지를 동기화한다.
        void loadActiveMessages();

        // 서버가 전송을 거부하면(@SendToUser('/queue/errors')) 이 큐로만 사유가 온다.
        // 구독하지 않으면 거부가 조용히 묻혀 "보냈는데 아무 일도 안 일어나는" 것처럼 보인다.
        client.subscribe('/user/queue/errors', (frame) => {
          let status = '';
          let message = frame.body;
          try {
            const err = JSON.parse(frame.body);
            status = err.status ?? '';
            message = err.message ?? frame.body;
          } catch {
            // body 가 JSON 이 아니면 원문 그대로 사용
          }
          console.warn('[FlashChat] 전송 거부:', status, message);
          // 서버에 저장되지 않은 optimistic 임시 메시지를 화면에서 되돌린다.
          setMsgs((prev) => prev.filter((m) => !m.id.startsWith('__tmp_')));
          setSendError(message);
        });

        client.subscribe('/topic/flash-chat', (frame) => {
          const raw = JSON.parse(frame.body);

          if (raw.type === 'DELETE') {
            removeMsg(raw.id);
            return;
          }

          setMsgs((prev) => {
            const me = raw.userId === userId;
            const original = raw.replyToId ? prev.find((m) => m.id === raw.replyToId) : null;
            const msg: ChatMsg = {
              id: raw.id,
              userId: raw.userId,
              me,
              name: raw.nickname,
              content: raw.content,
              createdAt: raw.createdAt,
              // 웹과 동일하게 서버 expiresAt 을 무시하고 createdAt + TTL 로 클라이언트에서 계산한다.
              expiresAt: new Date(new Date(raw.createdAt).getTime() + TTL_MS).toISOString(),
              replyTo: raw.replyToId
                ? { id: raw.replyToId, name: original?.name ?? null, content: original?.content ?? null }
                : null,
            };

            // optimistic dedup: 내가 보낸 echo 가 오면 임시 메시지를 교체
            if (me) {
              const tmpIdx = prev.findIndex(
                (m) => m.id.startsWith('__tmp_') && m.content === msg.content,
              );
              if (tmpIdx !== -1) {
                const tmp = prev[tmpIdx];
                const h = timeouts.current.get(tmp.id);
                if (h) clearTimeout(h);
                timeouts.current.delete(tmp.id);
                const copy = [...prev];
                copy.splice(tmpIdx, 1, msg);
                scheduleDelete(msg);
                return copy;
              }
            }

            scheduleDelete(msg);
            return [...prev, msg];
          });
          scrollToEnd();
        });
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      localTimeouts.forEach((h) => clearTimeout(h));
      localTimeouts.clear();
      client.deactivate();
    };
    // userId 가 정해진 뒤 한 번만 연결
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function send() {
    const content = input.trim();
    if (!content) return;
    const replyRef = replyTo;

    // 연결이 없으면 publish 가 조용히 실패해 메시지가 사라진 것처럼 보인다.
    // 입력을 유지한 채 사유를 노출하고 전송하지 않는다.
    const client = stompRef.current;
    if (!client || !client.connected) {
      setSendError('서버에 연결되어 있지 않아요. 연결 상태를 확인하는 중입니다…');
      return;
    }

    setInput('');
    setReplyTo(null);
    setSendError(null);

    const tempId = `__tmp_${Date.now()}`;
    const optimistic: ChatMsg = {
      id: tempId,
      userId: userId ?? 0,
      me: true,
      name: nickname ?? '',
      content,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
      replyTo: replyRef ? { id: replyRef.id, name: replyRef.name, content: replyRef.content } : null,
    };
    setMsgs((prev) => [...prev, optimistic]);
    scheduleDelete(optimistic);
    scrollToEnd();

    try {
      client.publish({
        destination: '/app/flash-chat/send',
        body: JSON.stringify({ content, replyToId: replyRef?.id ?? null }),
      });
    } catch (e) {
      // publish 실패: optimistic 을 되돌리고 사유를 노출한다.
      removeMsg(tempId);
      setSendError('메시지 전송에 실패했어요. 다시 시도해 주세요.');
      console.warn('[FlashChat] publish 실패:', e);
    }
  }

  function formatTime(createdAt: string): string {
    const ts = new Date(createdAt).getTime();
    if (now - ts < 60_000) return '방금';
    const d = new Date(createdAt);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1" style={{ paddingBottom: keyboardSpacing }}>
        <View className="border-b border-stone-100 px-5 py-3">
          <Text className="text-lg font-bold text-ink">Flash Chat</Text>
          <Text className="text-xs text-muted">메시지는 10분 후 사라져요</Text>
        </View>

        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          className="flex-1"
          contentContainerClassName="px-4 py-3 gap-2"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadActiveMessages();
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Text className="text-sm text-stone-400">아직 메시지가 없어요. 먼저 말을 걸어보세요!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onLongPress={() => setReplyTo(item)}>
              <Bubble msg={item} time={formatTime(item.createdAt)} />
            </Pressable>
          )}
        />

        {sendError ? (
          <Pressable
            onPress={() => setSendError(null)}
            className="flex-row items-center gap-2 border-t border-red-100 bg-red-50 px-4 py-2 active:opacity-70">
            <Text className="flex-1 text-xs text-red-600">{sendError}</Text>
            <X size={16} color="#dc2626" />
          </Pressable>
        ) : null}

        {replyTo ? (
          <View className="flex-row items-center gap-2 border-t border-stone-100 bg-stone-50 px-4 py-2">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-[#208AEF]">{replyTo.name}에게 답장</Text>
              <Text className="text-xs text-stone-500" numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} className="p-1 active:opacity-60">
              <X size={18} color="#78716c" />
            </Pressable>
          </View>
        ) : null}

        <View className="flex-row items-end gap-2 border-t border-stone-100 px-4 py-2.5">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요"
            placeholderTextColor="#a8a29e"
            multiline
            onFocus={scrollToEnd}
            className="max-h-28 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[15px] text-ink"
          />
          <Pressable
            onPress={send}
            disabled={!input.trim()}
            className={`h-11 w-11 items-center justify-center rounded-full bg-[#208AEF] ${
              !input.trim() ? 'opacity-40' : ''
            }`}>
            <Send color="#fff" size={20} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function mapIncoming(
  raw: FlashChatMessageResponse,
  all: FlashChatMessageResponse[],
  myId: number | null,
): ChatMsg {
  const original = raw.replyToId ? all.find((m) => m.id === raw.replyToId) : null;
  return {
    id: raw.id,
    userId: raw.userId,
    me: raw.userId === myId,
    name: raw.nickname,
    content: raw.content,
    createdAt: raw.createdAt,
    // 웹과 동일하게 서버 expiresAt 을 무시하고 createdAt + TTL 로 클라이언트에서 계산한다.
    expiresAt: new Date(new Date(raw.createdAt).getTime() + TTL_MS).toISOString(),
    replyTo: raw.replyToId
      ? { id: raw.replyToId, name: original?.nickname ?? null, content: original?.content ?? null }
      : null,
  };
}

function Bubble({ msg, time }: { msg: ChatMsg; time: string }) {
  return (
    <View className={`flex-row ${msg.me ? 'justify-end' : 'justify-start'}`}>
      <View className="max-w-[80%]">
        {!msg.me ? <Text className="mb-0.5 ml-1 text-xs text-stone-500">{msg.name}</Text> : null}

        {msg.replyTo ? (
          <View
            className={`mb-0.5 rounded-lg border-l-2 border-[#208AEF] px-2 py-1 ${
              msg.me ? 'bg-blue-50' : 'bg-stone-100'
            }`}>
            <Text className="text-[11px] font-semibold text-[#208AEF]">{msg.replyTo.name}</Text>
            <Text className="text-[11px] text-stone-500" numberOfLines={1}>
              {msg.replyTo.content}
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-end gap-1.5">
          {msg.me ? <Text className="mb-0.5 text-[10px] text-stone-400">{time}</Text> : null}
          <View
            className={`rounded-2xl px-4 py-2.5 ${
              msg.me ? 'rounded-br-md bg-[#208AEF]' : 'rounded-bl-md bg-stone-100'
            }`}>
            <Text className={`text-[15px] ${msg.me ? 'text-white' : 'text-stone-800'}`}>
              {msg.content}
            </Text>
          </View>
          {!msg.me ? <Text className="mb-0.5 text-[10px] text-stone-400">{time}</Text> : null}
        </View>
      </View>
    </View>
  );
}
