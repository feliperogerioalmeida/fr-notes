import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { FileAudio, FolderOpen, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  selectIsRecordingNote,
  useRecordingStore,
} from "@/features/recording/recording-store.js";
import { describeError } from "@/lib/errors.js";
import { revealRecordings } from "@/lib/native.js";

import { useRecordingsQuery, useRetranscribe } from "./use-recordings.js";

export const RetranscribeButton = ({ noteId }: { noteId: string }) => {
  const { data: recordings = [] } = useRecordingsQuery(noteId);
  const isRecording = useRecordingStore(selectIsRecordingNote(noteId));
  const retranscribe = useRetranscribe();
  const [open, setOpen] = useState(false);
  if (recordings.length === 0 || isRecording) return null;
  const confirm = async () => {
    try {
      const count = await retranscribe.mutateAsync(noteId);
      setOpen(false);
      toast.success(`Transcrição refeita: ${count} falas`, {
        description: "Regere as notas para usar a nova transcrição.",
      });
    } catch (error) {
      toast.error(describeError(error));
    }
  };
  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Refazer a transcrição a partir do áudio"
        title="Refazer a transcrição a partir do áudio"
        onClick={() => setOpen(true)}
      >
        <FileAudio />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => !retranscribe.isPending && setOpen(next)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refazer a transcrição a partir do áudio?</DialogTitle>
            <DialogDescription>
              O áudio guardado desta reunião vai de novo para a Deepgram, que
              transcreve o arquivo inteiro e separa as vozes outra vez. Útil
              quando a internet caiu ou a transcrição ao vivo saiu ruim.
            </DialogDescription>
          </DialogHeader>
          <p className="text-caption text-muted-foreground">
            A transcrição atual é substituída e os nomes dados às vozes são
            apagados, porque a numeração delas pode mudar. A Deepgram cobra
            pelos minutos de áudio enviados.
          </p>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => void revealRecordings(noteId)}
            >
              <FolderOpen />
              Ver arquivos
            </Button>
            <Button
              disabled={retranscribe.isPending}
              onClick={() => void confirm()}
            >
              {retranscribe.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              {retranscribe.isPending
                ? "Transcrevendo…"
                : "Refazer transcrição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
