import { cleanSnippet, splitHighlights } from "@workspace/core";

export const HighlightedText = ({ snippet }: { snippet: string }) => (
  <>
    {splitHighlights(cleanSnippet(snippet)).map((part, index) =>
      part.highlighted ? (
        <mark
          key={index}
          className="bg-brand-subtle text-heading rounded-sm px-0.5"
        >
          {part.text}
        </mark>
      ) : (
        <span key={index}>{part.text}</span>
      ),
    )}
  </>
);
