import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  type ActiveSpeakerObservation,
  applySpeakerSuggestions,
  attributeSpeakers,
  type AxSnapshot,
  type Note,
  readRoster,
} from "@workspace/core";
import { toast } from "sonner";

import { useMeetingStore } from "@/features/meetings/meeting-store.js";
import { getStorage } from "@/lib/database.js";
import {
  ACCESSIBILITY_REQUIRED_ERROR,
  onSpeakerSnapshot,
  requestAccessibilityPermission,
  startSpeakerMonitor,
  stopSpeakerMonitor,
} from "@/lib/native.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const APPLY_INTERVAL_MS = 30_000;

interface Tracking {
  noteId: string;
  diagnostics: boolean;
  bundleId: string | null;
  knownNames: string[];
  selfNames: string[];
  observations: ActiveSpeakerObservation[];
  cleanups: (() => void)[];
}

let tracking: Tracking | null = null;

const collectKnownNames = (note: Note) => [
  ...note.participants
    .map((participant) => participant.name)
    .filter((name): name is string => Boolean(name)),
  ...Object.values(note.speakerNames),
];

const recordSnapshot = (snapshot: AxSnapshot) => {
  if (!tracking || snapshot.bundleId !== tracking.bundleId) return;
  const reading = readRoster({
    snapshot,
    knownNames: tracking.knownNames,
    selfNames: tracking.selfNames,
  });
  tracking.observations.push({
    atMs: reading.observedAtMs,
    activeNames: reading.activeNames,
  });
};

const offerAccessibility = () =>
  toast.warning("Não dá para identificar quem está falando", {
    description:
      "O FR Notes precisa da permissão de Acessibilidade para ler os nomes na janela da reunião.",
    id: "speaker-accessibility",
    duration: Infinity,
    action: {
      label: "Permitir",
      onClick: () => void requestAccessibilityPermission(),
    },
  });

const followMeetingApp = async () => {
  const current = tracking;
  const bundleId = useMeetingStore.getState().activeApps[0]?.bundleId ?? null;
  if (!current || !bundleId || bundleId === current.bundleId) return;
  current.bundleId = bundleId;
  try {
    await startSpeakerMonitor({
      noteId: current.noteId,
      bundleId,
      diagnostics: current.diagnostics,
    });
  } catch (error) {
    current.bundleId = null;
    if (String(error).includes(ACCESSIBILITY_REQUIRED_ERROR)) {
      offerAccessibility();
      return;
    }
    console.info("speaker monitor unavailable", error);
  }
};

const refreshSpeakerQueries = (noteId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.note(noteId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcript(noteId) }),
  ]);

const applyAttribution = async (target: Tracking) => {
  if (target.observations.length === 0) return [];
  const storage = await getStorage();
  const note = await storage.notes.findNote(target.noteId);
  if (!note) return [];
  const suggestions = attributeSpeakers({
    segments: await storage.transcript.listSegments(target.noteId),
    observations: target.observations,
  });
  const { speakerNames, applied } = applySpeakerSuggestions({
    speakerNames: note.speakerNames,
    suggestions,
  });
  if (applied.length === 0) return [];
  await storage.notes.updateNote({ id: note.id, patch: { speakerNames } });
  await refreshSpeakerQueries(note.id);
  return applied;
};

const subscribeToSignals = async (target: Tracking) => {
  const unlisten: UnlistenFn = await onSpeakerSnapshot(recordSnapshot);
  const unsubscribe = useMeetingStore.subscribe(() => void followMeetingApp());
  const timer = setInterval(
    () => void applyAttribution(target),
    APPLY_INTERVAL_MS,
  );
  target.cleanups.push(unlisten, unsubscribe, () => clearInterval(timer));
};

export const startSpeakerTracking = async (noteId: string) => {
  const storage = await getStorage();
  const [settings, note] = await Promise.all([
    storage.settings.readSettings(),
    storage.notes.findNote(noteId),
  ]);
  if (!settings.speakerDetection || !note) return;
  await stopSpeakerTracking();
  tracking = {
    noteId,
    diagnostics: settings.speakerDiagnostics,
    bundleId: null,
    knownNames: collectKnownNames(note),
    selfNames: [settings.userName].filter(Boolean),
    observations: [],
    cleanups: [],
  };
  await subscribeToSignals(tracking);
  await followMeetingApp();
};

export const stopSpeakerTracking = async () => {
  const finished = tracking;
  tracking = null;
  if (!finished) return;
  finished.cleanups.forEach((cleanup) => cleanup());
  await stopSpeakerMonitor().catch(() => undefined);
  const applied = await applyAttribution(finished);
  if (applied.length === 0) return;
  toast.success("Vozes identificadas", {
    description: applied.map((suggestion) => suggestion.name).join(", "),
  });
};
