import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getStorage } from "@/lib/database.js";

const SEARCH_DEBOUNCE_MS = 180;

const useDebouncedValue = (value: string, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

export const useSearchResults = (query: string) => {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  return useQuery({
    queryKey: ["search", debounced],
    queryFn: async () => (await getStorage()).search.search(debounced),
    enabled: debounced.length > 0,
    placeholderData: (previous) => previous,
  });
};
