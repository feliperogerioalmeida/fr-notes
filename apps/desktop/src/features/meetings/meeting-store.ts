import type { CalendarEvent, MeetingApp } from "@workspace/core";
import { create } from "zustand";

export interface MeetingPrompt {
  key: string;
  title: string;
  subtitle: string;
  event: CalendarEvent | null;
  fromApp: boolean;
  joinUrl: string | null;
}

interface MeetingState {
  activeApps: MeetingApp[];
  prompt: MeetingPrompt | null;
  dismissedKeys: Set<string>;
  quietUntilMs: number;
  setActiveApps: (apps: MeetingApp[]) => void;
  showPrompt: (prompt: MeetingPrompt) => void;
  clearPrompt: () => void;
  dismissPrompt: () => void;
  silenceAppPromptsUntil: (untilMs: number) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  activeApps: [],
  prompt: null,
  dismissedKeys: new Set(),
  quietUntilMs: 0,
  setActiveApps: (activeApps) => set({ activeApps }),
  showPrompt: (prompt) => set({ prompt }),
  clearPrompt: () => set({ prompt: null }),
  dismissPrompt: () =>
    set((state) => ({
      prompt: null,
      dismissedKeys: state.prompt
        ? new Set([...state.dismissedKeys, state.prompt.key])
        : state.dismissedKeys,
    })),
  silenceAppPromptsUntil: (untilMs) => set({ quietUntilMs: untilMs }),
}));
