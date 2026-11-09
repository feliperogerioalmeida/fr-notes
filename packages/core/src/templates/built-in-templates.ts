import type { TemplateInput } from "../domain/template.js";

export interface BuiltInTemplate extends TemplateInput {
  id: string;
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "builtin-general",
    name: "Reunião geral",
    description: "Resumo, pontos discutidos, decisões e próximos passos.",
    instructions: [
      "### Resumo — 2 a 4 frases com o objetivo e o resultado da reunião.",
      "### Pontos discutidos — um tópico por assunto, com os detalhes relevantes em sub-bullets.",
      "### Decisões — o que ficou decidido, de forma objetiva.",
      "### Próximos passos — tarefas com responsável e prazo quando mencionados.",
    ].join("\n"),
  },
  {
    id: "builtin-client-discovery",
    name: "Cliente / Descoberta",
    description: "Entender o problema do cliente, escopo, orçamento e prazos.",
    instructions: [
      "### Contexto do cliente — quem é, o negócio e o momento atual.",
      "### Problema e dores — o que motivou a conversa, com exemplos citados.",
      "### Requisitos e escopo — funcionalidades, integrações e restrições técnicas.",
      "### Orçamento e prazos — valores, datas e expectativas mencionadas.",
      "### Objeções e riscos — dúvidas, receios e pontos sensíveis.",
      "### Próximos passos — proposta, follow-ups e responsáveis.",
    ].join("\n"),
  },
  {
    id: "builtin-one-on-one",
    name: "1:1",
    description: "Conversa individual: andamento, bloqueios e feedback.",
    instructions: [
      "### Como a pessoa está — clima, energia e preocupações.",
      "### Andamento e bloqueios — progresso do trabalho e o que está travando.",
      "### Feedback — o que foi dado e recebido, nos dois sentidos.",
      "### Próximos passos — compromissos de cada lado.",
    ].join("\n"),
  },
  {
    id: "builtin-standup",
    name: "Daily / Standup",
    description: "O que cada pessoa fez, vai fazer e o que está bloqueando.",
    instructions: [
      "Crie uma seção `###` por pessoa que falou, com três bullets:",
      "- Fez: o que concluiu desde a última daily.",
      "- Vai fazer: o foco de hoje.",
      "- Bloqueios: impedimentos (omita se não houver).",
      "Feche com ### Pontos de atenção se algo precisar de ação do time.",
    ].join("\n"),
  },
  {
    id: "builtin-kickoff",
    name: "Kickoff de projeto",
    description: "Objetivos, escopo, marcos, responsáveis e riscos.",
    instructions: [
      "### Objetivos — o que o projeto precisa alcançar e como medir sucesso.",
      "### Escopo — o que entra e o que fica de fora.",
      "### Marcos e entregas — datas e entregas combinadas.",
      "### Responsáveis — quem cuida de cada frente.",
      "### Riscos e dependências — o que pode atrasar ou bloquear.",
      "### Próximos passos — tarefas imediatas com responsável.",
    ].join("\n"),
  },
  {
    id: "builtin-interview",
    name: "Entrevista",
    description: "Perfil do candidato, pontos fortes, atenção e avaliação.",
    instructions: [
      "### Perfil — experiência e contexto do candidato.",
      "### Pontos fortes — com evidências citadas na conversa.",
      "### Pontos de atenção — lacunas ou respostas fracas.",
      "### Respostas-chave — as respostas mais relevantes, resumidas.",
      "### Avaliação — recomendação objetiva e próximos passos do processo.",
    ].join("\n"),
  },
];
