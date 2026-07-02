import { Text, View } from 'react-native';

export interface Source {
  type: string;
  cls: 'blue' | 'green' | 'gray';
  meta: string;
  date?: string;
  body?: string;
  link: string;
  url?: string; // 내부 라우트 경로 (v1 에서는 매뉴얼 화면 비범위라 표시만)
}

const BORDER = { blue: '#cfe0ff', green: '#bfe9cf', gray: '#e5e7eb' } as const;
const BG = { blue: '#f3f8ff', green: '#f2fcf6', gray: '#fafafa' } as const;
const BADGE = {
  blue: { backgroundColor: '#2b7fff', color: '#fff' },
  green: { backgroundColor: '#00a63e', color: '#fff' },
  gray: { backgroundColor: '#eef0f3', color: '#4b5563' },
} as const;

export function SourceCard({ source }: { source: Source }) {
  const badge = BADGE[source.cls];
  return (
    <View
      className="rounded-2xl p-4"
      style={{ borderWidth: 1, borderColor: BORDER[source.cls], backgroundColor: BG[source.cls] }}>
      <View className="mb-2 flex-row items-center gap-2.5">
        <Text
          className="overflow-hidden rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: badge.backgroundColor, color: badge.color }}>
          {source.type}
        </Text>
        <Text className="flex-1 text-[13px] text-muted" numberOfLines={1}>
          {source.meta}
        </Text>
        {source.date ? <Text className="text-[13px] text-stone-400">{source.date}</Text> : null}
      </View>

      {source.body ? (
        <Text className="text-[15px] leading-6 text-stone-800">{source.body}</Text>
      ) : null}
    </View>
  );
}
