import { create } from "zustand";

export type DictationPhase = "idle" | "listening" | "processing";

interface DictationState {
  phase: DictationPhase;
  pressedAt: number | null;
  handsFree: boolean;
  setPhase: (phase: DictationPhase) => void;
  markPressed: (pressedAt: number) => void;
  enableHandsFree: () => void;
  reset: () => void;
}

export const useDictationStore = create<DictationState>((set) => ({
  phase: "idle",
  pressedAt: null,
  handsFree: false,
  setPhase: (phase) => set({ phase }),
  markPressed: (pressedAt) => set({ pressedAt, handsFree: false }),
  enableHandsFree: () => set({ handsFree: true }),
  reset: () => set({ phase: "idle", pressedAt: null, handsFree: false }),
}));
