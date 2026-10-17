import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Demo, Locked, NoOrg, chip, inputCls } from "@/components/common/states";
import { usePersisted, useApp } from "@/app/state";
import { can, defaultRules, useOrgCtx, type Rules } from "./model";
import { money, quote, wallet } from "./wallet-service";

const Switch = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => (
  <label className="flex min-h-11 items-center justify-between gap-3 border-b-2 border-hairline py-2 font-semibold"><span>{label}</span><input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} className="size-5 accent-[#6903d3]" /></label>
);


export function Wallet() {
  const { org } = useOrgCtx();
  const [amt, setAmt] = useState(500);
  const q = quote(amt, 60);
  return (
    <>
      <h1 className="text-3xl">wallet{org ? `: ${org.name}` : ""}</h1>
      <p role="note" className="mt-2 rounded-2xl bg-hairline p-3 text-sm font-semibold">demo wallet. balances here are not real money and no payment can happen from this build.</p>
      <p className="mt-4 text-sm text-body">available balance</p><p className="font-display text-4xl font-bold">{money(wallet.balance)}</p>
      <Button variant="outline" disabled className="mt-3">withdraw (needs the backend)</Button>
      <h2 className="mt-8 text-xl">tip preview</h2>
      <label className="mt-2 block text-sm font-semibold">amount ({wallet.currency})<input type="number" min={100} className={inputCls} value={amt} onChange={(e) => setAmt(Number(e.target.value))} /></label>
      <dl className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border-2 border-hairline p-4 text-sm"><dt className="text-body">recipient</dt><dd>futa techies</dd><dt className="text-body">platform transaction fee</dt><dd>{money(q.fee)} (rate from server)</dd><dt className="text-body">organization share</dt><dd>{money(q.orgShare)}</dd><dt className="text-body">poster share</dt><dd>{money(q.posterShare)}</dd><dt className="font-bold">you pay</dt><dd className="font-bold">{money(amt)}</dd></dl>
      <p className="mt-1 text-xs text-body">the final split and fee are calculated by the backend. this preview only shows the shape.</p>
      <h2 className="mt-8 text-xl">transactions</h2>
      {!wallet.txs.length && <p className="mt-2 text-body">no transactions yet. tips you send and receive will show here.</p>}
    </>
  );
}

export function OrgNotifications() {
  const { org } = useOrgCtx();
  const [read, setRead] = usePersisted<string[]>("ub-orgread", []);
  const [f, setF] = useState("all");
  if (!org) return <NoOrg />;
  const items = [["o1", "followers", "5 new followers today"], ["o2", "reviews", "1 draft is waiting for review"], ["o3", "comments", "3 new comments on the chevening update"], ["o4", "members", "amaka was invited as delegate"], ["o5", "documents", "ngozi_e requested access to sponsor list.xlsx"]];
  return (
    <>
      <div className="flex items-center"><h1 className="text-3xl">alerts</h1><button className="ml-auto text-sm font-semibold text-primary" onClick={() => setRead(items.map((i) => i[0]))}>mark all as read</button></div><Demo />
      <div className="mt-3 flex gap-2 overflow-x-auto">{["all", ...items.map((i) => i[1])].map((t) => <button key={t} aria-pressed={f === t} className={chip(f === t)} onClick={() => setF(t)}>{t}</button>)}</div>
      <ul className="mt-3 divide-y-2 divide-hairline">{items.filter((i) => f === "all" || i[1] === f).map((i) => <li key={i[0]} className="flex items-center gap-3 py-3"><span className={`size-2.5 rounded-full ${read.includes(i[0]) ? "bg-transparent" : "bg-primary"}`} aria-hidden /><button className="text-left font-semibold" onClick={() => setRead([...read, i[0]])}>{i[2]}{!read.includes(i[0]) && <span className="sr-only"> (unread)</span>}</button></li>)}</ul>
    </>
  );
}

