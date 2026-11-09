const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const TIMESTAMP_PAD = 2;
const LOCALE = "pt-BR";

const TODAY_LABEL = "Hoje";
const YESTERDAY_LABEL = "Ontem";

export interface DayGroup<Item> {
  key: string;
  label: string;
  items: Item[];
}

interface GroupByDayInput<Item> {
  items: Item[];
  getDate: (item: Item) => string;
  now?: Date;
}

const toDayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const shiftDays = (date: Date, days: number): Date => {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
};

const formatLongDay = (date: Date): string =>
  new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);

export const formatDayLabel = (date: Date, now: Date = new Date()): string => {
  const key = toDayKey(date);
  if (key === toDayKey(now)) return TODAY_LABEL;
  if (key === toDayKey(shiftDays(now, -1))) return YESTERDAY_LABEL;
  return formatLongDay(date);
};

export const groupByDay = <Item>({
  items,
  getDate,
  now = new Date(),
}: GroupByDayInput<Item>): DayGroup<Item>[] => {
  const groups = new Map<string, DayGroup<Item>>();
  items.forEach((item) => {
    const date = new Date(getDate(item));
    const key = toDayKey(date);
    const group = groups.get(key) ?? {
      key,
      label: formatDayLabel(date, now),
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  });
  return [...groups.values()];
};

export const formatTime = (iso: string): string =>
  new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export const formatFullDate = (iso: string): string =>
  new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));

const pad = (value: number): string =>
  String(value).padStart(TIMESTAMP_PAD, "0");

export const formatElapsed = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / MS_PER_SECOND));
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
};
