import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Folder, Plus, Trash2 } from "lucide-react";
import { useNavigate, useOutletContext, useParams } from "react-router";

import { PageContainer } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import {
  useDeleteFolder,
  useFoldersQuery,
} from "@/features/folders/use-folders.js";
import { NotesList } from "@/features/notes/notes-list.js";
import { useNotesQuery } from "@/features/notes/use-notes.js";
import { useStartNote } from "@/features/notes/use-start-note.js";

import type { ShellContext } from "./shell-context.js";

export const FolderPage = () => {
  const { folderId = "" } = useParams();
  const { searchQuery } = useOutletContext<ShellContext>();
  const { data: folders = [] } = useFoldersQuery();
  const { data: notes = [] } = useNotesQuery({ folderId, query: searchQuery });
  const deleteFolder = useDeleteFolder();
  const startNote = useStartNote();
  const navigate = useNavigate();
  const folder = folders.find((item) => item.id === folderId);

  const remove = async () => {
    await deleteFolder.mutateAsync(folderId);
    navigate("/");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        actions={
          <Button variant="ghost" size="sm" onClick={() => void remove()}>
            <Trash2 />
            Apagar pasta
          </Button>
        }
      />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-title-3 text-heading flex items-center gap-3">
              <Folder className="text-muted-foreground size-5" />
              {folder?.name ?? "Pasta"}
            </h1>
            <Button onClick={() => void startNote({ folderId })}>
              <Plus />
              Nova nota
            </Button>
          </div>
          <NotesList
            notes={notes}
            emptyState={
              <p className="text-body-sm text-muted-foreground px-3">
                Nenhuma nota nesta pasta ainda.
              </p>
            }
          />
        </PageContainer>
      </ScrollArea>
    </div>
  );
};
