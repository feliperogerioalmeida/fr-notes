import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { useState } from "react";

import { PageContainer } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { ConnectCalendar } from "@/features/calendar/connect-calendar.js";
import { EventDayGroups } from "@/features/calendar/event-day-groups.js";
import { useCalendarEvents } from "@/features/calendar/use-calendar.js";
import { useNotesQuery } from "@/features/notes/use-notes.js";
import { usePermissions } from "@/features/settings/use-settings.js";

type AgendaPeriod = "next" | "previous";

const WEEK_DAYS = 7;

const RANGES: Record<AgendaPeriod, { daysBack: number; daysAhead: number }> = {
  next: { daysBack: 0, daysAhead: WEEK_DAYS },
  previous: { daysBack: WEEK_DAYS, daysAhead: 1 },
};

const PERIOD_LABELS: Record<AgendaPeriod, string> = {
  next: "Próximos 7 dias",
  previous: "Últimos 7 dias",
};

const isAgendaPeriod = (value: string): value is AgendaPeriod =>
  value in PERIOD_LABELS;

const AgendaEvents = ({ period }: { period: AgendaPeriod }) => {
  const { data: events = [], isLoading } = useCalendarEvents(RANGES[period]);
  const { data: notes = [] } = useNotesQuery();
  const ordered = period === "previous" ? [...events].reverse() : events;
  if (isLoading) return null;
  if (ordered.length === 0) {
    return (
      <p className="text-body-sm text-muted-foreground px-3">
        Nenhum evento neste período.
      </p>
    );
  }
  return <EventDayGroups events={ordered} notes={notes} nowMs={Date.now()} />;
};

export const AgendaPage = () => {
  const { data: permissions } = usePermissions();
  const [period, setPeriod] = useState<AgendaPeriod>("next");
  const granted = permissions?.calendar === "granted";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-title-3 text-heading">Agenda</h1>
              <p className="text-body-sm text-muted-foreground">
                Suas reuniões do Calendário da Apple, com as notas de cada uma.
              </p>
            </div>
            <Tabs
              value={period}
              onValueChange={(value) => {
                if (isAgendaPeriod(value)) setPeriod(value);
              }}
            >
              <TabsList className="h-8">
                {(Object.keys(PERIOD_LABELS) as AgendaPeriod[]).map(
                  (option) => (
                    <TabsTrigger
                      key={option}
                      value={option}
                      className="text-caption"
                    >
                      {PERIOD_LABELS[option]}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
            </Tabs>
          </div>
          {granted ? <AgendaEvents period={period} /> : <ConnectCalendar />}
        </PageContainer>
      </ScrollArea>
    </div>
  );
};
