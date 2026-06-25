import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 키보드가 화면 콘텐츠 영역을 가리는 높이를 반환한다.
// Android(특히 SDK54 edge-to-edge)에서 KeyboardAvoidingView 가 입력창을 못 밀어올리는 문제를
// 회피하기 위해, 실제 Keyboard 이벤트로 직접 계산한다.
//
// 콘텐츠는 탭바 위에서 끝나므로 기본 겹침 = 키보드높이 - 탭바높이.
// 단, Android edge-to-edge 에서는 keyboardDidShow 가 보고하는 키보드 높이가
// 하단 내비게이션 바 inset 만큼 짧게 나온다 → 그만큼 더해 보정한다.
export function useKeyboardSpacing(tabBarHeight: number): number {
  const insets = useSafeAreaInsets();
  const [spacing, setSpacing] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvt, (e) => {
      const androidInsetFix = Platform.OS === 'android' ? insets.bottom : 0;
      const overlap = e.endCoordinates.height - tabBarHeight + androidInsetFix;
      setSpacing(overlap > 0 ? overlap : 0);
    });
    const hide = Keyboard.addListener(hideEvt, () => setSpacing(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, [tabBarHeight, insets.bottom]);

  return spacing;
}

// 키보드의 실제 높이(px)만 반환한다. 탭바·안전영역 보정을 하지 않으므로
// 전체화면 Modal 처럼 화면 맨 아래에 붙어 있는 시트를 키보드 위로 띄울 때 쓴다.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
