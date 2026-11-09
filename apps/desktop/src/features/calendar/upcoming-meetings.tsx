import { type CalendarEvent, formatDayLabel } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { Link } from "react-router";

import { useNotesQuery } from "@/features/notes/use-notes.js";
import { usePermissions } from "@/features/settings/use-settings.js";

import { ConnectCalendar } from "./connect-calendar.js";
import { EventCompactRow } from "./event-row.js";
import { useCalendarEvents } from "./use-calendar.js";

const MAX_EVENTS = 5;

const selectUpcoming = (events: CalendarEvent[], nowMs: number) =>
  events
    .filter((event) => !event.isAllDay && event.endMs >= nowMs)
    .slice(0, MAX_EVENTS);

const dayLabelOf = (event: CalendarEvent) =>
  formatDayLabel(new Date(event.startMs));

const startsNewDay = (events: CalendarEvent[], index: number) => {
  const previous = events[index - 1];
  const current = events[index];
  if (!previous || !current) return true;
  return dayLabelOf(previous) !== dayLabelOf(current);
};

const EmptyAgenda = () => (
  <p className="text-caption text-muted-foreground">
    Nada na agenda hoje e amanhã.
  </p>
);

export const UpcomingMeetings = () => {
  const { data: permissions } = usePermissions();
  const { data: events = [] } = useCalendarEvents();
  const { data: notes = [] } = useNotesQuery();
  if (permissions && permissions.calendar !== "granted") {
    return <ConnectCalendar />;
  }
  const nowMs = Date.now();
  const upcoming = selectUpcoming(events, nowMs);
  const notesByEvent = new Map(
    notes.map((note) => [note.calendarEventId, note]),
  );
  return (
    <section className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-label text-muted-foreground uppercase">
          Próximas reuniões
        </h2>
        <Button size="xs" variant="ghost" asChild>
          <Link to="/agenda">Agenda</Link>
        </Button>
      </div>
      {upcoming.length === 0 ? (
        <EmptyAgenda />
      ) : (
        <div className="divide-border flex flex-col divide-y">
          {upcoming.map((event, index) => (
            <div
              key={event.id}
              className="flex flex-col py-3 first:pt-0 last:pb-0"
            >
              {startsNewDay(upcoming, index) && (
                <span className="text-caption text-muted-foreground pt-1 pb-2 first-letter:uppercase">
                  {dayLabelOf(event)}
                </span>
              )}
              <EventCompactRow
                event={event}
                note={notesByEvent.get(event.id)}
                nowMs={nowMs}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
