import { openStream } from "./http";

/**
 * listens for live pings (new notification, new message) from the server.
 * reconnects with backoff. pages also refresh on their own schedule, so a dropped connection only delays updates.
 */
export function startRealtime(onEvent: (name: string) => void): () => void {
  let stopped = false; const ctl = new AbortController();
  void (async () => {
    let delay = 2000;
    while (!stopped) {
      try {
        const reader = (await openStream("/events", ctl.signal)).getReader(); const dec = new TextDecoder(); let buf = ""; delay = 2000;
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          for (let i = buf.indexOf("\n\n"); i >= 0; i = buf.indexOf("\n\n")) { const ev = /^event: (.+)$/m.exec(buf.slice(0, i))?.[1]; buf = buf.slice(i + 2); if (ev) onEvent(ev); }
        }
      } catch { if (stopped) return; }
      await new Promise((r) => setTimeout(r, delay)); delay = Math.min(delay * 2, 30_000);
    }
  })();
  return () => { stopped = true; ctl.abort(); };
}
