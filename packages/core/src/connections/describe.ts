import type { ActionItem } from "../domain/action-item.js";
import type { Note } from "../domain/note.js";
import { formatFullDate } from "../utils/dates.js";

const noteDate = (note: Note) => note.recordingStartedAt ?? note.createdAt;

export const describeTaskOrigin = (item: ActionItem, note: Note): string =>
  [
    `Próximo passo da reunião "${note.title || "Sem título"}" (${formatFullDate(noteDate(note))}).`,
    item.owner ? `Responsável: ${item.owner}` : "",
    item.dueText ? `Prazo: ${item.dueText}` : "",
    "",
    "Criado pelo FR Notes.",
  ]
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n");

export const describeTaskTitle = (item: ActionItem): string =>
  item.text.charAt(0).toLocaleUpperCase("pt-BR") + item.text.slice(1);
