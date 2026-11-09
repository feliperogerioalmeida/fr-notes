import type { CalendarInfo } from "@workspace/core";
import { Switch } from "@workspace/ui/components/ui/switch";

import { useCalendarsQuery } from "@/features/calendar/use-calendar.js";

import { SettingsSection } from "./settings-section.js";
import { useSettings, useUpdateSettings } from "./use-settings.js";

const groupBySource = (calendars: CalendarInfo[]) =>
  calendars.reduce<Map<string, CalendarInfo[]>>((groups, calendar) => {
    groups.set(calendar.source, [
      ...(groups.get(calendar.source) ?? []),
      calendar,
    ]);
    return groups;
  }, new Map());

const CalendarToggle = ({ calendar }: { calendar: CalendarInfo }) => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const visible = !settings.hiddenCalendarIds.includes(calendar.id);
  const toggle = (show: boolean) =>
    updateSettings.mutate({
      hiddenCalendarIds: show
        ? settings.hiddenCalendarIds.filter((id) => id !== calendar.id)
        : [...settings.hiddenCalendarIds, calendar.id],
    });
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-body-sm flex items-center gap-2.5">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: calendar.color ?? undefined }}
        />
        {calendar.title}
      </span>
      <Switch
        checked={visible}
        onCheckedChange={toggle}
        aria-label={`Mostrar ${calendar.title}`}
      />
    </div>
  );
};

export const CalendarsSection = () => {
  const { data: calendars = [] } = useCalendarsQuery();
  if (calendars.length === 0) return null;
  return (
    <SettingsSection
      title="Calendários"
      description="Escolha quais calendários do app Calendário aparecem na agenda e nos avisos de reunião."
    >
      {[...groupBySource(calendars)].map(([source, items]) => (
        <div key={source} className="flex flex-col gap-1">
          <span className="text-label text-muted-foreground uppercase">
            {source}
          </span>
          {items.map((calendar) => (
            <CalendarToggle key={calendar.id} calendar={calendar} />
          ))}
        </div>
      ))}
    </SettingsSection>
  );
};
