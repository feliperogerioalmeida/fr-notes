import { create } from "zustand";

interface EnhanceState {
  noteId: string | null;
  draft: string;
  begin: (noteId: string) => void;
  update: (draft: string) => void;
  finish: () => void;
}

export const useEnhanceStore = create<EnhanceState>((set) => ({
  noteId: null,
  draft: "",
  begin: (noteId) => set({ noteId, draft: "" }),
  update: (draft) => set({ draft }),
  finish: () => set({ noteId: null, draft: "" }),
}));
