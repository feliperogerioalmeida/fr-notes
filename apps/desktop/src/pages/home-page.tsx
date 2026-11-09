import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Mic, Plus } from "lucide-react";
import { useOutletContext } from "react-router";

import { PageContainer, PageTitle } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { UpcomingMeetings } from "@/features/calendar/upcoming-meetings.js";
import { NotesList } from "@/features/notes/notes-list.js";
import { useNotesQuery } from "@/features/notes/use-notes.js";
import { useStartNote } from "@/features/notes/use-start-note.js";
import { WeekSummary } from "@/features/notes/week-summary.js";
import { useSettings } from "@/features/settings/use-settings.js";

import type { ShellContext } from "./shell-context.js";

const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 18;

const pickGreeting = (hour: number) => {
  if (hour < MORNING_END_HOUR) return "Bom dia";
  if (hour < AFTERNOON_END_HOUR) return "Boa tarde";
  return "Boa noite";
};

const greet = (name: string) => {
  const greeting = pickGreeting(new Date().getHours());
  const firstName = name.trim().split(" ")[0];
  return firstName ? `${greeting}, ${firstName}` : greeting;
};

const todayLabel = () =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

const EmptyNotes = () => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center">
    <p className="text-body text-heading font-medium">Nenhuma nota ainda</p>
    <p className="text-body-sm text-muted-foreground max-w-sm">
      Comece uma nota e grave sua próxima reunião. A FR transcreve e organiza
      tudo para você no final.
    </p>
  </div>
);

const NoResults = () => (
  <p className="text-body-sm text-muted-foreground px-3">
    Nenhuma nota encontrada para essa busca.
  </p>
);

export const HomePage = () => {
  const { searchQuery } = useOutletContext<ShellContext>();
  const settings = useSettings();
  const { data: notes = [] } = useNotesQuery({ query: searchQuery });
  const { data: allNotes = [] } = useNotesQuery();
  const startNote = useStartNote();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <PageTitle
            title={greet(settings.userName)}
            description={todayLabel()}
            actions={
              <>
                <Button variant="outline" onClick={() => void startNote()}>
                  <Plus />
                  Nova nota
                </Button>
                <Button onClick={() => void startNote({ record: true })}>
                  <Mic />
                  Gravar reunião
                </Button>
              </>
            }
          />
          <div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="flex min-w-0 flex-col gap-3">
              {searchQuery && (
                <h2 className="text-label text-muted-foreground px-3 uppercase">
                  Resultados para “{searchQuery}”
                </h2>
              )}
              <NotesList
                notes={notes}
                emptyState={searchQuery ? <NoResults /> : <EmptyNotes />}
              />
            </section>
            <aside className="order-first flex flex-col gap-4 @4xl:sticky @4xl:top-0 @4xl:order-none">
              <UpcomingMeetings />
              <WeekSummary notes={allNotes} />
            </aside>
          </div>
        </PageContainer>
      </ScrollArea>
    </div>
  );
};
