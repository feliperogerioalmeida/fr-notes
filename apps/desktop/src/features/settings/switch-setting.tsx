import type { Settings } from "@workspace/core";
import { Switch } from "@workspace/ui/components/ui/switch";

import { useSettings, useUpdateSettings } from "./use-settings.js";

type BooleanSettingKey = {
  [Key in keyof Settings]: Settings[Key] extends boolean ? Key : never;
}[keyof Settings];

interface SwitchSettingProps {
  settingKey: BooleanSettingKey;
  title: string;
  description: string;
}

export const SwitchSetting = ({
  settingKey,
  title,
  description,
}: SwitchSettingProps) => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-body-sm text-heading font-medium">{title}</span>
        <span className="text-caption text-muted-foreground">
          {description}
        </span>
      </div>
      <Switch
        checked={settings[settingKey]}
        onCheckedChange={(checked) =>
          updateSettings.mutate({ [settingKey]: checked })
        }
      />
    </div>
  );
};
