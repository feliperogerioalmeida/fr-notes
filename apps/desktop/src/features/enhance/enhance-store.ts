import { create } from "zustand";

export type EnhancePhase = "reading" | "writing";

export interface EnhanceJob {
  draft: string;
  phase: EnhancePhase;
  startedAt: number;
  estimatedReadMs: number;
}

interface BeginInput {
  noteId: string;
  estimatedReadMs: number;
}

interface EnhanceState {
  jobs: Record<string, EnhanceJob>;
  begin: (input: BeginInput) => void;
  update: (noteId: string, draft: string) => void;
  finish: (noteId: string) => void;
}

const withoutJob = (jobs: Record<string, EnhanceJob>, noteId: string) =>
  Object.fromEntries(Object.entries(jobs).filter(([id]) => id !== noteId));

export const useEnhanceStore = create<EnhanceState>((set) => ({
  jobs: {},
  begin: ({ noteId, estimatedReadMs }) =>
    set((state) => ({
      jobs: {
        ...state.jobs,
        [noteId]: {
          draft: "",
          phase: "reading",
          startedAt: Date.now(),
          estimatedReadMs,
        },
      },
    })),
  update: (noteId, draft) =>
    set((state) => {
      const job = state.jobs[noteId];
      if (!job) return state;
      return {
        jobs: { ...state.jobs, [noteId]: { ...job, draft, phase: "writing" } },
      };
    }),
  finish: (noteId) =>
    set((state) => ({ jobs: withoutJob(state.jobs, noteId) })),
}));

export const useEnhanceJob = (noteId: string | undefined) =>
  useEnhanceStore((state) => (noteId ? state.jobs[noteId] : undefined));

export const isEnhancing = (noteId: string) =>
  Boolean(useEnhanceStore.getState().jobs[noteId]);
