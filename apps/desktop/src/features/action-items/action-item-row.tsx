import { openUrl } from "@tauri-apps/plugin-opener";
import {
  type ActionItem,
  describeProviderName,
  type SentRef,
} from "@workspace/core";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { CalendarClock, Check, LoaderCircle, Send, User } from "lucide-react";
import { type ReactNode, useState } from "react";

import { ConnectionMenuItems } from "@/features/connections/connection-menu-items.js";

import { sendItemTo, wasSentTo } from "./send-to-connection.js";
import { useToggleActionItem } from "./use-action-items.js";

const CheckButton = ({ item }: { item: ActionItem }) => {
  const toggle = useToggleActionItem();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.done}
      aria-label={item.done ? "Reabrir" : "Concluir"}
      onClick={() => toggle.mutate(item)}
      className={cn(
        "ease-brand mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150",
        item.done
          ? "bg-brand border-brand text-brand-foreground"
          : "border-border-strong hover:border-brand",
      )}
    >
      {item.done && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
};

const SentBadge = ({ sent }: { sent: SentRef }) => {
  const label = `Em ${describeProviderName(sent.provider)}`;
  if (!sent.url) return <Badge variant="secondary">{label}</Badge>;
  return (
    <Badge variant="secondary" asChild>
      <button
        type="button"
        onClick={() => void openUrl(sent.url ?? "")}
        className="hover:bg-accent cursor-pointer"
      >
        {label}
      </button>
    </Badge>
  );
};

const SendItemMenu = ({ item }: { item: ActionItem }) => {
  const [isSending, setIsSending] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-xs"
          variant="ghost"
          disabled={isSending}
          aria-label="Enviar próximo passo"
        >
          {isSending ? <LoaderCircle className="animate-spin" /> : <Send />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ConnectionMenuItems
          capability="task"
          label="Enviar para"
          isDone={(connection) => wasSentTo(item, connection)}
          onSelect={async (connection) => {
            setIsSending(true);
            await sendItemTo({ item, connection });
            setIsSending(false);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Chip = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <span className="text-caption text-muted-foreground inline-flex items-center gap-1 [&_svg]:size-3">
    {icon}
    {children}
  </span>
);

interface ActionItemRowProps {
  item: ActionItem;
  context?: ReactNode;
}

export const ActionItemRow = ({ item, context }: ActionItemRowProps) => (
  <li className="group hover:bg-accent/60 ease-brand flex items-start gap-3 rounded-md px-2 py-2 transition-colors duration-150">
    <CheckButton item={item} />
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p
        className={cn(
          "fr-selectable text-body-sm first-letter:uppercase",
          item.done ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        {item.text}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {item.owner && <Chip icon={<User />}>{item.owner}</Chip>}
        {item.dueText && <Chip icon={<CalendarClock />}>{item.dueText}</Chip>}
        {context}
        {item.sentTo.map((sent) => (
          <SentBadge key={`${sent.connectionId}-${sent.sentAt}`} sent={sent} />
        ))}
      </div>
    </div>
    <div className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
      <SendItemMenu item={item} />
    </div>
  </li>
);
