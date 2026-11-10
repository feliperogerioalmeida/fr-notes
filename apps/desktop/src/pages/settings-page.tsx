import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import {
  AudioLines,
  CalendarDays,
  Info,
  Keyboard,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  UserRound,
  Webhook,
} from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, NavLink, useParams } from "react-router";

import { PageContainer } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { DictationSection } from "@/features/dictation/dictation-section.js";
import { IntegrationsSection } from "@/features/integrations/integrations-section.js";
import { AboutSection } from "@/features/settings/about-section.js";
import { AiSection } from "@/features/settings/ai-section.js";
import { CalendarsSection } from "@/features/settings/calendars-section.js";
import {
  PreferencesSection,
  ProfileSection,
} from "@/features/settings/general-sections.js";
import { MeetingsSection } from "@/features/settings/meetings-section.js";
import { PermissionsSection } from "@/features/settings/permissions-section.js";
import { SpeakersSection } from "@/features/settings/speakers-section.js";
import { TranscriptionSection } from "@/features/settings/transcription-section.js";
import {
  type SettingsSectionId,
  useSettingsAttention,
} from "@/features/settings/use-settings-attention.js";

interface SectionDefinition {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
  description: string;
  content: () => ReactNode;
}

const SECTIONS: SectionDefinition[] = [
  {
    id: "geral",
    label: "Geral",
    icon: UserRound,
    description: "Quem você é, template padrão e aparência.",
    content: () => (
      <>
        <ProfileSection />
        <PreferencesSection />
      </>
    ),
  },
  {
    id: "ditado",
    label: "Ditado e atalhos",
    icon: Keyboard,
    description:
      "Fale em qualquer app e o FR Notes digita para você. Atalhos globais para gravar reuniões.",
    content: () => <DictationSection />,
  },
  {
    id: "transcricao",
    label: "Transcrição",
    icon: AudioLines,
    description:
      "Deepgram nova-3 em tempo real: um canal para o seu microfone e outro para o áudio do computador.",
    content: () => <TranscriptionSection />,
  },
  {
    id: "reunioes",
    label: "Reuniões e agenda",
    icon: CalendarDays,
    description:
      "Detecção automática de reuniões e quais calendários aparecem no app.",
    content: () => (
      <>
        <MeetingsSection />
        <SpeakersSection />
        <CalendarsSection />
      </>
    ),
  },
  {
    id: "ia",
    label: "IA",
    icon: Sparkles,
    description:
      "O modelo que junta suas anotações com a transcrição e responde perguntas.",
    content: () => <AiSection />,
  },
  {
    id: "integracoes",
    label: "Integrações",
    icon: Webhook,
    description:
      "Envie cada nota para outros sistemas (FR Hub, n8n, Make, seu backend) por webhook assinado.",
    content: () => <IntegrationsSection />,
  },
  {
    id: "permissoes",
    label: "Permissões",
    icon: ShieldCheck,
    description:
      "Acessos do macOS para ouvir você, os outros participantes e ler sua agenda.",
    content: () => <PermissionsSection />,
  },
  {
    id: "sobre",
    label: "Sobre",
    icon: Info,
    description: "Versão instalada e atualizações.",
    content: () => <AboutSection />,
  },
];

const DEFAULT_SECTION: SettingsSectionId = "geral";

const SettingsNav = () => {
  const attention = useSettingsAttention();
  return (
    <nav className="flex flex-col gap-0.5 @3xl:sticky @3xl:top-0">
      {SECTIONS.map(({ id, label, icon: Icon }) => (
        <NavLink
          key={id}
          to={`/settings/${id}`}
          className={({ isActive }) =>
            cn(
              "text-body-sm ease-brand flex h-8 items-center gap-2.5 rounded-md px-2.5 transition-colors duration-150",
              isActive
                ? "bg-accent text-accent-foreground [&_svg]:text-brand"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )
          }
        >
          <Icon className="size-4" strokeWidth={1.75} />
          <span className="flex-1 truncate">{label}</span>
          {attention[id] && (
            <span
              className="bg-warning size-2 rounded-full"
              aria-label="Precisa de atenção"
            />
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export const SettingsPage = () => {
  const { section } = useParams();
  const current = SECTIONS.find((item) => item.id === section);
  if (!current) {
    return <Navigate to={`/settings/${DEFAULT_SECTION}`} replace />;
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer>
          <h1 className="text-title-3 text-heading">Configurações</h1>
          <div className="grid items-start gap-8 @3xl:grid-cols-[200px_minmax(0,1fr)]">
            <SettingsNav />
            <div className="flex max-w-[760px] min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-body-lg text-heading font-semibold">
                  {current.label}
                </h2>
                <p className="text-body-sm text-muted-foreground">
                  {current.description}
                </p>
              </div>
              {current.content()}
            </div>
          </div>
        </PageContainer>
      </ScrollArea>
    </div>
  );
};
