import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

/** a bottom sheet on phones and a centered panel on larger screens, built on the native dialog (focus trap and escape included). */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="sheet-title" className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-white p-5 text-ink backdrop:bg-black/50 sm:m-auto sm:max-w-md sm:rounded-3xl">
      <div className="flex items-center"><h2 id="sheet-title" className="text-xl">{title}</h2><button aria-label="close" onClick={onClose} className="ml-auto grid size-10 place-items-center rounded-full"><X size={20} /></button></div>
      <div className="mt-3">{children}</div>
    </dialog>
  );
}
