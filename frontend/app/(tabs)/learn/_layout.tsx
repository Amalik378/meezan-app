import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function LearnLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="lesson" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="quiz" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="results" options={{ animation: 'fade' }} />
    </Stack>
  );
}
