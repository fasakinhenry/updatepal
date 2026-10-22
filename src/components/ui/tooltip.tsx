import { useId, type ReactNode } from "react";

/** a short hint for icon buttons. shows on hover and keyboard focus, and is announced through aria-describedby. */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="group relative inline-flex" aria-describedby={id}>
      {children}
      <span id={id} role="tooltip" className="pointer-events-none absolute -bottom-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-night px-2.5 py-1 text-xs font-semibold text-on-primary opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">{text}</span>
    </span>
  );
}
