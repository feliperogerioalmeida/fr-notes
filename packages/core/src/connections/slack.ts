import type { ActionItem } from "../domain/action-item.js";
import type { Note } from "../domain/note.js";
import { describeTaskOrigin, describeTaskTitle } from "./describe.js";
import {
  ConnectionRequestError,
  type HttpFetch,
  type SentResult,
} from "./http.js";

const PROVIDER = "Slack";

const SLACK_RULES: [RegExp, string][] = [
  [/^#{1,3}\s+(.+)$/gm, "*$1*"],
  [/\*\*(.+?)\*\*/g, "*$1*"],
  [/^(\s*)[-*]\s+\[ \]\s+/gm, "$1☐ "],
  [/^(\s*)[-*]\s+\[[xX]\]\s+/gm, "$1☑ "],
  [/^(\s*)[-*]\s+/gm, "$1• "],
];

export const markdownToSlack = (markdown: string): string =>
  SLACK_RULES.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    markdown,
  ).trim();

export const buildSlackNoteText = (note: Note, summary: string): string =>
  [`*${note.title || "Reunião sem título"}*`, markdownToSlack(summary)].join(
    "\n\n",
  );

export const buildSlackTaskText = (item: ActionItem, note: Note): string =>
  [`☐ *${describeTaskTitle(item)}*`, describeTaskOrigin(item, note)].join("\n");

interface PostSlackMessageInput {
  webhookUrl: string;
  text: string;
  fetch: HttpFetch;
}

export const postSlackMessage = async ({
  webhookUrl,
  text,
  fetch,
}: PostSlackMessageInput): Promise<SentResult> => {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new ConnectionRequestError(
      PROVIDER,
      response.status,
      await response.text(),
    );
  }
  return { externalId: null, url: null };
};
