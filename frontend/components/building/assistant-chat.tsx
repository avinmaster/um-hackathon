"use client";
import { AlertTriangle, RefreshCw, Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { streamPOST } from "../../lib/sse";
import { Button } from "../ui/button";
import { Markdown } from "../ui/markdown";
import { cn } from "../../lib/cn";

type Msg = {
  role: "user" | "assistant";
  content: string;
  error?: string;
};

const SUGGESTIONS = [
  "Show me inside",
  "Back to the building exterior",
  "How many units are there?",
  "What amenities does this building have?",
];

const INTERIOR_HINTS =
  /\b(inside|interior|apartment|unit|room|floor plan|layout)\b/i;
const EXTERIOR_HINTS =
  /\b(outside|exterior|building|facade|street|outdoor)\b/i;

export function AssistantChat({
  buildingId,
  onSwitchView,
}: {
  buildingId: string;
  onSwitchView?: (mode: "exterior" | "interior") => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Ask me anything about this building — layout, amenities, history. I answer from what was uploaded.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const lastUserPromptRef = useRef<string>("");

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    lastUserPromptRef.current = trimmed;
    // Side-effect: nudge the 3D view to match the user's question. We pick
    // exterior when both hints are present (the question is comparative).
    if (onSwitchView) {
      if (INTERIOR_HINTS.test(trimmed) && !EXTERIOR_HINTS.test(trimmed)) {
        onSwitchView("interior");
      } else if (EXTERIOR_HINTS.test(trimmed)) {
        onSwitchView("exterior");
      }
    }
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
        { signal: ctrl.signal },
      );
    } catch (e) {
      if (ctrl.signal.aborted && !abortRef.current) return;
      const message =
        e instanceof Error
          ? e.message
          : "The assistant didn't respond. Please try again.";
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { ...last, error: message };
        }
        return copy;
      });
      console.error(e);
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
      <header className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-md border border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[var(--color-bg)] text-[var(--color-primary-glow)]">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Ask the assistant</div>
          <div className="text-[10px] text-[var(--color-ink-subtle)]">
            answers come from this building's documents
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
            onRetry={
              i === messages.length - 1 &&
              m.role === "assistant" &&
              m.error &&
              !streaming
                ? retryLast
                : undefined
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
  onRetry,
}: {
  msg: Msg;
  streaming: boolean;
  onRetry?: () => void;
}) {
  const isUser = msg.role === "user";
  const hasError = Boolean(msg.error);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn("max-w-[85%]", isUser && "ml-auto")}
    >
      {!isUser && hasError && !msg.content && (
        <div className="rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--color-fail)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-fail)_10%,transparent)] px-3 py-2 text-sm leading-relaxed text-[var(--color-ink)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-fail)]" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--color-fail)]">
                Couldn't get an answer
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--color-ink-muted)] break-words">
                {msg.error}
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)]"
                >
                  <RefreshCw className="h-3 w-3" /> Try again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {(isUser || msg.content || (!hasError && !isUser)) && (
        <div
          className={cn(
            "rounded-[var(--r-md)] px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "whitespace-pre-wrap bg-[var(--color-primary)] text-white"
              : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)]",
          )}
        >
          {isUser ? (
            msg.content
          ) : msg.content ? (
            // Mid-stream content can have unbalanced markdown tokens; render
            // as plain text while streaming, only render Markdown when settled.
            streaming ? (
              <span className="whitespace-pre-wrap">{msg.content}</span>
            ) : (
              <Markdown>{msg.content}</Markdown>
            )
          ) : (
            <TypingDots />
          )}
        </div>
      )}
      {!isUser && msg.content && hasError && (
        <div className="mt-1.5 flex items-center gap-2 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--color-ink-muted)]">
          <AlertTriangle className="h-3 w-3 text-[var(--color-warn)]" />
          <span className="flex-1">Reply was cut short — {msg.error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[var(--color-cyan)] hover:text-[var(--color-primary-glow)]"
            >
              <RefreshCw className="h-3 w-3" /> retry
            </button>
          )}
        </div>
      )}
      {!isUser && msg.content && !hasError && (
        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-ink-subtle)] font-mono">
          <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-cyan)]" />
          from the uploaded documents
          {streaming && <span className="text-[var(--color-cyan)]">…</span>}
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
