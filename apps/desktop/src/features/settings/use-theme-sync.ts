import { useTheme } from "next-themes";
import { useEffect } from "react";

import { useSettingsQuery } from "./use-settings.js";

export const useThemeSync = () => {
  const { data: settings, isPlaceholderData } = useSettingsQuery();
  const { setTheme } = useTheme();
  useEffect(() => {
    if (!settings || isPlaceholderData) return;
    setTheme(settings.theme);
  }, [settings, isPlaceholderData, setTheme]);
};
