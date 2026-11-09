import type { Template } from "@workspace/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useTemplatesQuery } from "@/features/templates/use-templates.js";

interface TemplateMenuProps {
  activeTemplateId: string | null;
  onSelect: (template: Template) => void;
  children: ReactNode;
}

export const TemplateMenu = ({
  activeTemplateId,
  onSelect,
  children,
}: TemplateMenuProps) => {
  const { data: templates = [] } = useTemplatesQuery();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-72">
        <DropdownMenuLabel>Gerar notas com o template</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onSelect={() => onSelect(template)}
            className="flex items-start gap-2"
          >
            <div className="flex flex-1 flex-col">
              <span>{template.name}</span>
              <span className="text-caption text-muted-foreground">
                {template.description}
              </span>
            </div>
            {template.id === activeTemplateId && (
              <Check className="text-brand mt-0.5" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/templates">Gerenciar templates</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
