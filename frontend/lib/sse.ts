/**
 * Minimal SSE helper that streams assistant/chat tokens back to React.
 *
 * FastAPI returns ``text/event-stream`` frames. ``POST`` requests cannot
 * use the native ``EventSource`` API (that is GET-only), so this parses
 * the stream by hand via ``fetch`` + ``ReadableStream``.
 */

import { API_BASE } from "./api";

export class StreamError extends Error {
  constructor(
    message: string,
    public readonly cause: "http" | "server" | "stall" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "StreamError";
  }
}

export type StreamPOSTOptions = {
  /** Abort if no bytes are received for this many ms (default 25_000). */
  stallTimeoutMs?: number;
  signal?: AbortSignal;
};

export async function streamPOST(
  path: string,
  body: unknown,
  onDelta: (chunk: string) => void,
  optsOrSignal?: StreamPOSTOptions | AbortSignal,
): Promise<void> {
  const opts: StreamPOSTOptions =
    optsOrSignal && optsOrSignal instanceof AbortSignal
      ? { signal: optsOrSignal }
      : optsOrSignal || {};
  const stallTimeoutMs = opts.stallTimeoutMs ?? 25_000;

  const ctrl = new AbortController();
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  let stalled = false;
  const armStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      ctrl.abort();
    }, stallTimeoutMs);
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    if (stallTimer) clearTimeout(stallTimer);
    if (opts.signal?.aborted) throw e;
    throw new StreamError(
      `Could not reach the assistant — ${(e as Error).message || "network error"}`,
      "http",
    );
  }
  if (!res.ok || !res.body) {
    throw new StreamError(
      `Assistant returned ${res.status} ${res.statusText}`,
      "http",
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  armStall();

  try {
    while (true) {
      let done: boolean;
      let value: Uint8Array | undefined;
      try {
        ({ done, value } = await reader.read());
      } catch (e) {
        if (stalled) {
          throw new StreamError(
            "The assistant stopped responding (connection stalled).",
            "stall",
          );
        }
        if (opts.signal?.aborted) throw e;
        throw new StreamError(
          `Connection dropped — ${(e as Error).message || "read error"}`,
          "http",
        );
      }
      if (done) break;
      armStall();
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const evt of events) {
        const lines = evt.split("\n");
        let eventName: string | undefined;
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (eventName === "end") continue;
        if (eventName === "error") {
          let message = "The assistant ran into an error.";
          if (data) {
            try {
              const parsed = JSON.parse(data) as { message?: string };
              if (parsed.message) message = parsed.message;
            } catch {
              /* keep default */
            }
          }
          throw new StreamError(message, "server");
        }
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as { content?: string };
          if (parsed.content) onDelta(parsed.content);
        } catch {
          /* ignore malformed frames */
        }
      }
    }
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
  }
}

export function openStateStream(
  path: string,
  onEvent: (type: string, payload: unknown) => void,
  signal?: AbortSignal,
): EventSource {
  const url = `${API_BASE}${path}`;
  const src = new EventSource(url, { withCredentials: false });
  src.addEventListener("state", (e) => {
    try {
      onEvent("state", JSON.parse((e as MessageEvent).data));
    } catch {
      /* ignore */
    }
  });
  src.addEventListener("end", (e) => {
    try {
      onEvent("end", JSON.parse((e as MessageEvent).data));
    } catch {
      /* ignore */
    }
    src.close();
  });
  if (signal) signal.addEventListener("abort", () => src.close());
  return src;
}
