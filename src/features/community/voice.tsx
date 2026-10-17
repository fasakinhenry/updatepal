import { useEffect, useRef, useState } from "react";
import { Microphone, Stop } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** records only after an explicit tap. audio stays in this tab, nothing is uploaded or delivered. */
export function VoiceNote({ onSend }: { onSend: (url: string, sec: number) => void }) {
  const [st, setSt] = useState<"idle" | "rec" | "ready">("idle");
  const [sec, setSec] = useState(0); const [url, setUrl] = useState(""); const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const timer = useRef(0); const dropped = useRef(false);
  useEffect(() => () => { clearInterval(timer.current); dropped.current = true; if (rec.current?.state === "recording") rec.current.stop(); }, []);
  const start = async () => {
    setErr(""); dropped.current = false;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(s); chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = () => { s.getTracks().forEach((t) => t.stop()); if (dropped.current) return; setUrl(URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType }))); setSt("ready"); };
      r.start(); rec.current = r; setSec(0); setSt("rec");
      timer.current = window.setInterval(() => setSec((x) => x + 1), 1000);
    } catch { setErr("microphone access was blocked or is not available on this device."); }
  };
  const stop = (drop = false) => { dropped.current = drop; clearInterval(timer.current); rec.current?.stop(); if (drop) setSt("idle"); };
  const reset = () => { if (url) URL.revokeObjectURL(url); setUrl(""); setSt("idle"); };
  return (
    <div className="mt-3" aria-label="voice note">
      {st === "idle" && <Button variant="outline" className="py-2 text-sm" onClick={start}><Microphone weight="fill" />record voice note</Button>}
      {st === "rec" && <div role="status" className="flex items-center gap-3 text-sm font-semibold"><span className="size-2.5 animate-pulse rounded-full bg-pink" aria-hidden />recording {fmt(sec)}<Button className="py-1.5 text-sm" onClick={() => stop()}><Stop weight="fill" />stop</Button><button className="text-primary" onClick={() => stop(true)}>cancel</button></div>}
      {st === "ready" && <div className="flex flex-wrap items-center gap-2"><audio controls src={url} className="h-10 max-w-full" /><Button className="py-1.5 text-sm" onClick={() => { onSend(url, sec); setUrl(""); setSt("idle"); }}>send</Button><button className="text-sm font-semibold text-primary" onClick={reset}>discard</button></div>}
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
      <p className="text-xs text-body">demo: voice notes are not uploaded or delivered.</p>
    </div>
  );
}
