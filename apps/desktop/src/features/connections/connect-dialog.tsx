import {
  type ConnectionCatalogEntry,
  type PickerOption,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { PasswordInput } from "@workspace/ui/components/ui/password-input";
import { LoaderCircle } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SelectSetting } from "@/features/settings/settings-controls.js";
import { SettingsField } from "@/features/settings/settings-section.js";
import { describeError } from "@/lib/errors.js";

import { PROVIDER_TARGETS } from "./load-options.js";
import { useSaveConnection } from "./use-connections.js";

interface ConnectDialogProps {
  entry: ConnectionCatalogEntry | null;
  onOpenChange: (open: boolean) => void;
}

const optionLabel = (option: PickerOption) =>
  option.path ? `${option.name} · ${option.path}` : option.name;

const useTargetOptions = (entry: ConnectionCatalogEntry | null) => {
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const target = entry ? PROVIDER_TARGETS[entry.provider] : undefined;
  const load = async (token: string) => {
    if (!target) return;
    setLoading(true);
    try {
      const loaded = await target.load(token.trim());
      setOptions(loaded);
      setSelected(loaded[0]?.id ?? "");
      if (loaded.length === 0) toast.message("Nada encontrado com essa chave.");
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setLoading(false);
    }
  };
  const reset = useCallback(() => {
    setOptions([]);
    setSelected("");
  }, []);
  return { target, options, selected, setSelected, loading, load, reset };
};

export const ConnectDialog = ({ entry, onOpenChange }: ConnectDialogProps) => {
  const [token, setToken] = useState("");
  const picker = useTargetOptions(entry);
  const saveConnection = useSaveConnection();
  const { reset } = picker;
  useEffect(() => {
    setToken("");
    reset();
  }, [entry, reset]);
  if (!entry) return null;
  const choice = picker.options.find((option) => option.id === picker.selected);
  const canSave = token.trim() && (!picker.target || choice);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    const config =
      picker.target && choice
        ? {
            [picker.target.configKey]: choice.id,
            [picker.target.nameKey]: choice.name,
          }
        : {};
    await saveConnection.mutateAsync({
      input: {
        provider: entry.provider,
        name: choice ? `${entry.name} · ${choice.name}` : entry.name,
        config,
        enabled: true,
      },
      token: token.trim(),
    });
    toast.success(`${entry.name} conectado`);
    onOpenChange(false);
  };
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Conectar {entry.name}</DialogTitle>
            <DialogDescription>{entry.description}</DialogDescription>
          </DialogHeader>
          <SettingsField
            label={entry.tokenLabel}
            htmlFor="connection-token"
            hint={entry.tokenHint}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <PasswordInput
                  id="connection-token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Cole aqui"
                />
              </div>
              {picker.target && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!token.trim() || picker.loading}
                  onClick={() => void picker.load(token)}
                >
                  {picker.loading && <LoaderCircle className="animate-spin" />}
                  Carregar
                </Button>
              )}
            </div>
          </SettingsField>
          {picker.target && picker.options.length > 0 && (
            <SettingsField
              label={picker.target.label}
              htmlFor="connection-target"
            >
              <SelectSetting
                id="connection-target"
                value={picker.selected}
                options={picker.options.map((option) => ({
                  value: option.id,
                  label: optionLabel(option),
                }))}
                onChange={picker.setSelected}
              />
            </SettingsField>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSave || saveConnection.isPending}
            >
              Conectar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
