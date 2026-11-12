import { formatDayLabel, formatTime, type Note } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { describeError } from "@/lib/errors.js";

import { useRescheduleNote } from "./use-notes.js";

const pad = (value: number) => String(value).padStart(2, "0");

const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toTimeInput = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const fromInputs = (day: string, time: string) => {
  const [year, month, date] = day.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if (
    !year ||
    !month ||
    !date ||
    hours === undefined ||
    minutes === undefined
  ) {
    return null;
  }
  return new Date(year, month - 1, date, hours, minutes).getTime();
};

const useDateForm = (startedAt: Date) => {
  const [day, setDay] = useState(() => toDateInput(startedAt));
  const [time, setTime] = useState(() => toTimeInput(startedAt));
  const reset = () => {
    setDay(toDateInput(startedAt));
    setTime(toTimeInput(startedAt));
  };
  return { day, setDay, time, setTime, reset };
};

interface RescheduleFormProps {
  form: ReturnType<typeof useDateForm>;
  isSaving: boolean;
  onSave: () => void;
}

const RescheduleForm = ({ form, isSaving, onSave }: RescheduleFormProps) => (
  <>
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note-date">Data</Label>
        <Input
          id="note-date"
          type="date"
          value={form.day}
          onChange={(event) => form.setDay(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note-time">Horário</Label>
        <Input
          id="note-time"
          type="time"
          value={form.time}
          onChange={(event) => form.setTime(event.target.value)}
        />
      </div>
    </div>
    <p className="text-caption text-muted-foreground">
      A transcrição acompanha: cada fala continua no mesmo ponto da reunião.
    </p>
    <Button size="sm" disabled={isSaving} onClick={onSave}>
      Salvar
    </Button>
  </>
);

export const NoteDateChip = ({ note }: { note: Note }) => {
  const startedAtIso = note.recordingStartedAt ?? note.createdAt;
  const startedAt = new Date(startedAtIso);
  const form = useDateForm(startedAt);
  const [open, setOpen] = useState(false);
  const reschedule = useRescheduleNote();
  const save = async () => {
    const startedAtMs = fromInputs(form.day, form.time);
    if (startedAtMs === null) return;
    try {
      await reschedule.mutateAsync({ id: note.id, startedAtMs });
      setOpen(false);
    } catch (error) {
      toast.error(describeError(error));
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset();
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Mudar data e horário"
          className="text-caption text-muted-foreground bg-secondary hover:bg-accent hover:text-foreground ease-brand inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors duration-150 [&_svg]:size-3.5"
        >
          <CalendarDays />
          {`${formatDayLabel(startedAt)}, ${formatTime(startedAtIso)}`}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-3">
        <RescheduleForm
          form={form}
          isSaving={reschedule.isPending}
          onSave={() => void save()}
        />
      </PopoverContent>
    </Popover>
  );
};
