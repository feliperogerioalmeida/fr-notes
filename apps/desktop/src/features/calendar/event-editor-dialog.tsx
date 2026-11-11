import { addDays, type CalendarEvent, startOfDay } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Input } from "@workspace/ui/components/ui/input";
import { Switch } from "@workspace/ui/components/ui/switch";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { SelectSetting } from "@/features/settings/settings-controls.js";
import { SettingsField } from "@/features/settings/settings-section.js";
import { useSettings } from "@/features/settings/use-settings.js";
import { describeError } from "@/lib/errors.js";
import type { SaveCalendarEventArgs } from "@/lib/native.js";

import { useCalendarsQuery } from "./use-calendar.js";
import { useSaveCalendarEvent } from "./use-calendar-data.js";

const LAST_CALENDAR_KEY = "fr-notes:last-calendar";
const TRUNCATED_NOTES_CHARS = 4000;

export interface EditorDraft {
  event: CalendarEvent | null;
  startMs: number;
  endMs: number;
  isAllDay: boolean;
}

interface EventForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  calendarId: string;
  location: string;
  notes: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

const toDateInput = (ms: number) => {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toTimeInput = (ms: number) => {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromInputs = (date: string, time = "00:00") =>
  new Date(`${date}T${time}:00`).getTime();

const readLastCalendar = () => {
  try {
    return localStorage.getItem(LAST_CALENDAR_KEY) ?? "";
  } catch {
    return "";
  }
};

const rememberCalendar = (calendarId: string) => {
  try {
    localStorage.setItem(LAST_CALENDAR_KEY, calendarId);
  } catch {
    return;
  }
};

const initialForm = (draft: EditorDraft): EventForm => ({
  title: draft.event?.title ?? "",
  date: toDateInput(draft.startMs),
  startTime: toTimeInput(draft.startMs),
  endTime: toTimeInput(draft.endMs),
  allDay: draft.isAllDay,
  calendarId: draft.event?.calendarId ?? readLastCalendar(),
  location: draft.event?.location ?? "",
  notes: draft.event?.notes ?? "",
});

const changedOrNull = (
  value: string,
  original: string | null | undefined,
  isNew: boolean,
) => {
  if (isNew) return value.trim() || null;
  return value !== (original ?? "") ? value : null;
};

const buildArgs = (
  form: EventForm,
  draft: EditorDraft,
): SaveCalendarEventArgs | null => {
  const startMs = form.allDay
    ? startOfDay(fromInputs(form.date))
    : fromInputs(form.date, form.startTime);
  const endMs = form.allDay
    ? addDays(startMs, 1)
    : fromInputs(form.date, form.endTime);
  if (endMs <= startMs) return null;
  const isNew = !draft.event;
  return {
    id: draft.event?.id ?? null,
    calendarId: form.calendarId || null,
    title: form.title.trim() || "Sem título",
    startMs,
    endMs,
    isAllDay: form.allDay,
    location: changedOrNull(form.location, draft.event?.location, isNew),
    notes: changedOrNull(form.notes, draft.event?.notes, isNew),
  };
};

const useWritableCalendars = () => {
  const { data: calendars = [] } = useCalendarsQuery();
  const { hiddenCalendarIds } = useSettings();
  return calendars
    .filter(
      (calendar) =>
        calendar.allowsModifications &&
        !hiddenCalendarIds.includes(calendar.id),
    )
    .map((calendar) => ({
      value: calendar.id,
      label: `${calendar.title} · ${calendar.source}`,
    }));
};

interface FormFieldsProps {
  form: EventForm;
  update: (patch: Partial<EventForm>) => void;
  notesLocked: boolean;
}

const TimeFields = ({ form, update }: Omit<FormFieldsProps, "notesLocked">) => (
  <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
    <SettingsField label="Dia" htmlFor="event-date">
      <Input
        id="event-date"
        type="date"
        value={form.date}
        onChange={(event) => update({ date: event.target.value })}
      />
    </SettingsField>
    {!form.allDay && (
      <>
        <SettingsField label="Início" htmlFor="event-start">
          <Input
            id="event-start"
            type="time"
            step={900}
            value={form.startTime}
            onChange={(event) => update({ startTime: event.target.value })}
          />
        </SettingsField>
        <SettingsField label="Fim" htmlFor="event-end">
          <Input
            id="event-end"
            type="time"
            step={900}
            value={form.endTime}
            onChange={(event) => update({ endTime: event.target.value })}
          />
        </SettingsField>
      </>
    )}
  </div>
);

const FormFields = ({ form, update, notesLocked }: FormFieldsProps) => {
  const calendars = useWritableCalendars();
  return (
    <div className="flex flex-col gap-4">
      <Input
        autoFocus
        value={form.title}
        onChange={(event) => update({ title: event.target.value })}
        placeholder="Título do evento"
        className="text-body h-10"
      />
      <TimeFields form={form} update={update} />
      <label className="text-body-sm flex items-center gap-2">
        <Switch
          checked={form.allDay}
          onCheckedChange={(allDay) => update({ allDay })}
        />
        Dia inteiro
      </label>
      {calendars.length > 0 && (
        <SettingsField label="Agenda" htmlFor="event-calendar">
          <SelectSetting
            id="event-calendar"
            value={form.calendarId || calendars[0]?.value || ""}
            options={calendars}
            onChange={(calendarId) => update({ calendarId })}
          />
        </SettingsField>
      )}
      <SettingsField label="Local" htmlFor="event-location">
        <Input
          id="event-location"
          value={form.location}
          onChange={(event) => update({ location: event.target.value })}
          placeholder="Endereço ou link da reunião"
        />
      </SettingsField>
      <SettingsField
        label="Descrição"
        htmlFor="event-notes"
        hint={
          notesLocked
            ? "Descrição longa: edite pelo app Calendário para não cortar o texto."
            : undefined
        }
      >
        <Textarea
          id="event-notes"
          rows={3}
          disabled={notesLocked}
          value={form.notes}
          onChange={(event) => update({ notes: event.target.value })}
        />
      </SettingsField>
    </div>
  );
};

interface EventEditorDialogProps {
  draft: EditorDraft;
  onClose: () => void;
}

export const EventEditorDialog = ({
  draft,
  onClose,
}: EventEditorDialogProps) => {
  const [form, setForm] = useState(() => initialForm(draft));
  const save = useSaveCalendarEvent();
  const update = (patch: Partial<EventForm>) =>
    setForm((current) => ({ ...current, ...patch }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const args = buildArgs(form, draft);
    if (!args) return toast.error("O fim precisa ser depois do início.");
    try {
      await save.mutateAsync(args);
      if (args.calendarId) rememberCalendar(args.calendarId);
      toast.success(draft.event ? "Evento atualizado" : "Evento criado");
      onClose();
    } catch (error) {
      toast.error(describeError(error));
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle>
              {draft.event ? "Editar evento" : "Novo evento"}
            </DialogTitle>
            <DialogDescription>
              Vai direto para o Calendário da Apple e sincroniza com a conta da
              agenda escolhida.
            </DialogDescription>
          </DialogHeader>
          <FormFields
            form={form}
            update={update}
            notesLocked={
              (draft.event?.notes?.length ?? 0) >= TRUNCATED_NOTES_CHARS
            }
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
