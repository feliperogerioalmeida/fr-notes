import { parseTemplateSections, type Template } from "@workspace/core";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Copy, Pencil, Star, Trash2 } from "lucide-react";

const MAX_FREEFORM_LINES = 4;

const SectionList = ({ instructions }: { instructions: string }) => {
  const sections = parseTemplateSections(instructions);
  if (sections.length === 0) {
    return (
      <p className="text-caption text-muted-foreground line-clamp-4 whitespace-pre-line">
        {instructions.split("\n").slice(0, MAX_FREEFORM_LINES).join("\n")}
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {sections.map((section, index) => (
        <li key={section.title} className="flex gap-2.5">
          <span className="text-label text-muted-foreground bg-secondary mt-px flex size-5 shrink-0 items-center justify-center rounded-sm tabular-nums">
            {index + 1}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-body-sm text-heading font-medium">
              {section.title}
            </span>
            {section.hint && (
              <span className="text-caption text-muted-foreground line-clamp-1 first-letter:uppercase">
                {section.hint}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
};

interface TemplateCardProps {
  template: Template;
  isDefault: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
}

export const TemplateCard = ({
  template,
  isDefault,
  onEdit,
  onDuplicate,
  onDelete,
  onMakeDefault,
}: TemplateCardProps) => (
  <article className="bg-card hover:border-border-strong ease-brand flex flex-col gap-4 rounded-lg border p-5 transition-colors duration-150">
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-body text-heading flex items-center gap-2 font-semibold">
          {template.name}
          {isDefault && (
            <Badge className="bg-brand-subtle text-brand border-transparent">
              Padrão
            </Badge>
          )}
        </h2>
        <p className="text-caption text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </div>
    </header>
    <div className="flex-1 border-t pt-4">
      <SectionList instructions={template.instructions} />
    </div>
    <footer className="flex items-center justify-between gap-2">
      <span className="text-caption text-muted-foreground">
        {template.isBuiltIn ? "Incluído no FR Notes" : "Criado por você"}
      </span>
      <div className="flex items-center gap-0.5">
        {!isDefault && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onMakeDefault}
            aria-label="Usar como padrão"
            title="Usar como padrão"
          >
            <Star />
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onDuplicate}
          aria-label="Duplicar"
          title="Duplicar"
        >
          <Copy />
        </Button>
        {!template.isBuiltIn && (
          <>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onEdit}
              aria-label="Editar"
              title="Editar"
            >
              <Pencil />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onDelete}
              aria-label="Apagar"
              title="Apagar"
            >
              <Trash2 />
            </Button>
          </>
        )}
      </div>
    </footer>
  </article>
);
