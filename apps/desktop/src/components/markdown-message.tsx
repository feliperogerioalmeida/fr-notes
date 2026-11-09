import { cn } from "@workspace/ui/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export const MarkdownMessage = ({
  content,
  className,
}: MarkdownMessageProps) => (
  <div className={cn("fr-markdown", className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
);
