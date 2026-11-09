import {
  type Connection,
  type ConnectionCapability,
  findCatalogEntry,
} from "@workspace/core";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Check, Plug } from "lucide-react";
import { useNavigate } from "react-router";

import { useConnectionsQuery } from "./use-connections.js";

export const useCapableConnections = (capability: ConnectionCapability) => {
  const { data: connections = [] } = useConnectionsQuery();
  return connections.filter(
    (connection) =>
      connection.enabled &&
      findCatalogEntry(connection.provider).capabilities.includes(capability),
  );
};

interface ConnectionMenuItemsProps {
  capability: ConnectionCapability;
  label: string;
  isDone?: (connection: Connection) => boolean;
  onSelect: (connection: Connection) => void;
}

export const ConnectionMenuItems = ({
  capability,
  label,
  isDone,
  onSelect,
}: ConnectionMenuItemsProps) => {
  const connections = useCapableConnections(capability);
  const navigate = useNavigate();
  return (
    <>
      {connections.length > 0 && (
        <DropdownMenuLabel className="text-caption text-muted-foreground font-normal">
          {label}
        </DropdownMenuLabel>
      )}
      {connections.map((connection) => (
        <DropdownMenuItem
          key={connection.id}
          onSelect={() => onSelect(connection)}
        >
          <span className="flex-1 truncate">{connection.name}</span>
          {isDone?.(connection) && <Check className="text-success" />}
        </DropdownMenuItem>
      ))}
      {connections.length > 0 && <DropdownMenuSeparator />}
      <DropdownMenuItem onSelect={() => navigate("/connections")}>
        <Plug />
        {connections.length > 0 ? "Gerenciar conexões" : "Conectar um app"}
      </DropdownMenuItem>
    </>
  );
};
