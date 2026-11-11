import type { CalendarEvent } from "../domain/calendar.js";

const MINUTE_MS = 60_000;
const SHOW_BEFORE_MS = 15 * MINUTE_MS;
const SHOW_AFTER_START_MS = 10 * MINUTE_MS;
const MAX_TITLE_CHARS = 16;
const FALLBACK_TITLE = "Reunião";

const shortenTitle = (title: string) => {
  const trimmed = title.trim() || FALLBACK_TITLE;
  return trimmed.length > MAX_TITLE_CHARS
    ? `${trimmed.slice(0, MAX_TITLE_CHARS).trimEnd()}…`
    : trimmed;
};

const isCountdownCandidate = (event: CalendarEvent, nowMs: number) =>
  !event.isAllDay &&
  event.startMs - nowMs <= SHOW_BEFORE_MS &&
  nowMs - event.startMs <= SHOW_AFTER_START_MS &&
  event.endMs > nowMs;

export const describeMeetingCountdown = (
  events: CalendarEvent[],
  nowMs: number,
): string | null => {
  const next = events
    .filter((event) => isCountdownCandidate(event, nowMs))
    .sort((first, second) => first.startMs - second.startMs)[0];
  if (!next) return null;
  const untilStart = next.startMs - nowMs;
  const when =
    untilStart <= 0
      ? "agora"
      : `em ${Math.max(1, Math.ceil(untilStart / MINUTE_MS))} min`;
  return `${shortenTitle(next.title)} · ${when}`;
};
