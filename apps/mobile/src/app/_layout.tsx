import "@/global.css";

import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { NAV_THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryProvider>
          <ThemeProvider value={NAV_THEME[scheme]}>
            <StatusBar style={scheme === "dark" ? "light" : "dark"} />
            <View className={cn("flex-1", scheme === "dark" && "dark")}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(protected)" />
              </Stack>
            </View>
          </ThemeProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
