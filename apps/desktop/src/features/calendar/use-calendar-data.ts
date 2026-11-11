import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type CalendarEvent, filterVisibleEvents } from "@workspace/core";

import { usePermissions } from "@/features/settings/use-settings.js";
import { getStorage } from "@/lib/database.js";
import {
  deleteCalendarEvent,
  listCalendarEvents,
  saveCalendarEvent,
  type SaveCalendarEventArgs,
} from "@/lib/native.js";
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

const relinkNotes = async (previousId: string, saved: CalendarEvent) => {
  if (previousId === saved.id) return;
  const storage = await getStorage();
  const linked = (await storage.notes.listNotes()).filter(
    (note) => note.calendarEventId === previousId,
  );
  for (const note of linked) {
    await storage.notes.updateNote({
      id: note.id,
      patch: { calendarEventId: saved.id },
    });
  }
};

const applyOptimisticMove = (
  events: CalendarEvent[] | undefined,
  args: SaveCalendarEventArgs,
) =>
  events?.map((event) =>
    event.id === args.id
      ? {
          ...event,
          title: args.title,
          startMs: args.startMs,
          endMs: args.endMs,
          isAllDay: args.isAllDay,
        }
      : event,
  );

export const useSaveCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: SaveCalendarEventArgs) => {
      const saved = await saveCalendarEvent(args);
      if (args.id) await relinkNotes(args.id, saved);
      return saved;
    },
    onMutate: (args) => {
      if (!args.id) return;
      queryClient.setQueriesData<CalendarEvent[]>(
        { queryKey: QUERY_KEYS.calendarEvents },
        (events) => applyOptimisticMove(events, args),
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarEvents }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes }),
      ]),
  });
};

export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCalendarEvent,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendarEvents }),
  });
};
