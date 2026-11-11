import type { UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { useGlobalShortcuts } from "@/features/dictation/use-global-shortcuts.js";
import { useMeetingDetection } from "@/features/meetings/use-meeting-detection.js";
import { useTrayCountdown } from "@/features/meetings/use-tray-countdown.js";
import { useStartNote } from "@/features/notes/use-start-note.js";
import { endRecording } from "@/features/recording/use-recording-controls.js";
import { useRecordingListeners } from "@/features/recording/use-recording-listeners.js";
import { useRecordingMaintenance } from "@/features/recordings/use-recording-maintenance.js";
import { SearchResults } from "@/features/search/search-results.js";
import { useThemeSync } from "@/features/settings/use-theme-sync.js";
import { useAutoUpdate } from "@/features/updates/use-auto-update.js";
import {
  onOpenNoteRequest,
  onStopRecordingRequest,
  onTrayNewNote,
} from "@/lib/native.js";
import type { ShellContext } from "@/pages/shell-context.js";

import { AppSidebar } from "./app-sidebar.js";

const useShellEvents = () => {
  const navigate = useNavigate();
  const startNote = useStartNote();
  useEffect(() => {
    const pending: Promise<UnlistenFn>[] = [
      onTrayNewNote(() => void startNote({ record: true })),
      onOpenNoteRequest((noteId) => navigate(`/notes/${noteId}`)),
      onStopRecordingRequest(() => void endRecording()),
    ];
    return () => {
      void Promise.all(pending).then((handles) =>
        handles.forEach((unlisten) => unlisten()),
      );
    };
  }, [navigate, startNote]);
};

export const AppShell = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const startNote = useStartNote();
  useRecordingListeners({ persistSegments: true });
  useRecordingMaintenance();
  useShellEvents();
  useMeetingDetection(startNote);
  useTrayCountdown();
  useGlobalShortcuts(startNote);
  useThemeSync();
  useAutoUpdate();
  const context: ShellContext = { searchQuery };
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <AppSidebar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main className="min-w-0 flex-1">
        {searchQuery.trim() ? (
          <SearchResults
            query={searchQuery}
            onOpen={() => setSearchQuery("")}
          />
        ) : (
          <Outlet context={context} />
        )}
      </main>
    </div>
  );
};
