import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createHighlightPlugin, highlightPluginKey } from "./highlightplugin";

async function transformTextApi(
  selectedText: string,
  chatMessage: string
): Promise<string> {
  const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT as string;
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY as string;
  const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT as string;
  const apiVersion =
    (import.meta.env.VITE_AZURE_OPENAI_API_VERSION as string) ||
    "2024-08-01-preview";

  if (!endpoint || !apiKey || !deployment) {
    throw new Error("Missing Azure env vars");
  }

  const url = `${endpoint.replace(
    /\/$/,
    ""
  )}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const system =
    "You are a helpful writing assistant. Rewrite the provided selection according to the user's instructions. Return ONLY the rewritten text without any preface or commentary.";
  const user = `Selection:\n"""${selectedText}"""\n\nInstructions: ${
    chatMessage || "Rewrite to be clearer."
  }`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],

      n: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim?.();
  if (!content) throw new Error("No completion content returned");
  return content;
}

export default function App() {
  const [chatInput, setChatInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectionPreview, setSelectionPreview] = useState<string>("");

  const editor = useEditor({
    extensions: [StarterKit],
    onCreate: ({ editor }) => {
      editor.registerPlugin(createHighlightPlugin());
    },
    content: `
      <h2>Welcome 👋</h2>
      <p>Select some text (or place your cursor in a paragraph), write instructions below, and press Send. The selected text will be replaced by the API response.</p>
      <p>This is a second paragraph to test selection behavior. Try bold/italic/list items too.</p>
      <ul><li>Bullet one</li><li>Bullet two</li></ul>
    `,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none focus:outline-none px-4 pt-4 pb-16 text-sm sm:text-base",
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const { state } = editor;
      const { from, to, empty, $from } = state.selection as any;

      let text = "";
      if (!empty && to > from) {
        text = state.doc.textBetween(from, to, "\n");
      } else {
        const depth = $from.depth;
        const start = $from.start(depth);
        const end = $from.end(depth);
        text = state.doc.textBetween(start, end, "\n");
      }
      setSelectionPreview(text.slice(0, 160));

      const range = !empty && to > from ? { from, to } : null;

      // guard: editor.view may be undefined briefly
      if (editor && (editor as any).view) {
        (editor as any).view.dispatch(
          editor.state.tr.setMeta(highlightPluginKey, range)
        );
      }
    },
  });

  useEffect(() => {
    if (editor) {
      const { state } = editor;
      const { $from } = state.selection as any;
      const start = $from.start($from.depth);
      const end = $from.end($from.depth);
      const text = state.doc.textBetween(start, end, "\n");
      setSelectionPreview(text.slice(0, 160));
    }
  }, [editor]);

  const getTargetRange = useCallback(() => {
    if (!editor) return null;
    const { state } = editor;
    const { from, to, empty, $from } = state.selection as any;
    if (!empty && to > from) {
      return { from, to, selectedText: state.doc.textBetween(from, to, "\n") };
    }
    const depth = $from.depth;
    const start = $from.start(depth);
    const end = $from.end(depth);
    const selectedText = state.doc.textBetween(start, end, "\n");
    return { from: start, to: end, selectedText };
  }, [editor]);

  const handleSubmit = useCallback(async () => {
    if (!editor || isSubmitting) return;
    const range = getTargetRange();
    if (!range) return;
    setIsSubmitting(true);
    try {
      const output = await transformTextApi(
        range.selectedText,
        chatInput.trim()
      );
      editor
        .chain()
        .focus()
        .insertContentAt({ from: range.from, to: range.to }, output)
        .run();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to transform text.");
    } finally {
      setIsSubmitting(false);
    }
  }, [editor, chatInput, getTargetRange, isSubmitting]);

  const canSend = useMemo(
    () => !!editor && !isSubmitting,
    [editor, isSubmitting]
  );

  return (
    <div className="min-h-screen w-full relative overflow-hidden text-sm sm:text-base">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-800" />
      <div className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="absolute -top-16 -left-16 h-52 w-52 rounded-full bg-fuchsia-500 blur-[90px] opacity-30" />
      <div className="absolute -bottom-16 -right-16 h-52 w-52 rounded-full bg-indigo-500 blur-[90px] opacity-30" />

      <div className="mx-auto max-w-5xl min-h-screen px-3 sm:px-4 py-4 flex flex-col gap-3">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white drop-shadow">
            Magic Marker AI -{" "}
            <small>
              made with <span className="text-pink-400">❤</span> by InDiCom
            </small>
          </h1>
          <p className="text-white/70 text-xs sm:text-sm">
            Select → Describe → Replace
          </p>
        </header>

        <div className="flex-1 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-xl overflow-hidden">
          <section className="relative min-h-[40vh] md:basis-[65%] flex flex-col">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/15 bg-white/5">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-0.5 border border-white/20">
                  Editor
                </span>
                <span className="hidden sm:inline text-white/60">•</span>
                <span
                  className="hidden sm:inline truncate max-w-[30ch]"
                  title={selectionPreview || "(no text)"}
                >
                  <span className="text-white/60">Selection:</span>{" "}
                  {selectionPreview || "(current paragraph)"}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-white/60">
                Cmd/Ctrl+B • Cmd/Ctrl+I
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {editor ? (
                <EditorContent editor={editor} className="h-full" />
              ) : (
                <div className="h-full grid place-items-center py-6 text-white/80">
                  Loading editor…
                </div>
              )}
            </div>
          </section>

          <div className="h-px bg-white/15" />

          <section className="md:basis-[35%] p-3 sm:p-4 bg-white/5">
            <div className="h-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-medium text-white/90">
                  AI Instructions
                </h2>
                <div className="text-[10px] sm:text-xs text-white/60">
                  Replaces your selection
                </div>
              </div>

              <div className="flex-1 grid grid-rows-[1fr_auto] gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="e.g., Make it concise and friendly"
                  className="w-full resize-none rounded-xl bg-white/10 border border-white/20 p-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 min-h-[80px] text-sm"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!canSend}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 font-medium shadow text-sm"
                    title="Send"
                  >
                    {isSubmitting ? "Sending…" : "Send"}
                  </button>

                  <div className="flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
                    <button
                      onClick={() => setChatInput("Summarize in one sentence.")}
                      className="px-2 py-1 rounded bg-white/15 border border-white/25 hover:bg-white/20"
                    >
                      Summarize
                    </button>
                    <button
                      onClick={() => setChatInput("Rewrite to active voice.")}
                      className="px-2 py-1 rounded bg-white/15 border border-white/25 hover:bg-white/20"
                    >
                      Active voice
                    </button>
                    <button
                      onClick={() =>
                        setChatInput("Make it warmer and add an emoji.")
                      }
                      className="px-2 py-1 rounded bg-white/15 border border-white/25 hover:bg-white/20"
                    >
                      Warmer 😊
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="text-center text-[11px] sm:text-xs text-white/70 flex flex-col gap-1">
          <span className="text-white/60">
            Made with <span className="text-pink-400">❤</span> by InDiCom
          </span>
        </footer>
      </div>

      <style>{`
        .ProseMirror p { margin: 0.25rem 0; }
        .ProseMirror h2 { font-size: 1.1rem; font-weight: 700; margin-top: 0.75rem; }
        .ProseMirror ul { list-style: disc; padding-left: 1rem; }
        .ProseMirror ol { list-style: decimal; padding-left: 1rem; }
        .ProseMirror blockquote { border-left: 3px solid rgba(255,255,255,0.25); margin: .5rem 0; padding-left: .5rem; color: rgba(255,255,255,0.85); }
        .ProseMirror { outline: none; }
        .persist-highlight {
          background-color: rgba(255, 215, 0, 0.35);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
