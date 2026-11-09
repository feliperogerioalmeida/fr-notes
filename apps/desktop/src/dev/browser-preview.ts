import type { InvokeArgs } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import initSqlJs, { type Database, type SqlValue } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

import {
  buildPreviewCalendars,
  buildPreviewEvents,
  seedPreviewData,
} from "./preview-seed.js";

interface SqlPayload {
  query: string;
  values: SqlValue[];
}

const LEVEL_INTERVAL_MS = 120;

const selectRows = (db: Database, { query, values }: SqlPayload) => {
  const statement = db.prepare(query);
  statement.bind(values);
  const rows: Record<string, unknown>[] = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
};

const executeStatement = (db: Database, { query, values }: SqlPayload) => {
  db.run(query, values);
  return [db.getRowsModified(), 0];
};

const simulateLevels = () =>
  setInterval(
    () =>
      void emit("recording:level", {
        microphone: Math.random() * 0.12,
        system: Math.random() * 0.18,
      }),
    LEVEL_INTERVAL_MS,
  );

const createRecordingSimulator = () => {
  let timer: ReturnType<typeof setInterval> | null = null;
  return {
    start: () => {
      timer = simulateLevels();
      return { sessionId: "preview", startedAtMs: Date.now() };
    },
    stop: () => {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
};

const createHandler = (db: Database) => {
  const secrets = new Map<string, string>();
  const recorder = createRecordingSimulator();
  const handlers: Record<string, (payload: InvokeArgs | undefined) => unknown> =
    {
      "plugin:sql|load": () => "sqlite:fr-notes.db",
      "plugin:app|version": () => "0.1.0-preview",
      "plugin:updater|check": () => null,
      "plugin:sql|select": (payload) =>
        selectRows(db, payload as unknown as SqlPayload),
      "plugin:sql|execute": (payload) =>
        executeStatement(db, payload as unknown as SqlPayload),
      get_secret: (payload) =>
        secrets.get(String((payload as { key: string }).key)) ?? null,
      has_secret: (payload) =>
        secrets.has(String((payload as { key: string }).key)),
      set_secret: (payload) => {
        const { key, value } = payload as { key: string; value: string };
        secrets.set(key, value);
      },
      delete_secret: (payload) =>
        secrets.delete(String((payload as { key: string }).key)),
      check_permissions: () => ({
        microphone: "granted",
        screenCapture: "undetermined",
        systemAudio: "granted",
        calendar: "granted",
        accessibility: "denied",
      }),
      request_accessibility_permission: () => false,
      set_fn_key_monitoring: () => null,
      "plugin:global-shortcut|register": () => null,
      "plugin:global-shortcut|unregister": () => null,
      request_system_audio_permission: () => true,
      request_calendar_access: () => true,
      list_calendar_events: () => buildPreviewEvents(),
      list_calendars: () => buildPreviewCalendars(),
      list_microphone_apps: () => [],
      get_recording_status: () => ({
        isRecording: false,
        noteId: null,
        startedAtMs: null,
      }),
      start_recording: () => recorder.start(),
      stop_recording: () => recorder.stop(),
    };
  return (cmd: string, payload?: InvokeArgs) =>
    handlers[cmd]?.(payload) ?? null;
};

const exposePreviewControls = () => {
  Object.assign(window, {
    simulateMeetingApp: (active = true) =>
      emit("microphone-apps:changed", {
        apps: active
          ? [{ bundleId: "us.zoom.xos", name: "zoom.us", pid: 4242 }]
          : [],
      }),
    simulateDictation: async () => {
      await emit("dictation:state", { status: "listening" });
      await emit("dictation:level", { level: 0.12 });
      await emit("dictation:partial", {
        text: "Oi Marina, te mando a proposta revisada até sexta com o cronograma",
      });
    },
    simulateNubPrompt: () =>
      emit("nub:prompt", {
        title: "Kickoff — App de pedidos",
        subtitle: "Zoom está usando o microfone",
      }),
  });
};

export const installBrowserPreview = async (): Promise<void> => {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const db = new SQL.Database();
  mockWindows("main");
  mockIPC(createHandler(db), { shouldMockEvents: true });
  exposePreviewControls();
  await seedPreviewData();
};
