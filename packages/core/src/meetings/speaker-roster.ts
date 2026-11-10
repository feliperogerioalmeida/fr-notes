export interface AxNode {
  parent?: number;
  role: string;
  subrole?: string;
  title?: string;
  description?: string;
  value?: string;
  identifier?: string;
  classes?: string[];
}

export interface AxSnapshot {
  bundleId: string;
  pid: number;
  observedAtMs: number;
  truncated: boolean;
  nodes: AxNode[];
}

export type RosterBlindReason =
  | "no-tree"
  | "no-known-names"
  | "no-participants-visible";

export interface RosterParticipant {
  name: string;
  active: boolean;
}

export interface RosterReading {
  observedAtMs: number;
  participants: RosterParticipant[];
  activeNames: string[];
  blindReason: RosterBlindReason | null;
}

interface ReadRosterInput {
  snapshot: AxSnapshot;
  knownNames: string[];
  selfNames?: string[];
}

const TILE_ANCESTOR_LEVELS = 4;
const MAX_TILE_NODES = 80;
const MIN_FIRST_NAME_LENGTH = 3;
const ACTIVE_TEXT_PATTERN =
  /\b(is speaking|speaking|is talking|talking|esta falando|falando|orador ativo|active speaker|hablando)\b/;
const SELF_SPEAKING_PATTERN = /\b(you are speaking|voce esta falando)\b/;
const ACTIVE_CLASS_PATTERN =
  /speaking|talking|active-?speaker|speaker-?active/i;

export const normalizeLabel = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsWords = (haystack: string, words: string) =>
  new RegExp(`(^|[^a-z0-9])${escapeRegExp(words)}([^a-z0-9]|$)`).test(haystack);

const nodeTexts = (node: AxNode): string[] =>
  [node.title, node.description, node.value]
    .filter((text): text is string => Boolean(text))
    .map(normalizeLabel);

interface NamePattern {
  name: string;
  variants: string[];
}

const buildNamePatterns = (names: string[]): NamePattern[] => {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const firstNames = unique.map((name) => normalizeLabel(name).split(" ")[0]);
  return unique.map((name) => {
    const full = normalizeLabel(name);
    const first = full.split(" ")[0] ?? "";
    const isUniqueFirst =
      first.length >= MIN_FIRST_NAME_LENGTH &&
      firstNames.filter((candidate) => candidate === first).length === 1;
    return {
      name,
      variants: isUniqueFirst && first !== full ? [full, first] : [full],
    };
  });
};

const matchName = (node: AxNode, patterns: NamePattern[]) => {
  const texts = nodeTexts(node);
  return patterns.find((pattern) =>
    pattern.variants.some((variant) =>
      texts.some((text) => containsWords(text, variant)),
    ),
  );
};

const buildChildren = (nodes: AxNode[]) => {
  const children = new Map<number, number[]>();
  nodes.forEach((node, index) => {
    if (node.parent === undefined) return;
    children.set(node.parent, [...(children.get(node.parent) ?? []), index]);
  });
  return children;
};

const collectSubtree = (root: number, children: Map<number, number[]>) => {
  const collected: number[] = [];
  const stack = [root];
  while (stack.length > 0 && collected.length < MAX_TILE_NODES) {
    const index = stack.pop() as number;
    collected.push(index);
    stack.push(...(children.get(index) ?? []));
  }
  return collected;
};

const isActiveNode = (node: AxNode) =>
  nodeTexts(node).some(
    (text) =>
      ACTIVE_TEXT_PATTERN.test(text) && !SELF_SPEAKING_PATTERN.test(text),
  ) || (node.classes ?? []).some((name) => ACTIVE_CLASS_PATTERN.test(name));

interface TileContext {
  nodes: AxNode[];
  children: Map<number, number[]>;
  patterns: NamePattern[];
}

const findTileRoot = (nameIndex: number, context: TileContext) => {
  let tile = nameIndex;
  let current = context.nodes[nameIndex]?.parent;
  for (
    let level = 0;
    level < TILE_ANCESTOR_LEVELS && current !== undefined;
    level++
  ) {
    const names = new Set(
      collectSubtree(current, context.children)
        .map((index) => context.nodes[index])
        .map((node) =>
          node ? matchName(node, context.patterns)?.name : undefined,
        )
        .filter(Boolean),
    );
    if (names.size > 1) break;
    tile = current;
    current = context.nodes[current]?.parent;
  }
  return tile;
};

const isTileActive = (nameIndex: number, context: TileContext) =>
  collectSubtree(findTileRoot(nameIndex, context), context.children).some(
    (index) => {
      const node = context.nodes[index];
      return node ? isActiveNode(node) : false;
    },
  );

const blindReading = (
  observedAtMs: number,
  blindReason: RosterBlindReason,
): RosterReading => ({
  observedAtMs,
  participants: [],
  activeNames: [],
  blindReason,
});

export const readRoster = ({
  snapshot,
  knownNames,
  selfNames = [],
}: ReadRosterInput): RosterReading => {
  const { observedAtMs, nodes } = snapshot;
  if (nodes.length === 0) return blindReading(observedAtMs, "no-tree");
  const selves = new Set(selfNames.map(normalizeLabel));
  const others = knownNames.filter((name) => !selves.has(normalizeLabel(name)));
  if (others.length === 0) return blindReading(observedAtMs, "no-known-names");
  const context: TileContext = {
    nodes,
    children: buildChildren(nodes),
    patterns: buildNamePatterns(others),
  };
  const found = new Map<string, boolean>();
  nodes.forEach((node, index) => {
    const pattern = matchName(node, context.patterns);
    if (!pattern) return;
    found.set(
      pattern.name,
      (found.get(pattern.name) ?? false) || isTileActive(index, context),
    );
  });
  if (found.size === 0)
    return blindReading(observedAtMs, "no-participants-visible");
  const participants = [...found].map(([name, active]) => ({ name, active }));
  return {
    observedAtMs,
    participants,
    activeNames: participants
      .filter((item) => item.active)
      .map((item) => item.name),
    blindReason: null,
  };
};
