import type { ActionItem } from "../domain/action-item.js";
import type { Note } from "../domain/note.js";
import { describeTaskOrigin, describeTaskTitle } from "./describe.js";
import { type HttpFetch, requestJson, type SentResult } from "./http.js";

const API = "https://api.clickup.com/api/v2";
const PROVIDER = "ClickUp";

interface Named {
  id: string;
  name: string;
}

interface Folder extends Named {
  lists?: Named[];
}

export interface PickerOption {
  id: string;
  name: string;
  path: string;
}

interface ClickUpAuth {
  token: string;
  fetch: HttpFetch;
}

const get = <Body>({ token, fetch }: ClickUpAuth, path: string) =>
  requestJson<Body>({
    fetch,
    provider: PROVIDER,
    url: `${API}${path}`,
    init: { method: "GET", headers: { Authorization: token } },
  });

const listSpaceLists = async (auth: ClickUpAuth, space: Named, team: Named) => {
  const { lists } = await get<{ lists: Named[] }>(
    auth,
    `/space/${space.id}/list?archived=false`,
  );
  const { folders } = await get<{ folders: Folder[] }>(
    auth,
    `/space/${space.id}/folder?archived=false`,
  );
  const prefix = `${team.name} / ${space.name}`;
  return [
    ...lists.map((list) => ({ id: list.id, name: list.name, path: prefix })),
    ...folders.flatMap((folder) =>
      (folder.lists ?? []).map((list) => ({
        id: list.id,
        name: list.name,
        path: `${prefix} / ${folder.name}`,
      })),
    ),
  ];
};

export const listClickUpLists = async (
  auth: ClickUpAuth,
): Promise<PickerOption[]> => {
  const { teams } = await get<{ teams: Named[] }>(auth, "/team");
  const options: PickerOption[] = [];
  for (const team of teams) {
    const { spaces } = await get<{ spaces: Named[] }>(
      auth,
      `/team/${team.id}/space?archived=false`,
    );
    for (const space of spaces) {
      options.push(...(await listSpaceLists(auth, space, team)));
    }
  }
  return options;
};

interface CreateClickUpTaskInput extends ClickUpAuth {
  listId: string;
  item: ActionItem;
  note: Note;
}

export const createClickUpTask = async ({
  listId,
  item,
  note,
  ...auth
}: CreateClickUpTaskInput): Promise<SentResult> => {
  const task = await requestJson<{ id: string; url?: string }>({
    fetch: auth.fetch,
    provider: PROVIDER,
    url: `${API}/list/${listId}/task`,
    init: {
      method: "POST",
      headers: {
        Authorization: auth.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: describeTaskTitle(item),
        markdown_description: describeTaskOrigin(item, note),
      }),
    },
  });
  return { externalId: task.id, url: task.url ?? null };
};
