"use client";
import { AlertTriangle, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { api, type Template } from "../../lib/api";
import { streamPOST } from "../../lib/sse";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/input";
import { Markdown } from "../ui/markdown";

type Msg = { role: "user" | "assistant"; content: string; error?: string };

export function TemplateAssistant({
  template,
  onTemplate,
}: {
  template: Template;
  onTemplate: (next: Template) => void;
}) {
  const [description, setDescription] = useState(
    "Shah Alam requires MBSA zoning clearance, Bomba fire-safety approval, ownership proof, and standard floor plans + photos. Include a cross-check.",
  );
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "I'm your template tutor. Ask why a step exists, what a field should capture, or have me draft a new starter template from a one-line brief.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const draft = async () => {
    setDrafting(true);
    setError(null);
    try {
      const next = await api.draftWithAI(template.id, description);
      onTemplate(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDrafting(false);
    }
  };

  const lastUserPromptRef = useRef<string>("");

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    lastUserPromptRef.current = trimmed;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }, { role: "assistant", content: "" }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamPOST(
        `/api/admin/templates/${template.id}/assistant`,
        {
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          template_id: template.id,
        },
        (delta) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant") {
              copy[copy.length - 1] = { ...last, content: last.content + delta };
            }
            return copy;
          });
        },
        { signal: ctrl.signal },
      );
    } catch (e) {
      if (ctrl.signal.aborted && !abortRef.current) return;
      const message =
        e instanceof Error ? e.message : "The assistant didn't respond.";
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { ...last, error: message };
        }
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const retryLast = () => {
    if (streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.error) return;
    setMessages((prev) => prev.slice(0, -2));
    void ask(lastUserPromptRef.current);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md border border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[var(--color-bg)] text-[var(--color-primary-glow)]">
            <Wand2 className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Draft with AI</div>
            <div className="text-[10px] text-[var(--color-ink-subtle)]">
              One sentence → GLM proposes the whole template.
            </div>
          </div>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this city needs…"
          className="min-h-[88px] text-xs"
        />
        <div className="flex items-center justify-between">
          <Badge tone="brand">GLM tool: draft_template</Badge>
          <Button size="sm" onClick={draft} disabled={drafting || !description.trim()}>
            {drafting ? "Drafting…" : "Generate"}
          </Button>
        </div>
        {error && <p className="text-xs text-[var(--color-fail)]">{error}</p>}
      </div>

      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[var(--color-border)]">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-[var(--color-bg-raised)] text-[var(--color-ink-muted)]">
          <Sparkles className="h-3 w-3" />
        </div>
        <div className="text-xs font-semibold">Explain / tutor</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const canRetry =
            isLast && m.role === "assistant" && !!m.error && !streaming;
          if (m.role === "assistant" && m.error && !m.content) {
            return (
              <div
                key={i}
                className="max-w-[95%] rounded-lg border border-[color-mix(in_srgb,var(--color-fail)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-fail)_10%,transparent)] px-3 py-2 text-sm leading-relaxed"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-fail)]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--color-fail)]">
                      Couldn't get an answer
                    </div>
                    <div className="mt-0.5 text-[12px] text-[var(--color-ink-muted)] break-words">
                      {m.error}
                    </div>
                    {canRetry && (
                      <button
                        onClick={retryLast}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)]"
                      >
                        <RefreshCw className="h-3 w-3" /> Try again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="max-w-[95%] space-y-1.5">
              <div
                className={cn(
                  "rounded-[var(--r-md)] px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto whitespace-pre-wrap bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-bg)] border border-[var(--color-border)]",
                )}
              >
                {m.role === "assistant" ? (
                  m.content ? (
                    // While streaming the latest assistant bubble, render
                    // plain text — half-formed markdown flickers as it lands.
                    streaming && isLast ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <Markdown>{m.content}</Markdown>
                    )
                  ) : (
                    "…"
                  )
                ) : (
                  m.content || "…"
                )}
              </div>
              {m.role === "assistant" && m.error && m.content && (
                <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--color-ink-muted)]">
                  <AlertTriangle className="h-3 w-3 text-[var(--color-warn)]" />
                  <span className="flex-1">Reply was cut short — {m.error}</span>
                  {canRetry && (
                    <button
                      onClick={retryLast}
                      className="inline-flex items-center gap-1 text-[var(--color-cyan)] hover:text-[var(--color-primary-glow)]"
                    >
                      <RefreshCw className="h-3 w-3" /> retry
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="flex gap-2 border-t border-[var(--color-border)] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Why do I need a cross-check step?"
          className="h-10 flex-1 rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
          disabled={streaming}
        />
        <Button type="submit" size="md" disabled={!input.trim() || streaming}>
          Ask
        </Button>
      </form>
    </div>
  );
}
