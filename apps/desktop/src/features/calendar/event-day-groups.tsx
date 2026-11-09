import {
  type CalendarEvent,
  formatDayLabel,
  groupByDay,
  type Note,
} from "@workspace/core";

import { EventRow } from "./event-row.js";

interface EventDayGroupsProps {
  events: CalendarEvent[];
  notes: Note[];
  nowMs: number;
}

export const EventDayGroups = ({
  events,
  notes,
  nowMs,
}: EventDayGroupsProps) => {
  const notesByEvent = new Map(
    notes.map((note) => [note.calendarEventId, note]),
  );
  const groups = groupByDay({
    items: events,
    getDate: (event) => new Date(event.startMs).toISOString(),
  });
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          <span className="text-caption text-muted-foreground px-3 pb-1 first-letter:uppercase">
            {formatDayLabel(new Date(group.items[0]?.startMs ?? nowMs))}
          </span>
          {group.items.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              note={notesByEvent.get(event.id)}
              nowMs={nowMs}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
