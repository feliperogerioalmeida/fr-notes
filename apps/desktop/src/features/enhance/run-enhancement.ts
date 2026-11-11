import {
  buildEnhancePrompt,
  ENHANCE_SYSTEM_PROMPT,
  type Note,
  parseEnhancedNotes,
  type Storage,
} from "@workspace/core";

import { syncActionItems } from "@/features/action-items/sync-action-items.js";
import { dispatchNoteEvent } from "@/features/integrations/deliver-webhooks.js";
import { getStorage } from "@/lib/database.js";
import { streamCompletion } from "@/lib/llm.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

import { useEnhanceStore } from "./enhance-store.js";
import { estimateReadMs, recordReadRate } from "./read-rate.js";

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
  const digests = await storage.digests.listDigests(noteId);
  return { note, segments, settings, digests };
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

interface StreamNotesInput {
  noteId: string;
  prompt: string;
  settings: Awaited<ReturnType<typeof loadInputs>>["settings"];
}

const streamNotes = async ({ noteId, prompt, settings }: StreamNotesInput) => {
  const chars = ENHANCE_SYSTEM_PROMPT.length + prompt.length;
  const store = useEnhanceStore.getState();
  store.begin({ noteId, estimatedReadMs: estimateReadMs(settings, chars) });
  const startedAt = Date.now();
  let isFirstText = true;
  return streamCompletion({
    settings,
    instructions: ENHANCE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    onText: (text) => {
      if (isFirstText) {
        isFirstText = false;
        recordReadRate({ settings, chars, elapsedMs: Date.now() - startedAt });
      }
      store.update(parseEnhancedNotes(text).markdown);
    },
  });
};

export const runEnhancement = async ({
  noteId,
  templateId,
}: RunEnhancementInput): Promise<void> => {
  const storage = await getStorage();
  const { note, segments, settings, digests } = await loadInputs(
    storage,
    noteId,
  );
  if (segments.length === 0 && !note.notesMarkdown.trim()) {
    throw new NothingToEnhanceError();
  }
  const template = await resolveTemplate(storage, [
    templateId,
    note.templateId,
    settings.defaultTemplateId,
  ]);
  try {
    const output = await streamNotes({
      noteId,
      settings,
      prompt: buildEnhancePrompt({
        note,
        segments,
        settings,
        template,
        digests,
      }),
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
    await syncActionItems(noteId, enhanced.markdown);
    void dispatchNoteEvent({ noteId, event: "note.enhanced" });
  } finally {
    useEnhanceStore.getState().finish();
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.note(noteId) });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes });
  }
};
