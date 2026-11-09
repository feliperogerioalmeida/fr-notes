import {
  type CalendarEvent,
  describeMeetingApps,
  findCurrentEvent,
  type MeetingApp,
} from "@workspace/core";

import type { MeetingPrompt } from "./meeting-store.js";

const REMINDER_WINDOW_MS = 60_000;

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
  };
};

export const findStartingEvent = (
  events: CalendarEvent[],
  nowMs: number,
): CalendarEvent | null =>
  events.find(
    (event) =>
      !event.isAllDay && Math.abs(event.startMs - nowMs) <= REMINDER_WINDOW_MS,
  ) ?? null;

export const buildReminderPrompt = (event: CalendarEvent): MeetingPrompt => ({
  key: `event:${event.id}`,
  title: event.title || "Reunião",
  subtitle: "Começando agora",
  event,
  fromApp: false,
});
