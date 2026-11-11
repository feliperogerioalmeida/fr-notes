import { openUrl } from "@tauri-apps/plugin-opener";
import {
  type CalendarEvent,
  describeMeetingProvider,
  describeParticipant,
  extractMeetingLink,
  type Note,
  toParticipants,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@workspace/ui/components/ui/popover";
import {
  CalendarDays,
  FileText,
  Lock,
  MapPin,
  Mic,
  Pencil,
  Repeat,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { useStartNote } from "@/features/notes/use-start-note.js";
import { describeError } from "@/lib/errors.js";

import { formatEventWhen } from "./calendar-format.js";
import { useDeleteCalendarEvent } from "./use-calendar-data.js";

const LIVE_LEAD_MS = 5 * 60_000;
const VISIBLE_PEOPLE = 5;
const DESCRIPTION_PREVIEW_CHARS = 280;

export interface EventSelection {
  event: CalendarEvent;
  anchor: DOMRect;
}

const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="text-caption text-muted-foreground flex items-start gap-2 [&>svg]:mt-0.5 [&>svg]:size-3.5 [&>svg]:shrink-0">
    {icon}
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

const NoteAction = ({
  event,
  note,
  onDone,
}: {
  event: CalendarEvent;
  note: Note | undefined;
  onDone: () => void;
}) => {
  const startNote = useStartNote();
  const navigate = useNavigate();
  if (note) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          onDone();
          navigate(`/notes/${note.id}`);
        }}
      >
        <FileText />
        Abrir nota
      </Button>
    );
  }
  if (event.isAllDay || event.endMs < Date.now()) return null;
  const live = event.startMs - LIVE_LEAD_MS <= Date.now();
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        onDone();
        void startNote({ event, record: live });
      }}
    >
      {live ? <Mic /> : <FileText />}
      {live ? "Gravar agora" : "Preparar notas"}
    </Button>
  );
};

const EventFacts = ({ event }: { event: CalendarEvent }) => {
  const people = toParticipants(event);
  const description = event.notes?.trim();
  return (
    <div className="flex flex-col gap-2">
      <Row icon={<CalendarDays />}>{event.calendarTitle}</Row>
      {event.location && <Row icon={<MapPin />}>{event.location}</Row>}
      {people.length > 0 && (
        <Row icon={<Users />}>
          {people.slice(0, VISIBLE_PEOPLE).map(describeParticipant).join(", ")}
          {people.length > VISIBLE_PEOPLE &&
            ` e mais ${people.length - VISIBLE_PEOPLE}`}
        </Row>
      )}
      {event.isRecurring && (
        <Row icon={<Repeat />}>
          Repete. Mudanças daqui valem só para esta ocorrência.
        </Row>
      )}
      {!event.canEdit && (
        <Row icon={<Lock />}>
          Só leitura: convite de outra pessoa ou agenda que não aceita
          alterações.
        </Row>
      )}
      {description && (
        <p className="text-caption text-muted-foreground border-t pt-2 whitespace-pre-wrap">
          {description.length > DESCRIPTION_PREVIEW_CHARS
            ? `${description.slice(0, DESCRIPTION_PREVIEW_CHARS)}…`
            : description}
        </p>
      )}
    </div>
  );
};

interface EditActionsProps {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  onClose: () => void;
}

const EditActions = ({ event, onEdit, onClose }: EditActionsProps) => {
  const remove = useDeleteCalendarEvent();
  const [confirming, setConfirming] = useState(false);
  if (!event.canEdit) return null;
  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(event.id);
      onClose();
      toast.success("Evento apagado");
    } catch (error) {
      toast.error(describeError(error));
    }
  };
  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-1">
        <span className="text-caption text-muted-foreground mr-auto">
          Apagar este evento?
        </span>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Não
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => void confirmDelete()}
        >
          Apagar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Apagar evento"
        onClick={() => setConfirming(true)}
      >
        <Trash2 />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onEdit(event)}>
        <Pencil />
        Editar
      </Button>
    </div>
  );
};

interface EventDetailsProps {
  selection: EventSelection | null;
  notesByEvent: Map<string | null, Note>;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
}

export const EventDetails = ({
  selection,
  notesByEvent,
  onClose,
  onEdit,
}: EventDetailsProps) => {
  if (!selection) return null;
  const { event, anchor } = selection;
  const link = extractMeetingLink(event);
  return (
    <Popover open onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor asChild>
        <div
          className="pointer-events-none fixed"
          style={{
            top: anchor.top,
            left: anchor.left,
            width: anchor.width,
            height: anchor.height,
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="right"
        align="start"
        collisionPadding={12}
        className="flex w-80 flex-col gap-3"
      >
        <div className="flex items-start gap-2.5">
          <span
            className="mt-1 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: event.calendarColor ?? "var(--brand)" }}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body-sm text-heading font-semibold">
              {event.title || "Sem título"}
            </span>
            <span className="text-caption text-muted-foreground">
              {formatEventWhen(event.startMs, event.endMs, event.isAllDay)}
            </span>
          </div>
        </div>
        <EventFacts event={event} />
        <div className="flex flex-wrap gap-1.5">
          {link && (
            <Button size="sm" onClick={() => void openUrl(link)}>
              <Video />
              Entrar no {describeMeetingProvider(link)}
            </Button>
          )}
          <NoteAction
            event={event}
            note={notesByEvent.get(event.id)}
            onDone={onClose}
          />
        </div>
        <EditActions
          event={event}
          onEdit={(target) => {
            onClose();
            onEdit(target);
          }}
          onClose={onClose}
        />
      </PopoverContent>
    </Popover>
  );
};
