import { formatTranscriptFrom } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { useNoteQuery } from "@/features/notes/use-notes.js";

import { useTranscriptQuery } from "./use-transcript.js";

export const CopyTranscriptButton = ({ noteId }: { noteId: string }) => {
  const { data: segments = [] } = useTranscriptQuery(noteId);
  const { data: note } = useNoteQuery(noteId);
  if (segments.length === 0) return null;
  const copy = async () => {
    const text = formatTranscriptFrom({
      segments,
      speakerNames: note?.speakerNames,
    });
    await navigator.clipboard.writeText(text);
    toast.success("Transcrição copiada");
  };
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={() => void copy()}
      aria-label="Copiar transcrição"
      title="Copiar transcrição"
    >
      <Copy />
    </Button>
  );
};
