import { useQuery } from "@tanstack/react-query";
import {
  buildChatContext,
  CHAT_SYSTEM_PROMPT,
  type ChatMessage,
} from "@workspace/core";
import type { ModelMessage } from "ai";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { getStorage } from "@/lib/database.js";
import { describeError } from "@/lib/errors.js";
import { streamCompletion } from "@/lib/llm.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const toModelMessages = (messages: ChatMessage[]): ModelMessage[] =>
  messages.map(({ role, content }) => ({ role, content }));

const buildInstructions = async (noteId: string) => {
  const storage = await getStorage();
  const note = await storage.notes.findNote(noteId);
  if (!note) throw new Error("Nota não encontrada.");
  const segments = await storage.transcript.listSegments(noteId);
  const settings = await storage.settings.readSettings();
  const context = buildChatContext({
    note,
    segments,
    settings,
    enhancedMarkdown: note.enhancedMarkdown,
  });
  return { instructions: `${CHAT_SYSTEM_PROMPT}\n\n${context}`, settings };
};

const askModel = async (noteId: string, onText: (text: string) => void) => {
  const storage = await getStorage();
  const history = await storage.chat.listMessages(noteId);
  const { instructions, settings } = await buildInstructions(noteId);
  const answer = await streamCompletion({
    settings,
    instructions,
    messages: toModelMessages(history),
    onText,
  });
  await storage.chat.appendMessage({
    noteId,
    role: "assistant",
    content: answer,
  });
};

export const useNoteChat = (noteId: string) => {
  const queryKey = QUERY_KEYS.chat(noteId);
  const { data: messages = [] } = useQuery({
    queryKey,
    queryFn: async () => (await getStorage()).chat.listMessages(noteId),
  });
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const busyRef = useRef(false);

  const send = useCallback(
    async (question: string) => {
      if (busyRef.current || !question.trim()) return;
      busyRef.current = true;
      const storage = await getStorage();
      await storage.chat.appendMessage({
        noteId,
        role: "user",
        content: question.trim(),
      });
      await queryClient.invalidateQueries({ queryKey });
      setStreamingText("");
      try {
        await askModel(noteId, setStreamingText);
      } catch (error) {
        toast.error(describeError(error));
      } finally {
        busyRef.current = false;
        setStreamingText(null);
        await queryClient.invalidateQueries({ queryKey });
      }
    },
    [noteId, queryKey],
  );

  const clear = useCallback(async () => {
    await (await getStorage()).chat.clearMessages(noteId);
    await queryClient.invalidateQueries({ queryKey });
  }, [noteId, queryKey]);

  return { messages, streamingText, send, clear };
};
