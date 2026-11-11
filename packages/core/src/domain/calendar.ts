import { z } from "zod";

export const CalendarAttendeeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  isCurrentUser: z.boolean().default(false),
});

export type CalendarAttendee = z.infer<typeof CalendarAttendeeSchema>;

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  isAllDay: z.boolean(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  url: z.string().nullable(),
  calendarId: z.string(),
  calendarTitle: z.string(),
  calendarColor: z.string().nullable(),
  attendees: z.array(CalendarAttendeeSchema),
  organizer: CalendarAttendeeSchema.nullable(),
  canEdit: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CalendarInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string().nullable(),
  source: z.string(),
  allowsModifications: z.boolean(),
});

export type CalendarInfo = z.infer<typeof CalendarInfoSchema>;

interface FilterVisibleEventsInput {
  events: CalendarEvent[];
  hiddenCalendarIds: string[];
}

export const filterVisibleEvents = ({
  events,
  hiddenCalendarIds,
}: FilterVisibleEventsInput): CalendarEvent[] => {
  const hidden = new Set(hiddenCalendarIds);
  return events.filter((event) => !hidden.has(event.calendarId));
};

export const ParticipantSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
});

export type Participant = z.infer<typeof ParticipantSchema>;

const MEETING_LINK_PATTERNS = [
  /https:\/\/meet\.google\.com\/[a-z0-9-]+/i,
  /https:\/\/[\w.-]*zoom\.us\/(?:j|my|w)\/[^\s"<>)]+/i,
  /https:\/\/teams\.(?:microsoft|live)\.com\/[^\s"<>)]+/i,
  /https:\/\/[\w.-]*webex\.com\/[^\s"<>)]+/i,
  /https:\/\/whereby\.com\/[^\s"<>)]+/i,
];

const MEETING_PROVIDERS: [RegExp, string][] = [
  [/meet\.google\.com/i, "Google Meet"],
  [/zoom\.us/i, "Zoom"],
  [/teams\.(microsoft|live)\.com/i, "Teams"],
  [/webex\.com/i, "Webex"],
  [/whereby\.com/i, "Whereby"],
];

const searchableText = (event: CalendarEvent): string =>
  [event.url, event.location, event.notes].filter(Boolean).join("\n");

export const extractMeetingLink = (event: CalendarEvent): string | null => {
  const text = searchableText(event);
  for (const pattern of MEETING_LINK_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
};

export const describeMeetingProvider = (link: string): string =>
  MEETING_PROVIDERS.find(([pattern]) => pattern.test(link))?.[1] ?? "Reunião";

export const toParticipants = (event: CalendarEvent): Participant[] =>
  [event.organizer, ...event.attendees]
    .filter((attendee): attendee is CalendarAttendee => attendee !== null)
    .filter((attendee) => !attendee.isCurrentUser)
    .filter(
      (attendee, index, all) =>
        all.findIndex(
          (other) =>
            (other.email ?? other.name) === (attendee.email ?? attendee.name),
        ) === index,
    )
    .map(({ name, email }) => ({ name, email }));

export const describeParticipant = ({ name, email }: Participant): string =>
  name?.trim() || email?.split("@")[0] || "Participante";

const UPCOMING_LEAD_MS = 5 * 60_000;

interface FindCurrentEventInput {
  events: CalendarEvent[];
  nowMs: number;
}

export const findCurrentEvent = ({
  events,
  nowMs,
}: FindCurrentEventInput): CalendarEvent | null =>
  events
    .filter((event) => !event.isAllDay)
    .find(
      (event) =>
        event.startMs - UPCOMING_LEAD_MS <= nowMs && nowMs <= event.endMs,
    ) ?? null;
