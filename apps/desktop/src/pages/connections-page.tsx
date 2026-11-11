import {
  type Connection,
  CONNECTION_CATALOG,
  type ConnectionCapability,
  type ConnectionCatalogEntry,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowRight,
  FileText,
  ListChecks,
  type LucideIcon,
  Plus,
  Trash2,
  Webhook,
} from "lucide-react";
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

const CAPABILITIES: Record<
  ConnectionCapability,
  { label: string; icon: LucideIcon }
> = {
  task: { label: "Próximos passos", icon: ListChecks },
  note: { label: "Notas", icon: FileText },
};

interface IntegrationCardProps {
  tile: ReactNode;
  title: string;
  description: string;
  isConnected?: boolean;
  details?: ReactNode;
  footer: ReactNode;
}

const ConnectedPill = () => (
  <span className="text-caption text-success inline-flex items-center gap-1.5 font-medium">
    <span className="bg-success size-1.5 rounded-full" />
    Conectado
  </span>
);

const IntegrationCard = ({
  tile,
  title,
  description,
  isConnected = false,
  details,
  footer,
}: IntegrationCardProps) => (
  <article
    className={cn(
      "bg-card ease-brand flex flex-col gap-5 rounded-xl border p-5 transition-colors duration-150",
      isConnected ? "border-border-strong" : "hover:border-border-strong",
    )}
  >
    <header className="flex items-start gap-4">
      <span className="bg-secondary flex size-12 shrink-0 items-center justify-center rounded-xl border p-2.5">
        {tile}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-body text-heading font-semibold">{title}</h2>
          {isConnected && <ConnectedPill />}
        </div>
        <p className="text-caption text-muted-foreground">{description}</p>
      </div>
    </header>
    {details}
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      {footer}
    </footer>
  </article>
);

const CapabilityList = ({
  capabilities,
}: {
  capabilities: ConnectionCapability[];
}) => (
  <div className="flex flex-wrap items-center gap-3">
    {capabilities.map((capability) => {
      const { label, icon: Icon } = CAPABILITIES[capability];
      return (
        <span
          key={capability}
          className="text-caption text-muted-foreground inline-flex items-center gap-1.5"
        >
          <Icon className="size-3.5" />
          {label}
        </span>
      );
    })}
  </div>
);

const DestinationList = ({ connections }: { connections: Connection[] }) => {
  const remove = useDeleteConnection();
  return (
    <ul className="flex flex-col gap-1">
      {connections.map((connection) => (
        <li
          key={connection.id}
          className="bg-secondary/60 flex items-center gap-2.5 rounded-lg py-1.5 pr-1.5 pl-3"
        >
          <ProviderLogo provider={connection.provider} className="size-3.5" />
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
  );
};

interface ProviderCardProps {
  entry: ConnectionCatalogEntry;
  connections: Connection[];
  onConnect: () => void;
}

const ProviderCard = ({ entry, connections, onConnect }: ProviderCardProps) => {
  const isConnected = connections.length > 0;
  return (
    <IntegrationCard
      tile={<ProviderLogo provider={entry.provider} className="size-full" />}
      title={entry.name}
      description={entry.description}
      isConnected={isConnected}
      details={isConnected && <DestinationList connections={connections} />}
      footer={
        <>
          <CapabilityList capabilities={entry.capabilities} />
          <Button
            size="sm"
            variant={isConnected ? "ghost" : "secondary"}
            onClick={onConnect}
          >
            <Plus />
            {isConnected ? "Outro destino" : "Conectar"}
          </Button>
        </>
      }
    />
  );
};

const WebhookCard = () => (
  <IntegrationCard
    tile={<Webhook className="text-heading size-full" strokeWidth={1.75} />}
    title="Webhooks"
    description="Envie cada nota automaticamente para qualquer sistema: FR Hub, n8n, Make ou o seu backend."
    footer={
      <>
        <CapabilityList capabilities={["note"]} />
        <Button size="sm" variant="secondary" asChild>
          <Link to="/settings/integracoes">
            Configurar
            <ArrowRight />
          </Link>
        </Button>
      </>
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
