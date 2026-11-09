import * as React from "react";
import { TextInput, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<typeof TextInput> & {
  label?: string;
  errorMessage?: string;
};

const Input = ({ label, errorMessage, className, ...props }: InputProps) => {
  const colors = useThemeColors();

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        className={cn(
          "h-11 rounded-md border border-input bg-background px-3 text-base text-foreground",
          errorMessage && "border-destructive",
          className,
        )}
        {...props}
      />
      {errorMessage ? (
        <Text className="text-xs text-destructive">{errorMessage}</Text>
      ) : null}
    </View>
  );
};

const Textarea = ({ label, errorMessage, className, ...props }: InputProps) => {
  const colors = useThemeColors();

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      ) : null}
      <TextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.mutedForeground}
        className={cn(
          "min-h-28 rounded-md border border-input bg-background px-3 py-3 text-base text-foreground",
          errorMessage && "border-destructive",
          className,
        )}
        {...props}
      />
      {errorMessage ? (
        <Text className="text-xs text-destructive">{errorMessage}</Text>
      ) : null}
    </View>
  );
};

export { Input, Textarea };
export type { InputProps };
