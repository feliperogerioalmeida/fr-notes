import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { filterVisibleEvents } from "@workspace/core";

import { usePermissions } from "@/features/settings/use-settings.js";
import { getStorage } from "@/lib/database.js";
import { listCalendarEvents } from "@/lib/native.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const REFRESH_MS = 60_000;

const fetchRange = async (fromMs: number, toMs: number) => {
  const settings = await (await getStorage()).settings.readSettings();
  const events = await listCalendarEvents({ fromMs, toMs });
  return filterVisibleEvents({
    events,
    hiddenCalendarIds: settings.hiddenCalendarIds,
  });
};

export const useRangeEvents = (fromMs: number, toMs: number) => {
  const granted = usePermissions().data?.calendar === "granted";
  return useQuery({
    queryKey: [...QUERY_KEYS.calendarEvents, "range", fromMs, toMs],
    queryFn: () => fetchRange(fromMs, toMs),
    enabled: granted,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
};
