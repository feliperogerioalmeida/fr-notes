import { useQuery } from "@tanstack/react-query";
import {
  ALL_MEETINGS_THREAD_ID,
  ASK_ALL_MEETINGS_SYSTEM_PROMPT,
  buildAskAllMeetingsPrompt,
  buildMeetingSources,
  type ChatMessage,
  type MeetingSource,
  type Note,
  toChatSources,
} from "@workspace/core";
import type { ModelMessage } from "ai";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { getStorage } from "@/lib/database.js";
import { describeError } from "@/lib/errors.js";
import { streamCompletion } from "@/lib/llm.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export type AskPhase = "idle" | "searching" | "reading" | "writing";

const HISTORY_MESSAGES = 4;
const QUERY_KEY = QUERY_KEYS.chat(ALL_MEETINGS_THREAD_ID);

const findPreviousQuestion = (messages: ChatMessage[]) =>
  [...messages].reverse().find((message) => message.role === "user")?.content ??
  "";

const retrieveSources = async (question: string, previousQuestion: string) => {
  const storage = await getStorage();
  const context = await storage.search.findMeetingContext({
    question: `${question} ${previousQuestion}`,
  });
  const noteIds = [
    ...new Set([
      ...context.excerpts.map((excerpt) => excerpt.noteId),
      ...context.summaries.map((summary) => summary.noteId),
    ]),
  ];
  const notes = await Promise.all(
    noteIds.map((id) => storage.notes.findNote(id)),
  );
  return buildMeetingSources({
    context,
    notes: notes.filter((note): note is Note => Boolean(note)),
  });
};

interface AnswerInput {
  question: string;
  sources: MeetingSource[];
  history: ChatMessage[];
  onText: (text: string) => void;
}

const answerQuestion = async ({
  question,
  sources,
  history,
  onText,
}: AnswerInput) => {
  const settings = await (await getStorage()).settings.readSettings();
  const previous: ModelMessage[] = history
    .slice(-HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content }));
  return streamCompletion({
    settings,
    instructions: ASK_ALL_MEETINGS_SYSTEM_PROMPT,
    messages: [
      ...previous,
      {
        role: "user",
        content: buildAskAllMeetingsPrompt({ question, sources }),
      },
    ],
    onText,
  });
};

const appendMessage = async (
  message: Parameters<
    Awaited<ReturnType<typeof getStorage>>["chat"]["appendMessage"]
  >[0],
) => {
  await (await getStorage()).chat.appendMessage(message);
  await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
};

export const useAskAllMeetings = () => {
  const { data: messages = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () =>
      (await getStorage()).chat.listMessages(ALL_MEETINGS_THREAD_ID),
  });
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null);
  const busyRef = useRef(false);

  const enterPhase = useCallback((next: AskPhase) => {
    setPhase(next);
    setPhaseStartedAt(next === "idle" ? null : Date.now());
  }, []);

  const send = useCallback(
    async (question: string) => {
      if (busyRef.current || !question.trim()) return;
      busyRef.current = true;
      const history = messages;
      await appendMessage({
        noteId: ALL_MEETINGS_THREAD_ID,
        role: "user",
        content: question.trim(),
      });
      enterPhase("searching");
      setStreamingText("");
      try {
        const sources = await retrieveSources(
          question,
          findPreviousQuestion(history),
        );
        enterPhase("reading");
        const answer = await answerQuestion({
          question,
          sources,
          history,
          onText: (text) => {
            setPhase("writing");
            setStreamingText(text);
          },
        });
        await appendMessage({
          noteId: ALL_MEETINGS_THREAD_ID,
          role: "assistant",
          content: answer,
          sources: toChatSources(sources),
        });
      } catch (error) {
        toast.error(describeError(error));
      } finally {
        busyRef.current = false;
        setStreamingText(null);
        enterPhase("idle");
      }
    },
    [messages, enterPhase],
  );

  const clear = useCallback(async () => {
    await (await getStorage()).chat.clearMessages(ALL_MEETINGS_THREAD_ID);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, []);

  return { messages, phase, phaseStartedAt, streamingText, send, clear };
};
