import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LeaderboardProvider } from "@/contexts/LeaderboardContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerShown: false }} />
      <Stack.Screen 
        name="leaderboard" 
        options={{ 
          title: "Leaderboard",
          headerStyle: { backgroundColor: "#f5f5f0" },
          headerTintColor: "#333"
        }} 
      />
      <Stack.Screen 
        name="calibration" 
        options={{ 
          title: "Calibration",
          headerStyle: { backgroundColor: "#f5f5f0" },
          headerTintColor: "#333"
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LeaderboardProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </LeaderboardProvider>
    </QueryClientProvider>
  );
}
