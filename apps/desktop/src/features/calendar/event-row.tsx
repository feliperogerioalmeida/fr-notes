import { openUrl } from "@tauri-apps/plugin-opener";
import {
  type CalendarEvent,
  describeMeetingProvider,
  extractMeetingLink,
  formatTime,
  type Note,
  toParticipants,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import { Mic, Users, Video } from "lucide-react";
import { useNavigate } from "react-router";

import { useStartNote } from "@/features/notes/use-start-note.js";

const LIVE_LEAD_MS = 5 * 60_000;

type EventTiming = "past" | "live" | "upcoming";

const ACTION_LABELS: Record<EventTiming, string> = {
  past: "Criar nota",
  live: "Gravar agora",
  upcoming: "Preparar notas",
};

const classifyTiming = (event: CalendarEvent, nowMs: number): EventTiming => {
  if (event.endMs < nowMs) return "past";
  if (event.startMs - LIVE_LEAD_MS <= nowMs) return "live";
  return "upcoming";
};

const toIso = (ms: number) => new Date(ms).toISOString();

const MeetingLinkButton = ({ link }: { link: string }) => (
  <Button
    size="xs"
    variant="ghost"
    className="text-muted-foreground"
    onClick={() => void openUrl(link)}
  >
    <Video />
    {describeMeetingProvider(link)}
  </Button>
);

interface EventRowProps {
  event: CalendarEvent;
  note: Note | undefined;
  nowMs: number;
}

const EventAction = ({ event, note, nowMs }: EventRowProps) => {
  const startNote = useStartNote();
  const navigate = useNavigate();
  const timing = classifyTiming(event, nowMs);
  if (note) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => navigate(`/notes/${note.id}`)}
      >
        Abrir nota
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="secondary"
      className="[&_svg]:text-brand"
      onClick={() => void startNote({ event, record: timing === "live" })}
    >
      {timing === "live" && <Mic />}
      {ACTION_LABELS[timing]}
    </Button>
  );
};

export const EventRow = ({ event, note, nowMs }: EventRowProps) => {
  const link = extractMeetingLink(event);
  const participants = toParticipants(event).length;
  const isPast = classifyTiming(event, nowMs) === "past";
  return (
    <div
      className={cn(
        "hover:bg-accent ease-brand flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150",
        isPast && "opacity-60 hover:opacity-100",
      )}
    >
      <span
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: event.calendarColor ?? undefined }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-sm text-heading truncate font-medium">
          {event.title || "Sem título"}
        </span>
        <span className="text-caption text-muted-foreground flex items-center gap-2">
          {event.isAllDay
            ? "Dia inteiro"
            : `${formatTime(toIso(event.startMs))} – ${formatTime(toIso(event.endMs))}`}
          <span className="truncate">· {event.calendarTitle}</span>
          {participants > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" />
              {participants}
            </span>
          )}
        </span>
      </div>
      {link && !isPast && <MeetingLinkButton link={link} />}
      {!event.isAllDay && (
        <EventAction event={event} note={note} nowMs={nowMs} />
      )}
    </div>
  );
};

export const EventCompactRow = ({ event, note, nowMs }: EventRowProps) => {
  const link = extractMeetingLink(event);
  const live = classifyTiming(event, nowMs) === "live";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-7 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: event.calendarColor ?? undefined }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm text-heading truncate font-medium">
            {event.title || "Sem título"}
          </span>
          <span className="text-caption text-muted-foreground truncate">
            {live ? "Agora · " : ""}
            {formatTime(toIso(event.startMs))} –{" "}
            {formatTime(toIso(event.endMs))} · {event.calendarTitle}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 pl-4">
        {link && <MeetingLinkButton link={link} />}
        <EventAction event={event} note={note} nowMs={nowMs} />
      </div>
    </div>
  );
};
