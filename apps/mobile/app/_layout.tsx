import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { colors } from "@/theme/colors";
import { getWs } from "@/lib/websocket";
import { initNotifications } from "@/lib/notifications";
import "../global.css";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  const [loaded, error] = useFonts({
    Outfit: require("../assets/fonts/Outfit-Regular.ttf"),
    "Outfit-Medium": require("../assets/fonts/Outfit-Medium.ttf"),
    "Outfit-SemiBold": require("../assets/fonts/Outfit-SemiBold.ttf"),
    "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
    "Fira Code": require("../assets/fonts/FiraCode-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // D6: app-level WS + notifications + session restore
  useEffect(() => {
    // SecureStore cold-start restore is automatic — the chunked storage adapter
    // in lib/supabase.ts is wired to Supabase's `auth.storage`, so the session
    // is restored before this layout mounts. No explicit code needed here.
    getWs().connect();
    const cleanup = initNotifications();
    return () => {
      cleanup();
    };
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </QueryClientProvider>
  );
}
