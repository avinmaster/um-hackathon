/**
 * Minimal SSE helper that streams assistant/chat tokens back to React.
 *
 * FastAPI returns ``text/event-stream`` frames. ``POST`` requests cannot
 * use the native ``EventSource`` API (that is GET-only), so this parses
 * the stream by hand via ``fetch`` + ``ReadableStream``.
 */

import { API_BASE } from "./api";

export async function streamPOST(
  path: string,
  body: unknown,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
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
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as { content?: string };
        if (parsed.content) onDelta(parsed.content);
      } catch {
        /* ignore malformed frames */
      }
    }
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
