const MIN_TERM_LENGTH = 2;
const MAX_TERMS = 12;

const PORTUGUESE_STOPWORDS = new Set(
  [
    "a o as os um uma uns umas de da do das dos em na no nas nos ao aos",
    "por pela pelo pelas pelos para pra com sem e ou que quem qual quais",
    "quando onde como porque se ja nao sim foi era ser estar esta este essa",
    "esse isso isto aquilo eu voce voces ele ela eles elas me te lhe meu minha",
    "seu sua nosso nossa mais muito tambem so ate sobre entre la aqui",
    "falamos falou falaram disse disseram dito reuniao reunioes vez vezes",
    "algum alguma alguem coisa coisas tem ter teve tinha houve ha",
  ]
    .join(" ")
    .split(" "),
);

export const normalizeSearchText = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

interface ExtractTermsOptions {
  dropStopwords?: boolean;
}

export const extractSearchTerms = (
  text: string,
  { dropStopwords = false }: ExtractTermsOptions = {},
): string[] => {
  const tokens = normalizeSearchText(text).match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = tokens.filter(
    (token) =>
      token.length >= MIN_TERM_LENGTH &&
      !(dropStopwords && PORTUGUESE_STOPWORDS.has(token)),
  );
  return [...new Set(terms)].slice(0, MAX_TERMS);
};

export type MatchMode = "all" | "any";

export const buildMatchQuery = (terms: string[], mode: MatchMode): string =>
  terms.map((term) => `${term}*`).join(mode === "all" ? " " : " OR ");

export const countMatchedTerms = (text: string, terms: string[]): number => {
  const words = normalizeSearchText(text).match(/[\p{L}\p{N}]+/gu) ?? [];
  return terms.filter((term) => words.some((word) => word.startsWith(term)))
    .length;
};
