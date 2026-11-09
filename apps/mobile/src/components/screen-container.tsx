import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

interface ScreenContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export const ScreenContainer = ({
  children,
  className,
  scrollable = true,
}: ScreenContainerProps) => {
  const content = scrollable ? (
    <ScrollView
      contentContainerClassName={cn("grow justify-center p-6", className)}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn("flex-1 justify-center p-6", className)}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: "padding", default: undefined })}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
