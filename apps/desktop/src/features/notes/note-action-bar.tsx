import type { Note, Template } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Separator } from "@workspace/ui/components/ui/separator";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowUp,
  ListChecks,
  LoaderCircle,
  type LucideIcon,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import {
  selectOpenItems,
  useNoteActionItems,
} from "@/features/action-items/use-action-items.js";
import { useEnhanceJob } from "@/features/enhance/enhance-store.js";
import { TemplateMenu } from "@/features/enhance/template-menu.js";
import { RecordingControl } from "@/features/recording/recording-control.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";

import type { SidePanel } from "./note-side-panel.js";

interface NoteActionBarProps {
  note: Note;
  hasTranscript: boolean;
  panel: SidePanel | null;
  onTogglePanel: (panel: SidePanel) => void;
  onAsk: (question: string) => void;
  onEnhance: (template: Template) => void;
}

const AskInput = ({ onAsk }: { onAsk: (question: string) => void }) => {
  const [question, setQuestion] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    onAsk(question);
    setQuestion("");
  };
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-1">
      <Input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Pergunte sobre esta reunião…"
        className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <Button
        type="submit"
        size="icon-sm"
        variant="ghost"
        disabled={!question.trim()}
        aria-label="Perguntar"
      >
        <ArrowUp />
      </Button>
    </form>
  );
};

const describeEnhanceAction = (isEnhancing: boolean, isFirstRun: boolean) => {
  if (isEnhancing) return "Gerando…";
  if (isFirstRun) return "Gerar notas";
  return "Regerar";
};

const EnhanceButton = ({
  note,
  onEnhance,
}: Pick<NoteActionBarProps, "note" | "onEnhance">) => {
  const isRecording = useRecordingStore((state) => state.noteId === note.id);
  const isEnhancing = Boolean(useEnhanceJob(note.id));
  const isFirstRun = !note.enhancedMarkdown;
  return (
    <TemplateMenu activeTemplateId={note.templateId} onSelect={onEnhance}>
      <Button
        size="sm"
        variant={isFirstRun && !isRecording ? "default" : "secondary"}
        disabled={isEnhancing}
        className="gap-1.5"
      >
        {isEnhancing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
        {describeEnhanceAction(isEnhancing, isFirstRun)}
      </Button>
    </TemplateMenu>
  );
};

interface PanelToggleProps {
  target: SidePanel;
  label: string;
  icon: LucideIcon;
  panel: SidePanel | null;
  count?: number;
  onToggle: (panel: SidePanel) => void;
}

const PanelToggle = ({
  target,
  label,
  icon: Icon,
  panel,
  count = 0,
  onToggle,
}: PanelToggleProps) => (
  <Button
    size={count > 0 ? "sm" : "icon-sm"}
    variant="ghost"
    aria-label={label}
    aria-pressed={panel === target}
    onClick={() => onToggle(target)}
    className={cn("gap-1", panel === target && "bg-accent text-brand")}
  >
    <Icon />
    {count > 0 && <span className="text-caption tabular-nums">{count}</span>}
  </Button>
);

const TasksToggle = ({
  noteId,
  panel,
  onToggle,
}: {
  noteId: string;
  panel: SidePanel | null;
  onToggle: (panel: SidePanel) => void;
}) => {
  const { data: items = [] } = useNoteActionItems(noteId);
  return (
    <PanelToggle
      target="tasks"
      label="Próximos passos"
      icon={ListChecks}
      panel={panel}
      count={selectOpenItems(items).length}
      onToggle={onToggle}
    />
  );
};

export const NoteActionBar = ({
  note,
  hasTranscript,
  panel,
  onTogglePanel,
  onAsk,
  onEnhance,
}: NoteActionBarProps) => (
  <div className="bg-card/95 flex w-full max-w-2xl items-center gap-1 rounded-xl border p-1.5 shadow-lg backdrop-blur">
    <RecordingControl noteId={note.id} hasTranscript={hasTranscript} />
    <PanelToggle
      target="transcript"
      label="Transcrição"
      icon={ScrollText}
      panel={panel}
      onToggle={onTogglePanel}
    />
    <TasksToggle noteId={note.id} panel={panel} onToggle={onTogglePanel} />
    <Separator orientation="vertical" className="mx-1 h-5!" />
    <AskInput onAsk={onAsk} />
    <EnhanceButton note={note} onEnhance={onEnhance} />
  </div>
);
