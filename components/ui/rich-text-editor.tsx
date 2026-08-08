"use client";

import { useCallback } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

/**
 * The post editor.
 *
 * Tiptap over ProseMirror, which matters for one reason beyond the toolbar: its
 * document is a **schema**, not a string. Anything typed, dragged or pasted is
 * parsed into nodes and marks the schema declares, and everything else is
 * dropped on the way in — so pasting a page of Word HTML, or a `<script>`,
 * cannot put either into the document. That is what makes the live preview
 * below safe to render, and it is a second layer under the server's sanitiser
 * rather than a replacement for it.
 *
 * Output is HTML rather than Tiptap's JSON. HTML is what the post page renders,
 * what the sanitiser understands, and what still means something if this editor
 * is ever replaced; JSON would tie every stored post to one library's document
 * format.
 */
export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The post page renders `h2`–`h4`; `h1` is the title, which lives in
        // its own field. An editor that can produce an `h1` produces posts with
        // two of them, which is a real SEO problem and an accessibility one.
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          // Matches the sanitiser's allow-list. A `javascript:` href typed here
          // would be stripped on save anyway; refusing it at the point of entry
          // means the author finds out immediately instead of silently losing
          // the link.
          protocols: ["http", "https", "mailto", "tel"],
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Placeholder.configure({ placeholder: "Write the post…" }),
    ],
    content: value,
    // Required under the App Router: rendering the editor during the server
    // pass produces markup ProseMirror then rebuilds on the client, which React
    // reports as a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "bx-editor__surface",
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", previous ?? "https://");
    // `null` is cancel and must not clear an existing link; an empty string is
    // an explicit "remove this one".
    if (href === null) return;
    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const src = window.prompt("Image URL");
    if (!src) return;
    const alt = window.prompt("Describe the image (alt text)") ?? "";
    editor.chain().focus().setImage({ src, alt }).run();
  }, [editor]);

  if (!editor) {
    // The server pass and the first client render, before ProseMirror mounts.
    return (
      <div className="h-64 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950" />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 p-2 dark:border-gray-800">
        <Tool
          editor={editor}
          Icon={Bold}
          label="Bold"
          isActive="bold"
          run={(chain) => chain.toggleBold().run()}
        />
        <Tool
          editor={editor}
          Icon={Italic}
          label="Italic"
          isActive="italic"
          run={(chain) => chain.toggleItalic().run()}
        />
        <Divider />
        <Tool
          editor={editor}
          Icon={Heading2}
          label="Heading 2"
          isActive={["heading", { level: 2 }]}
          run={(chain) => chain.toggleHeading({ level: 2 }).run()}
        />
        <Tool
          editor={editor}
          Icon={Heading3}
          label="Heading 3"
          isActive={["heading", { level: 3 }]}
          run={(chain) => chain.toggleHeading({ level: 3 }).run()}
        />
        <Divider />
        <Tool
          editor={editor}
          Icon={List}
          label="Bullet list"
          isActive="bulletList"
          run={(chain) => chain.toggleBulletList().run()}
        />
        <Tool
          editor={editor}
          Icon={ListOrdered}
          label="Numbered list"
          isActive="orderedList"
          run={(chain) => chain.toggleOrderedList().run()}
        />
        <Tool
          editor={editor}
          Icon={Quote}
          label="Quote"
          isActive="blockquote"
          run={(chain) => chain.toggleBlockquote().run()}
        />
        <Tool
          editor={editor}
          Icon={Code}
          label="Code block"
          isActive="codeBlock"
          run={(chain) => chain.toggleCodeBlock().run()}
        />
        <Tool
          editor={editor}
          Icon={Minus}
          label="Divider"
          run={(chain) => chain.setHorizontalRule().run()}
        />
        <Divider />

        <ToolButton
          Icon={Link2}
          label="Add or edit link"
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <ToolButton
          Icon={Link2Off}
          label="Remove link"
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        />
        <ToolButton Icon={ImagePlus} label="Insert image" onClick={addImage} />
        <Divider />

        <ToolButton
          Icon={Undo2}
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolButton
          Icon={Redo2}
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      <EditorContent editor={editor} className="bx-editor" />
    </div>
  );
}

type Chain = ReturnType<ReturnType<Editor["chain"]>["focus"]>;

function Tool({
  editor,
  Icon,
  label,
  isActive,
  run,
}: {
  editor: Editor;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: string | [string, Record<string, unknown>];
  run: (chain: Chain) => void;
}) {
  const active = Array.isArray(isActive)
    ? editor.isActive(isActive[0], isActive[1])
    : isActive
      ? editor.isActive(isActive)
      : false;

  return (
    <ToolButton
      Icon={Icon}
      label={label}
      active={active}
      onClick={() => run(editor.chain().focus())}
    />
  );
}

function ToolButton({
  Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-9 w-9 place-content-center rounded-md transition-colors disabled:opacity-30 ${
        active
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
          : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Divider() {
  return (
    <span
      className="mx-1 my-1.5 w-px bg-gray-200 dark:bg-gray-700"
      aria-hidden
    />
  );
}
