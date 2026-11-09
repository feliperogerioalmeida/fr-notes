import { cn } from "@workspace/ui/lib/utils";

const BAR_WEIGHTS = [0.55, 1, 0.75, 0.9, 0.6];
const MIN_HEIGHT_PERCENT = 18;
const LEVEL_GAIN = 4.5;
const FULL_PERCENT = 100;

interface AudioLevelBarsProps {
  level: number;
  active: boolean;
  className?: string;
  barClassName?: string;
}

const toHeight = (level: number, weight: number) =>
  Math.min(
    FULL_PERCENT,
    Math.max(MIN_HEIGHT_PERCENT, level * LEVEL_GAIN * weight * FULL_PERCENT),
  );

export const AudioLevelBars = ({
  level,
  active,
  className,
  barClassName,
}: AudioLevelBarsProps) => (
  <span
    className={cn("flex h-4 items-center gap-[2px]", className)}
    aria-hidden="true"
  >
    {BAR_WEIGHTS.map((weight, index) => (
      <span
        key={index}
        className={cn(
          "ease-brand w-[3px] rounded-full transition-[height] duration-150",
          active ? "bg-brand" : "bg-muted-foreground/40",
          barClassName,
        )}
        style={{
          height: `${active ? toHeight(level, weight) : MIN_HEIGHT_PERCENT}%`,
        }}
      />
    ))}
  </span>
);
