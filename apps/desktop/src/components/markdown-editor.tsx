import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const buildExtensions = (placeholder: string) => [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({ placeholder }),
  Markdown,
];

export const MarkdownEditor = ({
  value,
  onChange,
  placeholder = "",
  editable = true,
  autoFocus = false,
  className,
}: MarkdownEditorProps) => {
  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    content: value,
    contentType: "markdown",
    editable,
    autofocus: autoFocus ? "end" : false,
    editorProps: { attributes: { class: cn("fr-editor", className) } },
    onUpdate: ({ editor: current }) => onChange?.(current.getMarkdown()),
  });

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (editor.getMarkdown() === value) return;
    editor.commands.setContent(value, {
      contentType: "markdown",
      emitUpdate: false,
    });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return <EditorContent editor={editor} />;
};
