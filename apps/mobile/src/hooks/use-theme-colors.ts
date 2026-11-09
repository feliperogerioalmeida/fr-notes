import { useColorScheme } from "nativewind";

import { THEME } from "@/lib/theme";

export const useThemeColors = () => {
  const { colorScheme } = useColorScheme();
  return THEME[colorScheme === "dark" ? "dark" : "light"];
};
