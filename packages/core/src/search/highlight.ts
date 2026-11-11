export const HIGHLIGHT_START = "\u0002";
export const HIGHLIGHT_END = "\u0003";

export interface HighlightPart {
  text: string;
  highlighted: boolean;
}

export const splitHighlights = (snippet: string): HighlightPart[] =>
  snippet
    .split(HIGHLIGHT_START)
    .flatMap((chunk, index) => {
      if (index === 0) return [{ text: chunk, highlighted: false }];
      const [marked = "", rest = ""] = chunk.split(HIGHLIGHT_END);
      return [
        { text: marked, highlighted: true },
        { text: rest, highlighted: false },
      ];
    })
    .filter((part) => part.text.length > 0);

const MARKDOWN_NOISE =
  /(^|\s)(?:(?:#{1,6}|[-*+]|\d+\.|\[[ xX]\])\s+)+|\*\*|__|`/g;

export const cleanSnippet = (snippet: string): string =>
  snippet.replace(MARKDOWN_NOISE, "$1").replace(/\s+/g, " ").trim();
