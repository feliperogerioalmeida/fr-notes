import { Label } from "@workspace/ui/components/ui/label";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export const SettingsSection = ({
  title,
  description,
  children,
}: SettingsSectionProps) => (
  <section className="bg-card flex flex-col gap-5 rounded-lg border p-6">
    {title && (
      <div className="flex flex-col gap-1">
        <h2 className="text-body text-heading font-semibold">{title}</h2>
        {description && (
          <p className="text-body-sm text-muted-foreground">{description}</p>
        )}
      </div>
    )}
    {children}
  </section>
);

interface SettingsFieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}

export const SettingsField = ({
  label,
  htmlFor,
  hint,
  children,
}: SettingsFieldProps) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
  </div>
);
