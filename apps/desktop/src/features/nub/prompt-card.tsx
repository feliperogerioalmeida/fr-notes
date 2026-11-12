import { formatTime } from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDown, ExternalLink, Mic, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import {
  MeetingAppIcon,
  shortProviderName,
} from "@/features/meetings/meeting-app-icon.js";
import {
  type NubPrompt,
  type PromptAction,
  requestPromptAction,
} from "@/lib/native.js";

const TICK_MS = 15_000;
const MINUTE_MS = 60_000;

const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
};

const describeStart = (startsAtMs: number, nowMs: number) => {
  const untilStart = startsAtMs - nowMs;
  if (untilStart > MINUTE_MS)
    return `em ${Math.ceil(untilStart / MINUTE_MS)} min`;
  if (untilStart > 0) return "em 1 min";
  if (untilStart > -MINUTE_MS) return "agora";
  return `começou há ${Math.floor(-untilStart / MINUTE_MS)} min`;
};

const describeSchedule = (prompt: NubPrompt, nowMs: number) => {
  if (prompt.startsAtMs === null) return prompt.subtitle;
  const range = [prompt.startsAtMs, prompt.endsAtMs]
    .filter((value): value is number => value !== null)
    .map((value) => formatTime(new Date(value).toISOString()))
    .join(" – ");
  return `${range} · ${describeStart(prompt.startsAtMs, nowMs)}`;
};

const send = (action: PromptAction) => () => void requestPromptAction(action);

const PrimaryAction = ({ prompt }: { prompt: NubPrompt }) => {
  const joins = Boolean(prompt.joinUrl && prompt.provider);
  const provider = prompt.provider ? shortProviderName(prompt.provider) : "";
  return (
    <button
      type="button"
      onClick={send(joins ? "join-and-record" : "record")}
      className="hover:bg-accent ease-brand flex items-center gap-2.5 rounded-l-[14px] py-1.5 pr-3.5 pl-3 text-left transition-colors duration-150"
    >
      {joins ? (
        <MeetingAppIcon provider={prompt.provider} className="size-7" />
      ) : (
        <span className="bg-brand text-brand-foreground flex size-7 items-center justify-center rounded-lg">
          <Mic className="size-4" />
        </span>
      )}
      <span className="flex flex-col leading-tight">
        <span className="text-body-sm text-heading font-semibold whitespace-nowrap">
          {joins ? `Entrar no ${provider}` : "Gravar"}
        </span>
        <span className="text-caption text-muted-foreground whitespace-nowrap">
          {joins ? "e gravar no FR Notes" : "com o FR Notes"}
        </span>
      </span>
    </button>
  );
};

interface OptionProps {
  icon: ReactNode;
  label: string;
  action: PromptAction;
}

const Option = ({ icon, label, action }: OptionProps) => (
  <button
    type="button"
    onClick={send(action)}
    className="hover:bg-accent text-body-sm text-foreground ease-brand [&_svg]:text-muted-foreground flex h-9 items-center gap-2.5 rounded-lg px-3 text-left transition-colors duration-150 [&_svg]:size-4"
  >
    {icon}
    {label}
  </button>
);

const MoreOptions = ({ prompt }: { prompt: NubPrompt }) => {
  const provider = prompt.provider ? shortProviderName(prompt.provider) : null;
  return (
    <div className="bg-card/95 mt-1.5 flex flex-col rounded-2xl border p-1 shadow-xl backdrop-blur">
      {prompt.joinUrl && provider && (
        <>
          <Option
            icon={<Mic />}
            label="Só gravar, sem abrir a reunião"
            action="record"
          />
          <Option
            icon={<ExternalLink />}
            label={`Só abrir o ${provider}`}
            action="join"
          />
        </>
      )}
      <Option icon={<X />} label="Agora não" action="dismiss" />
    </div>
  );
};

interface PromptCardProps {
  prompt: NubPrompt;
  expanded: boolean;
  onToggle: () => void;
}

export const PromptCard = ({ prompt, expanded, onToggle }: PromptCardProps) => {
  const now = useNow();
  return (
    <>
      <div
        data-tauri-drag-region
        className="bg-card/95 flex h-[72px] w-full shrink-0 items-center gap-3 rounded-[22px] border py-2 pr-2 pl-3.5 shadow-xl backdrop-blur"
      >
        <span
          data-tauri-drag-region
          className={cn(
            "h-9 w-1 shrink-0 rounded-full",
            !prompt.accentColor && "bg-brand",
          )}
          style={
            prompt.accentColor
              ? { backgroundColor: prompt.accentColor }
              : undefined
          }
        />
        <div data-tauri-drag-region className="flex min-w-0 flex-1 flex-col">
          <span
            data-tauri-drag-region
            className="text-body-sm text-heading truncate font-semibold"
          >
            {prompt.title}
          </span>
          <span
            data-tauri-drag-region
            className="text-caption text-muted-foreground truncate"
          >
            {describeSchedule(prompt, now)}
          </span>
        </div>
        <div className="bg-secondary/70 flex h-full shrink-0 items-stretch rounded-[16px] border">
          <PrimaryAction prompt={prompt} />
          <span className="bg-border w-px" />
          <button
            type="button"
            onClick={onToggle}
            aria-label="Mais opções"
            className="hover:bg-accent ease-brand flex w-9 items-center justify-center rounded-r-[14px] transition-colors duration-150"
          >
            <ChevronDown
              className={cn(
                "text-muted-foreground ease-brand size-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        </div>
        <button
          type="button"
          onClick={send("dismiss")}
          aria-label="Fechar"
          title="Fechar"
          className="text-muted-foreground hover:bg-accent hover:text-foreground ease-brand flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
        >
          <X className="size-4" />
        </button>
      </div>
      {expanded && <MoreOptions prompt={prompt} />}
    </>
  );
};
