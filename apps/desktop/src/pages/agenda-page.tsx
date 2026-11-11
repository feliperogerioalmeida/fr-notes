import {
  addDays,
  addMonths,
  atMinute,
  buildDays,
  buildMonthGrid,
  type CalendarEvent,
  DAYS_PER_WEEK,
  startOfDay,
  startOfWeek,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header.js";
import {
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
} from "@/features/calendar/calendar-format.js";
import { ConnectCalendar } from "@/features/calendar/connect-calendar.js";
import { EventDayGroups } from "@/features/calendar/event-day-groups.js";
import {
  EventDetails,
  type EventSelection,
} from "@/features/calendar/event-details.js";
import {
  type EditorDraft,
  EventEditorDialog,
} from "@/features/calendar/event-editor-dialog.js";
import { MonthGrid } from "@/features/calendar/month-grid.js";
import { TimeGrid } from "@/features/calendar/time-grid.js";
import {
  useRangeEvents,
  useSaveCalendarEvent,
} from "@/features/calendar/use-calendar-data.js";
import type { TimeRange } from "@/features/calendar/use-grid-interactions.js";
import { useNotesQuery } from "@/features/notes/use-notes.js";
import { usePermissions } from "@/features/settings/use-settings.js";
import { describeError } from "@/lib/errors.js";

type CalendarView = "day" | "week" | "month" | "list";

const VIEW_LABELS: Record<CalendarView, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  list: "Lista",
};
const VIEW_STORAGE_KEY = "fr-notes:calendar-view";
const NEW_EVENT_DURATION_MINUTES = 30;

const isCalendarView = (value: string): value is CalendarView =>
  value in VIEW_LABELS;

const readView = (): CalendarView => {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY) ?? "";
    return isCalendarView(stored) ? stored : "week";
  } catch {
    return "week";
  }
};

const rangeFor = (view: CalendarView, anchorMs: number) => {
  if (view === "day") {
    const day = startOfDay(anchorMs);
    return { fromMs: day, toMs: addDays(day, 1), days: [day] };
  }
  if (view === "month") {
    const grid = buildMonthGrid(anchorMs);
    return {
      fromMs: grid[0] ?? anchorMs,
      toMs: addDays(grid.at(-1) ?? anchorMs, 1),
      days: grid,
    };
  }
  const first = startOfWeek(anchorMs);
  return {
    fromMs: first,
    toMs: addDays(first, DAYS_PER_WEEK),
    days: buildDays(first, DAYS_PER_WEEK),
  };
};

const stepFor = (view: CalendarView, anchorMs: number, direction: number) => {
  if (view === "month") return addMonths(anchorMs, direction);
  return addDays(anchorMs, direction * (view === "day" ? 1 : DAYS_PER_WEEK));
};

const titleFor = (view: CalendarView, anchorMs: number, days: number[]) => {
  if (view === "month") return formatMonthTitle(anchorMs);
  if (view === "day") return formatDayTitle(anchorMs);
  return formatWeekTitle(days[0] ?? anchorMs);
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const useCalendarShortcuts = (
  onToday: () => void,
  onStep: (direction: number) => void,
) => {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey) return;
      if (event.key.toLowerCase() === "t") onToday();
      if (event.key === "ArrowLeft") onStep(-1);
      if (event.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onToday, onStep]);
};

interface ToolbarProps {
  view: CalendarView;
  title: string;
  onView: (view: CalendarView) => void;
  onToday: () => void;
  onStep: (direction: number) => void;
  onNew: () => void;
}

