import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "../domain/calendar.js";
import { describeMeetingCountdown } from "./meeting-countdown.js";

const NOW = Date.UTC(2026, 10, 11, 12, 59, 0);
const MINUTE = 60_000;

const event = (
  title: string,
  startOffsetMin: number,
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent => ({
  id: title,
  title,
  startMs: NOW + startOffsetMin * MINUTE,
  endMs: NOW + (startOffsetMin + 60) * MINUTE,
  isAllDay: false,
  location: null,
  notes: null,
  url: null,
  calendarId: "c",
  calendarTitle: "Trabalho",
  calendarColor: "#FF6B1A",
  attendees: [],
  organizer: null,
  ...overrides,
});

describe("describeMeetingCountdown", () => {
  it("counts down to the next meeting within 15 minutes", () => {
    expect(describeMeetingCountdown([event("Kickoff", 1)], NOW)).toBe(
      "Kickoff · em 1 min",
    );
    expect(describeMeetingCountdown([event("Kickoff", 14.2)], NOW)).toBe(
      "Kickoff · em 15 min",
    );
  });

  it("shortens long titles and says agora once it started", () => {
    expect(
      describeMeetingCountdown(
        [event("Ingenious Brazil - Marketing", -2)],
        NOW,
      ),
    ).toBe("Ingenious Brazil… · agora");
  });

  it("ignores far, all-day and long-started meetings", () => {
    expect(
      describeMeetingCountdown(
        [
          event("Depois", 30),
          event("Feriado", 1, { isAllDay: true }),
          event("Antiga", -20),
        ],
        NOW,
      ),
    ).toBeNull();
  });
});
