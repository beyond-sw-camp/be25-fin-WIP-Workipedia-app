import Svg, { Polygon } from 'react-native-svg';

// 웹 로그인 카드의 Workipedia 큐브 로고 (SVG polygon 그대로 포팅).
export function Logo({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={(size / 56) * 64} viewBox="0 0 56 64">
      <Polygon points="28,2 54,17 28,31 2,17" fill="#bab4ab" />
      <Polygon points="2,17 28,31 28,62 2,48" fill="#9e9890" />
      <Polygon points="4,21 25,31 25,55 4,45" fill="white" />
      <Polygon points="28,31 54,17 54,48 28,62" fill="#88817a" />
    </Svg>
  );
}
