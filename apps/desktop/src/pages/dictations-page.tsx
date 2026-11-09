import { type Dictation, formatTime, groupByDay } from "@workspace/core";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Copy, Keyboard, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import { PageContainer, PageTitle } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { DICTATION_TRIGGER_LABELS } from "@/features/dictation/shortcuts.js";
import {
  useDeleteDictation,
  useDictationsQuery,
} from "@/features/dictation/use-dictations.js";
import { useSettings } from "@/features/settings/use-settings.js";

const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text);
  toast.success("Texto copiado");
};

const DictationItem = ({ dictation }: { dictation: Dictation }) => {
  const remove = useDeleteDictation();
  return (
    <article className="group hover:bg-accent ease-brand flex items-start gap-3 rounded-lg px-3 py-3 transition-colors duration-150">
      <span className="text-caption text-muted-foreground w-11 shrink-0 pt-0.5 tabular-nums">
        {formatTime(dictation.createdAt)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="fr-selectable text-body-sm text-foreground whitespace-pre-wrap">
          {dictation.text}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {dictation.targetAppName && (
            <Badge variant="outline">{dictation.targetAppName}</Badge>
          )}
          {dictation.polished && (
            <Badge variant="secondary">Polido com IA</Badge>
          )}
          {!dictation.inserted && (
            <Badge className="bg-warning-subtle text-warning-foreground border-transparent">
              Não digitado
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-60 group-hover:opacity-100">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => void copyText(dictation.text)}
          aria-label="Copiar"
        >
          <Copy />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => remove.mutate(dictation.id)}
          aria-label="Apagar"
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
};

const HowTo = () => {
  const { dictationEnabled, dictationTrigger } = useSettings();
  return (
    <div className="bg-card flex items-center gap-4 rounded-lg border px-4 py-3">
      <Keyboard className="text-muted-foreground size-5 shrink-0" />
      <p className="text-body-sm text-muted-foreground flex-1">
        {dictationEnabled
          ? `${DICTATION_TRIGGER_LABELS[dictationTrigger]}, fale e solte: o texto é digitado onde está o cursor. Toque rápido mantém o microfone aberto; Esc cancela.`
          : "O ditado está desligado."}
      </p>
      <Button size="sm" variant="ghost" asChild>
        <Link to="/settings/ditado">Configurar</Link>
      </Button>
    </div>
  );
};

export const DictationsPage = () => {
  const { data: dictations = [] } = useDictationsQuery();
  const groups = groupByDay({
    items: dictations,
    getDate: (dictation) => dictation.createdAt,
  });
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <PageTitle
            title="Ditados"
            description="Tudo o que você ditou em qualquer app fica guardado aqui."
          />
          <HowTo />
          {groups.length === 0 ? (
            <p className="text-body-sm text-muted-foreground px-3">
              Nenhum ditado ainda.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="flex flex-col gap-1">
                <h2 className="text-label text-muted-foreground px-3 pb-1 uppercase">
                  {group.label}
                </h2>
                {group.items.map((dictation) => (
                  <DictationItem key={dictation.id} dictation={dictation} />
                ))}
              </section>
            ))
          )}
        </PageContainer>
      </ScrollArea>
    </div>
  );
};
