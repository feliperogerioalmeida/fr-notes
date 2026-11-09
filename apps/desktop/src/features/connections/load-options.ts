import {
  type ConnectionProvider,
  listClickUpLists,
  listLinearTeams,
  listNotionDatabases,
  type PickerOption,
} from "@workspace/core";

import { httpFetch } from "@/lib/http-client.js";

export interface ProviderTarget {
  configKey: string;
  nameKey: string;
  label: string;
  load: (token: string) => Promise<PickerOption[]>;
}

export const PROVIDER_TARGETS: Partial<
  Record<ConnectionProvider, ProviderTarget>
> = {
  clickup: {
    configKey: "listId",
    nameKey: "listName",
    label: "Lista",
    load: (token) => listClickUpLists({ token, fetch: httpFetch }),
  },
  linear: {
    configKey: "teamId",
    nameKey: "teamName",
    label: "Time",
    load: (token) => listLinearTeams({ token, fetch: httpFetch }),
  },
  notion: {
    configKey: "databaseId",
    nameKey: "databaseName",
    label: "Banco de dados",
    load: (token) => listNotionDatabases({ token, fetch: httpFetch }),
  },
};
