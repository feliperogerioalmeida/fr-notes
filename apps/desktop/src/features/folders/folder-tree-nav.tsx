import {
  buildFolderTree,
  describeFolderPath,
  type Folder,
  type FolderNode,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  ChevronRight,
  Ellipsis,
  Folder as FolderIcon,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, useMatch, useNavigate } from "react-router";

import { DeleteFolderDialog } from "./delete-folder-dialog.js";
import { FolderActionsMenu } from "./folder-actions-menu.js";
import { FolderNameInput } from "./folder-name-input.js";
import {
  useCreateFolder,
  useFoldersQuery,
  useRenameFolder,
} from "./use-folders.js";

const EXPANDED_STORAGE_KEY = "fr-notes:expanded-folders";
const INDENT_BASE_PX = 4;
const INDENT_STEP_PX = 14;

const readExpanded = (): Set<string> => {
  try {
    const stored = localStorage.getItem(EXPANDED_STORAGE_KEY);
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set();
  }
};

const writeExpanded = (expanded: Set<string>) => {
  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...expanded]));
  } catch {
    return;
  }
};

const useExpandedFolders = () => {
  const [expanded, setExpanded] = useState(readExpanded);
  const setOpen = useCallback(
    (ids: string[], open: boolean) =>
      setExpanded((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => (open ? next.add(id) : next.delete(id)));
        writeExpanded(next);
        return next;
      }),
    [],
  );
  return { expanded, setOpen };
};

type Editing =
  | { mode: "create"; parentId: string | null }
  | { mode: "rename"; folderId: string }
  | null;

const indentFor = (depth: number) => ({
  paddingLeft: INDENT_BASE_PX + depth * INDENT_STEP_PX,
});

interface TreeContext {
  expanded: Set<string>;
  activeId: string | null;
  editing: Editing;
  setOpen: (ids: string[], open: boolean) => void;
  setEditing: (editing: Editing) => void;
  onDelete: (folder: Folder) => void;
}

const FolderRow = ({
  node,
  context,
}: {
  node: FolderNode;
  context: TreeContext;
}) => {
  const { folder, depth, children } = node;
  const isOpen = context.expanded.has(folder.id);
  return (
    <div
      style={indentFor(depth)}
      className={cn(
        "group/folder text-body-sm ease-brand flex h-8 items-center gap-0.5 rounded-md pr-1 transition-colors duration-150",
        context.activeId === folder.id
          ? "bg-sidebar-accent text-sidebar-accent-foreground [&_svg.folder-icon]:text-brand"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <button
        type="button"
        aria-label={isOpen ? "Recolher" : "Expandir"}
        onClick={() => context.setOpen([folder.id], !isOpen)}
        className={cn(
          "text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded",
          children.length === 0 && "invisible",
        )}
      >
        <ChevronRight
          className={cn(
            "ease-brand size-3.5 transition-transform",
            isOpen && "rotate-90",
          )}
        />
      </button>
      <NavLink
        to={`/folders/${folder.id}`}
        className="flex h-full min-w-0 flex-1 items-center gap-2"
      >
        <FolderIcon
          className="folder-icon size-4 shrink-0"
          strokeWidth={1.75}
        />
        <span className="truncate">{folder.name}</span>
      </NavLink>
      <FolderActionsMenu
        folder={folder}
        onCreateChild={() => {
          context.setOpen([folder.id], true);
          context.setEditing({ mode: "create", parentId: folder.id });
        }}
        onRename={() =>
          context.setEditing({ mode: "rename", folderId: folder.id })
        }
        onDelete={() => context.onDelete(folder)}
      >
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={`Ações da pasta ${folder.name}`}
          className="opacity-0 group-hover/folder:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
        >
          <Ellipsis />
        </Button>
      </FolderActionsMenu>
    </div>
  );
};

const FolderTreeItem = ({
  node,
  context,
}: {
  node: FolderNode;
  context: TreeContext;
}) => {
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const { editing, setEditing } = context;
  const isRenaming =
    editing?.mode === "rename" && editing.folderId === node.folder.id;
  const isCreatingChild =
    editing?.mode === "create" && editing.parentId === node.folder.id;
  const showChildren = context.expanded.has(node.folder.id) || isCreatingChild;
  return (
    <li>
      {isRenaming ? (
        <FolderNameInput
          initialName={node.folder.name}
          className="py-0.5"
          onSubmit={async (name) => {
            await renameFolder.mutateAsync({ id: node.folder.id, name });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <FolderRow node={node} context={context} />
      )}
      {showChildren && (
        <ul className="flex flex-col gap-0.5 pt-0.5">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.folder.id}
              node={child}
              context={context}
            />
          ))}
          {isCreatingChild && (
            <li style={indentFor(node.depth + 1)}>
              <FolderNameInput
                placeholder="Nome da subpasta"
                className="py-0.5"
                onSubmit={async (name) => {
                  await createFolder.mutateAsync({
                    name,
                    parentId: node.folder.id,
                  });
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </li>
          )}
        </ul>
      )}
    </li>
  );
};

const useActiveFolder = (
  folders: Folder[],
  setOpen: TreeContext["setOpen"],
) => {
  const match = useMatch("/folders/:folderId");
  const activeId = match?.params.folderId ?? null;
  const ancestorKey = activeId
    ? describeFolderPath(folders, activeId)
        .slice(0, -1)
        .map((folder) => folder.id)
        .join(",")
    : "";
  useEffect(() => {
    if (ancestorKey) setOpen(ancestorKey.split(","), true);
  }, [ancestorKey, setOpen]);
  return activeId;
};

export const FolderTreeNav = () => {
  const { data: folders = [] } = useFoldersQuery();
  const createFolder = useCreateFolder();
  const navigate = useNavigate();
  const { expanded, setOpen } = useExpandedFolders();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);
  const activeId = useActiveFolder(folders, setOpen);
  const context: TreeContext = {
    expanded,
    activeId,
    editing,
    setOpen,
    setEditing,
    onDelete: setDeleting,
  };
  const handleDeleted = (deletedId: string, parentId: string | null) => {
    if (activeId === deletedId)
      navigate(parentId ? `/folders/${parentId}` : "/");
  };
  return (
    <section className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-2.5 pt-4 pb-1">
        <span className="text-label text-muted-foreground uppercase">
          Pastas
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Nova pasta"
          onClick={() => setEditing({ mode: "create", parentId: null })}
        >
          <Plus />
        </Button>
      </div>
      {editing?.mode === "create" && editing.parentId === null && (
        <FolderNameInput
          onSubmit={async (name) => {
            await createFolder.mutateAsync({ name });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      <ul className="flex flex-col gap-0.5">
        {buildFolderTree(folders).map((node) => (
          <FolderTreeItem key={node.folder.id} node={node} context={context} />
        ))}
      </ul>
      <DeleteFolderDialog
        folder={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={(parentId) =>
          deleting && handleDeleted(deleting.id, parentId)
        }
      />
    </section>
  );
};
