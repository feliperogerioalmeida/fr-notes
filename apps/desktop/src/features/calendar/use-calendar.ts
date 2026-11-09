import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type CalendarEvent, filterVisibleEvents } from "@workspace/core";

import { usePermissions } from "@/features/settings/use-settings.js";
import { getStorage } from "@/lib/database.js";
import {
  listCalendarEvents,
  listCalendars,
  requestCalendarAccess,
} from "@/lib/native.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const REFRESH_MS = 60_000;
const UPCOMING_DAYS = 2;

interface CalendarRange {
  daysBack?: number;
  daysAhead?: number;
}

const buildRange = ({
  daysBack = 0,
  daysAhead = UPCOMING_DAYS,
}: CalendarRange) => {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - daysBack);
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  to.setDate(to.getDate() + daysAhead);
  return { fromMs: from.getTime(), toMs: to.getTime() };
};

export const fetchVisibleEvents = async (
  range: CalendarRange = {},
): Promise<CalendarEvent[]> => {
  const settings = await (await getStorage()).settings.readSettings();
  const events = await listCalendarEvents(buildRange(range));
  return filterVisibleEvents({
    events,
    hiddenCalendarIds: settings.hiddenCalendarIds,
  });
};

const useCalendarGranted = () => usePermissions().data?.calendar === "granted";

export const useCalendarEvents = (range: CalendarRange = {}) => {
  const granted = useCalendarGranted();
  const { daysBack = 0, daysAhead = UPCOMING_DAYS } = range;
  return useQuery({
    queryKey: QUERY_KEYS.calendarEventsRange(daysBack, daysAhead),
    queryFn: () => fetchVisibleEvents({ daysBack, daysAhead }),
    enabled: granted,
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS,
  });
};

export const useCalendarsQuery = () =>
  useQuery({
    queryKey: QUERY_KEYS.calendars,
    queryFn: listCalendars,
    enabled: useCalendarGranted(),
  });

export const useConnectCalendar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestCalendarAccess,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.permissions }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarEvents }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendars }),
      ]),
  });
};
