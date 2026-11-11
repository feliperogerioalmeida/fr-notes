import { Input } from "@workspace/ui/components/ui/input";
import { cn } from "@workspace/ui/lib/utils";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";

interface FolderNameInputProps {
  initialName?: string;
  placeholder?: string;
  className?: string;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

export const FolderNameInput = ({
  initialName = "",
  placeholder = "Nome da pasta",
  className,
  onSubmit,
  onCancel,
}: FolderNameInputProps) => {
  const [name, setName] = useState(initialName);
  const committed = useRef(false);
  const commit = async () => {
    if (committed.current) return;
    committed.current = true;
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return onCancel();
    await onSubmit(trimmed);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void commit();
  };
  const cancelOnEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    committed.current = true;
    onCancel();
  };
  return (
    <form onSubmit={submit} className={cn("px-1", className)}>
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={cancelOnEscape}
        onFocus={(event) => event.target.select()}
        placeholder={placeholder}
        className="h-8"
      />
    </form>
  );
};
