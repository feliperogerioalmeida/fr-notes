import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const BRAND_FONT_SIZES = [
  "display",
  "title-1",
  "title-2",
  "title-3",
  "body-lg",
  "body",
  "body-sm",
  "caption",
  "label",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: BRAND_FONT_SIZES }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
