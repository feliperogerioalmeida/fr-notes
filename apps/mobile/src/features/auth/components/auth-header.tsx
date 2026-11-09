import { View } from "react-native";

import { Text } from "@/components/ui/text";

interface AuthHeaderProps {
  title: string;
  description: string;
}

export const AuthHeader = ({ title, description }: AuthHeaderProps) => (
  <View className="gap-1.5">
    <Text variant="h3">{title}</Text>
    <Text variant="muted">{description}</Text>
  </View>
);
