import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import {
  AudioLines,
  CalendarDays,
  Folder,
  House,
  LayoutTemplate,
  type LucideIcon,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { NavLink } from "react-router";

import {
  useCreateFolder,
  useFoldersQuery,
} from "@/features/folders/use-folders.js";
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

const NewFolderInput = ({ onDone }: { onDone: () => void }) => {
  const [name, setName] = useState("");
  const createFolder = useCreateFolder();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) await createFolder.mutateAsync(name);
    onDone();
  };
  return (
    <form onSubmit={submit} className="px-1">
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={onDone}
        placeholder="Nome da pasta"
        className="h-8"
      />
    </form>
  );
};

const FoldersSection = () => {
  const { data: folders = [] } = useFoldersQuery();
  const [isCreating, setIsCreating] = useState(false);
  return (
    <section className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-2.5 pt-4 pb-1">
        <span className="text-label text-muted-foreground uppercase">
          Pastas
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Nova pasta"
          onClick={() => setIsCreating(true)}
        >
          <Plus />
        </Button>
      </div>
      {isCreating && <NewFolderInput onDone={() => setIsCreating(false)} />}
      {folders.map((folder) => (
        <SidebarLink
          key={folder.id}
          to={`/folders/${folder.id}`}
          icon={Folder}
          label={folder.name}
        />
      ))}
    </section>
  );
};

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
    <div className="relative px-3 pt-3 pb-2">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-5.5 mt-0.5 size-3.5 -translate-y-1/2" />
      <Input
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar notas"
        className="h-8 pl-8"
      />
    </div>
    <ScrollArea className="min-h-0 flex-1">
      <nav className="flex flex-col gap-0.5 px-3">
        <SidebarLink to="/" icon={House} label="Início" end />
        <SidebarLink to="/agenda" icon={CalendarDays} label="Agenda" />
        <SidebarLink to="/dictations" icon={AudioLines} label="Ditados" />
        <SidebarLink to="/templates" icon={LayoutTemplate} label="Templates" />
        <FoldersSection />
      </nav>
    </ScrollArea>
    <div className="flex flex-col gap-2 p-3">
      <RecordingCard />
      <SidebarLink to="/settings" icon={Settings} label="Configurações" />
    </div>
  </aside>
);
