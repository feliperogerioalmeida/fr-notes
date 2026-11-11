import type { CalendarEvent } from "../domain/calendar.js";

export const MINUTES_PER_DAY = 24 * 60;
export const DAYS_PER_WEEK = 7;
const MS_PER_MINUTE = 60_000;
const MONTH_GRID_WEEKS = 6;
const DEFAULT_SNAP_MINUTES = 15;

export const startOfDay = (ms: number): number => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const addDays = (ms: number, days: number): number => {
  const date = new Date(ms);
  date.setDate(date.getDate() + days);
  return date.getTime();
};

export const addMonths = (ms: number, months: number): number => {
  const date = new Date(ms);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
};

export const startOfWeek = (ms: number, weekStartsOn = 0): number => {
  const day = startOfDay(ms);
  const offset =
    (new Date(day).getDay() - weekStartsOn + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return addDays(day, -offset);
};

export const buildDays = (firstDayMs: number, count: number): number[] =>
  Array.from({ length: count }, (_, index) =>
    addDays(startOfDay(firstDayMs), index),
  );

export const buildMonthGrid = (
  anchorMs: number,
  weekStartsOn = 0,
): number[] => {
  const first = new Date(anchorMs);
  first.setDate(1);
  return buildDays(
    startOfWeek(first.getTime(), weekStartsOn),
    MONTH_GRID_WEEKS * DAYS_PER_WEEK,
  );
};

export const isSameDay = (first: number, second: number): boolean =>
  startOfDay(first) === startOfDay(second);

export const eventsOnDay = (
  events: CalendarEvent[],
  dayMs: number,
): CalendarEvent[] => {
  const dayStart = startOfDay(dayMs);
  const dayEnd = addDays(dayStart, 1);
  return events.filter(
    (event) => event.startMs < dayEnd && event.endMs > dayStart,
  );
};

export const snapMinutes = (
  minutes: number,
  step = DEFAULT_SNAP_MINUTES,
): number => Math.round(minutes / step) * step;

export const minutesIntoDay = (ms: number, dayStartMs: number): number =>
  Math.round((ms - dayStartMs) / MS_PER_MINUTE);

export const atMinute = (dayStartMs: number, minutes: number): number => {
  const date = new Date(dayStartMs);
  date.setMinutes(minutes);
  return date.getTime();
};

export interface PositionedEvent {
  event: CalendarEvent;
  startMinute: number;
  endMinute: number;
  column: number;
  columns: number;
}

interface Slot {
  event: CalendarEvent;
  startMinute: number;
  endMinute: number;
}

const MIN_BLOCK_MINUTES = 15;

const toSlots = (events: CalendarEvent[], dayStartMs: number): Slot[] =>
  events
    .filter((event) => !event.isAllDay)
    .map((event) => {
      const startMinute = Math.max(
        0,
        minutesIntoDay(event.startMs, dayStartMs),
      );
      const endMinute = Math.min(
        MINUTES_PER_DAY,
        minutesIntoDay(event.endMs, dayStartMs),
      );
      return {
        event,
        startMinute,
        endMinute: Math.max(endMinute, startMinute + MIN_BLOCK_MINUTES),
      };
    })
    .filter((slot) => slot.startMinute < MINUTES_PER_DAY && slot.endMinute > 0)
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

const placeCluster = (cluster: Slot[]): PositionedEvent[] => {
  const columnEnds: number[] = [];
  const placed = cluster.map((slot) => {
    const free = columnEnds.findIndex((end) => end <= slot.startMinute);
    const column = free === -1 ? columnEnds.length : free;
    columnEnds[column] = slot.endMinute;
    return { ...slot, column };
  });
  return placed.map((slot) => ({ ...slot, columns: columnEnds.length }));
};

export const layoutDayEvents = (
  events: CalendarEvent[],
  dayStartMs: number,
): PositionedEvent[] => {
  const clusters: Slot[][] = [];
  let clusterEnd = -1;
  for (const slot of toSlots(eventsOnDay(events, dayStartMs), dayStartMs)) {
    if (slot.startMinute >= clusterEnd) clusters.push([]);
    clusters[clusters.length - 1]?.push(slot);
    clusterEnd = Math.max(clusterEnd, slot.endMinute);
  }
  return clusters.flatMap(placeCluster);
};
