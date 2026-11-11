import {
  ALL_MEETINGS_THREAD_ID,
  buildMeetingSources,
  type CalendarEvent,
  type Note,
  nowIso,
  toChatSources,
  type TranscriptSource,
} from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import { connectionTokenKey, writeSecret } from "@/lib/native.js";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SEGMENT_GAP_MS = 9_000;

const DEMO_TRANSCRIPT: [TranscriptSource, string][] = [
  [
    "microphone",
    "Bom dia, Marina! Obrigado pelo tempo. Me conta como funciona o processo de pedidos hoje.",
  ],
  [
    "system",
    "Hoje tudo chega pelo WhatsApp e a gente copia para uma planilha. Perdemos uns dez pedidos por semana.",
  ],
  ["microphone", "E quantas pessoas mexem nessa planilha?"],
  [
    "system",
    "Três pessoas. E o financeiro só fecha o mês depois de conferir tudo na mão.",
  ],
  [
    "microphone",
    "Faz sentido. Vocês têm um prazo em mente para colocar algo no ar?",
  ],
  [
    "system",
    "Queríamos até março, antes da campanha de outono. O orçamento aprovado é de quarenta mil.",
  ],
  [
    "microphone",
    "Perfeito. Vou montar uma proposta com um MVP de pedidos integrado ao WhatsApp e te mando até sexta.",
  ],
];

const DEMO_NOTES = `- pedidos chegam por whatsapp → planilha
- perdem ~10 pedidos/semana
- prazo: março (campanha outono)
- orçamento 40k`;

const DEMO_ENHANCED = `### Contexto do cliente
- Operação de pedidos da Marina hoje depende de **WhatsApp + planilha** compartilhada por 3 pessoas.
- O financeiro só fecha o mês depois de conferir os pedidos manualmente.

### Problema e dores
- Perdem cerca de **10 pedidos por semana** na passagem do WhatsApp para a planilha.
- Retrabalho e conferência manual atrasam o fechamento.

### Orçamento e prazos
- Orçamento aprovado: **R$ 40 mil**.
- Precisam do sistema no ar **até março**, antes da campanha de outono.

### Próximos passos
- [ ] Felipe — enviar proposta de MVP de pedidos integrado ao WhatsApp (até sexta)
- [ ] Marina — compartilhar a planilha atual para mapear os campos`;

const seedDemoMeeting = async () => {
  const storage = await getStorage();
  const note = await storage.notes.createNote({
    title: "Descoberta — Pedidos da Marina",
    templateId: "builtin-client-discovery",
    participants: [
      { name: "Marina Souza", email: "marina@cliente.com" },
      { name: "João Lima", email: "joao@cliente.com" },
    ],
  });
  const startedAt = Date.now() - 2 * MINUTE_MS * DEMO_TRANSCRIPT.length;
  await storage.notes.updateNote({
    id: note.id,
    patch: {
      notesMarkdown: DEMO_NOTES,
      enhancedMarkdown: DEMO_ENHANCED,
      status: "done",
      recordingStartedAt: new Date(startedAt).toISOString(),
    },
  });
  await storage.actionItems.syncFromMarkdown({
    noteId: note.id,
    markdown: DEMO_ENHANCED,
  });
  for (const [index, [source, text]] of DEMO_TRANSCRIPT.entries()) {
    const startMs = startedAt + index * SEGMENT_GAP_MS;
    await storage.transcript.appendSegment({
      noteId: note.id,
      source,
      text,
      startMs,
      endMs: startMs + SEGMENT_GAP_MS - 1000,
      speaker: source === "system" ? Math.floor(index / 2) % 2 : null,
    });
  }
};

const SPRINT_ENHANCED = `### Resumo
- Sprint fechou com **8 de 10** histórias entregues.
- Sync com o FR Hub ficou para a próxima sprint.

### Próximos passos
- [ ] Ana — revisar o fluxo de onboarding no app (quarta)
- [x] Felipe — publicar a versão 0.2.0
- [ ] Bruno — estimar o sync de notas com o FR Hub`;

const seedSprintReview = async () => {
  const storage = await getStorage();
  const note = await storage.notes.createNote({
    title: "Review de sprint — FR Hub",
  });
  const startedAt = new Date(Date.now() - DAY_MS).toISOString();
  await storage.notes.updateNote({
    id: note.id,
    patch: {
      enhancedMarkdown: SPRINT_ENHANCED,
      status: "done",
      recordingStartedAt: startedAt,
    },
  });
  await storage.actionItems.syncFromMarkdown({
    noteId: note.id,
    markdown: SPRINT_ENHANCED,
  });
};

