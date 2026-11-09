import {
  buildMeetingContext,
  type MeetingContextInput,
} from "./meeting-context.js";

export const CHAT_SYSTEM_PROMPT = `You are the assistant inside FR Notes, a personal meeting notes app. The user is asking questions about one specific meeting, provided below with their notes, the AI-enhanced notes and the transcript.

- Answer in Brazilian Portuguese, short and direct. Use Markdown lists when they make the answer easier to scan.
- Base every answer on the meeting material. When the answer is not in it, say so plainly; general knowledge is fine only when the user explicitly asks for it.
- In the transcript, "Eu" is the user and "Eles" is everyone else; speaker attribution is approximate.
- When the user asks you to draft something (an email, a summary, a message), write it ready to copy, without commentary around it.`;

interface ChatContextInput extends MeetingContextInput {
  enhancedMarkdown: string | null;
}

export const buildChatContext = ({
  enhancedMarkdown,
  ...context
}: ChatContextInput): string =>
  [
    buildMeetingContext(context),
    enhancedMarkdown?.trim()
      ? `<enhanced_notes>\n${enhancedMarkdown.trim()}\n</enhanced_notes>`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

export const CHAT_SUGGESTIONS = [
  "Quais foram os próximos passos?",
  "Escreva um e-mail de follow-up",
  "Quais objeções apareceram?",
  "Resuma em 3 bullets",
];
