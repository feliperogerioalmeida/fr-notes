import {
  buildFolderTree,
  describeFolderPath,
  flattenFolderTree,
  type Folder,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import {
  ChevronRight,
  Ellipsis,
  Folder as FolderIcon,
  FolderPlus,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router";

import { PageContainer } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { DeleteFolderDialog } from "@/features/folders/delete-folder-dialog.js";
import { FolderActionsMenu } from "@/features/folders/folder-actions-menu.js";
import { FolderNameInput } from "@/features/folders/folder-name-input.js";
import {
  useCreateFolder,
  useFoldersQuery,
  useRenameFolder,
} from "@/features/folders/use-folders.js";
import { NotesList } from "@/features/notes/notes-list.js";
import { useNotesQuery } from "@/features/notes/use-notes.js";
import { useStartNote } from "@/features/notes/use-start-note.js";

import type { ShellContext } from "./shell-context.js";

const Breadcrumb = ({ ancestors }: { ancestors: Folder[] }) =>
  ancestors.length === 0 ? null : (
    <nav className="text-caption text-muted-foreground flex flex-wrap items-center gap-1">
      {ancestors.map((ancestor) => (
        <span key={ancestor.id} className="inline-flex items-center gap-1">
          <Link
            to={`/folders/${ancestor.id}`}
            className="hover:text-foreground"
          >
            {ancestor.name}
          </Link>
          <ChevronRight className="size-3" />
        </span>
      ))}
    </nav>
  );

interface SubfoldersProps {
  folder: Folder;
  subfolders: Folder[];
  isCreating: boolean;
  onCreated: () => void;
}

const Subfolders = ({
  folder,
  subfolders,
  isCreating,
  onCreated,
}: SubfoldersProps) => {
  const createFolder = useCreateFolder();
  if (subfolders.length === 0 && !isCreating) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-label text-muted-foreground px-1 uppercase">
        Subpastas
      </h2>
      <div className="grid gap-2 @2xl:grid-cols-3 @5xl:grid-cols-4">
        {subfolders.map((subfolder) => (
          <Link
            key={subfolder.id}
            to={`/folders/${subfolder.id}`}
            className="bg-card hover:border-border-strong text-body-sm text-heading ease-brand flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors duration-150"
          >
            <FolderIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate">{subfolder.name}</span>
          </Link>
        ))}
        {isCreating && (
          <FolderNameInput
            placeholder="Nome da subpasta"
            className="px-0"
            onSubmit={async (name) => {
              await createFolder.mutateAsync({ name, parentId: folder.id });
              onCreated();
            }}
            onCancel={onCreated}
          />
        )}
      </div>
    </section>
  );
};

type PageEditing = "rename" | "create" | null;

interface FolderTitleProps {
  folder: Folder;
  editing: PageEditing;
  setEditing: (editing: PageEditing) => void;
}

const FolderTitle = ({ folder, editing, setEditing }: FolderTitleProps) => {
  const renameFolder = useRenameFolder();
  if (editing !== "rename") {
    return (
      <h1 className="text-title-3 text-heading flex min-w-0 items-center gap-3">
        <FolderIcon className="text-muted-foreground size-5 shrink-0" />
        <span className="truncate">{folder.name}</span>
      </h1>
    );
  }
  return (
    <FolderNameInput
      initialName={folder.name}
      className="w-full max-w-sm px-0"
      onSubmit={async (name) => {
        await renameFolder.mutateAsync({ id: folder.id, name });
        setEditing(null);
      }}
      onCancel={() => setEditing(null)}
    />
  );
};

interface FolderHeadingProps extends FolderTitleProps {
  folders: Folder[];
}

const FolderHeading = ({
  folder,
  folders,
  editing,
  setEditing,
}: FolderHeadingProps) => {
  const startNote = useStartNote();
  return (
    <div className="flex flex-col gap-1.5">
      <Breadcrumb
        ancestors={describeFolderPath(folders, folder.id).slice(0, -1)}
      />
      <div className="flex items-center justify-between gap-4">
        <FolderTitle
          folder={folder}
          editing={editing}
          setEditing={setEditing}
        />
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => setEditing("create")}>
            <FolderPlus />
            Subpasta
          </Button>
          <Button onClick={() => void startNote({ folderId: folder.id })}>
            <Plus />
            Nova nota
          </Button>
        </div>
      </div>
    </div>
  );
};

const FolderContent = ({
  folder,
  folders,
}: {
  folder: Folder;
  folders: Folder[];
}) => {
  const { searchQuery } = useOutletContext<ShellContext>();
  const { data: notes = [] } = useNotesQuery({
    folderId: folder.id,
    query: searchQuery,
  });
  const navigate = useNavigate();
  const [editing, setEditing] = useState<PageEditing>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const subfolders = flattenFolderTree(buildFolderTree(folders))
    .filter((node) => node.folder.parentId === folder.id)
    .map((node) => node.folder);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        actions={
          <FolderActionsMenu
            folder={folder}
            align="end"
            onCreateChild={() => setEditing("create")}
            onRename={() => setEditing("rename")}
            onDelete={() => setIsDeleting(true)}
          >
            <Button variant="ghost" size="icon" aria-label="Ações da pasta">
              <Ellipsis />
            </Button>
          </FolderActionsMenu>
        }
      />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <FolderHeading
            folder={folder}
            folders={folders}
            editing={editing}
            setEditing={setEditing}
          />
          <Subfolders
            folder={folder}
            subfolders={subfolders}
            isCreating={editing === "create"}
            onCreated={() => setEditing(null)}
          />
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
      <DeleteFolderDialog
        folder={isDeleting ? folder : null}
        onOpenChange={setIsDeleting}
        onDeleted={(parentId) =>
          navigate(parentId ? `/folders/${parentId}` : "/")
        }
      />
    </div>
  );
};

export const FolderPage = () => {
  const { folderId = "" } = useParams();
  const { data: folders = [], isLoading } = useFoldersQuery();
  const folder = folders.find((item) => item.id === folderId);
  if (isLoading) return null;
  if (!folder) {
    return (
      <p className="text-muted-foreground p-10">Esta pasta não existe mais.</p>
    );
  }
  return <FolderContent key={folder.id} folder={folder} folders={folders} />;
};
