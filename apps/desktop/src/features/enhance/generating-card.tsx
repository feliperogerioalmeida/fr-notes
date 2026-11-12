import { LoaderCircle } from "lucide-react";
import { NavLink } from "react-router";
import { useShallow } from "zustand/react/shallow";

import { useNoteQuery } from "@/features/notes/use-notes.js";

import { useEnhanceStore } from "./enhance-store.js";

const GeneratingRow = ({ noteId }: { noteId: string }) => {
  const { data: note } = useNoteQuery(noteId);
  return (
    <NavLink
      to={`/notes/${noteId}`}
      className="hover:bg-accent ease-brand flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150"
    >
      <LoaderCircle className="text-brand size-3.5 shrink-0 animate-spin" />
      <span className="text-caption text-foreground truncate">
        {note?.title.trim() || "Sem título"}
      </span>
    </NavLink>
  );
};

export const GeneratingCard = () => {
  const noteIds = useEnhanceStore(
    useShallow((state) => Object.keys(state.jobs)),
  );
  if (noteIds.length === 0) return null;
  return (
    <div className="bg-card flex flex-col gap-0.5 rounded-lg border p-1.5">
      <span className="text-label text-muted-foreground px-2 pt-1 pb-0.5 uppercase">
        Gerando notas
      </span>
      {noteIds.map((noteId) => (
        <GeneratingRow key={noteId} noteId={noteId} />
      ))}
    </div>
  );
};
