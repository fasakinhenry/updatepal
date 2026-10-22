import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Locked, NoOrg, inputCls } from "@/components/common/states";
import { useToast } from "@/components/common/toast";
import { useApp } from "@/app/state";
import { ApiError } from "@/lib/http";
import { can, useOrgCtx } from "@/features/org/model";
import { money, paymentsService, type Plan, type WalletData } from "./payments-service";

const banks: [string, string][] = [["044", "access bank"], ["058", "guaranty trust bank"], ["011", "first bank"], ["033", "united bank for africa"], ["057", "zenith bank"], ["070", "fidelity bank"], ["214", "fcmb"], ["232", "sterling bank"], ["076", "polaris bank"], ["050", "ecobank"], ["035", "wema bank"], ["032", "union bank"], ["301", "jaiz bank"]];
const msg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);

/** agentic tipping: the ai proposes how to split a budget across updates you liked. you review and edit it, and only your payment moves money. */
function TipPlanner() {
  const { config, user } = useApp(); const toast = useToast();
  const batchers = config.payments.providers.filter((p) => p.batch);
  const [pid, setPid] = useState(batchers.find((p) => p.id === user?.payments.preferred)?.id ?? batchers[0]?.id ?? "");
  const p = batchers.find((x) => x.id === pid);
  const [text, setText] = useState(""); const [budget, setBudget] = useState(10); const [plan, setPlan] = useState<Plan | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  if (!batchers.length || !p) return null;
  const total = plan?.items.reduce((a, i) => a + i.amount, 0) ?? 0;
  const run = async () => { setBusy(true); setErr(""); try { setPlan(await paymentsService.plan({ instruction: text, budget, provider: p.id })); } catch (e) { setErr(msg(e, "could not make a plan.")); } finally { setBusy(false); } };
  const pay = async () => {
    if (!plan) return; setBusy(true);
    try { const r = await paymentsService.batch(p.id, plan.items.filter((i) => i.update && i.amount > 0).map((i) => ({ update: i.update!.id, amount: i.amount }))); window.location.href = r.checkoutUrl; } catch (e) { setErr(msg(e, "could not start the payment.")); setBusy(false); toast("payment not started"); }
  };
  return (
    <section className="mt-6 rounded-3xl border-2 border-pink bg-hairline p-5 shadow-[3px_4px_0_0_#ed0578]" aria-label="ai tip planner">
      <h2 className="flex items-center gap-2 text-xl"><Sparkle weight="fill" className="text-primary" />ai tip planner</h2>
      <p className="mt-1 text-sm text-ink">tell the assistant how much you want to give and why. it picks from updates you bookmarked, loved or referenced in your stories. you approve everything before paying with {p.id}.</p>
      {batchers.length > 1 && <label className="mt-3 block text-sm font-semibold">pay with<select className={inputCls} value={pid} onChange={(e) => setPid(e.target.value as typeof pid)}>{batchers.map((x) => <option key={x.id} value={x.id}>{x.id} ({x.currency})</option>)}</select></label>}
      <label className="mt-3 block text-sm font-semibold">what should it do? (optional)<textarea className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="thank the scholarship updates that helped me most" /></label>
      <label className="mt-3 block text-sm font-semibold">budget ({p.currency})<input type="number" step="0.01" min={p.minTipMinor / 100} className={inputCls} value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></label>
      <Button className="mt-3" disabled={busy || budget < p.minTipMinor / 100} onClick={() => void run()}>{busy && !plan ? "planning..." : "make a plan"}</Button>
      <p role="alert" className="mt-2 text-sm font-semibold text-[#d02b2b]">{err}</p>
      {plan && <div className="mt-4"><p className="text-sm font-semibold">{plan.summary}</p><p className="text-xs text-body">{plan.aiUsed ? "planned by ai. check every amount." : "ai was unavailable, so this is a simple even split."}</p>
        {!plan.items.length && <p className="mt-2 text-body">nothing to tip yet. bookmark or love some updates first.</p>}
        <ul className="mt-3 grid gap-2">{plan.items.map((i, k) => <li key={k} className="rounded-2xl bg-white p-3"><div className="flex items-center gap-2"><Link to={`/app/update/${i.update?.id}`} className="min-w-0 flex-1 truncate font-semibold text-primary">{i.update?.title}</Link><input aria-label={`amount for ${i.update?.title}`} type="number" step="0.01" min={p.minTipMinor / 100} className="w-24 rounded-lg border border-lilac bg-white px-2 py-1" value={i.amount} onChange={(e) => setPlan({ ...plan, items: plan.items.map((x, j) => (j === k ? { ...x, amount: Number(e.target.value) } : x)) })} /><button aria-label="remove" className="text-sm font-semibold text-body" onClick={() => setPlan({ ...plan, items: plan.items.filter((_, j) => j !== k) })}>x</button></div><p className="text-xs text-body">{i.update?.org}{i.reason ? ` · ${i.reason}` : ""}</p></li>)}</ul>
        {plan.items.length > 0 && <div className="mt-3 flex items-center gap-3"><b>total {money(Math.round(total * 100), p.currency)}</b>{total > budget && <span className="text-sm font-semibold text-[#d02b2b]">over your budget</span>}<Button disabled={busy || total <= 0 || total > budget || plan.items.some((i) => i.amount * 100 < p.minTipMinor)} onClick={() => void pay()}>{busy ? "opening..." : `pay with ${p.id}`}</Button></div>}</div>}
    </section>
  );
}

