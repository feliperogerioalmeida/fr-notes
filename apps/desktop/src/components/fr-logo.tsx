import { cn } from "@workspace/ui/lib/utils";

import symbolOnDark from "@/assets/fr-compacto-negativa.svg";
import symbolOnLight from "@/assets/fr-simbolo-colorida.svg";

interface FrSymbolProps {
  className?: string;
}

export const FrSymbol = ({ className }: FrSymbolProps) => (
  <span className={cn("relative inline-flex shrink-0", className)}>
    <img
      src={symbolOnLight}
      alt="FR"
      className="size-full object-contain dark:hidden"
      draggable={false}
    />
    <img
      src={symbolOnDark}
      alt="FR"
      className="hidden size-full object-contain dark:block"
      draggable={false}
    />
  </span>
);

interface FrLogoProps {
  className?: string;
}

export const FrLogo = ({ className }: FrLogoProps) => (
  <span className={cn("inline-flex items-center gap-2", className)}>
    <FrSymbol className="h-5 w-[22px]" />
    <span className="text-label text-heading tracking-[0.18em] uppercase">
      Notes
    </span>
  </span>
);
