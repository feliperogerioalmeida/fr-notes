import type { Template, TemplateInput } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Input } from "@workspace/ui/components/ui/input";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { SettingsField } from "@/features/settings/settings-section.js";

import { useSaveTemplate } from "./use-templates.js";

const EMPTY_TEMPLATE: TemplateInput = {
  name: "",
  description: "",
  instructions: "",
};

const INSTRUCTIONS_PLACEHOLDER = [
  "### Contexto — por que a reunião aconteceu.",
  "### Decisões — o que ficou decidido.",
  "### Próximos passos — tarefas com responsável.",
].join("\n");

interface TemplateDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toInput = (template: Template | null): TemplateInput =>
  template
    ? {
        name: template.name,
        description: template.description,
        instructions: template.instructions,
      }
    : EMPTY_TEMPLATE;

export const TemplateDialog = ({
  template,
  open,
  onOpenChange,
}: TemplateDialogProps) => {
  const [input, setInput] = useState<TemplateInput>(toInput(template));
  const saveTemplate = useSaveTemplate();
  useEffect(() => setInput(toInput(template)), [template, open]);
  const update = (patch: Partial<TemplateInput>) =>
    setInput((current) => ({ ...current, ...patch }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.name.trim() || !input.instructions.trim()) return;
    await saveTemplate.mutateAsync({ id: template?.id ?? null, input });
    toast.success("Template salvo");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>
              {template ? "Editar template" : "Novo template"}
            </DialogTitle>
            <DialogDescription>
              Descreva as seções que as notas geradas devem ter.
            </DialogDescription>
          </DialogHeader>
          <SettingsField label="Nome" htmlFor="template-name">
            <Input
              id="template-name"
              value={input.name}
              onChange={(event) => update({ name: event.target.value })}
            />
          </SettingsField>
          <SettingsField label="Descrição" htmlFor="template-description">
            <Input
              id="template-description"
              value={input.description}
              onChange={(event) => update({ description: event.target.value })}
            />
          </SettingsField>
          <SettingsField label="Estrutura" htmlFor="template-instructions">
            <Textarea
              id="template-instructions"
              rows={8}
              value={input.instructions}
              placeholder={INSTRUCTIONS_PLACEHOLDER}
              onChange={(event) => update({ instructions: event.target.value })}
              className="font-mono text-xs"
            />
          </SettingsField>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saveTemplate.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
