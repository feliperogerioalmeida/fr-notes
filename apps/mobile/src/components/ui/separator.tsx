import { View } from "react-native";

import { cn } from "@/lib/utils";

const Separator = ({ className }: { className?: string }) => (
  <View className={cn("h-hairline w-full bg-border", className)} />
);

export { Separator };
