import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const T = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(T);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<number>(0);
  const show = useCallback((m: string) => { setMsg(m); clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(""), 3500); }, []);
  return (
    <T.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-6">
        {msg && <p className="pointer-events-auto rounded-full bg-night px-5 py-3 text-sm font-semibold text-on-primary shadow-[3px_4px_0_0_#ed0578]">{msg}</p>}
      </div>
    </T.Provider>
  );
}

/** accessible modal built on the native dialog element (focus trap and escape come from the browser). */
export function ConfirmDialog({ open, title, body, confirm, confirmDisabled, children, onConfirm, onClose }: { open: boolean; title: string; body: string; confirm: string; confirmDisabled?: boolean; children?: ReactNode; onConfirm: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="dlg-title" className="m-auto w-[min(92vw,26rem)] rounded-3xl bg-white p-6 text-ink backdrop:bg-black/50">
      <h2 id="dlg-title" className="text-xl">{title}</h2><p className="mt-2 text-body">{body}</p>{children}
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>cancel</Button><Button onClick={onConfirm} disabled={confirmDisabled}>{confirm}</Button></div>
    </dialog>
  );
}
