import {
  type CalendarEvent,
  extractMeetingLink,
  type PositionedEvent,
} from "@workspace/core";
import { FileText, Video } from "lucide-react";
import type { CSSProperties } from "react";

import { formatClock } from "./calendar-format.js";
import { HOUR_HEIGHT } from "./calendar-layout.js";

const MINUTES_PER_HOUR = 60;
const BLOCK_GAP_PX = 2;
const MIN_BLOCK_HEIGHT = 16;
const SHOW_TIME_MIN_HEIGHT = 34;
const FALLBACK_COLOR = "var(--brand)";

export const eventColorStyle = (event: CalendarEvent): CSSProperties => {
  const color = event.calendarColor ?? FALLBACK_COLOR;
  return {
    backgroundColor: `color-mix(in srgb, ${color} 22%, var(--card))`,
    borderLeftColor: color,
  };
};

const positionStyle = (positioned: PositionedEvent): CSSProperties => {
  const width = 100 / positioned.columns;
  return {
    top: (positioned.startMinute / MINUTES_PER_HOUR) * HOUR_HEIGHT,
    height: Math.max(
      ((positioned.endMinute - positioned.startMinute) / MINUTES_PER_HOUR) *
        HOUR_HEIGHT -
        BLOCK_GAP_PX,
      MIN_BLOCK_HEIGHT,
    ),
    left: `calc(${positioned.column * width}% + 1px)`,
    width: `calc(${width}% - 3px)`,
  };
};

interface EventBlockProps {
  positioned: PositionedEvent;
  hasNote: boolean;
  onOpen: (event: CalendarEvent, anchor: DOMRect) => void;
}

export const EventBlock = ({
  positioned,
  hasNote,
  onOpen,
}: EventBlockProps) => {
  const { event } = positioned;
  const style = positionStyle(positioned);
  const showTime = Number(style.height) >= SHOW_TIME_MIN_HEIGHT;
  return (
    <button
      type="button"
      onClick={(click) =>
        onOpen(event, click.currentTarget.getBoundingClientRect())
      }
      style={{ ...style, ...eventColorStyle(event) }}
      className="text-caption hover:ring-border-strong absolute flex flex-col overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left shadow-xs hover:ring-1"
    >
      <span className="text-heading flex w-full items-center gap-1 font-medium">
        <span className="truncate">{event.title || "Sem título"}</span>
        {hasNote && (
          <FileText className="text-muted-foreground size-3 shrink-0" />
        )}
        {extractMeetingLink(event) && (
          <Video className="text-muted-foreground size-3 shrink-0" />
        )}
      </span>
      {showTime && (
        <span className="text-muted-foreground truncate tabular-nums">
          {formatClock(event.startMs)} – {formatClock(event.endMs)}
        </span>
      )}
    </button>
  );
};
