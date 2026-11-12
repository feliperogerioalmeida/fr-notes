import { formatDuration, formatFullDate, pluralize } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Label } from "@workspace/ui/components/ui/label";
import { Switch } from "@workspace/ui/components/ui/switch";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { FileText, FileUp, LoaderCircle, X } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { useSettings } from "@/features/settings/use-settings.js";
import { describeError } from "@/lib/errors.js";

import {
  enhanceInOrder,
  previewTranscript,
  saveImportedNotes,
  type TranscriptInput,
  type TranscriptPreview,
} from "./import-transcripts.js";

const ACCEPTED_FILES = ".txt,.md,.markdown,text/plain,text/markdown";
const TURN_FORMS = { one: "fala", other: "falas" };
const TRANSCRIPT_FORMS = { one: "transcrição", other: "transcrições" };
const PASTE_PLACEHOLDER =
  "Meeting Title: Kickoff do projeto\nDate: Nov 12\n\nTranscript:\nMarina: Bom dia, vamos começar?\nMe: Vamos.";

const readFiles = (list: FileList | null): Promise<TranscriptInput[]> =>
  Promise.all(
    [...(list ?? [])].map(async (file) => ({
      text: await file.text(),
      fileName: file.name,
    })),
  );

const MINUTE_MS = 60_000;

const describeLength = (ms: number) =>
  ms >= MINUTE_MS ? `~${formatDuration(ms)}` : "";

const describeSpeakers = ({ transcript }: TranscriptPreview) =>
  transcript.participants.map((participant) => participant.name).join(", ");

const PreviewRow = ({ preview }: { preview: TranscriptPreview }) => {
  const { transcript } = preview;
  const turns = transcript.segments.length;
  const details = [
    formatFullDate(new Date(transcript.startedAtMs).toISOString()),
    describeLength(transcript.endedAtMs - transcript.startedAtMs),
    `${turns} ${pluralize(turns, TURN_FORMS)}`,
    describeSpeakers(preview),
  ].filter(Boolean);
  return (
    <li className="flex items-start gap-2.5 rounded-md border px-3 py-2">
      <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="text-body-sm text-heading truncate font-medium">
          {transcript.title ?? "Transcrição importada"}
        </span>
        <span className="text-caption text-muted-foreground">
          {details.join(" · ")}
        </span>
      </div>
    </li>
  );
};

const useImportForm = () => {
  const settings = useSettings();
  const [pasted, setPasted] = useState("");
  const [files, setFiles] = useState<TranscriptInput[]>([]);
  const [generate, setGenerate] = useState(true);
  const sources = useMemo<TranscriptInput[]>(() => {
    if (files.length > 0) return files;
    return pasted.trim() ? [{ text: pasted, fileName: null }] : [];
  }, [files, pasted]);
  const previews = useMemo(
    () =>
      sources
        .map((source) => previewTranscript(source, settings.userName))
        .filter((preview) => preview.transcript.segments.length > 0),
    [sources, settings.userName],
  );
  const reset = () => {
    setPasted("");
    setFiles([]);
  };
  return {
    pasted,
    setPasted,
    files,
    setFiles,
    generate,
    setGenerate,
    sources,
    previews,
    reset,
  };
};

type ImportForm = ReturnType<typeof useImportForm>;

const SourceField = ({ form }: { form: ImportForm }) => {
  if (form.files.length === 0) {
    return (
      <Textarea
        value={form.pasted}
        onChange={(event) => form.setPasted(event.target.value)}
        placeholder={PASTE_PLACEHOLDER}
        className="h-48 resize-none font-mono text-xs"
      />
    );
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-body-sm text-muted-foreground">
        {form.files.length}{" "}
        {form.files.length === 1 ? "arquivo escolhido" : "arquivos escolhidos"}
      </span>
      <Button variant="ghost" size="sm" onClick={() => form.setFiles([])}>
        <X />
        Voltar para colar texto
      </Button>
    </div>
  );
};

const GenerateSwitch = ({ form }: { form: ImportForm }) => (
  <div className="flex items-center justify-between gap-4">
    <Label
      htmlFor="import-generate"
      className="flex flex-col items-start gap-0.5 text-left"
    >
      <span>Gerar as notas com a IA</span>
      <span className="text-caption text-muted-foreground font-normal">
        Usa o provedor e o template padrão configurados.
      </span>
    </Label>
    <Switch
      id="import-generate"
      checked={form.generate}
      onCheckedChange={form.setGenerate}
    />
  </div>
);

const reportEnhancement = async (noteIds: string[]) => {
  const failures = await enhanceInOrder(noteIds);
  if (failures.length > 0) toast.error(describeError(failures[0]));
};

const PreviewList = ({ form }: { form: ImportForm }) => {
  if (form.previews.length > 0) {
    return (
      <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
        {form.previews.map((preview, index) => (
          <PreviewRow key={index} preview={preview} />
        ))}
      </ul>
    );
  }
  if (form.sources.length === 0) return null;
  return (
    <p className="text-caption text-destructive">
      Não encontrei falas no formato “Nome: fala”.
    </p>
  );
};

const describeImported = (count: number) =>
  `${count} ${pluralize(count, TRANSCRIPT_FORMS)} importada${count === 1 ? "" : "s"}`;

const useImportSubmit = (form: ImportForm, close: () => void) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const submit = async () => {
    setIsSaving(true);
    try {
      const noteIds = await saveImportedNotes(form.previews);
      close();
      form.reset();
      toast.success(describeImported(noteIds.length));
      if (noteIds[0]) navigate(`/notes/${noteIds[0]}`);
      if (form.generate) void reportEnhancement(noteIds);
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setIsSaving(false);
    }
  };
  return { isSaving, submit };
};

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImportDialog = ({ open, onOpenChange }: ImportDialogProps) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useImportForm();
  const { isSaving, submit } = useImportSubmit(form, () => onOpenChange(false));
  const count = form.previews.length;
  const pickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    form.setFiles(await readFiles(event.target.files));
    event.target.value = "";
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isSaving && onOpenChange(next)}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar transcrição</DialogTitle>
          <DialogDescription>
            Cole uma transcrição copiada do Granola ou de outro app, no formato
            “Nome: fala”, ou escolha arquivos .txt ou .md. Cada uma vira uma
            nota.
          </DialogDescription>
        </DialogHeader>
        <SourceField form={form} />
        <PreviewList form={form} />
        <GenerateSwitch form={form} />
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => fileInput.current?.click()}>
            <FileText />
            Escolher arquivos
          </Button>
          <Button
            disabled={count === 0 || isSaving}
            onClick={() => void submit()}
          >
            {isSaving && <LoaderCircle className="animate-spin" />}
            {count > 1 ? `Importar ${count}` : "Importar"}
          </Button>
        </DialogFooter>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_FILES}
          multiple
          hidden
          onChange={(event) => void pickFiles(event)}
        />
      </DialogContent>
    </Dialog>
  );
};

export const ImportTranscriptButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp />
        Importar
      </Button>
      <ImportDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
