import { create } from "zustand";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "downloading"
  | "ready"
  | "error";

interface UpdateState {
  status: UpdateStatus;
  version: string | null;
  progress: number;
  setStatus: (status: UpdateStatus) => void;
  beginDownload: (version: string) => void;
  setProgress: (progress: number) => void;
  markReady: () => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  status: "idle",
  version: null,
  progress: 0,
  setStatus: (status) => set({ status }),
  beginDownload: (version) =>
    set({ status: "downloading", version, progress: 0 }),
  setProgress: (progress) => set({ progress }),
  markReady: () => set({ status: "ready", progress: 1 }),
}));