export function Wallet({ asOrg }: { asOrg?: boolean }) {
  const { config, user } = useApp(); const { org, role, ctx, grants } = useOrgCtx(); const toast = useToast(); const [sp, setSp] = useSearchParams();
  const [w, setW] = useState<WalletData | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ method: "paypal" as "bank" | "paypal", amount: "", bank: "058", otherCode: "", accountNumber: "", accountName: "", paypalEmail: user?.payments.paypalEmail ?? "" });
  const target = asOrg ? ctx : undefined; const captured = useRef(false);
  const load = useCallback(() => { if (asOrg && !org) return; setW(null); paymentsService.wallet(target).then(setW).catch((e) => setErr(msg(e, "could not load the wallet."))); }, [asOrg, org?.id, target]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // coming back from paypal: capture the approved order
    const order = sp.get("token"); if (sp.get("provider") !== "paypal" || !order || captured.current) return; captured.current = true;
    paymentsService.capture(order).then((r) => { toast(r.completed ? "payment received. thank you." : "payment is still processing."); setSp({}); load(); }).catch((e) => setErr(msg(e, "we could not confirm your paypal payment. if you were charged, it will appear shortly."))); // eslint-disable-line react-hooks/exhaustive-deps
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  if (asOrg && !org) return <NoOrg />;
  if (asOrg && !can(role, "wallet", grants)) return <Locked what="the organization wallet" />;
  const methods = config.payments.withdrawalMethods;
  const m = methods.find((x) => x.id === f.method) ?? methods[0];
  const bankCode = f.bank === "other" ? f.otherCode : f.bank;
  const valid = !!m && Number(f.amount) * 100 >= m.minMinor && (f.method === "paypal" ? /^\S+@\S+\.\S+$/.test(f.paypalEmail) : f.accountNumber.length === 10 && f.accountName.trim().length >= 3 && /^\d{3,10}$/.test(bankCode));
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      await paymentsService.withdraw(f.method === "paypal" ? { org: target, method: "paypal", amount: Number(f.amount), paypalEmail: f.paypalEmail } : { org: target, method: "bank", amount: Number(f.amount), bankCode, bankName: banks.find((b) => b[0] === bankCode)?.[1], accountNumber: f.accountNumber, accountName: f.accountName });
      toast("withdrawal requested. it is reviewed before it is paid."); setF({ ...f, amount: "", accountNumber: "" }); load();
    } catch (e) { setErr(msg(e, "could not request the withdrawal.")); } finally { setBusy(false); }
  };
  return (
    <>
      <h1 className="text-3xl">wallet{asOrg && org ? `: ${org.name}` : ""}</h1>
      {sp.get("cancelled") && <p role="status" className="mt-2 rounded-xl bg-hairline p-3 text-sm font-semibold">payment cancelled. nothing was charged.</p>}
      {sp.get("tip") === "done" && !sp.get("token") && <p role="status" className="mt-2 rounded-xl bg-hairline p-3 text-sm font-semibold">thank you. your payment can take a minute to be confirmed.</p>}
      <p role="alert" className="mt-2 text-sm font-semibold text-[#d02b2b]">{err}</p>
      {!w && !err && <div className="mt-4 h-28 animate-pulse rounded-2xl bg-hairline" aria-hidden />}
      {w && <>
        <p className="mt-4 text-sm text-body">available balance</p>
        {w.wallets.length ? <ul className="flex flex-wrap gap-x-8 gap-y-1">{w.wallets.map((x) => <li key={x.currency} className="font-display text-4xl font-bold">{money(x.balance, x.currency)}</li>)}</ul> : <p className="font-display text-4xl font-bold">{money(0, config.payments.providers[0]?.currency ?? "NGN")}</p>}
        <p className="mt-1 text-xs text-body">tips are kept in the currency they were paid in, after the platform fee. withdrawals are reviewed by a person before they are paid.</p>
        {!asOrg && config.payments.enabled && <TipPlanner />}
        <h2 className="mt-8 text-xl">withdraw</h2>
        {!w.withdrawalsEnabled || !m ? <p className="mt-2 text-body">withdrawals are not available yet.</p> : (
          <div className="mt-2 grid gap-3">
            <label className="text-sm font-semibold">payout method<select className={inputCls} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as "bank" | "paypal" })}>{methods.map((x) => <option key={x.id} value={x.id}>{x.id === "paypal" ? `paypal (${x.currency})` : `bank account (${x.currency})`}</option>)}</select></label>
            <label className="text-sm font-semibold">amount ({m.currency})<input type="number" step="0.01" className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder={`minimum ${m.minMinor / 100}`} /></label>
            {f.method === "paypal" ? <label className="text-sm font-semibold">paypal email<input type="email" className={inputCls} value={f.paypalEmail} onChange={(e) => setF({ ...f, paypalEmail: e.target.value })} /></label> : <>
              <label className="text-sm font-semibold">bank<select className={inputCls} value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })}>{banks.map(([c, n]) => <option key={c} value={c}>{n}</option>)}<option value="other">other (enter code)</option></select></label>
              {f.bank === "other" && <label className="text-sm font-semibold">bank code<input className={inputCls} value={f.otherCode} onChange={(e) => setF({ ...f, otherCode: e.target.value })} /></label>}
              <label className="text-sm font-semibold">account number<input inputMode="numeric" maxLength={10} className={inputCls} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value.replace(/\D/g, "") })} /></label>
              <label className="text-sm font-semibold">account name<input className={inputCls} value={f.accountName} onChange={(e) => setF({ ...f, accountName: e.target.value })} /></label></>}
            <Button disabled={busy || !valid} onClick={() => void submit()}>{busy ? "sending..." : "request withdrawal"}</Button>
            <p className="text-xs text-body">your payout details are encrypted before they are stored.</p>
          </div>)}
        {w.withdrawals.length > 0 && <><h2 className="mt-8 text-xl">withdrawals</h2><ul className="mt-2 divide-y-2 divide-hairline">{w.withdrawals.map((x) => <li key={x._id} className="py-2 text-sm"><b>{money(x.amount, x.currency)}</b> to {x.method === "paypal" ? `paypal ${x.paypal?.hint ?? ""}` : `${x.bank?.bankName ?? "bank"} ****${x.bank?.last4}`} <span className="ml-2 rounded-full bg-hairline px-2 py-0.5 text-xs font-bold">{x.status}</span>{x.reference && <span className="block text-xs text-body">reference {x.reference}</span>}{x.note && <span className="block text-xs text-body">{x.note}</span>}</li>)}</ul></>}
        <h2 className="mt-8 text-xl">activity</h2>{!w.entries.length && <p className="mt-2 text-body">no activity yet. tips you receive will show here.</p>}
        <ul className="mt-2 divide-y-2 divide-hairline">{w.entries.map((e) => <li key={e._id} className="flex justify-between gap-3 py-2 text-sm"><span>{e.note ?? e.type} <span className="text-xs text-body">{new Date(e.createdAt).toLocaleDateString("en")}</span></span><b className={e.amount < 0 ? "text-pink" : ""}>{e.amount > 0 ? "+" : ""}{money(e.amount, e.currency)}</b></li>)}</ul>
      </>}
    </>
  );
}
