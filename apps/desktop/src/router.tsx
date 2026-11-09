import { createHashRouter } from "react-router";

import { AppShell } from "@/components/app-shell.js";
import { AgendaPage } from "@/pages/agenda-page.js";
import { FolderPage } from "@/pages/folder-page.js";
import { HomePage } from "@/pages/home-page.js";
import { NotePage } from "@/pages/note-page.js";
import { NubPage } from "@/pages/nub-page.js";
import { SettingsPage } from "@/pages/settings-page.js";
import { TemplatesPage } from "@/pages/templates-page.js";

export const router = createHashRouter([
  { path: "/nub", element: <NubPage /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "agenda", element: <AgendaPage /> },
      { path: "notes/:noteId", element: <NotePage /> },
      { path: "folders/:folderId", element: <FolderPage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "settings/:section?", element: <SettingsPage /> },
    ],
  },
]);
