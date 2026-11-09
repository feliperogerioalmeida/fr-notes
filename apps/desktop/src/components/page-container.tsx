import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export const PageContainer = ({ children, className }: PageContainerProps) => (
  <div
    className={cn(
      "@container mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-10 pt-4 pb-16",
      className,
    )}
  >
    {children}
  </div>
);

interface PageTitleProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export const PageTitle = ({ title, description, actions }: PageTitleProps) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="flex flex-col gap-1">
      <h1 className="text-title-3 text-heading flex items-center gap-3">
        {title}
      </h1>
      {description && (
        <p className="text-body-sm text-muted-foreground first-letter:uppercase">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
