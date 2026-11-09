import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type {
  CalendarEvent,
  CalendarInfo,
  LiveSegmentEvent,
  MicrophoneApp,
  TranscriptSource,
} from "@workspace/core";

export const SECRET_KEYS = {
  deepgram: "deepgram_api_key",
  llm: "llm_api_key",
} as const;

export type SecretKey =
  | (typeof SECRET_KEYS)[keyof typeof SECRET_KEYS]
  | `webhook_secret:${string}`
  | `webhook_header:${string}`;

export const webhookSecretKey = (webhookId: string): SecretKey =>
  `webhook_secret:${webhookId}`;

export const webhookHeaderKey = (webhookId: string): SecretKey =>
  `webhook_header:${webhookId}`;

export type PermissionState =
  | "granted"
  | "denied"
  | "undetermined"
  | "restricted";

export type PrivacyPane =
  | "microphone"
  | "screen-capture"
  | "system-audio"
  | "calendar"
  | "accessibility";

export interface Permissions {
  microphone: PermissionState;
  screenCapture: PermissionState;
  systemAudio: PermissionState;
  calendar: PermissionState;
  accessibility: PermissionState;
}

export interface StartRecordingArgs {
  noteId: string;
  language: string;
  keyterms: string[];
  captureSystemAudio: boolean;
  echoCancellation: boolean;
}

export interface RecordingStarted {
  sessionId: string;
  startedAtMs: number;
}

export interface RecordingStatus {
  isRecording: boolean;
  noteId: string | null;
  startedAtMs: number | null;
}

export interface RecordingLevels {
  microphone: number;
  system: number;
}

export interface RecordingStateEvent {
  status: "recording" | "stopped" | "error";
  noteId: string | null;
  message: string | null;
}

export interface RecordingErrorEvent {
  source: TranscriptSource | "deepgram";
  message: string;
}

export const MISSING_DEEPGRAM_KEY_ERROR = "missing_deepgram_api_key";

export const SYSTEM_AUDIO_DENIED_ERROR = "system_audio_permission_denied";

export const CALENDAR_DENIED_ERROR = "calendar_access_denied";

export const ACCESSIBILITY_REQUIRED_ERROR = "accessibility_permission_required";

export const DICTATION_RUNNING_ERROR = "dictation_already_running";

export const readSecret = (key: SecretKey) =>
  invoke<string | null>("get_secret", { key });

export const writeSecret = (key: SecretKey, value: string) =>
  invoke<void>("set_secret", { key, value });

export const removeSecret = (key: SecretKey) =>
  invoke<void>("delete_secret", { key });

export const checkSecret = (key: SecretKey) =>
  invoke<boolean>("has_secret", { key });

export const startRecording = (args: StartRecordingArgs) =>
  invoke<RecordingStarted>("start_recording", { args });

export const stopRecording = () => invoke<void>("stop_recording");

export const readRecordingStatus = () =>
  invoke<RecordingStatus>("get_recording_status");

export const readPermissions = () => invoke<Permissions>("check_permissions");

export const requestMicrophonePermission = () =>
  invoke<boolean>("request_microphone_permission");

export const requestScreenCapturePermission = () =>
  invoke<boolean>("request_screen_capture_permission");

export const requestSystemAudioPermission = () =>
  invoke<boolean>("request_system_audio_permission");

export const requestCalendarAccess = () =>
  invoke<boolean>("request_calendar_access");

export interface ListEventsRange {
  fromMs: number;
  toMs: number;
  calendarIds?: string[];
}

export const listCalendars = () => invoke<CalendarInfo[]>("list_calendars");

export const listCalendarEvents = (range: ListEventsRange) =>
  invoke<CalendarEvent[]>("list_calendar_events", { args: range });

export const listMicrophoneApps = () =>
  invoke<MicrophoneApp[]>("list_microphone_apps");

export const openPrivacySettings = (pane: PrivacyPane) =>
  invoke<void>("open_privacy_settings", { pane });

export const setNubVisible = (visible: boolean) =>
  invoke<void>("show_nub", { visible });

const subscribe = <Payload>(
  event: string,
  handler: (payload: Payload) => void,
): Promise<UnlistenFn> =>
  listen<Payload>(event, ({ payload }) => handler(payload));

export const onRecordingLevel = (handler: (levels: RecordingLevels) => void) =>
  subscribe("recording:level", handler);

