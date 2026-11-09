import type { Note } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import {
  Copy,
  Ellipsis,
  FolderInput,
  Send,
  Trash2,
  Webhook,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { sendNoteTo } from "@/features/action-items/send-to-connection.js";
import { ConnectionMenuItems } from "@/features/connections/connection-menu-items.js";
import { useFoldersQuery } from "@/features/folders/use-folders.js";
import { dispatchCurrentState } from "@/features/integrations/deliver-webhooks.js";

import { useDeleteNote, useUpdateNote } from "./use-notes.js";

const buildMarkdown = (note: Note) =>
  [
    `# ${note.title || "Sem título"}`,
    note.enhancedMarkdown ?? note.notesMarkdown,
  ]
    .filter(Boolean)
    .join("\n\n");

const FolderSubmenu = ({ note }: { note: Note }) => {
  const { data: folders = [] } = useFoldersQuery();
  const updateNote = useUpdateNote();
  const moveTo = (folderId: string | null) =>
    updateNote.mutate({ id: note.id, patch: { folderId } });
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FolderInput />
        Mover para pasta
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onSelect={() => moveTo(null)}>
          Sem pasta
        </DropdownMenuItem>
        {folders.map((folder) => (
          <DropdownMenuItem key={folder.id} onSelect={() => moveTo(folder.id)}>
            {folder.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

const SendNoteSubmenu = ({ note }: { note: Note }) => (
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>
      <Send />
      Enviar nota para
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent className="w-56">
      <ConnectionMenuItems
        capability="note"
        label="Destinos"
        onSelect={(connection) => void sendNoteTo({ note, connection })}
      />
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

export const NoteActionsMenu = ({ note }: { note: Note }) => {
  const deleteNote = useDeleteNote();
  const navigate = useNavigate();
  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(buildMarkdown(note));
    toast.success("Nota copiada em Markdown");
  };
  const sendToIntegrations = async () => {
    const results = await dispatchCurrentState(note);
    if (results.length === 0) {
      toast.message("Nenhum webhook ativo", {
        description: "Cadastre um em Configurações → Integrações.",
      });
      return;
    }
    const failed = results.filter((result) => result.error).length;
    if (failed > 0) toast.error(`${failed} envio(s) falharam`);
    else toast.success("Webhooks disparados");
  };
  const remove = async () => {
    await deleteNote.mutateAsync(note.id);
    navigate("/");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ações da nota">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={copyMarkdown}>
          <Copy />
          Copiar como Markdown
        </DropdownMenuItem>
        <SendNoteSubmenu note={note} />
        <DropdownMenuItem onSelect={() => void sendToIntegrations()}>
          <Webhook />
          Disparar webhooks
        </DropdownMenuItem>
        <FolderSubmenu note={note} />
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={remove}>
          <Trash2 />
          Apagar nota
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
