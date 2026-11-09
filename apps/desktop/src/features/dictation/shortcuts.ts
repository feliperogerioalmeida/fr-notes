import type { DictationTrigger, RecordingShortcut } from "@workspace/core";

export const DICTATION_ACCELERATORS: Record<
  Exclude<DictationTrigger, "fn">,
  string
> = {
  "alt-space": "Alt+Space",
  "ctrl-alt-space": "Control+Alt+Space",
  "cmd-shift-space": "CommandOrControl+Shift+Space",
};

export const DICTATION_TRIGGER_LABELS: Record<DictationTrigger, string> = {
  fn: "Segurar fn (🌐)",
  "alt-space": "Segurar ⌥ Espaço",
  "ctrl-alt-space": "Segurar ⌃ ⌥ Espaço",
  "cmd-shift-space": "Segurar ⌘ ⇧ Espaço",
};

export const RECORDING_ACCELERATORS: Record<
  Exclude<RecordingShortcut, "off">,
  string
> = {
  "alt-shift-r": "Alt+Shift+R",
  "ctrl-alt-r": "Control+Alt+R",
};

export const RECORDING_SHORTCUT_LABELS: Record<RecordingShortcut, string> = {
  "alt-shift-r": "⌥ ⇧ R",
  "ctrl-alt-r": "⌃ ⌥ R",
  off: "Desligado",
};
