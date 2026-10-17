import { useState } from "react";
import { ConfirmDialog, useToast } from "@/components/common/toast";
import { inputCls } from "@/components/common/states";
import { money, quote, wallet } from "@/features/org/wallet-service";
import { orgs, type Update } from "@/lib/mock";

export function TipDialog({ u, open, onClose }: { u: Update; open: boolean; onClose: () => void }) {
  const [amt, setAmt] = useState(500);
  const toast = useToast();
  const org = orgs.find((o) => o.id === u.org)?.name ?? u.org;
  const bad = !Number.isFinite(amt) || amt < 100;
  const q = quote(amt, 60);
  return (
    <ConfirmDialog open={open} title={`tip ${org}`} body="demo only. no money moves and nothing is charged." confirm="send tip" confirmDisabled={bad} onClose={onClose} onConfirm={() => { toast("demo tip recorded. no money moved."); onClose(); }}>
      <label className="mt-3 block text-sm font-semibold">amount ({wallet.currency})<input type="number" min={100} className={inputCls} value={amt} onChange={(e) => setAmt(Number(e.target.value))} aria-invalid={bad} /></label>
      {bad && <p role="alert" className="text-sm font-semibold text-[#d02b2b]">the minimum tip is {money(100)}.</p>}
      <dl className="mt-3 grid grid-cols-2 gap-1 text-sm"><dt className="text-body">recipient</dt><dd>{org}</dd><dt className="text-body">poster credit</dt><dd>set by the organization</dd><dt className="text-body">platform transaction fee</dt><dd>{money(q.fee)}</dd><dt className="font-bold">total</dt><dd className="font-bold">{money(amt + q.fee)}</dd></dl>
      <p className="mt-1 text-xs text-body">the real fee and split are calculated by the server.</p>
    </ConfirmDialog>
  );
}
