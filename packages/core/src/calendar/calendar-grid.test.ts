import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "../domain/calendar.js";
import {
  buildMonthGrid,
  eventsOnDay,
  layoutDayEvents,
  startOfWeek,
} from "./calendar-grid.js";

const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

const event = (
  id: string,
  start: number,
  end: number,
  isAllDay = false,
): CalendarEvent => ({
  id,
  title: id,
  startMs: start,
  endMs: end,
  isAllDay,
  location: null,
  notes: null,
  url: null,
  calendarId: "c",
  calendarTitle: "Trabalho",
  calendarColor: "#FF6B1A",
  attendees: [],
  organizer: null,
});

describe("calendar grid", () => {
  it("starts weeks on sunday and builds a six week month grid", () => {
    expect(new Date(startOfWeek(at(11, 15))).getDate()).toBe(8);
    const grid = buildMonthGrid(at(11, 12));
    expect(grid).toHaveLength(42);
    expect(new Date(grid[0] as number).getDate()).toBe(1);
    expect(new Date(grid[41] as number).getDate()).toBe(12);
  });

  it("finds events that touch a day, including multi-day ones", () => {
    const events = [
      event("ontem", at(10, 9), at(10, 10)),
      event("noite", at(10, 23), at(11, 1)),
      event("feriado", at(11, 0), at(12, 0), true),
    ];
    expect(eventsOnDay(events, at(11, 12)).map((item) => item.id)).toEqual([
      "noite",
      "feriado",
    ]);
  });

  it("puts overlapping meetings side by side and keeps separate ones full width", () => {
    const positioned = layoutDayEvents(
      [
        event("a", at(11, 9), at(11, 10)),
        event("b", at(11, 9, 30), at(11, 11)),
        event("c", at(11, 10), at(11, 10, 30)),
        event("d", at(11, 14), at(11, 15)),
        event("dia", at(11, 0), at(12, 0), true),
      ],
      at(11, 0),
    );
    expect(
      positioned.map(({ event: item, column, columns, startMinute }) => [
        item.id,
        column,
        columns,
        startMinute,
      ]),
    ).toEqual([
      ["a", 0, 2, 540],
      ["b", 1, 2, 570],
      ["c", 0, 2, 600],
      ["d", 0, 1, 840],
    ]);
  });

  it("clips events that start before the day", () => {
    const [positioned] = layoutDayEvents(
      [event("noite", at(10, 23), at(11, 1))],
      at(11, 0),
    );
    expect(positioned?.startMinute).toBe(0);
    expect(positioned?.endMinute).toBe(60);
  });
});
