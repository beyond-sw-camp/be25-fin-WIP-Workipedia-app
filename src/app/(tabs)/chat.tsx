import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Client } from '@stomp/stompjs';
import { Send, X } from 'lucide-react-native';

import { getActiveMessages } from '@/api/chatApi';
import { wsOrigin } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';
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

const TTL_MS = 10 * 60 * 1000;

export default function ChatScreen() {
  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);
  const token = useAuthStore((s) => s.accessToken);

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [now, setNow] = useState(Date.now());

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

  // 상대시간("방금")을 실제 시간으로 전환하기 위한 30초 틱
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // 초기 로드 + STOMP 연결
  useEffect(() => {
    let active = true;
    const localTimeouts = timeouts.current;

    (async () => {
      try {
        const res = await getActiveMessages();
        if (!active) return;
        const list: ChatMsg[] = res.data.messages.map((raw) => mapIncoming(raw, res.data.messages, userId));
        setMsgs(list);
        list.forEach(scheduleDelete);
      } catch {
        // 초기 로드 실패해도 실시간 연결은 유지
      }
    })();

    const client = new Client({
      brokerURL: `${wsOrigin()}/ws/flash-chat`,
      reconnectDelay: 5000,
      beforeConnect: () => {
        client.connectHeaders = { Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ''}` };
      },
      onConnect: () => {
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
              expiresAt: raw.expiresAt,
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
      active = false;
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
    setInput('');
    setReplyTo(null);

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
      stompRef.current?.publish({
        destination: '/app/flash-chat/send',
        body: JSON.stringify({ content, replyToId: replyRef?.id ?? null }),
      });
    } catch {
      // 연결 전 전송은 무시 (optimistic 은 이미 표시됨)
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
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
      </KeyboardAvoidingView>
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
    expiresAt: raw.expiresAt,
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
