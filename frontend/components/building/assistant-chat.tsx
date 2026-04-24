"use client";
import { Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { streamPOST } from "../../lib/sse";
import { Button } from "../ui/button";
import { cn } from "../../lib/cn";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's on floor 3?",
  "How many units are there?",
  "What amenities does this building have?",
  "When was it built?",
];

export function AssistantChat({ buildingId }: { buildingId: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm grounded in this building's profile and content documents. Ask me anything about the layout, amenities, or history.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
        `/api/buildings/${buildingId}/assistant`,
        {
          messages: next
            .slice(0, -1)
            .map((m) => ({ role: m.role, content: m.content })),
          building_id: buildingId,
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
            content:
              "Sorry — I couldn't reach the assistant. Is the backend running?",
          };
        }
        return copy;
      });
      console.error(e);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-[var(--color-accent)]">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold">Grounded assistant</div>
          <div className="text-[10px] text-[var(--color-ink-subtle)]">
            cites profile + content docs only
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void ask(s)}
              disabled={streaming}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this building…"
            className="h-10 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
            disabled={streaming}
          />
          <Button type="submit" size="md" disabled={!input.trim() || streaming}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
        msg.role === "user"
          ? "ml-auto bg-[var(--color-accent)] text-black"
          : "bg-[var(--color-bg)] border border-[var(--color-border)]",
      )}
    >
      {msg.content || (msg.role === "assistant" ? "…" : "")}
    </div>
  );
}
