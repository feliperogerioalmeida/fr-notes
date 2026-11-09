import { describeParticipant, type Note } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { Check, Pencil, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";

import { useUpdateNote } from "@/features/notes/use-notes.js";

interface SpeakerNamePopoverProps {
  note: Note;
  speakerIndex: number;
  label: string;
}

const uniqueNames = (note: Note) => [
  ...new Set(note.participants.map(describeParticipant)),
];

export const SpeakerNamePopover = ({
  note,
  speakerIndex,
  label,
}: SpeakerNamePopoverProps) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const updateNote = useUpdateNote();
  const key = String(speakerIndex);
  const assigned = note.speakerNames[key];

  const assign = (name: string | null) => {
    const speakerNames = { ...note.speakerNames };
    if (name?.trim()) speakerNames[key] = name.trim();
    else delete speakerNames[key];
    updateNote.mutate({ id: note.id, patch: { speakerNames } });
    setCustom("");
    setOpen(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    assign(custom);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="text-label text-muted-foreground hover:text-foreground h-auto gap-1 self-start px-1 py-0.5 uppercase"
          title="Quem é?"
        >
          {label}
          <Pencil className="size-2.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-64 flex-col gap-3 p-3">
        <span className="text-caption text-muted-foreground">
          Quem é a voz {speakerIndex + 1}?
        </span>
        <div className="flex flex-col gap-0.5">
          {uniqueNames(note).map((name) => (
            <Button
              key={name}
              size="sm"
              variant="ghost"
              className="justify-start"
              onClick={() => assign(name)}
            >
              <UserRound />
              <span className="flex-1 text-left">{name}</span>
              {assigned === name && <Check className="text-brand" />}
            </Button>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Outro nome"
            className="h-8"
          />
          <Button type="submit" size="sm" variant="secondary">
            Salvar
          </Button>
        </form>
        {assigned && (
          <Button
            size="xs"
            variant="ghost"
            className="text-muted-foreground self-start"
            onClick={() => assign(null)}
          >
            Voltar para “Pessoa {speakerIndex + 1}”
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
