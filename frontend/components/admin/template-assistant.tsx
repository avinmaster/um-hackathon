"use client";
import { Sparkles, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { api, type Template } from "../../lib/api";
import { streamPOST } from "../../lib/sse";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/input";

type Msg = { role: "user" | "assistant"; content: string };

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

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
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
        ctrl.signal,
      );
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Sorry — the assistant stream failed. Is the backend running?",
          };
        }
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] to-[color-mix(in_srgb,var(--color-cyan)_25%,transparent)] text-[var(--color-primary-glow)]">
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
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[95%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === "user"
                ? "ml-auto bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-cyan)] text-white shadow-[var(--shadow-glow-violet)]"
                : "bg-[var(--color-bg)] border border-[var(--color-border)]",
            )}
          >
            {m.content || "…"}
          </div>
        ))}
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
