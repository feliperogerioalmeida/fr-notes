import {
  type ActionItem,
  type ActionItemGroup,
  type ActionItemGrouping,
  ANY_OWNER_FILTER,
  formatDayLabel,
  formatTime,
  groupActionItems,
  listActionItemOwners,
  matchesOwnerFilter,
  MINE_OWNER_FILTER,
  type Note,
} from "@workspace/core";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { FileText, ListChecks } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { PageContainer, PageTitle } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { ActionItemRow } from "@/features/action-items/action-item-row.js";
import { SendAllItemsMenu } from "@/features/action-items/action-items-panel.js";
import { useAllActionItems } from "@/features/action-items/use-action-items.js";
import { useNotesQuery } from "@/features/notes/use-notes.js";
import { useSettings } from "@/features/settings/use-settings.js";

type TaskFilter = "open" | "done" | "all";

const FILTER_LABELS: Record<TaskFilter, string> = {
  open: "Pendentes",
  done: "Concluídos",
  all: "Todos",
};

const GROUPING_LABELS: Record<ActionItemGrouping, string> = {
  note: "Por reunião",
  owner: "Por pessoa",
};

const FILTERS: Record<TaskFilter, (item: ActionItem) => boolean> = {
  open: (item) => !item.done,
  done: (item) => item.done,
  all: () => true,
};

const isTaskFilter = (value: string): value is TaskFilter =>
  value in FILTER_LABELS;

const isGrouping = (value: string): value is ActionItemGrouping =>
  value in GROUPING_LABELS;

const describeNoteDate = (note: Note) => {
  const iso = note.recordingStartedAt ?? note.createdAt;
  return `${formatDayLabel(new Date(iso))} · ${formatTime(iso)}`;
};

const NoteLink = ({ note }: { note: Note }) => (
  <Link
    to={`/notes/${note.id}`}
    className="text-caption text-muted-foreground hover:text-foreground inline-flex min-w-0 items-center gap-1 [&_svg]:size-3"
  >
    <FileText />
    <span className="truncate">{note.title || "Reunião sem título"}</span>
  </Link>
);

const GroupHeader = ({ group }: { group: ActionItemGroup }) => (
  <header className="flex items-center gap-3 border-b px-2 pb-2">
    <div className="flex min-w-0 flex-1 items-baseline gap-2">
      {group.note ? (
        <Link
          to={`/notes/${group.note.id}`}
          className="text-body-sm text-heading hover:text-brand truncate font-semibold"
        >
          {group.title || "Reunião sem título"}
        </Link>
      ) : (
        <span className="text-body-sm text-heading truncate font-semibold">
          {group.title}
        </span>
      )}
      {group.note && (
        <span className="text-caption text-muted-foreground shrink-0 first-letter:uppercase">
          {describeNoteDate(group.note)}
        </span>
      )}
      <span className="text-caption text-muted-foreground shrink-0 tabular-nums">
        {group.items.length}
      </span>
    </div>
    {group.note && <SendAllItemsMenu noteId={group.note.id} />}
  </header>
);

const TaskGroup = ({
  group,
  notesById,
}: {
  group: ActionItemGroup;
  notesById: Map<string, Note>;
}) => {
  const byOwner = group.note === null;
  return (
    <section className="flex flex-col gap-1">
      <GroupHeader group={group} />
      <ul className="flex flex-col gap-0.5">
        {group.items.map((item) => {
          const note = notesById.get(item.noteId);
          return (
            <ActionItemRow
              key={item.id}
              item={item}
              hideOwner={byOwner}
              context={byOwner && note ? <NoteLink note={note} /> : undefined}
            />
          );
        })}
      </ul>
    </section>
  );
};

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

const OwnerSelect = ({
  value,
  owners,
  onChange,
}: {
  value: string;
  owners: string[];
  onChange: (owner: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger size="sm" className="text-caption w-56">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={MINE_OWNER_FILTER}>Meus</SelectItem>
      <SelectItem value={ANY_OWNER_FILTER}>Todos os responsáveis</SelectItem>
      {owners.length > 0 && <SelectSeparator />}
      {owners.map((owner) => (
        <SelectItem key={owner} value={owner}>
          {owner}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const GroupingTabs = ({
  value,
  onChange,
}: {
  value: ActionItemGrouping;
  onChange: (grouping: ActionItemGrouping) => void;
}) => (
  <Tabs
    value={value}
    onValueChange={(next) => {
      if (isGrouping(next)) onChange(next);
    }}
  >
    <TabsList className="h-8">
      {(Object.keys(GROUPING_LABELS) as ActionItemGrouping[]).map((option) => (
        <TabsTrigger key={option} value={option} className="text-caption">
          {GROUPING_LABELS[option]}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

const useTaskView = () => {
  const settings = useSettings();
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [owner, setOwner] = useState(
    settings.userName.trim() ? MINE_OWNER_FILTER : ANY_OWNER_FILTER,
  );
  const [grouping, setGrouping] = useState<ActionItemGrouping>("note");
  const { data: items = [] } = useAllActionItems();
  const { data: notes = [] } = useNotesQuery();
  const ownedItems = items.filter((item) =>
    matchesOwnerFilter(item, owner, settings.userName),
  );
  const counts = {
    open: ownedItems.filter(FILTERS.open).length,
    done: ownedItems.filter(FILTERS.done).length,
    all: ownedItems.length,
  };
  const groups = groupActionItems({
    items: ownedItems.filter(FILTERS[filter]),
    notes,
    by: grouping,
  });
  return {
    filter,
    setFilter,
    owner,
    setOwner,
    grouping,
    setGrouping,
    counts,
    groups,
    owners: listActionItemOwners(items),
    notesById: new Map(notes.map((note) => [note.id, note])),
  };
};

export const TasksPage = () => {
  const view = useTaskView();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <PageTitle
            title="Próximos passos"
            description="Tudo o que ficou combinado nas reuniões, num lugar só."
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs
              filter={view.filter}
              counts={view.counts}
              onChange={view.setFilter}
            />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <OwnerSelect
                value={view.owner}
                owners={view.owners}
                onChange={view.setOwner}
              />
              <GroupingTabs value={view.grouping} onChange={view.setGrouping} />
            </div>
          </div>
          {view.groups.length === 0 ? (
            <EmptyTasks filter={view.filter} />
          ) : (
            <div className="flex flex-col gap-8">
              {view.groups.map((group) => (
                <TaskGroup
                  key={group.key}
                  group={group}
                  notesById={view.notesById}
                />
              ))}
            </div>
          )}
        </PageContainer>
      </ScrollArea>
    </div>
  );
};
