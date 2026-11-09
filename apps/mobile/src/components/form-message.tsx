import { View } from "react-native";

import { Text } from "@/components/ui/text";

interface FormMessageProps {
  message?: string;
  variant?: "error" | "success";
}

export const FormMessage = ({
  message,
  variant = "error",
}: FormMessageProps) => {
  if (!message) return null;

  return (
    <View
      className={
        variant === "error"
          ? "rounded-md bg-destructive/10 px-3 py-2"
          : "rounded-md bg-accent px-3 py-2"
      }
    >
      <Text
        variant="small"
        className={
          variant === "error" ? "text-destructive" : "text-accent-foreground"
        }
      >
        {message}
      </Text>
    </View>
  );
};
