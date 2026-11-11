import { describe, expect, it } from "vitest";

import {
  type CalendarEvent,
  describeMeetingProvider,
  extractMeetingLink,
  filterVisibleEvents,
  findCurrentEvent,
  toParticipants,
} from "./calendar.js";

const NOW = Date.UTC(2026, 10, 9, 13, 0);
const MINUTE = 60_000;

const buildEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "event-1",
  title: "Descoberta com cliente",
  startMs: NOW,
  endMs: NOW + 30 * MINUTE,
  isAllDay: false,
  location: null,
  notes: null,
  url: null,
  calendarId: "calendar-work",
  calendarTitle: "Trabalho",
  calendarColor: "#FF6B1A",
  attendees: [],
  organizer: null,
  canEdit: false,
  isRecurring: false,
  ...overrides,
});

describe("extractMeetingLink", () => {
  it("finds a Google Meet link in the notes", () => {
    const event = buildEvent({
      notes: "Entrar: https://meet.google.com/abc-defg-hij\nAté lá",
    });
    const link = extractMeetingLink(event);

    expect(link).toBe("https://meet.google.com/abc-defg-hij");
    expect(describeMeetingProvider(link ?? "")).toBe("Google Meet");
  });

  it("finds a Zoom link in the location", () => {
    const event = buildEvent({
      location: "https://us02web.zoom.us/j/123456?pwd=x",
    });

    expect(extractMeetingLink(event)).toBe(
      "https://us02web.zoom.us/j/123456?pwd=x",
    );
  });

  it("returns null without a meeting link", () => {
    expect(extractMeetingLink(buildEvent({ location: "Sala 3" }))).toBeNull();
  });
});

describe("toParticipants", () => {
  it("drops the current user and duplicates", () => {
    const participants = toParticipants(
      buildEvent({
        organizer: {
          name: "Marina",
          email: "marina@cliente.com",
          isCurrentUser: false,
        },
        attendees: [
          { name: "Marina", email: "marina@cliente.com", isCurrentUser: false },
          { name: "Felipe", email: "felipe@fr.dev", isCurrentUser: true },
          { name: null, email: "joao@cliente.com", isCurrentUser: false },
        ],
      }),
    );

    expect(participants).toEqual([
      { name: "Marina", email: "marina@cliente.com" },
      { name: null, email: "joao@cliente.com" },
    ]);
  });
});

describe("filterVisibleEvents", () => {
  it("drops events from hidden calendars", () => {
    const events = [
      buildEvent({ id: "work" }),
      buildEvent({ id: "holiday", calendarId: "calendar-holidays" }),
    ];

    expect(
      filterVisibleEvents({
        events,
        hiddenCalendarIds: ["calendar-holidays"],
      }).map((event) => event.id),
    ).toEqual(["work"]);
  });
});

describe("findCurrentEvent", () => {
  it("matches an event starting in the next minutes", () => {
    const upcoming = buildEvent({ startMs: NOW + 3 * MINUTE });

    expect(findCurrentEvent({ events: [upcoming], nowMs: NOW })?.id).toBe(
      "event-1",
    );
  });

  it("ignores all-day and finished events", () => {
    const events = [
      buildEvent({ id: "all-day", isAllDay: true }),
      buildEvent({
        id: "past",
        startMs: NOW - 90 * MINUTE,
        endMs: NOW - MINUTE,
      }),
    ];

    expect(findCurrentEvent({ events, nowMs: NOW })).toBeNull();
  });
});
