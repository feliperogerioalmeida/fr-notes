import { cn } from "@workspace/ui/lib/utils";
import { Video } from "lucide-react";

import meetLogo from "@/assets/meeting-apps/meet.svg";
import teamsLogo from "@/assets/meeting-apps/teams.svg";
import zoomLogo from "@/assets/meeting-apps/zoom.svg";

const PROVIDER_LOGOS: Record<string, string> = {
  "Google Meet": meetLogo,
  Zoom: zoomLogo,
  Teams: teamsLogo,
};

interface MeetingAppIconProps {
  provider: string | null;
  className?: string;
}

export const MeetingAppIcon = ({
  provider,
  className,
}: MeetingAppIconProps) => {
  const logo = provider ? PROVIDER_LOGOS[provider] : undefined;
  if (!logo) return <Video className={cn("text-heading", className)} />;
  return (
    <img
      src={logo}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("object-contain", className)}
    />
  );
};

const SHORT_NAMES: Record<string, string> = {
  "Google Meet": "Meet",
};

export const shortProviderName = (provider: string) =>
  SHORT_NAMES[provider] ?? provider;
