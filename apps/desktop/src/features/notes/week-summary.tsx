import { formatDuration, type Note, summarizeWeek } from "@workspace/core";

interface MetricProps {
  label: string;
  value: string;
}

const Metric = ({ label, value }: MetricProps) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-title-3 text-heading tabular-nums">{value}</span>
    <span className="text-caption text-muted-foreground">{label}</span>
  </div>
);

export const WeekSummary = ({ notes }: { notes: Note[] }) => {
  const summary = summarizeWeek(notes);
  return (
    <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-label text-muted-foreground uppercase">
        Esta semana
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <Metric label="notas" value={String(summary.notesCount)} />
        <Metric label="gravadas" value={formatDuration(summary.recordedMs)} />
        <Metric label="com IA" value={String(summary.enhancedCount)} />
      </div>
    </section>
  );
};
