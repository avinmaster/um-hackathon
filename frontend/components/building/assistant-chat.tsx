"use client";
import { Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
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
    const next: Msg[] = [
      ...messages,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ];
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
              copy[copy.length - 1] = {
                ...last,
                content: last.content + delta,
              };
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
        <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] to-[color-mix(in_srgb,var(--color-cyan)_30%,transparent)] text-[var(--color-primary-glow)]">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Grounded assistant</div>
          <div className="text-[10px] text-[var(--color-ink-subtle)]">
            cites profile + content docs only · powered by{" "}
            <span className="font-mono text-[var(--color-ink-muted)]">
              ilmu-glm-5.1
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            msg={m}
            streaming={
              streaming && i === messages.length - 1 && m.role === "assistant"
            }
          />
        ))}
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s, i) => (
            <motion.button
              key={s}
              onClick={() => void ask(s)}
              disabled={streaming}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)] disabled:opacity-50"
            >
              {s}
            </motion.button>
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
            className="h-10 flex-1 rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none transition-all placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
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

function MessageBubble({
  msg,
  streaming,
}: {
  msg: Msg;
  streaming: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn("max-w-[85%]", isUser && "ml-auto")}
    >
      <div
        className={cn(
          "rounded-[var(--r-md)] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-cyan)] text-white shadow-[var(--shadow-glow-violet)]"
            : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)]",
        )}
      >
        {msg.content || (msg.role === "assistant" ? <TypingDots /> : "")}
      </div>
      {!isUser && msg.content && (
        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-ink-subtle)] font-mono">
          <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-cyan)]" />
          grounded · profile + content docs
          {streaming && <span className="text-[var(--color-cyan)]">streaming…</span>}
        </div>
      )}
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-primary-glow)]"
        />
      ))}
    </span>
  );
}
