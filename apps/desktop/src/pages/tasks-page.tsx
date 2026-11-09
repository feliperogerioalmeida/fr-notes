import {
  type ActionItem,
  formatDayLabel,
  formatTime,
  type Note,
} from "@workspace/core";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { ListChecks } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { PageContainer, PageTitle } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { ActionItemRow } from "@/features/action-items/action-item-row.js";
import { SendAllItemsMenu } from "@/features/action-items/action-items-panel.js";
import { useAllActionItems } from "@/features/action-items/use-action-items.js";
import { useNotesQuery } from "@/features/notes/use-notes.js";

type TaskFilter = "open" | "done" | "all";

const FILTER_LABELS: Record<TaskFilter, string> = {
  open: "Pendentes",
  done: "Concluídos",
  all: "Todos",
};

const isTaskFilter = (value: string): value is TaskFilter =>
  value in FILTER_LABELS;

const FILTERS: Record<TaskFilter, (item: ActionItem) => boolean> = {
  open: (item) => !item.done,
  done: (item) => item.done,
  all: () => true,
};

interface NoteGroup {
  note: Note;
  items: ActionItem[];
}

const groupByNote = (items: ActionItem[], notes: Note[]): NoteGroup[] => {
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const groups = new Map<string, NoteGroup>();
  items.forEach((item) => {
    const note = notesById.get(item.noteId);
    if (!note) return;
    const group = groups.get(note.id) ?? { note, items: [] };
    group.items.push(item);
    groups.set(note.id, group);
  });
  return [...groups.values()];
};

const describeNoteDate = (note: Note) => {
  const iso = note.recordingStartedAt ?? note.createdAt;
  return `${formatDayLabel(new Date(iso))} · ${formatTime(iso)}`;
};

const NoteTasksCard = ({ group }: { group: NoteGroup }) => (
  <article className="bg-card flex flex-col gap-2 rounded-lg border p-4">
    <header className="flex items-start gap-3 px-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/notes/${group.note.id}`}
          className="text-body-sm text-heading hover:text-brand truncate font-semibold"
        >
          {group.note.title || "Reunião sem título"}
        </Link>
        <span className="text-caption text-muted-foreground first-letter:uppercase">
          {describeNoteDate(group.note)}
        </span>
      </div>
      <SendAllItemsMenu noteId={group.note.id} />
    </header>
    <ul className="flex flex-col gap-0.5">
      {group.items.map((item) => (
        <ActionItemRow key={item.id} item={item} />
      ))}
    </ul>
  </article>
);

const EmptyTasks = ({ filter }: { filter: TaskFilter }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
    <ListChecks className="text-muted-foreground size-6" />
    <p className="text-body-sm text-heading font-medium">
      {filter === "open" ? "Nada pendente" : "Nenhum próximo passo aqui"}
    </p>
    <p className="text-caption text-muted-foreground max-w-sm">
      Os próximos passos saem das notas geradas com IA. Envie cada um para o
      ClickUp, Linear ou Slack direto daqui.
    </p>
  </div>
);

const FilterTabs = ({
  filter,
  counts,
  onChange,
}: {
  filter: TaskFilter;
  counts: Record<TaskFilter, number>;
  onChange: (filter: TaskFilter) => void;
}) => (
  <Tabs
    value={filter}
    onValueChange={(value) => {
      if (isTaskFilter(value)) onChange(value);
    }}
  >
    <TabsList className="h-8">
      {(Object.keys(FILTER_LABELS) as TaskFilter[]).map((option) => (
        <TabsTrigger
          key={option}
          value={option}
          className="text-caption gap-1.5"
        >
          {FILTER_LABELS[option]}
          <span className="text-muted-foreground tabular-nums">
            {counts[option]}
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

export const TasksPage = () => {
  const [filter, setFilter] = useState<TaskFilter>("open");
  const { data: items = [] } = useAllActionItems();
  const { data: notes = [] } = useNotesQuery();
  const counts = {
    open: items.filter(FILTERS.open).length,
    done: items.filter(FILTERS.done).length,
    all: items.length,
  };
  const groups = groupByNote(items.filter(FILTERS[filter]), notes);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <PageTitle
            title="Próximos passos"
            description="Tudo o que ficou combinado nas reuniões, num lugar só."
            actions={
              <FilterTabs
                filter={filter}
                counts={counts}
                onChange={setFilter}
              />
            }
          />
          {groups.length === 0 ? (
            <EmptyTasks filter={filter} />
          ) : (
            <div className="grid items-start gap-4 @4xl:grid-cols-2">
              {groups.map((group) => (
                <NoteTasksCard key={group.note.id} group={group} />
              ))}
            </div>
          )}
        </PageContainer>
      </ScrollArea>
    </div>
  );
};