const CalendarToolbar = ({
  view,
  title,
  onView,
  onToday,
  onStep,
  onNew,
}: ToolbarProps) => (
  <div className="flex flex-wrap items-center gap-3 px-8 pb-4">
    <Button size="sm" variant="secondary" onClick={onToday}>
      Hoje
    </Button>
    <div className="flex items-center">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Anterior"
        onClick={() => onStep(-1)}
      >
        <ChevronLeft />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Próximo"
        onClick={() => onStep(1)}
      >
        <ChevronRight />
      </Button>
    </div>
    <h1 className="text-title-3 text-heading mr-auto">{title}</h1>
    <Tabs
      value={view}
      onValueChange={(value) => isCalendarView(value) && onView(value)}
    >
      <TabsList className="h-8">
        {(Object.keys(VIEW_LABELS) as CalendarView[]).map((option) => (
          <TabsTrigger key={option} value={option} className="text-caption">
            {VIEW_LABELS[option]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
    <Button size="sm" onClick={onNew}>
      <Plus />
      Novo evento
    </Button>
  </div>
);

const useCalendarState = () => {
  const [view, setView] = useState<CalendarView>(readView);
  const [anchorMs, setAnchorMs] = useState(() => Date.now());
  const changeView = (next: CalendarView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      return;
    }
  };
  return { view, anchorMs, setAnchorMs, changeView };
};

const useMoveEvent = () => {
  const save = useSaveCalendarEvent();
  return (event: CalendarEvent, range: TimeRange) =>
    save.mutate(
      {
        id: event.id,
        calendarId: event.calendarId,
        title: event.title,
        startMs: range.startMs,
        endMs: range.endMs,
        isAllDay: event.isAllDay,
        location: null,
        notes: null,
      },
      { onError: (error) => toast.error(describeError(error)) },
    );
};

const CalendarBody = ({
  view,
  anchorMs,
  onSelectDay,
}: {
  view: CalendarView;
  anchorMs: number;
  onSelectDay: (day: number) => void;
}) => {
  const range = rangeFor(view, anchorMs);
  const { data: events = [] } = useRangeEvents(range.fromMs, range.toMs);
  const { data: notes = [] } = useNotesQuery();
  const notesByEvent = new Map(
    notes.map((note) => [note.calendarEventId, note]),
  );
  const [selection, setSelection] = useState<EventSelection | null>(null);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const moveEvent = useMoveEvent();
  const open = (event: CalendarEvent, anchor: DOMRect) =>
    setSelection({ event, anchor });
  const create = (created: TimeRange & { isAllDay: boolean }) =>
    setDraft({ event: null, ...created });
  const grid =
    view === "month" ? (
      <MonthGrid
        anchorMs={anchorMs}
        events={events}
        onOpen={open}
        onSelectDay={onSelectDay}
        onCreate={create}
      />
    ) : view === "list" ? (
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <EventDayGroups events={events} notes={notes} nowMs={Date.now()} />
        </div>
      </ScrollArea>
    ) : (
      <TimeGrid
        days={range.days}
        events={events}
        notesByEvent={notesByEvent}
        onCreate={create}
        onMove={moveEvent}
        onOpen={open}
      />
    );
  return (
    <>
      {grid}
      <EventDetails
        selection={selection}
        notesByEvent={notesByEvent}
        onClose={() => setSelection(null)}
        onEdit={(event) =>
          setDraft({
            event,
            startMs: event.startMs,
            endMs: event.endMs,
            isAllDay: event.isAllDay,
          })
        }
      />
      {draft && (
        <EventEditorDialog
          key={`${draft.event?.id ?? "new"}-${draft.startMs}`}
          draft={draft}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  );
};

const nextHalfHour = () => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return atMinute(
    startOfDay(now.getTime()),
    Math.ceil(minutes / NEW_EVENT_DURATION_MINUTES) *
      NEW_EVENT_DURATION_MINUTES,
  );
};

export const AgendaPage = () => {
  const granted = usePermissions().data?.calendar === "granted";
  const { view, anchorMs, setAnchorMs, changeView } = useCalendarState();
  const [newDraft, setNewDraft] = useState<EditorDraft | null>(null);
  const step = (direction: number) =>
    setAnchorMs((current) => stepFor(view, current, direction));
  const today = () => setAnchorMs(Date.now());
  useCalendarShortcuts(today, step);
  const openNew = () => {
    const startMs = nextHalfHour();
    setNewDraft({
      event: null,
      startMs,
      endMs: startMs + NEW_EVENT_DURATION_MINUTES * 60_000,
      isAllDay: false,
    });
  };
  const days = rangeFor(view, anchorMs).days;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <CalendarToolbar
        view={view}
        title={titleFor(view, anchorMs, days)}
        onView={changeView}
        onToday={today}
        onStep={step}
        onNew={openNew}
      />
      <div className="bg-card mx-8 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
        {granted ? (
          <CalendarBody
            view={view}
            anchorMs={anchorMs}
            onSelectDay={(day) => {
              setAnchorMs(day);
              changeView("day");
            }}
          />
        ) : (
          <div className="p-8">
            <ConnectCalendar />
          </div>
        )}
      </div>
      {newDraft && (
        <EventEditorDialog draft={newDraft} onClose={() => setNewDraft(null)} />
      )}
    </div>
  );
};