const seedConnections = async () => {
  const storage = await getStorage();
  const clickUpId = await storage.connections.createConnection({
    provider: "clickup",
    name: "ClickUp · Sprint atual",
    config: { listId: "preview-list", listName: "Sprint atual" },
    enabled: true,
  });
  await writeSecret(connectionTokenKey(clickUpId), "pk_preview");
  const slackId = await storage.connections.createConnection({
    provider: "slack",
    name: "Slack · #clientes",
    config: {},
    enabled: true,
  });
  await writeSecret(
    connectionTokenKey(slackId),
    "https://hooks.slack.com/preview",
  );
  const [first] = await storage.actionItems.listAll();
  if (!first) return;
  await storage.actionItems.recordSent({
    id: first.id,
    ref: {
      connectionId: clickUpId,
      provider: "clickup",
      externalId: "86abc",
      url: "https://app.clickup.com/t/86abc",
      sentAt: nowIso(),
    },
  });
};

const seedAskConversation = async () => {
  const storage = await getStorage();
  const question = "Quando falamos do orçamento e qual foi o valor?";
  const context = await storage.search.findMeetingContext({ question });
  const notes = await Promise.all(
    context.excerpts.map((excerpt) => storage.notes.findNote(excerpt.noteId)),
  );
  const sources = buildMeetingSources({
    context,
    notes: notes.filter((note): note is Note => Boolean(note)),
  });
  await storage.chat.appendMessage({
    noteId: ALL_MEETINGS_THREAD_ID,
    role: "user",
    content: question,
  });
  await storage.chat.appendMessage({
    noteId: ALL_MEETINGS_THREAD_ID,
    role: "assistant",
    content:
      "Na **Descoberta — Pedidos da Marina**, a Marina contou que o orçamento aprovado é de **R$ 40 mil** e que o sistema precisa estar no ar até março [1]. As notas da reunião registram o mesmo valor [2].",
    sources: toChatSources(sources),
  });
};

export const seedPreviewData = async () => {
  const storage = await getStorage();
  await storage.settings.writeSettings({ userName: "Felipe Rogério" });
  await storage.folders.createFolder({ name: "FR Digital" });
  const clients = await storage.folders.createFolder({ name: "Clientes" });
  const marina = await storage.folders.createFolder({
    name: "Marina Souza",
    parentId: clients,
  });
  await storage.folders.createFolder({ name: "Kickoff", parentId: marina });
  await storage.folders.createFolder({ name: "Pedidos", parentId: clients });
  await seedSprintReview();
  await seedDemoMeeting();
  await storage.notes.createNote({ title: "1:1 com o time" });
  await seedConnections();
  await seedAskConversation();
};

const buildEvent = (
  overrides: Partial<CalendarEvent> & Pick<CalendarEvent, "id" | "title">,
): CalendarEvent => ({
  startMs: Date.now(),
  endMs: Date.now() + 30 * MINUTE_MS,
  isAllDay: false,
  location: null,
  notes: null,
  url: null,
  calendarId: "preview-work",
  calendarTitle: "Trabalho",
  calendarColor: "#FF6B1A",
  attendees: [],
  organizer: null,
  ...overrides,
});

export const buildPreviewEvents = (): CalendarEvent[] => {
  const now = Date.now();
  return [
    buildEvent({
      id: "preview-kickoff",
      title: "Kickoff — App de pedidos",
      startMs: now + 2 * MINUTE_MS,
      endMs: now + 47 * MINUTE_MS,
      notes: "Link: https://meet.google.com/abc-defg-hij",
      attendees: [
        {
          name: "Marina Souza",
          email: "marina@cliente.com",
          isCurrentUser: false,
        },
        { name: "João Lima", email: "joao@cliente.com", isCurrentUser: false },
        { name: "Felipe", email: "felipe@fr.dev", isCurrentUser: true },
      ],
    }),
    buildEvent({
      id: "preview-design",
      title: "Review de design FR Hub",
      startMs: now + 3 * 60 * MINUTE_MS,
      endMs: now + 4 * 60 * MINUTE_MS,
      calendarId: "preview-icloud",
      calendarTitle: "Pessoal",
      calendarColor: "#3E7BFA",
      location: "https://us02web.zoom.us/j/123456789",
    }),
  ];
};

export const buildPreviewCalendars = () => [
  {
    id: "preview-icloud",
    title: "Pessoal",
    color: "#3E7BFA",
    source: "iCloud",
    allowsModifications: true,
  },
  {
    id: "preview-work",
    title: "Trabalho",
    color: "#FF6B1A",
    source: "Google",
    allowsModifications: true,
  },
  {
    id: "preview-holidays",
    title: "Feriados no Brasil",
    color: "#1F9D6B",
    source: "Outros",
    allowsModifications: false,
  },
];
