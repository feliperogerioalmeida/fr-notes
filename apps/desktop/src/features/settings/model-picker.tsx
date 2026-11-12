import {
  type CatalogModel,
  formatContextWindow,
  formatModelPrice,
  type LlmProvider,
} from "@workspace/core";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { describeError } from "@/lib/errors.js";

import { useModelCatalog } from "./use-model-catalog.js";

interface ModelPickerProps {
  id: string;
  provider: LlmProvider;
  value: string;
  placeholder: string;
  onChange: (modelId: string) => void;
}

const groupByProvider = (models: CatalogModel[]) =>
  models.reduce<Map<string, CatalogModel[]>>((groups, model) => {
    groups.set(model.provider, [...(groups.get(model.provider) ?? []), model]);
    return groups;
  }, new Map());

const ModelTraits = ({ model }: { model: CatalogModel }) => (
  <span className="flex shrink-0 items-center gap-1">
    {model.fast && (
      <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
        rápido
      </Badge>
    )}
    {model.reasons && (
      <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
        raciocínio
      </Badge>
    )}
  </span>
);

const ModelRow = ({
  model,
  selected,
}: {
  model: CatalogModel;
  selected: boolean;
}) => {
  const details = [
    formatModelPrice(model),
    formatContextWindow(model.contextWindow),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <Check className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className="text-body-sm text-heading truncate font-medium">
            {model.name}
          </span>
          <ModelTraits model={model} />
        </span>
        <span className="text-caption text-muted-foreground truncate">
          <span className="font-mono">{model.id}</span>
          {details && ` · ${details}`}
        </span>
      </span>
    </>
  );
};

const CatalogStatus = ({
  isLoading,
  error,
}: {
  isLoading: boolean;
  error: unknown;
}) => {
  if (isLoading) {
    return (
      <p className="text-caption text-muted-foreground flex items-center gap-2 px-3 py-2">
        <LoaderCircle className="size-3.5 animate-spin" />
        Carregando modelos…
      </p>
    );
  }
  if (!error) return null;
  return (
    <p className="text-caption text-muted-foreground px-3 py-2">
      {describeError(error)} Você ainda pode digitar o nome do modelo.
    </p>
  );
};

interface TriggerProps {
  id: string;
  open: boolean;
  value: string;
  placeholder: string;
  selected: CatalogModel | undefined;
}

const PickerTrigger = ({
  id,
  open,
  value,
  placeholder,
  selected,
}: TriggerProps) => (
  <PopoverTrigger asChild>
    <Button
      id={id}
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal"
    >
      <span className="flex min-w-0 flex-col items-start text-left">
        <span
          className={cn(
            "text-body-sm truncate",
            !value && "text-muted-foreground",
          )}
        >
          {selected?.name ?? (value || placeholder)}
        </span>
        {selected && (
          <span className="text-caption text-muted-foreground truncate font-mono">
            {selected.id}
          </span>
        )}
      </span>
      <ChevronsUpDown className="text-muted-foreground size-4" />
    </Button>
  </PopoverTrigger>
);

interface OptionsProps {
  models: CatalogModel[];
  value: string;
  typed: string;
  onChoose: (modelId: string) => void;
}

const PickerOptions = ({ models, value, typed, onChoose }: OptionsProps) => {
  const groups = useMemo(() => [...groupByProvider(models)], [models]);
  const canUseTyped = typed && !models.some((model) => model.id === typed);
  return (
    <CommandList>
      <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
      {canUseTyped && (
        <CommandGroup heading="Outro modelo">
          <CommandItem
            value={`custom ${typed}`}
            onSelect={() => onChoose(typed)}
          >
            Usar “<span className="font-mono">{typed}</span>”
          </CommandItem>
        </CommandGroup>
      )}
      {groups.map(([groupProvider, items]) => (
        <CommandGroup key={groupProvider} heading={groupProvider}>
          {items.map((model) => (
            <CommandItem
              key={model.id}
              value={`${model.id} ${model.name}`}
              onSelect={() => onChoose(model.id)}
            >
              <ModelRow model={model} selected={model.id === value} />
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </CommandList>
  );
};

export const ModelPicker = ({
  id,
  provider,
  value,
  placeholder,
  onChange,
}: ModelPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: models = [], isLoading, error } = useModelCatalog(provider);
  const selected = useMemo(
    () => models.find((model) => model.id === value),
    [models, value],
  );
  const choose = (modelId: string) => {
    onChange(modelId);
    setOpen(false);
    setSearch("");
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PickerTrigger
        id={id}
        open={open}
        value={value}
        placeholder={placeholder}
        selected={selected}
      />
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[420px] p-0"
      >
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por nome, provedor ou ID…"
          />
          <CatalogStatus isLoading={isLoading} error={error} />
          <PickerOptions
            models={models}
            value={value}
            typed={search.trim()}
            onChoose={choose}
          />
        </Command>
      </PopoverContent>
    </Popover>
  );
};