export const onTranscriptSegment = (
  handler: (segment: LiveSegmentEvent) => void,
) => subscribe("transcript:segment", handler);

export const onRecordingState = (
  handler: (state: RecordingStateEvent) => void,
) => subscribe("recording:state", handler);

export const onRecordingError = (
  handler: (error: RecordingErrorEvent) => void,
) => subscribe("recording:error", handler);

export const onTrayNewNote = (handler: () => void) =>
  subscribe("tray:new-note", handler);

export const onMicrophoneAppsChanged = (
  handler: (apps: MicrophoneApp[]) => void,
) =>
  subscribe<{ apps: MicrophoneApp[] }>("microphone-apps:changed", ({ apps }) =>
    handler(apps),
  );

const MAIN_WINDOW_LABEL = "main";
const NUB_WINDOW_LABEL = "nub";
const OPEN_NOTE_EVENT = "nub:open-note";
const STOP_RECORDING_EVENT = "nub:stop-recording";
const START_RECORDING_EVENT = "nub:start-recording";
const DISMISS_PROMPT_EVENT = "nub:dismiss-prompt";
const PROMPT_EVENT = "nub:prompt";

export interface NubPrompt {
  title: string;
  subtitle: string;
}

export const requestOpenNote = (noteId: string) =>
  emitTo(MAIN_WINDOW_LABEL, OPEN_NOTE_EVENT, noteId);

export const requestStopRecording = () =>
  emitTo(MAIN_WINDOW_LABEL, STOP_RECORDING_EVENT);

export const onOpenNoteRequest = (handler: (noteId: string) => void) =>
  subscribe(OPEN_NOTE_EVENT, handler);

export const onStopRecordingRequest = (handler: () => void) =>
  subscribe(STOP_RECORDING_EVENT, handler);

export const requestStartRecording = () =>
  emitTo(MAIN_WINDOW_LABEL, START_RECORDING_EVENT);

export const requestDismissPrompt = () =>
  emitTo(MAIN_WINDOW_LABEL, DISMISS_PROMPT_EVENT);

export const onStartRecordingRequest = (handler: () => void) =>
  subscribe(START_RECORDING_EVENT, handler);

export const onDismissPromptRequest = (handler: () => void) =>
  subscribe(DISMISS_PROMPT_EVENT, handler);

export const sendNubPrompt = (prompt: NubPrompt | null) =>
  emitTo(NUB_WINDOW_LABEL, PROMPT_EVENT, prompt);

export const onNubPrompt = (handler: (prompt: NubPrompt | null) => void) =>
  subscribe(PROMPT_EVENT, handler);

export const focusMainWindow = async () => {
  const main = await WebviewWindow.getByLabel(MAIN_WINDOW_LABEL);
  await main?.show();
  await main?.unminimize();
  await main?.setFocus();
};

export interface StartDictationArgs {
  language: string;
  keyterms: string[];
}

export interface DictationTargetApp {
  name: string;
  bundleId: string;
}

export interface DictationResult {
  text: string;
  targetApp: DictationTargetApp | null;
}

export type DictationStatus = "listening" | "processing" | "idle";

export const startDictation = (args: StartDictationArgs) =>
  invoke<{ startedAtMs: number }>("start_dictation", { args });

export const stopDictation = () => invoke<DictationResult>("stop_dictation");

export const cancelDictation = () => invoke<void>("cancel_dictation");

export const hideDictationPill = () => invoke<void>("hide_dictation_pill");

export const insertText = (text: string) =>
  invoke<void>("insert_text", { text });

export const setFnKeyMonitoring = (enabled: boolean) =>
  invoke<void>("set_fn_key_monitoring", { enabled });

export const requestAccessibilityPermission = () =>
  invoke<boolean>("request_accessibility_permission");

export const onDictationLevel = (handler: (level: number) => void) =>
  subscribe<{ level: number }>("dictation:level", ({ level }) =>
    handler(level),
  );

export const onDictationPartial = (handler: (text: string) => void) =>
  subscribe<{ text: string }>("dictation:partial", ({ text }) => handler(text));

export const onDictationState = (handler: (status: DictationStatus) => void) =>
  subscribe<{ status: DictationStatus }>("dictation:state", ({ status }) =>
    handler(status),
  );

export const onFnKey = (handler: (pressed: boolean) => void) =>
  subscribe<{ pressed: boolean }>("dictation:fn-key", ({ pressed }) =>
    handler(pressed),
  );
