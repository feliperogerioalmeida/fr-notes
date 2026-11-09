import { ActivityIndicator, View } from "react-native";

export const FullScreenLoader = () => (
  <View className="flex-1 items-center justify-center bg-background">
    <ActivityIndicator size="large" />
  </View>
);
