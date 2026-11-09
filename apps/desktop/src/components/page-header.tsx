import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, actions, className }: PageHeaderProps) => (
  <header
    data-tauri-drag-region
    className={cn(
      "flex h-12 shrink-0 items-center justify-between gap-3 px-6",
      className,
    )}
  >
    <div data-tauri-drag-region className="min-w-0 flex-1">
      {title}
    </div>
    {actions && <div className="flex items-center gap-1">{actions}</div>}
  </header>
);
