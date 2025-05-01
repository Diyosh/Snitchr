import { Stack } from 'expo-router';
import { useAppStore } from '../assets/zustand/store';
import { getColors } from '../assets/constants/Colors';

export default function Layout() {
  const { darkMode } = useAppStore();
  const Colors = getColors(darkMode);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.linkBlue,
        },
        headerTintColor: '#fff',
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    />
  );
}
