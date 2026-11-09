import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";

import { PageHeader } from "@/components/page-header.js";
import { AboutSection } from "@/features/settings/about-section.js";
import { AiSection } from "@/features/settings/ai-section.js";
import { CalendarsSection } from "@/features/settings/calendars-section.js";
import {
  PreferencesSection,
  ProfileSection,
} from "@/features/settings/general-sections.js";
import { MeetingsSection } from "@/features/settings/meetings-section.js";
import { PermissionsSection } from "@/features/settings/permissions-section.js";
import { TranscriptionSection } from "@/features/settings/transcription-section.js";

export const SettingsPage = () => (
  <div className="flex h-full min-h-0 flex-col">
    <PageHeader />
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-10 pt-4 pb-16">
        <h1 className="text-title-3 text-heading">Configurações</h1>
        <TranscriptionSection />
        <MeetingsSection />
        <CalendarsSection />
        <AiSection />
        <PermissionsSection />
        <ProfileSection />
        <PreferencesSection />
        <AboutSection />
      </div>
    </ScrollArea>
  </div>
);
