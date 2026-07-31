'use client';

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  IndentIncrease,
  IndentDecrease,
  SeparatorHorizontal,
} from "lucide-react";
import { AVAILABLE_VARIABLES } from "@/lib/templateVariables";
import { useEffect, useCallback } from "react";

interface TemplateEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}

export function TemplateEditor({ initialContent = "", onChange, readOnly = false }: TemplateEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    enableInputRules: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ heading: false, orderedList: false }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          `min-h-full px-4 py-3 text-sm text-gray-900 focus:outline-none prose prose-sm max-w-none ${readOnly ? "bg-gray-50 cursor-not-allowed" : ""}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      if (typeof window !== "undefined") {
        (window as unknown as Record<string, unknown>).__templateEditor__ = editor;
      }
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
      if (initialContent && editor.getHTML() !== initialContent && initialContent !== "<p></p>") {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent, readOnly]);

  const insertVariable = useCallback(
    (key: string) => {
      editor?.commands.insertContent(`{{${key}}}`);
      editor?.commands.focus();
    },
    [editor]
  );

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-primary-100 text-primary-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className={`${readOnly ? "opacity-60 pointer-events-none" : ""}`}>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Variable einfügen – klicken, um an Cursor-Position einzufügen
        </p>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVariable(v.key)}
              className="rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
              title={`{{${v.key}}}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      </div>

      <div className="rounded-lg border border-gray-300 overflow-hidden flex flex-col" style={{ minHeight: 360 }}>
        <div className={`flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2 ${readOnly ? "opacity-50 pointer-events-none" : ""}`}>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Fett"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Kursiv"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Unterstrichen"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-gray-300" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Aufzählung"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-gray-300" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Linksbündig"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Zentriert"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Rechtsbündig"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            active={editor.isActive({ textAlign: "justify" })}
            title="Blocksatz"
          >
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-gray-300" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Trennlinie einfügen"
          >
            <SeparatorHorizontal className="h-4 w-4" />
          </ToolbarButton>
        </div>
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
