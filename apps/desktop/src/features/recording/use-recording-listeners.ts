import type { UnlistenFn } from "@tauri-apps/api/event";
import type { LiveSegmentEvent } from "@workspace/core";
import { useEffect } from "react";
import { toast } from "sonner";

import { getStorage } from "@/lib/database.js";
import {
  onRecordingError,
  onRecordingLevel,
  onRecordingState,
  onTranscriptSegment,
  readRecordingStatus,
} from "@/lib/native.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

import {
  collectEchoesOf,
  isMicrophoneEcho,
  rememberMicrophone,
} from "./echo-filter.js";
import { useRecordingStore } from "./recording-store.js";

const SYSTEM_AUDIO_WARNING =
  "Não consegui capturar o áudio do computador. Permita “Gravação de Áudio do Sistema” em Configurações.";

const refreshTranscript = (noteId: string) =>
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcript(noteId) });

const persistMicrophone = async (segment: LiveSegmentEvent) => {
  if (isMicrophoneEcho(segment)) return;
  const storage = await getStorage();
  const saved = await storage.transcript.appendSegment(segment);
  rememberMicrophone({ ...segment, segmentId: saved.id });
};

const persistSystem = async (segment: LiveSegmentEvent) => {
  const storage = await getStorage();
  await storage.transcript.appendSegment(segment);
  const echoes = collectEchoesOf(segment);
  await Promise.all(echoes.map((id) => storage.transcript.deleteSegment(id)));
};

const persistFinalSegment = async (segment: LiveSegmentEvent) => {
  if (segment.source === "microphone") await persistMicrophone(segment);
  if (segment.source === "system") await persistSystem(segment);
  await refreshTranscript(segment.noteId);
};

const handleSegment = (segment: LiveSegmentEvent) => {
  const { setInterim } = useRecordingStore.getState();
  if (!segment.isFinal) {
    setInterim(segment, segment.source);
    return;
  }
  setInterim(null, segment.source);
  if (segment.text.trim()) void persistFinalSegment(segment);
};

const syncInitialStatus = async () => {
  const status = await readRecordingStatus();
  if (!status.isRecording || !status.noteId || !status.startedAtMs) return;
  useRecordingStore.getState().markRecording({
    noteId: status.noteId,
    startedAtMs: status.startedAtMs,
  });
};

interface RecordingListenersOptions {
  persistSegments: boolean;
}

const registerListeners = ({ persistSegments }: RecordingListenersOptions) =>
  Promise.all([
    onRecordingLevel((levels) =>
      useRecordingStore.getState().setLevels(levels),
    ),
    onTranscriptSegment((segment) => {
      if (persistSegments) handleSegment(segment);
    }),
    onRecordingState((state) => {
      if (state.status === "recording") return void syncInitialStatus();
      useRecordingStore.getState().markIdle();
    }),
    onRecordingError((error) => {
      if (!persistSegments) return;
      toast.error(
        error.source === "system" ? SYSTEM_AUDIO_WARNING : error.message,
      );
    }),
  ]);

export const useRecordingListeners = (options: RecordingListenersOptions) => {
  const { persistSegments } = options;
  useEffect(() => {
    let unlisteners: UnlistenFn[] = [];
    let disposed = false;
    void registerListeners({ persistSegments }).then((handles) => {
      if (disposed) return handles.forEach((unlisten) => unlisten());
      unlisteners = handles;
    });
    void syncInitialStatus();
    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [persistSegments]);
};
