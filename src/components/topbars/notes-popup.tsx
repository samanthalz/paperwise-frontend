"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {BaseEditor, createEditor, Descendant, Editor, Element as SlateElement, Transforms,} from "slate";
import {Editable, ReactEditor, RenderElementProps, RenderLeafProps, Slate, useSlate, withReact,} from "slate-react";
import {Button} from "@/components/ui/button";
import {
    Bold,
    Code,
    Italic,
    List,
    ListOrdered,
    LucideIcon,
    Quote,
    Save,
    Strikethrough,
    Underline,
    X,
} from "lucide-react";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,} from "@/components/ui/tooltip";

type NotesPopupProps = {
    open: boolean;
    onCloseAction: () => void;
    pdfId: string | null;
};

type CustomText = {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
};

type CustomElement = {
    type: string;
    children: CustomText[];
};

declare module "slate" {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor;
        Element: CustomElement;
        Text: CustomText;
    }
}

const LIST_TYPES = ["numbered-list", "bulleted-list"];

export default function NotesPopup({open, onCloseAction, pdfId}: NotesPopupProps) {
    const editor = useMemo(() => withReact(createEditor()), []);
    const supabase = useMemo(() => createClientComponentClient(), []);
    const [editorKey, setEditorKey] = useState(0);

    const [value, setValue] = useState<Descendant[]>([
        {type: "paragraph", children: [{text: ""}]},
    ]);
    const [userId, setUserId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Get user session
    useEffect(() => {
        const getUser = async () => {
            const {
                data: {session},
                error,
            } = await supabase.auth.getSession();
            if (error) return console.error("Session fetch error:", error);
            if (session) setUserId(session.user.id);
            else setUserId(null);
        };
        getUser();
    }, [supabase]);

    // Load notes
    useEffect(() => {
        if (!userId || !pdfId) return;

        const loadNotes = async () => {
            const {data, error} = await supabase
                .from("notes")
                .select("content")
                .eq("user_id", userId)
                .eq("pdf_id", pdfId)
                .maybeSingle();

            if (error) return console.error(error);

            if (data?.content) {
                try {
                    const content =
                        typeof data.content === "string"
                            ? JSON.parse(data.content)
                            : data.content;

                    if (!Array.isArray(content) || content.length === 0) {
                        setValue([{type: "paragraph", children: [{text: ""}]}]);
                    } else {
                        setValue(content);
                        setEditorKey((prev) => prev + 1); // Force re-mount
                    }
                } catch {
                    console.warn("Invalid content in DB, using default paragraph");
                }
            } else {
                setValue([{type: "paragraph", children: [{text: ""}]}]);
            }
        };

        loadNotes();
    }, [userId, pdfId, supabase]);

    // Manual save
    const saveNotes = useCallback(async () => {
        if (!userId || !pdfId) return;
        setSaving(true);
        const {error} = await supabase.from("notes").upsert(
            {
                user_id: userId,
                pdf_id: pdfId,
                content: value,
                updated_at: new Date().toISOString(),
            },
            {onConflict: "user_id,pdf_id"}
        );
        if (error) console.error("Save error:", error);
        setSaving(false);
    }, [supabase, userId, pdfId, value]);

    // Toolbar helpers
    const isMarkActive = (
        editor: Editor,
        format: keyof Omit<CustomText, "text">
    ) => {
        const marks = Editor.marks(editor);
        return marks ? !!marks[format] : false;
    };

    const toggleMark = (editor: Editor, format: keyof Omit<CustomText, "text">) => {
        const isActive = isMarkActive(editor, format);
        if (isActive) Editor.removeMark(editor, format);
        else Editor.addMark(editor, format, true);
    };

    const isBlockActive = (editor: Editor, format: string) => {
        const [match] = Editor.nodes(editor, {
            match: (n) =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === format,
        });
        return !!match;
    };

    const toggleBlock = (editor: Editor, format: string) => {
        const isActive = isBlockActive(editor, format);
        const isList = LIST_TYPES.includes(format);

        Transforms.unwrapNodes(editor, {
            match: (n) => SlateElement.isElement(n) && LIST_TYPES.includes(n.type),
            split: true,
        });

        const newType = isActive ? "paragraph" : isList ? "list-item" : format;
        Transforms.setNodes(editor, {type: newType});

        if (!isActive && isList) {
            const block: CustomElement = {type: format, children: []};
            Transforms.wrapNodes(editor, block);
        }
        Editor.normalize(editor, {force: true});
    };

    // Render helpers
    const renderElement = useCallback((props: RenderElementProps) => {
        const {element, attributes, children} = props;
        switch (element.type) {
            case "blockquote":
                return (
                    <blockquote
                        {...attributes}
                        className="border-l-[3px] border-primary/60 pl-4 italic text-[var(--foreground)]/80 bg-[color-mix(in srgb, var(--toolbar-bg) 90%, white 10%)] rounded-md py-1"
                    >
                        {children}
                    </blockquote>
                );
            case "numbered-list":
                return (
                    <ol {...attributes} className="list-decimal ml-4 space-y-1">
                        {children}
                    </ol>
                );
            case "bulleted-list":
                return (
                    <ul {...attributes} className="list-disc ml-4 space-y-1">
                        {children}
                    </ul>
                );
            case "list-item":
                return <li {...attributes}>{children}</li>;
            default:
                return <p {...attributes}>{children}</p>;
        }
    }, []);

    const renderLeaf = useCallback((props: RenderLeafProps) => {
        const {leaf, attributes, children} = props;
        let el = children;
        if (leaf.bold) el = <strong>{el}</strong>;
        if (leaf.italic) el = <em>{el}</em>;
        if (leaf.underline) el = <u>{el}</u>;
        if (leaf.strikethrough) el = <s>{el}</s>;
        if (leaf.code)
            el = (
                <code
                    className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 px-1 rounded font-mono text-[0.9em]"
                >
                    {el}
                </code>
            );
        return <span {...attributes}>{el}</span>;
    }, []);

    if (!open) return null;

    // Toolbar button with tooltip
    const ToolbarButton = ({
                               format,
                               Icon,
                               label,
                           }: {
        format: string;
        Icon: LucideIcon;
        label: string;
    }) => {
        const editor = useSlate();
        const active = ["blockquote", "numbered-list", "bulleted-list"].includes(format)
            ? isBlockActive(editor, format)
            : isMarkActive(editor, format as keyof Omit<CustomText, "text">);

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={active ? "default" : "ghost"}
                        size="icon"
                        className={`${
                            active
                                ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[color-mix(in oklch, var(--primary) 85%, black)]"
                                : "hover:bg-[var(--sidebar-accent)]"
                        }`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            ReactEditor.focus(editor);
                            if (!editor.selection)
                                Transforms.select(editor, Editor.start(editor, []));
                            if (
                                ["blockquote", "numbered-list", "bulleted-list"].includes(
                                    format
                                )
                            )
                                toggleBlock(editor, format);
                            else
                                toggleMark(editor, format as keyof Omit<CustomText, "text">);
                        }}
                    >
                        <Icon className="w-4 h-4"/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{label}</TooltipContent>
            </Tooltip>
        );
    };

    return (
        <TooltipProvider>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div
                    className="bg-[var(--editor-bg)] w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--toolbar-border)]">
                    {/* Header */}
                    <div
                        className="flex justify-between items-center border-b p-4 bg-[var(--toolbar-bg)] border-[var(--toolbar-border)]">
                        <h2
                            className="text-xl font-semibold"
                            style={{color: "var(--toolbar-heading)"}}
                        >
                            My Notes
                        </h2>
                        <Button variant="ghost" size="icon" onClick={onCloseAction}>
                            <X className="w-5 h-5"/>
                        </Button>
                    </div>

                    <Slate editor={editor} key={editorKey} initialValue={value} onChange={setValue}>
                        {/* Toolbar */}
                        <div
                            className="flex gap-2 border-b p-2 bg-[var(--toolbar-bg)] border-[var(--toolbar-border)] flex-wrap">
                            {[
                                {icon: Bold, format: "bold", label: "Bold"},
                                {icon: Italic, format: "italic", label: "Italic"},
                                {icon: Underline, format: "underline", label: "Underline"},
                                {icon: Strikethrough, format: "strikethrough", label: "Strikethrough"},
                                {icon: Code, format: "code", label: "Code"},
                                {icon: Quote, format: "blockquote", label: "Quote"},
                                {icon: ListOrdered, format: "numbered-list", label: "Numbered List"},
                                {icon: List, format: "bulleted-list", label: "Bulleted List"},
                            ].map(({icon, format, label}) => (
                                <ToolbarButton key={format} format={format} Icon={icon} label={label}/>
                            ))}
                        </div>

                        {/* Editor */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-[var(--editor-bg)]">
                            <Editable
                                renderElement={renderElement}
                                renderLeaf={renderLeaf}
                                placeholder="Write your notes..."
                                spellCheck
                                autoFocus
                                className="focus:outline-none min-h-[300px] prose prose-sm max-w-none"
                            />
                        </div>
                    </Slate>

                    {/* Footer */}
                    <div
                        className="border-t p-3 text-sm text-gray-600 flex justify-between items-center bg-[var(--toolbar-bg)] border-[var(--toolbar-border)]">
                        <span>{saving ? "Saving..." : "Click save to store your notes"}</span>
                        <Button
                            onClick={saveNotes}
                            disabled={saving}
                            className="flex items-center gap-2"
                        >
                            <Save className="w-4 h-4"/>
                            {saving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
