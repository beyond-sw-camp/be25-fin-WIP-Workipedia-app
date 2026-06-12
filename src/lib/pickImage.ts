import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const BASE: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
};

// 갤러리에서 여러 장 선택. 취소/권한거부 시 빈 배열.
export async function pickFromLibrary(): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('권한 필요', '사진을 첨부하려면 갤러리 접근 권한이 필요합니다.');
    return [];
  }
  const res = await ImagePicker.launchImageLibraryAsync({ ...BASE, allowsMultipleSelection: true });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}

// 카메라로 한 장 촬영. 취소/권한거부 시 빈 배열.
export async function pickFromCamera(): Promise<string[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('권한 필요', '사진을 촬영하려면 카메라 접근 권한이 필요합니다.');
    return [];
  }
  const res = await ImagePicker.launchCameraAsync(BASE);
  if (res.canceled || !res.assets?.length) return [];
  return [res.assets[0].uri];
}
