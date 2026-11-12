import type { MeetingApp } from "./meeting-apps.js";

export const MEETING_END_GRACE_MS = 15_000;
export const MEETING_END_COUNTDOWN_MS = 10_000;

export const bindMeetingApps = (
  bound: readonly string[],
  active: readonly MeetingApp[],
): string[] => [...new Set([...bound, ...active.map((app) => app.bundleId)])];

export const isBoundMeetingActive = (
  bound: readonly string[],
  active: readonly MeetingApp[],
): boolean => active.some((app) => bound.includes(app.bundleId));

export const hasMeetingEnded = (
  bound: readonly string[],
  active: readonly MeetingApp[],
): boolean => bound.length > 0 && !isBoundMeetingActive(bound, active);
