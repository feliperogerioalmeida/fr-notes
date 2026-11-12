import type { Participant } from "../domain/calendar.js";
import type { SpeakerNames, TranscriptSource } from "../domain/transcript.js";

export interface ImportedSegment {
  source: TranscriptSource;
  speaker: number | null;
  text: string;
  startMs: number;
  endMs: number;
}

export interface ImportedTranscript {
  title: string | null;
  startedAtMs: number;
  endedAtMs: number;
  participants: Participant[];
  speakerNames: SpeakerNames;
  segments: ImportedSegment[];
}

interface ImportTranscriptInput {
  text: string;
  selfNames?: string[];
  fallbackTitle?: string | null;
  startTime?: string;
  now?: Date;
}

interface Turn {
  speaker: string;
  text: string;
}

const TITLE_LINE = /^(?:meeting title|título|titulo|title)\s*:\s*(.+)$/i;
const DATE_LINE = /^(?:date|data)\s*:\s*(.+)$/i;
const PARTICIPANTS_LINE =
  /^(?:meeting participants|participants|participantes)\s*:\s*(.*)$/i;
const TRANSCRIPT_MARKER = /^(?:transcript|transcrição|transcricao)\s*:\s*$/i;
const TURN_LINE = /^([\p{L}][^:\n]{0,59}?)\s*:\s*(.*)$/u;
const TIME_PREFIX = /^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/;
const MAX_SPEAKER_WORDS = 5;
const SELF_LABELS = ["me", "eu", "you", "você"];
const GENERIC_LABEL =
  /^(?:them|eles|speaker\s+\w+|pessoa\s+\d+|participant\s+\d+)$/i;
const MS_PER_WORD = 400;
const GAP_MS = 300;
const MIN_TURN_MS = 800;
const DAY_MS = 86_400_000;

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  fev: 1,
  mar: 2,
  apr: 3,
  abr: 3,
  may: 4,
  mai: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  ago: 7,
  sep: 8,
  set: 8,
  oct: 9,
  out: 9,
  nov: 10,
  dec: 11,
  dez: 11,
};

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const isSpeakerLabel = (label: string) =>
  label.split(/\s+/).length <= MAX_SPEAKER_WORDS && !/[.?!,;]/.test(label);

const collectTurns = (lines: string[]): Turn[] =>
  lines.reduce<Turn[]>((turns, rawLine) => {
    const line = rawLine.replace(TIME_PREFIX, "").trim();
    if (!line) return turns;
    const match = line.match(TURN_LINE);
    const speaker = match?.[1]?.trim();
    if (match && speaker && isSpeakerLabel(speaker)) {
      const text = (match[2] ?? "").trim();
      return text ? [...turns, { speaker, text }] : turns;
    }
    const last = turns.at(-1);
    if (!last) return turns;
    last.text = `${last.text} ${line}`;
    return turns;
  }, []);

const readHeader = (lines: string[], pattern: RegExp) =>
  lines.map((line) => line.trim().match(pattern)?.[1]?.trim()).find(Boolean) ??
  null;

const splitHeaderAndBody = (lines: string[]) => {
  const marker = lines.findIndex((line) => TRANSCRIPT_MARKER.test(line.trim()));
  if (marker >= 0) {
    return { header: lines.slice(0, marker), body: lines.slice(marker + 1) };
  }
  const isHeader = (line: string) =>
    [TITLE_LINE, DATE_LINE, PARTICIPANTS_LINE].some((pattern) =>
      pattern.test(line.trim()),
    );
  return {
    header: lines.filter(isHeader),
    body: lines.filter((line) => !isHeader(line)),
  };
};

