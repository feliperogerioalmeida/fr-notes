import type { CalendarEvent, MeetingApp } from "@workspace/core";
import { create } from "zustand";

export interface MeetingPrompt {
  key: string;
  title: string;
  subtitle: string;
  event: CalendarEvent | null;
  fromApp: boolean;
}

interface MeetingState {
  activeApps: MeetingApp[];
  prompt: MeetingPrompt | null;
  dismissedKeys: Set<string>;
  setActiveApps: (apps: MeetingApp[]) => void;
  showPrompt: (prompt: MeetingPrompt) => void;
  clearPrompt: () => void;
  dismissPrompt: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  activeApps: [],
  prompt: null,
  dismissedKeys: new Set(),
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
}));
