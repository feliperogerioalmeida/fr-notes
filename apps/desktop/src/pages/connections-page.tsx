import {
  type Connection,
  CONNECTION_CATALOG,
  type ConnectionCatalogEntry,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { Plus, Webhook, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link } from "react-router";

import { PageContainer, PageTitle } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { ConnectDialog } from "@/features/connections/connect-dialog.js";
import { ProviderLogo } from "@/features/connections/provider-logo.js";
import {
  useConnectionsQuery,
  useDeleteConnection,
} from "@/features/connections/use-connections.js";

interface IntegrationRowProps {
  tile: ReactNode;
  title: string;
  subtitle: ReactNode;
  isConnected?: boolean;
  action: ReactNode;
}

const IntegrationRow = ({
  tile,
  title,
  subtitle,
  isConnected = false,
  action,
}: IntegrationRowProps) => (
  <article
    className={cn(
      "bg-card ease-brand flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-150",
      isConnected ? "border-border-strong" : "hover:border-border-strong",
    )}
  >
    <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-lg border p-2">
      {tile}
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <h2 className="text-body-sm text-heading font-semibold">{title}</h2>
        {isConnected && (
          <span className="text-caption text-success inline-flex items-center gap-1">
            <span className="bg-success size-1.5 rounded-full" />
            Conectado
          </span>
        )}
      </div>
      {subtitle}
    </div>
    {action}
  </article>
);

const Description = ({ children }: { children: ReactNode }) => (
  <p className="text-caption text-muted-foreground truncate">{children}</p>
);

const describeDestination = (connection: Connection, providerName: string) =>
  connection.name.replace(`${providerName} · `, "");

interface DestinationChipsProps {
  connections: Connection[];
  providerName: string;
}

const DestinationChips = ({
  connections,
  providerName,
}: DestinationChipsProps) => {
  const remove = useDeleteConnection();
  return (
    <ul className="flex flex-wrap gap-1">
      {connections.map((connection) => (
        <li
          key={connection.id}
          className="bg-secondary text-caption text-foreground inline-flex h-[1.125rem] items-center gap-0.5 rounded pl-1.5"
        >
          {describeDestination(connection, providerName)}
          <button
            type="button"
            onClick={() => remove.mutate(connection)}
            aria-label={`Desconectar ${connection.name}`}
            className="text-muted-foreground hover:text-foreground flex h-full items-center rounded px-1"
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
};

interface ProviderRowProps {
  entry: ConnectionCatalogEntry;
  connections: Connection[];
  onConnect: () => void;
}

const ProviderRow = ({ entry, connections, onConnect }: ProviderRowProps) => {
  const isConnected = connections.length > 0;
  return (
    <IntegrationRow
      tile={<ProviderLogo provider={entry.provider} className="size-full" />}
      title={entry.name}
      isConnected={isConnected}
      subtitle={
        isConnected ? (
          <DestinationChips
            connections={connections}
            providerName={entry.name}
          />
        ) : (
          <Description>{entry.description}</Description>
        )
      }
      action={
        isConnected ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onConnect}
            aria-label={`Adicionar outro destino do ${entry.name}`}
            title="Adicionar outro destino"
          >
            <Plus />
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onConnect}>
            Conectar
          </Button>
        )
      }
    />
  );
};

const WebhookRow = () => (
  <IntegrationRow
    tile={<Webhook className="text-heading size-full" strokeWidth={1.75} />}
    title="Webhooks"
    subtitle={<Description>Cada nota no seu sistema.</Description>}
    action={
      <Button size="sm" variant="secondary" asChild>
        <Link to="/settings/integracoes">Configurar</Link>
      </Button>
    }
  />
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
          <div className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {CONNECTION_CATALOG.map((entry) => (
              <ProviderRow
                key={entry.provider}
                entry={entry}
                connections={connections.filter(
                  (connection) => connection.provider === entry.provider,
                )}
                onConnect={() => setConnecting(entry)}
              />
            ))}
            <WebhookRow />
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