export const parseLooseDate = (
  value: string | null,
  now: Date,
): Date | null => {
  if (!value) return null;
  const direct = Date.parse(value);
  if (!Number.isNaN(direct) && /\d{4}/.test(value)) return new Date(direct);
  const text = normalize(value);
  const monthKey = Object.keys(MONTHS).find((key) => text.includes(key));
  const day = text.match(/\b(\d{1,2})\b/)?.[1];
  if (monthKey === undefined || !day) return null;
  const year = text.match(/\b(\d{4})\b/)?.[1];
  const date = new Date(
    year ? Number(year) : now.getFullYear(),
    MONTHS[monthKey] ?? 0,
    Number(day),
    9,
  );
  if (!year && date.getTime() - now.getTime() > DAY_MS) {
    date.setFullYear(date.getFullYear() - 1);
  }
  return date;
};

const DEFAULT_START_TIME = "09:00";
const TIME_INPUT = /^(\d{1,2}):(\d{2})$/;

const withTime = (date: Date, time: string) => {
  const match = time.match(TIME_INPUT);
  if (!match) return date;
  const result = new Date(date);
  result.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return result;
};

const durationOf = (text: string) =>
  Math.max(MIN_TURN_MS, text.split(/\s+/).length * MS_PER_WORD);

interface SpeakerMap {
  isSelf: (label: string) => boolean;
  isSelfName: (name: string) => boolean;
  indexOf: (label: string) => number;
  names: SpeakerNames;
}

const createSpeakerMap = (selfNames: string[]): SpeakerMap => {
  const selfLabels = new Set(
    [...SELF_LABELS, ...selfNames].map(normalize).filter(Boolean),
  );
  const indexes = new Map<string, number>();
  const names: SpeakerNames = {};
  const indexOf = (label: string) => {
    const key = normalize(label);
    const known = indexes.get(key);
    if (known !== undefined) return known;
    const index = indexes.size;
    indexes.set(key, index);
    if (!GENERIC_LABEL.test(label.trim())) names[String(index)] = label.trim();
    return index;
  };
  const isSelf = (label: string) => selfLabels.has(normalize(label));
  const isSelfName = (name: string) =>
    isSelf(name) ||
    [...selfLabels].some((self) => normalize(name).startsWith(`${self} `));
  return { isSelf, isSelfName, indexOf, names };
};

const toParticipants = (header: string | null, names: SpeakerNames) => {
  const fromHeader = (header ?? "")
    .split(/[,;]/)
    .map((name) => name.trim())
    .filter(Boolean);
  const unique = [...new Set([...Object.values(names), ...fromHeader])];
  return unique.map((name) => ({ name, email: null }));
};

export const importTranscript = ({
  text,
  selfNames = [],
  fallbackTitle = null,
  startTime = DEFAULT_START_TIME,
  now = new Date(),
}: ImportTranscriptInput): ImportedTranscript => {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const { header, body } = splitHeaderAndBody(lines);
  const startedAt = withTime(
    parseLooseDate(readHeader(header, DATE_LINE), now) ?? now,
    startTime,
  );
  const speakers = createSpeakerMap(selfNames);
  let cursor = startedAt.getTime();
  const segments = collectTurns(body).map((turn): ImportedSegment => {
    const startMs = cursor;
    const endMs = startMs + durationOf(turn.text);
    cursor = endMs + GAP_MS;
    const mine = speakers.isSelf(turn.speaker);
    return {
      source: mine ? "microphone" : "system",
      speaker: mine ? null : speakers.indexOf(turn.speaker),
      text: turn.text,
      startMs,
      endMs,
    };
  });
  const selfFree = (participant: Participant) =>
    !speakers.isSelfName(participant.name ?? "");
  return {
    title: readHeader(header, TITLE_LINE) ?? fallbackTitle,
    startedAtMs: startedAt.getTime(),
    endedAtMs: segments.at(-1)?.endMs ?? startedAt.getTime(),
    participants: toParticipants(
      readHeader(header, PARTICIPANTS_LINE),
      speakers.names,
    ).filter(selfFree),
    speakerNames: speakers.names,
    segments,
  };
};
