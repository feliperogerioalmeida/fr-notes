import {
  addDays,
  atMinute,
  type CalendarEvent,
  eventsOnDay,
  isSameDay,
  layoutDayEvents,
  minutesIntoDay,
  type Note,
} from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { formatClock, formatHour, formatWeekday } from "./calendar-format.js";
import { EventBlock, eventColorStyle } from "./event-block.js";
import {
  GUTTER_WIDTH,
  HOUR_HEIGHT,
  type TimeRange,
  useGridInteractions,
} from "./use-grid-interactions.js";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const INITIAL_SCROLL_HOUR = 7;
const NOW_TICK_MS = 60_000;
const MINUTES_PER_HOUR = 60;

const columnsTemplate = (count: number): CSSProperties => ({
  gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${count}, minmax(0, 1fr))`,
});

const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
};

const DayHeader = ({ days, now }: { days: number[]; now: number }) => (
  <div className="grid border-b" style={columnsTemplate(days.length)}>
    <span />
    {days.map((day) => {
      const today = isSameDay(day, now);
      return (
        <div
          key={day}
          className="flex items-center justify-center gap-1.5 border-l py-2"
        >
          <span className="text-caption text-muted-foreground">
            {formatWeekday(day)}
          </span>
          <span
            className={cn(
              "text-body-sm flex size-6 items-center justify-center rounded-full font-semibold tabular-nums",
              today ? "bg-brand text-brand-foreground" : "text-heading",
            )}
          >
            {new Date(day).getDate()}
          </span>
        </div>
      );
    })}
  </div>
);

interface AllDayRowProps {
  days: number[];
  events: CalendarEvent[];
  onOpen: (event: CalendarEvent, anchor: DOMRect) => void;
  onCreate: (range: TimeRange & { isAllDay: boolean }) => void;
}

const AllDayRow = ({ days, events, onOpen, onCreate }: AllDayRowProps) => {
  const allDay = events.filter((event) => event.isAllDay);
  return (
    <div className="grid border-b" style={columnsTemplate(days.length)}>
      <span className="text-muted-foreground self-center pr-2 text-right text-[0.65rem] whitespace-nowrap">
        dia todo
      </span>
      {days.map((day) => (
        <div
          key={day}
          onDoubleClick={() =>
            onCreate({ startMs: day, endMs: addDays(day, 1), isAllDay: true })
          }
          className="flex min-h-7 flex-col gap-0.5 border-l p-0.5"
        >
          {eventsOnDay(allDay, day).map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={(click) =>
                onOpen(event, click.currentTarget.getBoundingClientRect())
              }
              style={eventColorStyle(event)}
              className="text-caption text-heading truncate rounded border-l-[3px] px-1.5 py-0.5 text-left font-medium"
            >
              {event.title || "Sem título"}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

const HourGutter = () => (
  <div className="relative">
    {HOURS.slice(1).map((hour) => (
      <span
        key={hour}
        className="text-caption text-muted-foreground absolute right-2 -translate-y-1/2 tabular-nums"
        style={{ top: hour * HOUR_HEIGHT }}
      >
        {formatHour(hour)}
      </span>
    ))}
  </div>
);

const NowLine = ({ day, now }: { day: number; now: number }) => (
  <div
    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
    style={{ top: (minutesIntoDay(now, day) / MINUTES_PER_HOUR) * HOUR_HEIGHT }}
  >
    <span className="bg-brand -ml-1 size-2 rounded-full" />
    <span className="bg-brand h-px flex-1" />
  </div>
);

interface DraftBlockProps {
  day: number;
  startMinute: number;
  endMinute: number;
}

const DraftBlock = ({ day, startMinute, endMinute }: DraftBlockProps) => (
  <div
    className="border-brand bg-brand-subtle text-caption text-heading pointer-events-none absolute inset-x-0.5 rounded-md border px-1.5 py-0.5"
    style={{
      top: (startMinute / MINUTES_PER_HOUR) * HOUR_HEIGHT,
      height: ((endMinute - startMinute) / MINUTES_PER_HOUR) * HOUR_HEIGHT - 2,
    }}
  >
    Novo evento · {formatClock(atMinute(day, startMinute))} –{" "}
    {formatClock(atMinute(day, endMinute))}
  </div>
);

export interface TimeGridProps {
  days: number[];
  events: CalendarEvent[];
  notesByEvent: Map<string | null, Note>;
  onCreate: (range: TimeRange & { isAllDay: boolean }) => void;
  onMove: (event: CalendarEvent, range: TimeRange) => void;
  onOpen: (event: CalendarEvent, anchor: DOMRect) => void;
}

const useInitialScroll = (
  scrollRef: React.RefObject<HTMLDivElement | null>,
  days: number[],
  now: number,
) => {
  const firstDay = days[0];
  useEffect(() => {
    const showsToday = days.some((day) => isSameDay(day, now));
    const hour = showsToday
      ? Math.max(0, new Date(now).getHours() - 1)
      : INITIAL_SCROLL_HOUR;
    scrollRef.current?.scrollTo({
      top: Math.min(hour, INITIAL_SCROLL_HOUR + 6) * HOUR_HEIGHT,
    });
  }, [firstDay, days.length]);
};

export const TimeGrid = ({
  days,
  events,
  notesByEvent,
  onCreate,
  onMove,
  onOpen,
}: TimeGridProps) => {
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useInitialScroll(scrollRef, days, now);
  const { createDraft, override, beginEventGesture, gridHandlers } =
    useGridInteractions({
      gridRef,
      days,
      onCreate: (range) => onCreate({ ...range, isAllDay: false }),
      onMove,
      onOpen,
    });
  const displayed = override
    ? events.map((event) =>
        event.id === override.id ? { ...event, ...override } : event,
      )
    : events;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DayHeader days={days} now={now} />
      <AllDayRow
        days={days}
        events={displayed}
        onOpen={onOpen}
        onCreate={onCreate}
      />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          ref={gridRef}
          {...gridHandlers}
          className="relative grid touch-none select-none"
          style={{
            ...columnsTemplate(days.length),
            height: HOURS.length * HOUR_HEIGHT,
          }}
        >
          <HourGutter />
          {days.map((day, index) => (
            <div key={day} className="relative border-l">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-border/60 border-t"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}
              {layoutDayEvents(displayed, day).map((positioned) => (
                <EventBlock
                  key={positioned.event.id}
                  positioned={positioned}
                  hasNote={notesByEvent.has(positioned.event.id)}
                  dragging={override?.id === positioned.event.id}
                  onPointerDown={beginEventGesture}
                />
              ))}
              {createDraft?.dayIndex === index && (
                <DraftBlock day={day} {...createDraft} />
              )}
              {isSameDay(day, now) && <NowLine day={day} now={now} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