export function Analytics() {
  const { org, role } = useOrgCtx();
  const [days, setDays] = useState(30);
  if (!org) return <NoOrg />;
  if (!can(role, "analytics")) return <Locked what="analytics" />;
  const data = Array.from({ length: 7 }, (_, i) => ({ label: `week ${i + 1}`, posts: [4, 6, 3, 7, 5, 8, 6][i] }));
  const max = Math.max(...data.map((d) => d.posts));
  const exportCsv = () => { const blob = new Blob(["week,posts\n" + data.map((d) => `${d.label},${d.posts}`).join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "publishing-demo.csv"; a.click(); URL.revokeObjectURL(a.href); };
  return (
    <>
      <h1 className="text-3xl">analytics</h1><Demo>demo metrics. reach and clicks are not measured until channel integrations exist.</Demo>
      <div className="mt-3 flex gap-2">{[7, 30, 90].map((d) => <button key={d} aria-pressed={days === d} className={chip(days === d)} onClick={() => setDays(d)}>last {d} days</button>)}<Button variant="outline" className="ml-auto py-1.5 text-sm" onClick={exportCsv}>export csv</Button></div>
      <h2 className="mt-6 text-xl">updates published per week</h2>
      <div role="img" aria-label={`bar chart of updates per week: ${data.map((d) => `${d.label} ${d.posts}`).join(", ")}`} className="mt-3 flex h-44 items-end gap-2">{data.map((d) => <div key={d.label} className="flex flex-1 flex-col items-center gap-1"><span className="text-xs font-semibold">{d.posts}</span><div className="w-full rounded-t-lg bg-primary" style={{ height: `${(d.posts / max) * 100}%` }} /><span className="text-[10px] text-body">{d.label.slice(5)}</span></div>)}</div>
    </>
  );
}

export function Feedback() {
  const { org, role } = useOrgCtx();
  const [items, setItems] = usePersisted("ub-feedback", [{ id: "f1", cat: "content", text: "please post deadlines earlier.", reviewed: false, note: "" }, { id: "f2", cat: "community", text: "love the weekly roundup.", reviewed: true, note: "" }]);
  const [f, setF] = useState("all");
  if (!org) return <NoOrg />;
  if (!can(role, "analytics")) return <Locked what="feedback" />;
  return (
    <>
      <h1 className="text-3xl">feedback</h1><Demo>feedback is private unless you make it public in settings.</Demo>
      <div className="mt-3 flex gap-2">{["all", "new", "reviewed"].map((s) => <button key={s} aria-pressed={f === s} className={chip(f === s)} onClick={() => setF(s)}>{s}</button>)}</div>
      <ul className="mt-3 grid gap-3">{items.filter((i) => f === "all" || (f === "reviewed") === i.reviewed).map((i) => (
        <li key={i.id} className="rounded-2xl border-2 border-hairline p-4"><span className="text-xs font-bold text-primary">{i.cat} · {i.reviewed ? "reviewed" : "new"}</span><p className="mt-1">{i.text}</p>
          <label className="mt-2 block text-sm font-semibold">internal note<input className={inputCls} value={i.note} onChange={(e) => setItems(items.map((x) => (x.id === i.id ? { ...x, note: e.target.value } : x)))} /></label>
          <Button variant="outline" className="mt-2 py-1.5 text-sm" onClick={() => setItems(items.map((x) => (x.id === i.id ? { ...x, reviewed: !x.reviewed } : x)))}>{i.reviewed ? "mark as new" : "mark as reviewed"}</Button></li>))}</ul>
    </>
  );
}

export function OrgSettings() {
  const { ctx, org, role } = useOrgCtx();
  const [r, setR] = usePersisted<Rules>(`ub-rules-${ctx}`, defaultRules);
  const [mode, setMode] = usePersisted(`ub-tipmode-${ctx}`, "shared");
  const [pub, setPub] = usePersisted(`ub-fbpublic-${ctx}`, false);
  const [typed, setTyped] = useState(""); const [saved, setSaved] = useState("");
  if (!org) return <NoOrg />;
  if (!can(role, "settings")) return <Locked what="organization settings" />;
  const sec = "mt-8 border-t-2 border-hairline pt-5";
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => { setR({ ...r, [k]: v }); setSaved("saved on this device."); };
  return (
    <>
      <h1 className="text-3xl">settings</h1><p role="status" className="text-sm font-semibold text-primary">{saved}</p>
      <section className={sec}><h2 className="text-xl">publishing rules</h2><p className="text-sm text-body">used by the formatter on the publish page. every organization sets its own.</p>
        <Switch label="lowercase updates" on={r.lowercase} set={(v) => set("lowercase", v)} /><Switch label="number updates" on={r.numbering} set={(v) => set("numbering", v)} /><Switch label="credit the poster" on={r.attribution} set={(v) => set("attribution", v)} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">number prefix<input className={inputCls} value={r.prefix} onChange={(e) => set("prefix", e.target.value)} /></label>
          <label className="text-sm font-semibold">next number (preview only)<input type="number" className={inputCls} value={r.next} onChange={(e) => set("next", Number(e.target.value))} /></label>
          <label className="text-sm font-semibold">poster name<input className={inputCls} value={r.handle} onChange={(e) => set("handle", e.target.value)} /></label>
          <label className="text-sm font-semibold">footer<input className={inputCls} value={r.footer} onChange={(e) => set("footer", e.target.value)} /></label>
        </div>
        <label className="mt-3 block text-sm font-semibold">required link<input className={inputCls} value={r.link} onChange={(e) => set("link", e.target.value)} /></label>
        <label className="mt-3 block text-sm font-semibold">ai instructions<textarea className={`${inputCls} min-h-24`} value={r.instructions} onChange={(e) => set("instructions", e.target.value)} /></label>
        <p className="text-xs text-body">only content you authorize is sent to the ai service. the server assigns the real update numbers.</p></section>
      <section className={sec}><h2 className="text-xl">tips</h2>
        <fieldset className="mt-2 grid gap-2"><legend className="sr-only">tip distribution</legend>{[["attribution", "organization name with poster credit"], ["shared", "share between organization and poster"], ["org", "organization only, hide poster"]].map(([v, l]) => <label key={v} className="flex gap-2 font-semibold"><input type="radio" name="tip" checked={mode === v} onChange={() => setMode(v)} />{l}</label>)}</fieldset>
        <p className="text-xs text-body">the platform fee is set by the server. nothing is calculated here.</p></section>
      <section className={sec}><h2 className="text-xl">feedback</h2><Switch label="show feedback publicly" on={pub} set={setPub} /></section>
      <section className={sec}><h2 className="text-xl">channels and invitations</h2><p className="text-body">channel connections and invite links need the backend. until then, copy updates and post manually.</p></section>
      <section className={`${sec} rounded-2xl`}><h2 className="text-xl text-[#d02b2b]">danger zone</h2>
        <Button variant="outline" className="mt-2" disabled>transfer ownership (needs the backend)</Button>
        <label className="mt-3 block text-sm font-semibold">type {org.id} to enable deletion<input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
        <Button className="mt-2" disabled={typed !== org.id} onClick={() => setSaved("deletion needs the backend. nothing was deleted.")}>delete organization</Button></section>
    </>
  );
}

export function PersonalSettings() {
  const { user, setUser } = useApp();
  const nav = useNavigate();
  const [p, setP] = usePersisted("ub-prefs", { follows: true, comments: true, mentions: true, dms: true });
  const [typed, setTyped] = useState("");
  return (
    <>
      <h1 className="text-3xl">settings</h1>
      <section className="mt-5"><h2 className="text-xl">notifications</h2>{(["follows", "comments", "mentions"] as const).map((k) => <Switch key={k} label={`${k}`} on={p[k]} set={(v) => setP({ ...p, [k]: v })} />)}</section>
      <section className="mt-6"><h2 className="text-xl">messages</h2><Switch label="accept direct messages" on={p.dms} set={(v) => setP({ ...p, dms: v })} />{!p.dms && <p className="text-sm text-body">people will see that you are not accepting messages.</p>}</section>
      <section className="mt-6"><h2 className="text-xl">account</h2><p className="text-body">signed in as {user?.email}. linking google to an email account needs a verified email, checked by the server.</p><p className="mt-1 text-sm text-body">theme: use the sun and moon button in the top bar. privacy: set visibility on your <Link to="/app/profile" className="font-semibold text-primary">profile</Link>. cookies: <Link to="/legal/cookies" className="font-semibold text-primary">preferences</Link>.</p></section>
      <section className="mt-6 border-t-2 border-hairline pt-5"><h2 className="text-xl text-[#d02b2b]">delete account</h2><label className="mt-2 block text-sm font-semibold">type delete to confirm<input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
        <Button className="mt-2" disabled={typed !== "delete"} onClick={() => { setUser(null); nav("/"); }}>delete my account</Button><p className="mt-1 text-xs text-body">demo: this only signs you out. real deletion needs the backend.</p></section>
    </>
  );
}
