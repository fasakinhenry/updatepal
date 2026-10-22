import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/common/toast";
import { inputCls } from "@/components/common/states";
import { useApp } from "@/app/state";
import { ApiError } from "@/lib/http";
import { money, paymentsService, type Quote } from "./payments-service";

/** the server calculates the split and the fee. this dialog only shows what it returns, then sends the person to the provider's secure checkout. */
export function TipDialog({ updateId, orgName, open, onClose }: { updateId: string; orgName: string; open: boolean; onClose: () => void }) {
  const { config, user } = useApp();
  const providers = config.payments.providers;
  const [pid, setPid] = useState(user?.payments.preferred && providers.some((p) => p.id === user.payments.preferred) ? user.payments.preferred : providers[0]?.id ?? "");
  const p = providers.find((x) => x.id === pid) ?? providers[0];
  const min = p ? p.minTipMinor / 100 : 1;
  const [amt, setAmt] = useState(Math.max(5, min)); const [q, setQ] = useState<Quote | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const bad = !p || !Number.isFinite(amt) || amt < min;
  useEffect(() => {
    if (!open || bad || !p) return void setQ(null);
    let live = true; const t = setTimeout(() => { paymentsService.quote(updateId, amt, p.id).then((r) => live && (setQ(r), setErr(""))).catch((e) => live && setErr(e instanceof ApiError ? e.message : "could not get the amounts.")); }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [open, amt, bad, updateId, p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async () => {
    if (!p) return; setBusy(true);
    try { const r = await paymentsService.tip(updateId, amt, p.id); window.location.href = r.checkoutUrl; } catch (e) { setErr(e instanceof ApiError ? e.message : "could not start the payment."); setBusy(false); }
  };
  return (
    <ConfirmDialog open={open} title={`tip ${orgName}`} body="you pay on a secure page run by the payment provider. we never see your card or paypal login." confirm={busy ? "opening checkout..." : `continue to ${p?.id === "paypal" ? "paypal" : "payment"}`} confirmDisabled={bad || busy || !q} onClose={onClose} onConfirm={() => void go()}>
      {providers.length > 1 && <fieldset className="mt-3"><legend className="text-sm font-semibold">pay with</legend><div className="mt-1 grid gap-1">{providers.map((x) => <label key={x.id} className="flex gap-2 font-semibold"><input type="radio" name="provider" checked={pid === x.id} onChange={() => setPid(x.id)} />{x.label} ({x.currency})</label>)}</div></fieldset>}
      <label className="mt-3 block text-sm font-semibold">amount ({p?.currency})<input type="number" step="0.01" min={min} className={inputCls} value={amt} onChange={(e) => setAmt(Number(e.target.value))} aria-invalid={bad} /></label>
      {bad && p && <p role="alert" className="text-sm font-semibold text-[#d02b2b]">the minimum tip is {money(p.minTipMinor, p.currency)}.</p>}
      {q && p && <dl className="mt-3 grid grid-cols-2 gap-1 text-sm"><dt className="text-body">you pay</dt><dd className="font-bold">{money(q.amount, p.currency)}</dd><dt className="text-body">platform transaction fee</dt><dd>{money(q.fee, p.currency)} ({(q.feeBps / 100).toFixed(2)}%, taken from the tip)</dd><dt className="text-body">{orgName} receives</dt><dd>{money(q.orgShare, p.currency)}</dd>{q.posterShare > 0 && <><dt className="text-body">poster receives</dt><dd>{money(q.posterShare, p.currency)}</dd></>}</dl>}
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
    </ConfirmDialog>
  );
}
