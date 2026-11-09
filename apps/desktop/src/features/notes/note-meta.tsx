import {
  describeParticipant,
  formatDayLabel,
  formatTime,
  type Note,
} from "@workspace/core";
import { CalendarDays, Folder, LayoutTemplate, Users } from "lucide-react";
import type { ReactNode } from "react";

import { useFoldersQuery } from "@/features/folders/use-folders.js";
import { useTemplatesQuery } from "@/features/templates/use-templates.js";

const VISIBLE_PARTICIPANTS = 3;

const describeParticipants = (note: Note) => {
  const names = note.participants.map(describeParticipant);
  const visible = names.slice(0, VISIBLE_PARTICIPANTS).join(", ");
  const hidden = names.length - VISIBLE_PARTICIPANTS;
  return hidden > 0 ? `${visible} +${hidden}` : visible;
};

const MetaChip = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <span className="text-caption text-muted-foreground bg-secondary inline-flex items-center gap-1.5 rounded-md px-2 py-1 [&_svg]:size-3.5">
    {icon}
    {label}
  </span>
);

export const NoteMeta = ({ note }: { note: Note }) => {
  const { data: folders = [] } = useFoldersQuery();
  const { data: templates = [] } = useTemplatesQuery();
  const folder = folders.find((item) => item.id === note.folderId);
  const template = templates.find((item) => item.id === note.templateId);
  const startedAt = note.recordingStartedAt ?? note.createdAt;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MetaChip
        icon={<CalendarDays />}
        label={`${formatDayLabel(new Date(startedAt))}, ${formatTime(startedAt)}`}
      />
      {note.participants.length > 0 && (
        <MetaChip icon={<Users />} label={describeParticipants(note)} />
      )}
      {folder && <MetaChip icon={<Folder />} label={folder.name} />}
      {template && note.enhancedMarkdown && (
        <MetaChip icon={<LayoutTemplate />} label={template.name} />
      )}
    </div>
  );
};
