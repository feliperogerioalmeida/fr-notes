const SECTION_PATTERN = /^###\s+(.+?)(?:\s+[—–-]\s+(.+))?$/;

export interface TemplateSection {
  title: string;
  hint: string | null;
}

export const parseTemplateSections = (
  instructions: string,
): TemplateSection[] =>
  instructions
    .split("\n")
    .map((line) => line.trim().match(SECTION_PATTERN))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({ title: match[1] ?? "", hint: match[2] ?? null }));
