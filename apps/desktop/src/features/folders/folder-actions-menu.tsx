import {
  buildFolderTree,
  flattenFolderTree,
  type Folder,
  type FolderNode,
  listDescendantIds,
} from "@workspace/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/ui/dropdown-menu";
import {
  Folder as FolderIcon,
  FolderInput,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { useFoldersQuery, useMoveFolder } from "./use-folders.js";

const OPTION_INDENT_PX = 12;

interface FolderOptionsProps {
  folders: Folder[];
  isDisabled?: (node: FolderNode) => boolean;
  isHidden?: (node: FolderNode) => boolean;
  onSelect: (folderId: string) => void;
}

export const FolderOptions = ({
  folders,
  isDisabled = () => false,
  isHidden = () => false,
  onSelect,
}: FolderOptionsProps) => (
  <>
    {flattenFolderTree(buildFolderTree(folders))
      .filter((node) => !isHidden(node))
      .map((node) => (
        <DropdownMenuItem
          key={node.folder.id}
          disabled={isDisabled(node)}
          onSelect={() => onSelect(node.folder.id)}
          style={{ paddingLeft: 8 + node.depth * OPTION_INDENT_PX }}
        >
          <FolderIcon />
          <span className="truncate">{node.folder.name}</span>
        </DropdownMenuItem>
      ))}
  </>
);

const MoveFolderSubmenu = ({ folder }: { folder: Folder }) => {
  const { data: folders = [] } = useFoldersQuery();
  const moveFolder = useMoveFolder();
  const blocked = listDescendantIds(folders, folder.id);
  const move = (parentId: string | null) =>
    moveFolder.mutate({ id: folder.id, parentId });
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FolderInput />
        Mover para
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuItem
          disabled={!folder.parentId}
          onSelect={() => move(null)}
        >
          Fora de pastas
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <FolderOptions
          folders={folders}
          isHidden={(node) => blocked.has(node.folder.id)}
          isDisabled={(node) => node.folder.id === folder.parentId}
          onSelect={move}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

interface FolderActionsMenuProps {
  folder: Folder;
  children: ReactNode;
  align?: "start" | "end";
  onCreateChild: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export const FolderActionsMenu = ({
  folder,
  children,
  align = "start",
  onCreateChild,
  onRename,
  onDelete,
}: FolderActionsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
    <DropdownMenuContent
      align={align}
      className="w-52"
      onCloseAutoFocus={(event) => event.preventDefault()}
    >
      <DropdownMenuItem onSelect={onCreateChild}>
        <FolderPlus />
        Nova subpasta
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onRename}>
        <Pencil />
        Renomear
      </DropdownMenuItem>
      <MoveFolderSubmenu folder={folder} />
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={onDelete}>
        <Trash2 />
        Apagar pasta
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
