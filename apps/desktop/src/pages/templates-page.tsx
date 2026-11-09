import type { Template } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { useState } from "react";

import { PageContainer, PageTitle } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import {
  useSettings,
  useUpdateSettings,
} from "@/features/settings/use-settings.js";
import { TemplateCard } from "@/features/templates/template-card.js";
import { TemplateDialog } from "@/features/templates/template-dialog.js";
import {
  useDeleteTemplate,
  useSaveTemplate,
  useTemplatesQuery,
} from "@/features/templates/use-templates.js";

const useTemplateActions = () => {
  const saveTemplate = useSaveTemplate();
  const deleteTemplate = useDeleteTemplate();
  const updateSettings = useUpdateSettings();
  const duplicate = (template: Template) =>
    saveTemplate.mutate({
      id: null,
      input: {
        name: `${template.name} (cópia)`,
        description: template.description,
        instructions: template.instructions,
      },
    });
  return {
    duplicate,
    remove: (template: Template) => deleteTemplate.mutate(template.id),
    makeDefault: (template: Template) =>
      updateSettings.mutate({ defaultTemplateId: template.id }),
  };
};

export const TemplatesPage = () => {
  const { data: templates = [] } = useTemplatesQuery();
  const settings = useSettings();
  const actions = useTemplateActions();
  const [editing, setEditing] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openEditor = (template: Template | null) => {
    setEditing(template);
    setIsDialogOpen(true);
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <PageTitle
            title="Templates"
            description="A estrutura que a IA segue ao gerar as notas de cada tipo de reunião."
            actions={
              <Button onClick={() => openEditor(null)}>
                <Plus />
                Novo template
              </Button>
            }
          />
          <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isDefault={template.id === settings.defaultTemplateId}
                onEdit={() => openEditor(template)}
                onDuplicate={() => actions.duplicate(template)}
                onDelete={() => actions.remove(template)}
                onMakeDefault={() => actions.makeDefault(template)}
              />
            ))}
          </div>
        </PageContainer>
      </ScrollArea>
      <TemplateDialog
        template={editing}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};
