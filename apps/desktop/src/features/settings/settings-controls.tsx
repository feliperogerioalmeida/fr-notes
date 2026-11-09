import type { Settings } from "@workspace/core";
import { Input } from "@workspace/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { useEffect, useState } from "react";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback.js";

import { useSettings, useUpdateSettings } from "./use-settings.js";

const SAVE_DELAY_MS = 500;

type TextSettingKey = {
  [Key in keyof Settings]: Settings[Key] extends string ? Key : never;
}[keyof Settings];

interface TextSettingProps {
  settingKey: TextSettingKey;
  placeholder?: string;
  multiline?: boolean;
}

export const TextSetting = ({
  settingKey,
  placeholder,
  multiline = false,
}: TextSettingProps) => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [value, setValue] = useState(settings[settingKey]);
  useEffect(() => setValue(settings[settingKey]), [settings, settingKey]);
  const save = useDebouncedCallback(
    (next: string) => updateSettings.mutate({ [settingKey]: next }),
    SAVE_DELAY_MS,
  );
  const handleChange = (next: string) => {
    setValue(next);
    save(next);
  };
  if (multiline) {
    return (
      <Textarea
        id={settingKey}
        value={value}
        placeholder={placeholder}
        onChange={(event) => handleChange(event.target.value)}
        rows={3}
      />
    );
  }
  return (
    <Input
      id={settingKey}
      value={value}
      placeholder={placeholder}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
};

export interface SelectOption<Value extends string> {
  value: Value;
  label: string;
}

interface SelectSettingProps<Value extends string> {
  id: string;
  value: Value;
  options: SelectOption<Value>[];
  onChange: (value: Value) => void;
}

export const SelectSetting = <Value extends string>({
  id,
  value,
  options,
  onChange,
}: SelectSettingProps<Value>) => (
  <Select
    value={value}
    onValueChange={(next) => {
      const option = options.find((item) => item.value === next);
      if (option) onChange(option.value);
    }}
  >
    <SelectTrigger id={id} className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
