import {
  formatDuration,
  type Note,
  pluralize,
  summarizeWeek,
} from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";
import { Link } from "react-router";

import { useAllActionItems } from "@/features/action-items/use-action-items.js";

const NOTE_FORMS = { one: "nota", other: "notas" };
const STEP_FORMS = { one: "passo aberto", other: "passos abertos" };

interface MetricProps {
  label: string;
  value: string;
  className?: string;
}

const Metric = ({ label, value, className }: MetricProps) => (
  <div className={cn("flex flex-col gap-0.5 whitespace-nowrap", className)}>
    <span className="text-title-3 text-heading whitespace-nowrap tabular-nums">
      {value}
    </span>
    <span className="text-caption text-muted-foreground">{label}</span>
  </div>
);

export const WeekSummary = ({ notes }: { notes: Note[] }) => {
  const { data: actionItems = [] } = useAllActionItems();
  const summary = summarizeWeek({ notes, actionItems });
  return (
    <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-label text-muted-foreground uppercase">
        Esta semana
      </h2>
      <div className="flex items-start justify-between gap-4">
        <Metric
          label={pluralize(summary.notesCount, NOTE_FORMS)}
          value={String(summary.notesCount)}
        />
        <Metric
          label="de gravação"
          value={formatDuration(summary.recordedMs)}
        />
        <Link
          to="/tasks"
          className="hover:bg-accent ease-brand -m-1.5 rounded-md p-1.5 transition-colors duration-150"
        >
          <Metric
            label={pluralize(summary.openStepsCount, STEP_FORMS)}
            value={String(summary.openStepsCount)}
          />
        </Link>
      </div>
    </section>
  );
};
