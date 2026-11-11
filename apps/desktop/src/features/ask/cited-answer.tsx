import { type ChatSource, linkCitations } from "@workspace/core";
import { FileText, Quote } from "lucide-react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router";
import remarkGfm from "remark-gfm";

import { buildNoteLink } from "@/features/search/note-link.js";

const SOURCE_ANCHOR = /^#source-(\d+)$/;

const useOpenSource = () => {
  const navigate = useNavigate();
  return (source: ChatSource) =>
    navigate(buildNoteLink(source.noteId, source.atMs));
};

const CitationChip = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-brand-subtle text-brand hover:bg-brand hover:text-brand-foreground mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 align-[0.1em] text-[0.7rem] leading-none font-semibold transition-colors"
  >
    {children}
  </button>
);

interface CitedAnswerProps {
  content: string;
  sources: ChatSource[];
}

export const CitedAnswer = ({ content, sources }: CitedAnswerProps) => {
  const openSource = useOpenSource();
  const byIndex = new Map(sources.map((source) => [source.index, source]));
  return (
    <div className="fr-markdown text-body-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const index = Number(href?.match(SOURCE_ANCHOR)?.[1]);
            const source = byIndex.get(index);
            if (!source) return <span>{children}</span>;
            return (
              <CitationChip onClick={() => openSource(source)}>
                {index}
              </CitationChip>
            );
          },
        }}
      >
        {linkCitations(content, sources)}
      </ReactMarkdown>
    </div>
  );
};

export const SourceList = ({ sources }: { sources: ChatSource[] }) => {
  const openSource = useOpenSource();
  if (sources.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 border-t pt-3">
      <span className="text-label text-muted-foreground uppercase">Fontes</span>
      <ul className="flex flex-col gap-0.5">
        {sources.map((source) => (
          <li key={source.index}>
            <button
              type="button"
              onClick={() => openSource(source)}
              className="hover:bg-accent text-caption ease-brand flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150"
            >
              <span className="bg-brand-subtle text-brand flex size-4 shrink-0 items-center justify-center rounded text-[0.7rem] font-semibold">
                {source.index}
              </span>
              {source.atMs === null ? (
                <FileText className="text-muted-foreground size-3.5 shrink-0" />
              ) : (
                <Quote className="text-muted-foreground size-3.5 shrink-0" />
              )}
              <span className="text-foreground truncate">{source.title}</span>
              <span className="text-muted-foreground shrink-0">
                · {source.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
