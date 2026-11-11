import { create } from "zustand";

export type EnhancePhase = "reading" | "writing";

interface BeginInput {
  noteId: string;
  estimatedReadMs: number;
}

interface EnhanceState {
  noteId: string | null;
  draft: string;
  phase: EnhancePhase;
  startedAt: number | null;
  estimatedReadMs: number;
  begin: (input: BeginInput) => void;
  update: (draft: string) => void;
  finish: () => void;
}

export const useEnhanceStore = create<EnhanceState>((set) => ({
  noteId: null,
  draft: "",
  phase: "reading",
  startedAt: null,
  estimatedReadMs: 0,
  begin: ({ noteId, estimatedReadMs }) =>
    set({
      noteId,
      draft: "",
      phase: "reading",
      startedAt: Date.now(),
      estimatedReadMs,
    }),
  update: (draft) => set({ draft, phase: "writing" }),
  finish: () =>
    set({ noteId: null, draft: "", phase: "reading", startedAt: null }),
}));
