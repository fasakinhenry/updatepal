import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/** accessible tabs: arrow keys, home and end move focus, only the active panel is rendered. */
export function Tabs({ tabs, label }: { tabs: { id: string; label: string; content: ReactNode }[]; label: string }) {
  const [cur, setCur] = useState(tabs[0].id);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i + tabs.length - 1) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
    if (n < 0) return;
    e.preventDefault(); setCur(tabs[n].id); refs.current[n]?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b-2 border-hairline">
        {tabs.map((t, i) => (
          <button key={t.id} ref={(el) => { refs.current[i] = el; }} role="tab" id={`${base}-${t.id}`} aria-selected={cur === t.id} aria-controls={`${base}-p-${t.id}`} tabIndex={cur === t.id ? 0 : -1} onClick={() => setCur(t.id)} onKeyDown={(e) => onKey(e, i)} className={`shrink-0 border-b-4 px-4 py-2.5 font-display font-bold ${cur === t.id ? "border-primary" : "border-transparent text-body"}`}>{t.label}</button>
        ))}
      </div>
      {tabs.map((t) => cur === t.id && <div key={t.id} role="tabpanel" id={`${base}-p-${t.id}`} aria-labelledby={`${base}-${t.id}`} className="pt-4">{t.content}</div>)}
    </div>
  );
}
