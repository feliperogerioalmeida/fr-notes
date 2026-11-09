import {
  buildEnhancePrompt,
  ENHANCE_SYSTEM_PROMPT,
  type Note,
  parseEnhancedNotes,
  type Storage,
} from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import { streamCompletion } from "@/lib/llm.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

import { useEnhanceStore } from "./enhance-store.js";

export class NothingToEnhanceError extends Error {
  constructor() {
    super("Escreva algumas notas ou grave a reunião antes de gerar.");
  }
}

interface RunEnhancementInput {
  noteId: string;
  templateId?: string;
}

const loadInputs = async (storage: Storage, noteId: string) => {
  const note = await storage.notes.findNote(noteId);
  if (!note) throw new Error("Nota não encontrada.");
  const segments = await storage.transcript.listSegments(noteId);
  const settings = await storage.settings.readSettings();
  return { note, segments, settings };
};

const resolveTemplate = async (
  storage: Storage,
  candidates: (string | null | undefined)[],
) => {
  for (const id of candidates) {
    const template = id ? await storage.templates.findTemplate(id) : null;
    if (template) return template;
  }
  throw new Error("Template não encontrado.");
};

const pickTitle = (note: Note, generatedTitle: string | null) =>
  note.title.trim() ? undefined : (generatedTitle ?? undefined);

export const runEnhancement = async ({
  noteId,
  templateId,
}: RunEnhancementInput): Promise<void> => {
  const storage = await getStorage();
  const { note, segments, settings } = await loadInputs(storage, noteId);
  if (segments.length === 0 && !note.notesMarkdown.trim()) {
    throw new NothingToEnhanceError();
  }
  const template = await resolveTemplate(storage, [
    templateId,
    note.templateId,
    settings.defaultTemplateId,
  ]);
  const store = useEnhanceStore.getState();
  store.begin(noteId);
  try {
    const output = await streamCompletion({
      settings,
      instructions: ENHANCE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildEnhancePrompt({ note, segments, settings, template }),
        },
      ],
      onText: (text) => store.update(parseEnhancedNotes(text).markdown),
    });
    const enhanced = parseEnhancedNotes(output);
    await storage.notes.updateNote({
      id: noteId,
      patch: {
        enhancedMarkdown: enhanced.markdown,
        templateId: template.id,
        title: pickTitle(note, enhanced.title),
      },
    });
  } finally {
    store.finish();
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.note(noteId) });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes });
  }
};
