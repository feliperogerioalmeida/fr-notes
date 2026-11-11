import {
  type ConnectionProvider,
  ConnectionProviderSchema,
} from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";

import clickupLogo from "@/assets/integrations/clickup.svg";
import linearLogo from "@/assets/integrations/linear.svg";
import notionLogo from "@/assets/integrations/notion.svg";
import slackLogo from "@/assets/integrations/slack.svg";

interface LogoAsset {
  src: string;
  className?: string;
}

const PROVIDER_LOGOS: Record<ConnectionProvider, LogoAsset> = {
  clickup: { src: clickupLogo },
  linear: { src: linearLogo, className: "dark:invert" },
  notion: { src: notionLogo },
  slack: { src: slackLogo },
};

interface ProviderLogoProps {
  provider: string;
  className?: string;
}

export const ProviderLogo = ({ provider, className }: ProviderLogoProps) => {
  const parsed = ConnectionProviderSchema.safeParse(provider);
  if (!parsed.success) return null;
  const logo = PROVIDER_LOGOS[parsed.data];
  return (
    <img
      src={logo.src}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("shrink-0 object-contain", logo.className, className)}
    />
  );
};
