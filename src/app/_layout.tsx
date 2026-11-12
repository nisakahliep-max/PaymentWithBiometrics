import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAccountStore } from '@/features/account/accountStore';
import { useHistoryStore } from '@/features/history/historyStore';
import { useRecipientsStore } from '@/features/recipients/recipientsStore';
import { colors } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/RouteErrorBoundary';

/** Kick off the three independent startup requests in parallel. */
function useBootstrap() {
  useEffect(() => {
    void Promise.all([
      useAccountStore.getState().refresh(),
      useRecipientsStore.getState().load(),
      useHistoryStore.getState().load(),
    ]);
  }, []);
}

export default function RootLayout() {
  useBootstrap();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.ink },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Transfer' }} />
        <Stack.Screen name="recipients" options={{ title: 'Send to', presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ title: 'Review transfer' }} />
        <Stack.Screen name="success" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="history" options={{ title: 'Transfer history' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
