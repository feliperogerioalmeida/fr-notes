import { cn } from "@workspace/ui/lib/utils";
import { type KeyboardEvent, useLayoutEffect, useRef } from "react";

interface NoteTitleFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const keepOnOneParagraph = (event: KeyboardEvent<HTMLTextAreaElement>) => {
  if (event.key === "Enter") event.preventDefault();
};

export const NoteTitleField = ({
  value,
  onChange,
  className,
}: NoteTitleFieldProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, " "))}
      onKeyDown={keepOnOneParagraph}
      placeholder="Nova nota"
      aria-label="Título da nota"
      className={cn(
        "text-heading placeholder:text-muted-foreground w-full resize-none overflow-hidden border-0 bg-transparent p-0 py-1 text-3xl leading-tight font-semibold tracking-tight outline-none",
        className,
      )}
    />
  );
};
