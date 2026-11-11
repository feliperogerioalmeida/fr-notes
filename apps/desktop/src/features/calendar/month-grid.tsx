import {
  buildMonthGrid,
  type CalendarEvent,
  DAYS_PER_WEEK,
  eventsOnDay,
  isSameDay,
} from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";

import { formatClock, formatWeekday } from "./calendar-format.js";

const VISIBLE_EVENTS = 3;

const sortForMonth = (events: CalendarEvent[]) =>
  [...events].sort(
    (first, second) =>
      Number(second.isAllDay) - Number(first.isAllDay) ||
      first.startMs - second.startMs,
  );

interface MonthCellProps {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  onOpen: (event: CalendarEvent, anchor: DOMRect) => void;
  onSelectDay: (day: number) => void;
}

const MonthEventChip = ({
  event,
  onOpen,
}: {
  event: CalendarEvent;
  onOpen: MonthCellProps["onOpen"];
}) => (
  <button
    type="button"
    onClick={(click) => {
      click.stopPropagation();
      onOpen(event, click.currentTarget.getBoundingClientRect());
    }}
    className="hover:bg-accent text-caption flex w-full items-center gap-1.5 rounded px-1 text-left"
  >
    <span
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: event.calendarColor ?? "var(--brand)" }}
    />
    {!event.isAllDay && (
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {formatClock(event.startMs)}
      </span>
    )}
    <span className="text-foreground truncate">
      {event.title || "Sem título"}
    </span>
  </button>
);

const MonthCell = ({
  day,
  inMonth,
  isToday,
  events,
  onOpen,
  onSelectDay,
}: MonthCellProps) => {
  const sorted = sortForMonth(events);
  const hidden = sorted.length - VISIBLE_EVENTS;
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-0.5 overflow-hidden border-t border-l p-1",
        !inMonth && "bg-muted/30",
      )}
    >
      <button
        type="button"
        onClick={() => onSelectDay(day)}
        className={cn(
          "text-caption hover:bg-accent flex size-6 items-center justify-center self-end rounded-full tabular-nums",
          isToday
            ? "bg-brand text-brand-foreground hover:bg-brand font-semibold"
            : inMonth
              ? "text-heading"
              : "text-muted-foreground",
        )}
      >
        {new Date(day).getDate()}
      </button>
      {sorted.slice(0, VISIBLE_EVENTS).map((event) => (
        <MonthEventChip key={event.id} event={event} onOpen={onOpen} />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => onSelectDay(day)}
          className="text-caption text-muted-foreground hover:text-foreground px-1 text-left"
        >
          +{hidden} mais
        </button>
      )}
    </div>
  );
};

interface MonthGridProps extends Pick<
  MonthCellProps,
  "onOpen" | "onSelectDay"
> {
  anchorMs: number;
  events: CalendarEvent[];
}

export const MonthGrid = ({
  anchorMs,
  events,
  ...handlers
}: MonthGridProps) => {
  const days = buildMonthGrid(anchorMs);
  const month = new Date(anchorMs).getMonth();
  const now = Date.now();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b">
        {days.slice(0, DAYS_PER_WEEK).map((day) => (
          <span
            key={day}
            className="text-caption text-muted-foreground py-2 text-center"
          >
            {formatWeekday(day)}
          </span>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 border-r border-b">
        {days.map((day) => (
          <MonthCell
            key={day}
            day={day}
            inMonth={new Date(day).getMonth() === month}
            isToday={isSameDay(day, now)}
            events={eventsOnDay(events, day)}
            {...handlers}
          />
        ))}
      </div>
    </div>
  );
};
