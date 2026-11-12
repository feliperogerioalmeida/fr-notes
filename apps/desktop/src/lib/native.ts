import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type {
  AxSnapshot,
  CalendarEvent,
  CalendarInfo,
  LiveSegmentEvent,
  LiveTranscript,
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
  | `webhook_header:${string}`
  | `connection_token:${string}`;

export const webhookSecretKey = (webhookId: string): SecretKey =>
  `webhook_secret:${webhookId}`;

export const webhookHeaderKey = (webhookId: string): SecretKey =>
  `webhook_header:${webhookId}`;

export const connectionTokenKey = (connectionId: string): SecretKey =>
  `connection_token:${connectionId}`;

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
  keepAudio: boolean;
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
const PROMPT_EVENT = "nub:prompt";

export interface NubPrompt {
  title: string;
  subtitle: string;
  startsAtMs: number | null;
  endsAtMs: number | null;
  accentColor: string | null;
  joinUrl: string | null;
  provider: string | null;
}

export type PromptAction = "join-and-record" | "record" | "join" | "dismiss";

const PROMPT_ACTION_EVENT = "nub:prompt-action";

export const requestPromptAction = (action: PromptAction) =>
  emitTo(MAIN_WINDOW_LABEL, PROMPT_ACTION_EVENT, action);

export const onPromptAction = (handler: (action: PromptAction) => void) =>
  subscribe(PROMPT_ACTION_EVENT, handler);

export const setTrayTitle = (title: string | null) =>
  invoke<void>("set_tray_title", { title });

export const requestOpenNote = (noteId: string) =>
  emitTo(MAIN_WINDOW_LABEL, OPEN_NOTE_EVENT, noteId);

export const requestStopRecording = () =>
  emitTo(MAIN_WINDOW_LABEL, STOP_RECORDING_EVENT);

export const onOpenNoteRequest = (handler: (noteId: string) => void) =>
  subscribe(OPEN_NOTE_EVENT, handler);

export const onStopRecordingRequest = (handler: () => void) =>
  subscribe(STOP_RECORDING_EVENT, handler);

export const sendNubPrompt = (prompt: NubPrompt | null) =>
  emitTo(NUB_WINDOW_LABEL, PROMPT_EVENT, prompt);

export const onNubPrompt = (handler: (prompt: NubPrompt | null) => void) =>
  subscribe(PROMPT_EVENT, handler);

const TRANSCRIPT_FEED_EVENT = "nub:transcript";
const ENDING_EVENT = "nub:ending";
const ENDING_ACTION_EVENT = "nub:ending-action";

export interface NubEnding {
  endsAtMs: number;
}

export type EndingAction = "keep-recording" | "finish-now";

export const sendNubTranscript = (transcript: LiveTranscript) =>
  emitTo(NUB_WINDOW_LABEL, TRANSCRIPT_FEED_EVENT, transcript);

export const onNubTranscript = (
  handler: (transcript: LiveTranscript) => void,
) => subscribe(TRANSCRIPT_FEED_EVENT, handler);

export const sendNubEnding = (ending: NubEnding | null) =>
  emitTo(NUB_WINDOW_LABEL, ENDING_EVENT, ending);

export const onNubEnding = (handler: (ending: NubEnding | null) => void) =>
  subscribe(ENDING_EVENT, handler);

export const requestEndingAction = (action: EndingAction) =>
  emitTo(MAIN_WINDOW_LABEL, ENDING_ACTION_EVENT, action);

export const onEndingAction = (handler: (action: EndingAction) => void) =>
  subscribe(ENDING_ACTION_EVENT, handler);

export interface ScreenWindow {
  owner: string;
  bundleId: string | null;
  layer: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const listFloatingWindows = async () =>
  (await invoke<ScreenWindow[] | null>("list_floating_windows")) ?? [];

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

interface StartSpeakerMonitorArgs {
  noteId: string;
  bundleId: string;
  diagnostics: boolean;
}

export const startSpeakerMonitor = (args: StartSpeakerMonitorArgs) =>
  invoke<void>("start_speaker_monitor", { args });

export const stopSpeakerMonitor = () => invoke<void>("stop_speaker_monitor");

export const revealSpeakerDiagnostics = () =>
  invoke<void>("reveal_speaker_diagnostics");

export const onSpeakerSnapshot = (handler: (snapshot: AxSnapshot) => void) =>
  subscribe("speaker-ax:snapshot", handler);

export interface RecordingFile {
  path: string;
  source: TranscriptSource;
  startedAtMs: number;
}

export interface RetranscribedSegment {
  source: TranscriptSource;
  startMs: number;
  endMs: number;
  text: string;
  speaker: number | null;
}

export const NO_RECORDINGS_ERROR = "no_recordings";

export const listRecordings = (noteId: string) =>
  invoke<RecordingFile[]>("list_recordings", { noteId });

export const revealRecordings = (noteId = "") =>
  invoke<void>("reveal_recordings", { noteId });

interface RetranscribeArgs {
  noteId: string;
  language: string;
  keyterms: string[];
}

export const retranscribeRecordings = (args: RetranscribeArgs) =>
  invoke<RetranscribedSegment[]>("retranscribe_recordings", { ...args });

export const cleanupRecordings = (retentionDays: number) =>
  invoke<number>("cleanup_recordings", { retentionDays });
