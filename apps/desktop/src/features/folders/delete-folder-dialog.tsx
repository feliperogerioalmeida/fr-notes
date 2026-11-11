import type { Folder } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";

import { useDeleteFolder, useFoldersQuery } from "./use-folders.js";

interface DeleteFolderDialogProps {
  folder: Folder | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (parentId: string | null) => void;
}

const describeDestination = (parent: Folder | undefined) =>
  parent ? `para a pasta “${parent.name}”` : "para fora de qualquer pasta";

export const DeleteFolderDialog = ({
  folder,
  onOpenChange,
  onDeleted,
}: DeleteFolderDialogProps) => {
  const { data: folders = [] } = useFoldersQuery();
  const deleteFolder = useDeleteFolder();
  if (!folder) return null;
  const parent = folders.find((item) => item.id === folder.parentId);
  const confirm = async () => {
    await deleteFolder.mutateAsync(folder.id);
    onOpenChange(false);
    onDeleted?.(folder.parentId);
  };
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apagar a pasta “{folder.name}”?</DialogTitle>
          <DialogDescription>
            Nenhuma nota é apagada: as notas e as subpastas vão{" "}
            {describeDestination(parent)}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={deleteFolder.isPending}
            onClick={() => void confirm()}
          >
            Apagar pasta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
