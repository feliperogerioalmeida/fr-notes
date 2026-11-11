import { Input } from "@workspace/ui/components/ui/input";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import {
  AudioLines,
  CalendarDays,
  House,
  LayoutTemplate,
  ListChecks,
  type LucideIcon,
  Plug,
  Search,
  Settings,
} from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { NavLink } from "react-router";

import { FolderTreeNav } from "@/features/folders/folder-tree-nav.js";
import { AudioLevelBars } from "@/features/recording/audio-level-bars.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";
import { useElapsed } from "@/hooks/use-elapsed.js";

import { FrLogo } from "./fr-logo.js";

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

const SidebarLink = ({ to, icon: Icon, label, end }: SidebarLinkProps) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        "text-body-sm ease-brand flex h-8 items-center gap-2.5 rounded-md px-2.5 transition-colors duration-150",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-brand"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )
    }
  >
    <Icon className="size-4" strokeWidth={1.75} />
    <span className="truncate">{label}</span>
  </NavLink>
);

const RecordingCard = () => {
  const noteId = useRecordingStore((state) => state.noteId);
  const startedAtMs = useRecordingStore((state) => state.startedAtMs);
  const levels = useRecordingStore((state) => state.levels);
  const elapsed = useElapsed(startedAtMs);
  if (!noteId) return null;
  return (
    <NavLink
      to={`/notes/${noteId}`}
      className="bg-brand-subtle border-brand/30 flex items-center gap-3 rounded-lg border px-3 py-2.5"
    >
      <AudioLevelBars
        level={Math.max(levels.microphone, levels.system)}
        active
      />
      <span className="text-body-sm text-heading flex-1 font-medium">
        Gravando
      </span>
      <span className="text-caption text-muted-foreground tabular-nums">
        {elapsed}
      </span>
    </NavLink>
  );
};

const useFocusShortcut = (inputRef: RefObject<HTMLInputElement | null>) => {
  useEffect(() => {
    const focusOnShortcut = (event: KeyboardEvent) => {
      if (!event.metaKey || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", focusOnShortcut);
    return () => window.removeEventListener("keydown", focusOnShortcut);
  }, [inputRef]);
};

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchField = ({ value, onChange }: SearchFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusShortcut(inputRef);
  return (
    <div className="relative px-3 pt-3 pb-2">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-5.5 mt-0.5 size-3.5 -translate-y-1/2" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onChange("");
        }}
        placeholder="Buscar em tudo"
        className="h-8 pr-10 pl-8"
      />
      <kbd className="text-caption text-muted-foreground pointer-events-none absolute top-1/2 right-5.5 mt-0.5 -translate-y-1/2 font-sans">
        ⌘K
      </kbd>
    </div>
  );
};

interface AppSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const AppSidebar = ({
  searchQuery,
  onSearchChange,
}: AppSidebarProps) => (
  <aside className="bg-sidebar border-sidebar-border flex w-60 shrink-0 flex-col border-r">
    <div
      data-tauri-drag-region
      className="flex h-12 shrink-0 items-end justify-end px-4 pb-1"
    >
      <FrLogo />
    </div>
    <SearchField value={searchQuery} onChange={onSearchChange} />
    <ScrollArea className="min-h-0 flex-1">
      <nav className="flex flex-col gap-0.5 px-3">
        <SidebarLink to="/" icon={House} label="Início" end />
        <SidebarLink to="/agenda" icon={CalendarDays} label="Agenda" />
        <SidebarLink to="/tasks" icon={ListChecks} label="Próximos passos" />
        <SidebarLink to="/dictations" icon={AudioLines} label="Ditados" />
        <SidebarLink to="/templates" icon={LayoutTemplate} label="Templates" />
        <SidebarLink to="/connections" icon={Plug} label="Conexões" />
        <FolderTreeNav />
      </nav>
    </ScrollArea>
    <div className="flex flex-col gap-2 p-3">
      <RecordingCard />
      <SidebarLink to="/settings" icon={Settings} label="Configurações" />
    </div>
  </aside>
);
