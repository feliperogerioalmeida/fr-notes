import {
  type Connection,
  CONNECTION_CATALOG,
  type ConnectionCatalogEntry,
} from "@workspace/core";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Plus, Trash2, Webhook } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { PageContainer, PageTitle } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { ConnectDialog } from "@/features/connections/connect-dialog.js";
import {
  useConnectionsQuery,
  useDeleteConnection,
} from "@/features/connections/use-connections.js";

const CAPABILITY_LABELS = { task: "Próximos passos", note: "Notas" } as const;

const Monogram = ({ name }: { name: string }) => (
  <span className="bg-secondary text-heading text-body flex size-10 shrink-0 items-center justify-center rounded-lg font-semibold">
    {name.charAt(0)}
  </span>
);

interface ProviderCardProps {
  entry: ConnectionCatalogEntry;
  connections: Connection[];
  onConnect: () => void;
}

const ProviderCard = ({ entry, connections, onConnect }: ProviderCardProps) => {
  const remove = useDeleteConnection();
  return (
    <article className="bg-card flex flex-col gap-4 rounded-lg border p-5">
      <header className="flex items-start gap-3">
        <Monogram name={entry.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-body text-heading font-semibold">{entry.name}</h2>
          <p className="text-caption text-muted-foreground">
            {entry.description}
          </p>
        </div>
      </header>
      <div className="flex flex-wrap gap-1.5">
        {entry.capabilities.map((capability) => (
          <Badge key={capability} variant="outline">
            {CAPABILITY_LABELS[capability]}
          </Badge>
        ))}
      </div>
      {connections.length > 0 && (
        <ul className="flex flex-col gap-1 border-t pt-3">
          {connections.map((connection) => (
            <li key={connection.id} className="flex items-center gap-2">
              <span className="bg-success size-1.5 rounded-full" />
              <span className="text-body-sm flex-1 truncate">
                {connection.name}
              </span>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => remove.mutate(connection)}
                aria-label={`Desconectar ${connection.name}`}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        size="sm"
        variant={connections.length > 0 ? "ghost" : "secondary"}
        className="mt-auto self-start"
        onClick={onConnect}
      >
        <Plus />
        {connections.length > 0 ? "Adicionar outro destino" : "Conectar"}
      </Button>
    </article>
  );
};

const WebhookCard = () => (
  <article className="bg-card flex flex-col gap-4 rounded-lg border p-5">
    <header className="flex items-start gap-3">
      <span className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Webhook className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-body text-heading font-semibold">Webhooks</h2>
        <p className="text-caption text-muted-foreground">
          Envie cada nota automaticamente para qualquer sistema: FR Hub, n8n,
          Make ou o seu backend.
        </p>
      </div>
    </header>
    <Button
      size="sm"
      variant="secondary"
      className="mt-auto self-start"
      asChild
    >
      <Link to="/settings/integracoes">Configurar webhooks</Link>
    </Button>
  </article>
);

export const ConnectionsPage = () => {
  const { data: connections = [] } = useConnectionsQuery();
  const [connecting, setConnecting] = useState<ConnectionCatalogEntry | null>(
    null,
  );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <PageTitle
            title="Conexões"
            description="Conecte só o que você usa. Na hora de enviar um próximo passo ou uma nota, você escolhe o destino."
          />
          <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {CONNECTION_CATALOG.map((entry) => (
              <ProviderCard
                key={entry.provider}
                entry={entry}
                connections={connections.filter(
                  (connection) => connection.provider === entry.provider,
                )}
                onConnect={() => setConnecting(entry)}
              />
            ))}
            <WebhookCard />
          </div>
        </PageContainer>
      </ScrollArea>
      <ConnectDialog
        entry={connecting}
        onOpenChange={(open) => {
          if (!open) setConnecting(null);
        }}
      />
    </div>
  );
};
