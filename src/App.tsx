import { useCallback, useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * Mock API call — replace with your real endpoint.
 * Expect to return a string that will replace the selected range.
 */
async function transformTextApi(
  selectedText: string,
  chatMessage: string
): Promise<string> {
  const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT as string; // e.g. https://your-resource.openai.azure.com
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY as string; // WARNING: exposed in browser build
  const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT as string; // your deployment name
  const apiVersion =
    (import.meta.env.VITE_AZURE_OPENAI_API_VERSION as string) ||
    "2024-08-01-preview";

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      "Missing Azure env vars: VITE_AZURE_OPENAI_ENDPOINT / VITE_AZURE_OPENAI_API_KEY / VITE_AZURE_OPENAI_DEPLOYMENT"
    );
  }

  const url = `${endpoint.replace(
    /\/$/,
    ""
  )}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const system =
    "You are a helpful writing assistant. Rewrite the provided selection according to the user's instructions. Return ONLY the rewritten text without any preface or commentary.";
  const user = `Selection:
"""${selectedText}"""


Instructions: ${chatMessage || "Rewrite to be clearer."}`;

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
    content: `
      <h2>Welcome 👋</h2>
      <p>Select some text (or place your cursor in a paragraph), write instructions below, and press Send. The selected text will be replaced by the API response.</p>
      <p>This is a second paragraph to test selection behavior. Try bold/italic/list items too.</p>
      <ul><li>Bullet one</li><li>Bullet two</li></ul>
    `,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none focus:outline-none px-5 sm:px-6 pt-5 sm:pt-6 pb-24 text-base",
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
    },
  });

  // Initialize selection preview on first render
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

    // If there's a real selection, use it
    if (!empty && to > from) {
      return { from, to, selectedText: state.doc.textBetween(from, to, "\n") };
    }

    // Otherwise, use the parent block (typically the paragraph) under the cursor
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
    } catch (e) {
      console.error(e);
      alert("Failed to transform text. Check the console for details.");
    } finally {
      setIsSubmitting(false);
    }
  }, [editor, chatInput, getTargetRange, isSubmitting]);

  const canSend = useMemo(
    () => !!editor && !isSubmitting,
    [editor, isSubmitting]
  );

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background gradient + ornaments */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-800" />
      {/* subtle grid */}
      <div className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:24px_24px]" />
      {/* radial glow blobs */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500 blur-[100px] opacity-30" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500 blur-[100px] opacity-30" />

      <div className="mx-auto max-w-6xl min-h-screen px-4 sm:px-6 py-6 flex flex-col gap-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white drop-shadow">
            The Magic AI Marker
          </h1>
          <p className="text-white/80 text-sm">Select → Describe → Replace</p>
        </header>

        {/* Shell card */}
        <div className="flex-1 rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Top: Editor panel */}
          <section className="relative min-h-[45vh] md:min-h-0 md:basis-[70%] md:h-[calc(70vh)] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/15 bg-white/5">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 border border-white/20">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 20l9-7-9-7-9 7 9 7z" />
                  </svg>
                  Editor
                </span>
                <span className="hidden sm:inline text-white/60">•</span>
                <span
                  className="hidden sm:inline truncate max-w-[40ch]"
                  title={selectionPreview || "(no text)"}
                >
                  <span className="text-white/60">Selection:</span>{" "}
                  {selectionPreview || "(current paragraph)"}
                </span>
              </div>
              <div className="text-xs text-white/60">
                Cmd/Ctrl+B bold • Cmd/Ctrl+I italic
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {editor ? (
                <EditorContent editor={editor} className="h-full" />
              ) : (
                <div className="h-full grid place-items-center py-10 text-white/80">
                  Loading editor…
                </div>
              )}
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-white/15" />

          {/* Bottom: Chat panel */}
          <section className="md:basis-[30%] md:h-[calc(30vh)] p-4 sm:p-5 bg-white/5">
            <div className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-white/90">
                  AI Instructions
                </h2>
                <div className="text-xs text-white/60">
                  The API will replace your selection
                </div>
              </div>

              {/* Chat box */}
              <div className="flex-1 grid grid-rows-[1fr_auto] gap-3">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="e.g., Make it concise and friendlier; keep technical terms."
                  className="w-full resize-none rounded-2xl bg-white/10 border border-white/20 p-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 min-h-[120px]"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!canSend}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 font-medium shadow"
                    title="Send"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                          ></circle>
                          <path
                            className="opacity-75"
                            d="M4 12a8 8 0 018-8"
                          ></path>
                        </svg>
                        Sending
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 2L11 13"></path>
                          <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                        </svg>
                        Send
                      </>
                    )}
                  </button>

                  {/* Presets */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => setChatInput("Summarize in one sentence.")}
                      className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/25 hover:bg-white/20"
                    >
                      Summarize
                    </button>
                    <button
                      onClick={() => setChatInput("Rewrite to active voice.")}
                      className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/25 hover:bg-white/20"
                    >
                      Active voice
                    </button>
                    <button
                      onClick={() =>
                        setChatInput("Make it warmer and add an emoji.")
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/25 hover:bg-white/20"
                    >
                      Warmer 😊
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-white/70">
          Swap{" "}
          <code className="px-1 rounded bg-black/30">transformTextApi</code>{" "}
          with your server call.
        </footer>
      </div>

      {/* Minimal ProseMirror styles */}
      <style>{`
        .ProseMirror p { margin: 0.5rem 0; }
        .ProseMirror h2 { font-size: 1.25rem; font-weight: 700; margin-top: 1rem; }
        .ProseMirror ul { list-style: disc; padding-left: 1.2rem; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.2rem; }
        .ProseMirror blockquote { border-left: 3px solid rgba(255,255,255,0.25); margin: .75rem 0; padding-left: .75rem; color: rgba(255,255,255,0.85); }
        .ProseMirror { outline: none; }
      `}</style>
    </div>
  );
}
