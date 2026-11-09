import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { PasswordInput } from "@workspace/ui/components/ui/password-input";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { describeError } from "@/lib/errors.js";
import type { SecretKey } from "@/lib/native.js";

import { SettingsField } from "./settings-section.js";
import { useSaveSecret } from "./use-settings.js";

interface SecretFieldProps {
  secretKey: SecretKey;
  label: string;
  isSaved: boolean;
  hint?: string;
}

export const SecretField = ({
  secretKey,
  label,
  isSaved,
  hint,
}: SecretFieldProps) => {
  const [value, setValue] = useState("");
  const saveSecret = useSaveSecret();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await saveSecret.mutateAsync({ key: secretKey, value });
      setValue("");
      toast.success(
        value.trim() ? "Chave salva no Keychain" : "Chave removida",
      );
    } catch (error) {
      toast.error(describeError(error));
    }
  };
  return (
    <SettingsField label={label} htmlFor={secretKey} hint={hint}>
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="flex-1">
          <PasswordInput
            id={secretKey}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={isSaved ? "•••••••• (salva)" : "Cole a chave aqui"}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={saveSecret.isPending}
        >
          {value.trim() || !isSaved ? "Salvar" : "Remover"}
        </Button>
        {isSaved && (
          <Badge className="bg-success-subtle text-success-foreground border-transparent">
            Ativa
          </Badge>
        )}
      </form>
    </SettingsField>
  );
};
