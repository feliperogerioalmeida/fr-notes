import "server-only";

import type { Dictionary } from "@/lib/dictionary.types";
import { defaultLocale, type Locale } from "@/lib/i18n.config";

const loaders = {
  "pt-BR": {
    common: () =>
      import("./dictionaries/pt-BR/common.json").then((m) => m.default),
    home: () => import("./dictionaries/pt-BR/home.json").then((m) => m.default),
    auth: () => import("./dictionaries/pt-BR/auth.json").then((m) => m.default),
  },
} satisfies Record<Locale, Record<string, () => Promise<unknown>>>;

type Namespace = keyof (typeof loaders)[Locale];

export const getNamespace = async <N extends Namespace>(
  namespace: N,
  locale?: Locale,
) => {
  const lang = locale ?? defaultLocale;
  return loaders[lang][namespace]() as Promise<Dictionary[N]>;
};

export const getDictionary = async (locale?: Locale): Promise<Dictionary> => {
  const lang = locale ?? defaultLocale;
  const entries = Object.entries(loaders[lang]);
  const results = await Promise.all(
    entries.map(async ([key, loader]) => [key, await loader()] as const),
  );
  return Object.fromEntries(results) as unknown as Dictionary;
};
