import { addDays } from "@workspace/core";

const LOCALE = "pt-BR";

const format = (ms: number, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, options).format(new Date(ms));

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const formatMonthTitle = (ms: number) =>
  capitalize(format(ms, { month: "long", year: "numeric" }));

export const formatDayTitle = (ms: number) =>
  capitalize(format(ms, { weekday: "long", day: "numeric", month: "long" }));

export const formatWeekTitle = (firstDayMs: number) => {
  const lastDayMs = addDays(firstDayMs, 6);
  const sameMonth =
    new Date(firstDayMs).getMonth() === new Date(lastDayMs).getMonth();
  const start = format(
    firstDayMs,
    sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" },
  );
  const end = format(lastDayMs, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${start} – ${end}`;
};

export const formatWeekday = (ms: number) =>
  capitalize(format(ms, { weekday: "short" }).replace(".", ""));

export const formatHour = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00`;

export const formatClock = (ms: number) =>
  format(ms, { hour: "2-digit", minute: "2-digit" });

export const formatEventWhen = (
  startMs: number,
  endMs: number,
  isAllDay: boolean,
) => {
  const day = capitalize(
    format(startMs, { weekday: "long", day: "numeric", month: "short" }),
  );
  if (isAllDay) return `${day} · dia inteiro`;
  return `${day} · ${formatClock(startMs)} – ${formatClock(endMs)}`;
};
