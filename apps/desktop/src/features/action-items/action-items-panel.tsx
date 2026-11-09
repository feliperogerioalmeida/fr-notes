import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { ListChecks, LoaderCircle, SendHorizontal } from "lucide-react";
import { useState } from "react";

import { ConnectionMenuItems } from "@/features/connections/connection-menu-items.js";

import { ActionItemRow } from "./action-item-row.js";
import { sendItemsTo } from "./send-to-connection.js";
import { selectOpenItems, useNoteActionItems } from "./use-action-items.js";

export const SendAllItemsMenu = ({ noteId }: { noteId: string }) => {
  const { data: items = [] } = useNoteActionItems(noteId);
  const [isSending, setIsSending] = useState(false);
  const open = selectOpenItems(items);
  if (open.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="xs" variant="ghost" disabled={isSending}>
          {isSending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <SendHorizontal />
          )}
          Enviar todos
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ConnectionMenuItems
          capability="task"
          label={`Enviar ${open.length} pendentes para`}
          onSelect={async (connection) => {
            setIsSending(true);
            await sendItemsTo({ items: open, connection });
            setIsSending(false);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
    <span className="bg-secondary flex size-10 items-center justify-center rounded-full">
      <ListChecks className="text-muted-foreground size-5" />
    </span>
    <p className="text-body-sm text-heading font-medium">
      Nenhum próximo passo ainda
    </p>
    <p className="text-caption text-muted-foreground max-w-[260px]">
      Eles aparecem aqui quando você gera as notas com IA. Também dá para
      escrever nas Notas FR: “- [ ] Ana — enviar proposta (sexta)”.
    </p>
  </div>
);

export const ActionItemsPanel = ({ noteId }: { noteId: string }) => {
  const { data: items = [], isLoading } = useNoteActionItems(noteId);
  if (isLoading) return null;
  if (items.length === 0) return <EmptyState />;
  return (
    <ul className="-mx-2 flex flex-col gap-0.5">
      {items.map((item) => (
        <ActionItemRow key={item.id} item={item} />
      ))}
    </ul>
  );
};
