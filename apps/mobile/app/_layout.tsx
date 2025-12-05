import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 分钟
        gcTime: 1000 * 60 * 10, // 10 分钟
      },
    },
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="projects/[id]" />
            <Stack.Screen name="editor/[id]" />
            <Stack.Screen name="settings" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}



