const TASK_LINE = /^(\s*)[-*]\s+\[( |x|X)\]\s+(.+?)\s*$/;
const OWNER_SEPARATOR = /\s+[—–-]\s+/;
const DUE_SUFFIX = /\s*\(([^()]+)\)\s*$/;
const MAX_OWNER_WORDS = 4;
const MAX_OWNER_LENGTH = 40;

export interface ParsedActionItem {
  key: string;
  text: string;
  owner: string | null;
  dueText: string | null;
  done: boolean;
}

export const normalizeTaskText = (text: string): string =>
  text
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const looksLikeOwner = (candidate: string) =>
  candidate.length <= MAX_OWNER_LENGTH &&
  candidate.trim().split(/\s+/).length <= MAX_OWNER_WORDS;

const splitOwner = (body: string) => {
  const [first, ...rest] = body.split(OWNER_SEPARATOR);
  if (rest.length === 0 || !first || !looksLikeOwner(first)) {
    return { owner: null, task: body };
  }
  return { owner: first.trim(), task: rest.join(" — ").trim() };
};

const splitDue = (task: string) => {
  const match = task.match(DUE_SUFFIX);
  if (!match?.[1]) return { text: task.trim(), dueText: null };
  return {
    text: task.slice(0, match.index).trim(),
    dueText: match[1].trim(),
  };
};

const parseTaskLine = (line: string): ParsedActionItem | null => {
  const match = line.match(TASK_LINE);
  if (!match?.[3]) return null;
  const body = match[3].replace(/\*\*/g, "");
  const { owner, task } = splitOwner(body);
  const { text, dueText } = splitDue(task);
  if (!text) return null;
  return {
    key: normalizeTaskText(`${owner ?? ""} ${text}`),
    text,
    owner,
    dueText,
    done: match[2]?.toLowerCase() === "x",
  };
};

export const extractActionItems = (markdown: string): ParsedActionItem[] =>
  markdown
    .split("\n")
    .map(parseTaskLine)
    .filter((item): item is ParsedActionItem => item !== null);

interface SetTaskCheckedInput {
  markdown: string;
  key: string;
  done: boolean;
}

export const setTaskChecked = ({
  markdown,
  key,
  done,
}: SetTaskCheckedInput): string =>
  markdown
    .split("\n")
    .map((line) => {
      const parsed = parseTaskLine(line);
      if (!parsed || parsed.key !== key) return line;
      return line.replace(/\[( |x|X)\]/, done ? "[x]" : "[ ]");
    })
    .join("\n");
