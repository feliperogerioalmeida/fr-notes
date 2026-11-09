import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Connection, ConnectionInput } from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import { connectionTokenKey, removeSecret, writeSecret } from "@/lib/native.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const useConnectionsQuery = () =>
  useQuery({
    queryKey: QUERY_KEYS.connections,
    queryFn: async () => (await getStorage()).connections.listConnections(),
  });

const useInvalidateConnections = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connections });
};

export interface SaveConnectionInput {
  input: ConnectionInput;
  token: string;
}

const persistConnection = async ({ input, token }: SaveConnectionInput) => {
  const id = await (await getStorage()).connections.createConnection(input);
  await writeSecret(connectionTokenKey(id), token);
  return id;
};

export const useSaveConnection = () => {
  const invalidate = useInvalidateConnections();
  return useMutation({ mutationFn: persistConnection, onSuccess: invalidate });
};

const removeConnection = async (connection: Connection) => {
  await (await getStorage()).connections.deleteConnection(connection.id);
  await removeSecret(connectionTokenKey(connection.id));
};

export const useDeleteConnection = () => {
  const invalidate = useInvalidateConnections();
  return useMutation({ mutationFn: removeConnection, onSuccess: invalidate });
};
