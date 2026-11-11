import {
  type CalendarEvent,
  describeMeetingApps,
  describeMeetingProvider,
  extractMeetingLink,
  findCurrentEvent,
  type MeetingApp,
} from "@workspace/core";

import type { NubPrompt } from "@/lib/native.js";

import type { MeetingPrompt } from "./meeting-store.js";

const REMINDER_LEAD_MS = 60_000;
const REMINDER_LATE_MS = 5 * 60_000;

export const buildAppPrompt = (
  apps: MeetingApp[],
  events: CalendarEvent[],
): MeetingPrompt => {
  const event = findCurrentEvent({ events, nowMs: Date.now() });
  return {
    key: `app:${apps.map((app) => app.bundleId).join(",")}`,
    title: event?.title || "Reunião detectada",
    subtitle: `${describeMeetingApps(apps)} está usando o microfone`,
    event,
    fromApp: true,
    joinUrl: null,
  };
};

export const findUpcomingEvent = (
  events: CalendarEvent[],
  nowMs: number,
): CalendarEvent | null =>
  events
    .filter(
      (event) =>
        !event.isAllDay &&
        nowMs >= event.startMs - REMINDER_LEAD_MS &&
        nowMs <= event.startMs + REMINDER_LATE_MS,
    )
    .sort((first, second) => first.startMs - second.startMs)[0] ?? null;

export const buildReminderPrompt = (event: CalendarEvent): MeetingPrompt => ({
  key: `event:${event.id}`,
  title: event.title || "Reunião",
  subtitle: "",
  event,
  fromApp: false,
  joinUrl: extractMeetingLink(event),
});

export const toNubPrompt = (prompt: MeetingPrompt): NubPrompt => ({
  title: prompt.title,
  subtitle: prompt.subtitle,
  startsAtMs: prompt.event?.startMs ?? null,
  endsAtMs: prompt.event?.endMs ?? null,
  accentColor: prompt.event?.calendarColor ?? null,
  joinUrl: prompt.joinUrl,
  provider: prompt.joinUrl ? describeMeetingProvider(prompt.joinUrl) : null,
});
