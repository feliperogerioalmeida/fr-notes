import {
  buildDigestPrompt,
  DIGEST_CHUNK_MS,
  DIGEST_SYSTEM_PROMPT,
  selectUndigestedSegments,
  type TranscriptSegment,
} from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import { streamCompletion } from "@/lib/llm.js";

const CHECK_INTERVAL_MS = 60_000;
const SETTLE_MS = 5_000;
const MAX_FAILURES = 2;

interface DigestTracking {
  noteId: string;
  timer: ReturnType<typeof setInterval>;
  running: AbortController | null;
  failures: number;
}

let tracking: DigestTracking | null = null;

const selectReadySegments = (pending: TranscriptSegment[]) =>
  pending.filter((segment) => segment.endMs <= Date.now() - SETTLE_MS);

const loadDigestInputs = async (noteId: string) => {
  const storage = await getStorage();
  const [note, settings, segments, digests] = await Promise.all([
    storage.notes.findNote(noteId),
    storage.settings.readSettings(),
    storage.transcript.listSegments(noteId),
    storage.digests.listDigests(noteId),
  ]);
  const ready = selectReadySegments(
    selectUndigestedSegments(segments, digests),
  );
  return { storage, note, settings, ready };
};

const coversEnoughTime = (segments: TranscriptSegment[]) => {
  const first = segments[0];
  const last = segments.at(-1);
  return Boolean(
    first && last && last.endMs - first.startMs >= DIGEST_CHUNK_MS,
  );
};

const runDigest = async (target: DigestTracking) => {
  if (target.running || target.failures >= MAX_FAILURES) return;
  const { storage, note, settings, ready } = await loadDigestInputs(
    target.noteId,
  );
  if (!note || !settings.llmDigestDuringMeeting || !settings.llmModel.trim())
    return;
  if (!coversEnoughTime(ready)) return;
  const controller = new AbortController();
  target.running = controller;
  try {
    const originMs = note.recordingStartedAt
      ? new Date(note.recordingStartedAt).getTime()
      : (ready[0]?.startMs ?? 0);
    const text = await streamCompletion({
      settings,
      instructions: DIGEST_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildDigestPrompt({
            segments: ready,
            speakerNames: note.speakerNames,
            originMs,
          }),
        },
      ],
      signal: controller.signal,
      onText: () => undefined,
    });
    if (tracking !== target || !text.trim()) return;
    await storage.digests.saveDigest({
      noteId: target.noteId,
      startMs: ready[0]?.startMs ?? originMs,
      endMs: ready.at(-1)?.endMs ?? originMs,
      text,
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    target.failures += 1;
    console.info("transcript digest failed", error);
  } finally {
    target.running = null;
  }
};

export const stopDigestTracking = () => {
  if (!tracking) return;
  clearInterval(tracking.timer);
  tracking.running?.abort();
  tracking = null;
};

export const startDigestTracking = (noteId: string) => {
  stopDigestTracking();
  const target: DigestTracking = {
    noteId,
    running: null,
    failures: 0,
    timer: setInterval(() => void runDigest(target), CHECK_INTERVAL_MS),
  };
  tracking = target;
};
