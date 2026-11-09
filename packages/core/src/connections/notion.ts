import type { Note } from "../domain/note.js";
import type { PickerOption } from "./clickup.js";
import { type HttpFetch, requestJson, type SentResult } from "./http.js";

const API = "https://api.notion.com/v1";
const PROVIDER = "Notion";
const NOTION_VERSION = "2022-06-28";
const MAX_BLOCKS = 100;
const MAX_TEXT = 2000;

interface NotionAuth {
  token: string;
  fetch: HttpFetch;
}

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Notion-Version": NOTION_VERSION,
  "Content-Type": "application/json",
});

const richText = (content: string) => [
  {
    type: "text",
    text: { content: content.replace(/\*\*/g, "").slice(0, MAX_TEXT) },
  },
];

const block = (type: string, content: string, extra: object = {}) => ({
  object: "block",
  type,
  [type]: { rich_text: richText(content), ...extra },
});

const BLOCK_RULES: [RegExp, (match: RegExpMatchArray) => object][] = [
  [/^###\s+(.+)$/, (match) => block("heading_3", match[1] ?? "")],
  [/^##\s+(.+)$/, (match) => block("heading_2", match[1] ?? "")],
  [/^#\s+(.+)$/, (match) => block("heading_1", match[1] ?? "")],
  [
    /^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/,
    (match) => block("to_do", match[2] ?? "", { checked: match[1] !== " " }),
  ],
  [/^\s*[-*]\s+(.+)$/, (match) => block("bulleted_list_item", match[1] ?? "")],
];

const toBlock = (line: string): object => {
  for (const [pattern, build] of BLOCK_RULES) {
    const match = line.match(pattern);
    if (match) return build(match);
  }
  return block("paragraph", line);
};

export const markdownToNotionBlocks = (markdown: string): object[] =>
  markdown
    .split("\n")
    .filter((line) => line.trim())
    .map(toBlock)
    .slice(0, MAX_BLOCKS);

interface NotionDatabase {
  id: string;
  title?: { plain_text: string }[];
  properties?: Record<string, { type: string }>;
}

export const listNotionDatabases = async ({
  token,
  fetch,
}: NotionAuth): Promise<PickerOption[]> => {
  const result = await requestJson<{ results: NotionDatabase[] }>({
    fetch,
    provider: PROVIDER,
    url: `${API}/search`,
    init: {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        filter: { property: "object", value: "database" },
      }),
    },
  });
  return result.results.map((database) => ({
    id: database.id,
    name:
      database.title?.map((part) => part.plain_text).join("") || "Sem título",
    path: "Notion",
  }));
};

const findTitleProperty = async (
  { token, fetch }: NotionAuth,
  databaseId: string,
) => {
  const database = await requestJson<NotionDatabase>({
    fetch,
    provider: PROVIDER,
    url: `${API}/databases/${databaseId}`,
    init: { method: "GET", headers: headers(token) },
  });
  const entry = Object.entries(database.properties ?? {}).find(
    ([, property]) => property.type === "title",
  );
  return entry?.[0] ?? "Name";
};

interface CreateNotionPageInput extends NotionAuth {
  databaseId: string;
  note: Note;
  summary: string;
}

export const createNotionPage = async ({
  databaseId,
  note,
  summary,
  ...auth
}: CreateNotionPageInput): Promise<SentResult> => {
  const titleProperty = await findTitleProperty(auth, databaseId);
  const page = await requestJson<{ id: string; url?: string }>({
    fetch: auth.fetch,
    provider: PROVIDER,
    url: `${API}/pages`,
    init: {
      method: "POST",
      headers: headers(auth.token),
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          [titleProperty]: {
            title: richText(note.title || "Reunião sem título"),
          },
        },
        children: markdownToNotionBlocks(summary),
      }),
    },
  });
  return { externalId: page.id, url: page.url ?? null };
};
