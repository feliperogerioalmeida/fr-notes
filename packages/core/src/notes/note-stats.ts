import type { Note } from "../domain/note.js";

const DAYS_IN_WEEK = 7;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

export interface WeekSummary {
  notesCount: number;
  recordedMs: number;
  enhancedCount: number;
}

const startOfWeek = (now: Date): Date => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
};

const recordedDuration = (note: Note): number => {
  if (!note.recordingStartedAt || !note.recordingEndedAt) return 0;
  const duration =
    new Date(note.recordingEndedAt).getTime() -
    new Date(note.recordingStartedAt).getTime();
  return Math.max(0, duration);
};

const noteDate = (note: Note): number =>
  new Date(note.recordingStartedAt ?? note.createdAt).getTime();

export const summarizeWeek = (
  notes: Note[],
  now: Date = new Date(),
): WeekSummary => {
  const weekStart = startOfWeek(now).getTime();
  const thisWeek = notes.filter((note) => noteDate(note) >= weekStart);
  return {
    notesCount: thisWeek.length,
    recordedMs: thisWeek.reduce(
      (total, note) => total + recordedDuration(note),
      0,
    ),
    enhancedCount: thisWeek.filter((note) => Boolean(note.enhancedMarkdown))
      .length,
  };
};

export const formatDuration = (ms: number): string => {
  const totalMinutes = Math.round(ms / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
};
