import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Locked, NoOrg, chip, inputCls } from "@/components/common/states";
import { ImagePicker } from "@/components/common/image-picker";
import { ConfirmDialog } from "@/components/common/toast";
import { useApp } from "@/app/state";
import { ApiError, saveBlob } from "@/lib/http";
import { social, type Note } from "@/features/social/social-service";
import { can, useOrgCtx, type Member, type Rules } from "./model";
import { orgService, type FeedbackItem } from "./org-service";

const msg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);
const Loading = () => <div className="h-28 animate-pulse rounded-2xl bg-hairline" aria-hidden />;
const Switch = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => (
  <label className="flex min-h-11 items-center justify-between gap-3 border-b-2 border-hairline py-2 font-semibold"><span>{label}</span><input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} className="size-5 accent-[#6903d3]" /></label>
);

export function OrgNotifications() {
  const { org, ctx } = useOrgCtx(); const nav = useNavigate();
  const [items, setItems] = useState<Note[] | null>(null); const [f, setF] = useState("all"); const [err, setErr] = useState("");
  useEffect(() => { if (org) social.notes(ctx).then(setItems).catch(() => setErr("could not load alerts.")); }, [ctx, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!org) return <NoOrg />;
  const mark = async (ids?: string[]) => { await social.markRead(ids).catch(() => undefined); setItems((l) => l?.map((n) => (!ids || ids.includes(n._id) ? { ...n, read: true } : n)) ?? null); };
  const types = ["all", ...new Set((items ?? []).map((n) => n.type))];
  const list = (items ?? []).filter((n) => f === "all" || n.type === f);
  return (
    <>
      <div className="flex items-center"><h1 className="text-3xl">alerts</h1><button className="ml-auto text-sm font-semibold text-primary" onClick={() => void mark(list.map((n) => n._id))}>mark all as read</button></div>
      <div className="mt-3 flex gap-2 overflow-x-auto">{types.map((t) => <button key={t} aria-pressed={f === t} className={chip(f === t)} onClick={() => setF(t)}>{t}</button>)}</div>
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>{!items && !err && <div className="mt-3"><Loading /></div>}{items && !list.length && <p className="mt-4 text-body">you are all caught up.</p>}
      <ul className="mt-3 divide-y-2 divide-hairline">{list.map((n) => <li key={n._id}><button onClick={() => { void mark([n._id]); nav(n.link); }} className="flex w-full items-center gap-3 py-3 text-left"><span className={`size-2.5 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} aria-hidden /><span className="font-semibold">{n.text}</span>{!n.read && <span className="sr-only">(unread)</span>}</button></li>)}</ul>
    </>
  );
}

export function Analytics() {
  const { org, role, ctx, grants } = useOrgCtx();
  const [days, setDays] = useState(30); const [d, setD] = useState<Awaited<ReturnType<typeof orgService.analytics>> | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (org) { setD(null); orgService.analytics(ctx, days).then(setD).catch((e) => setErr(msg(e, "could not load analytics."))); } }, [ctx, days, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!org) return <NoOrg />;
  if (!can(role, "analytics", grants)) return <Locked what="analytics" />;
  const max = Math.max(1, ...(d?.series ?? []).map((s) => s.posts));
  return (
    <>
      <h1 className="text-3xl">analytics</h1><p className="mt-1 text-xs text-body">counts come from your real activity. reach and clicks are not measured, so they are not shown.</p>
      <div className="mt-3 flex gap-2">{[7, 30, 90].map((n) => <button key={n} aria-pressed={days === n} className={chip(days === n)} onClick={() => setDays(n)}>last {n} days</button>)}<Button variant="outline" className="ml-auto py-1.5 text-sm" onClick={() => void orgService.analyticsCsv(ctx, days).then((b) => saveBlob(b, "analytics.csv")).catch((e) => setErr(msg(e, "could not export.")))}>export csv</Button></div>
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>{!d && !err && <div className="mt-4"><Loading /></div>}
      {d && <>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl border-2 border-hairline p-3"><dd className="font-display text-3xl font-bold">{d.followers.total}</dd><dt className="text-xs text-body">followers</dt></div><div className="rounded-2xl border-2 border-hairline p-3"><dd className="font-display text-3xl font-bold">{d.followers.new}</dd><dt className="text-xs text-body">new in range</dt></div><div className="rounded-2xl border-2 border-hairline p-3"><dd className="font-display text-3xl font-bold">{d.series.reduce((a, s) => a + s.posts, 0)}</dd><dt className="text-xs text-body">updates</dt></div></dl>
        <h2 className="mt-6 text-xl">updates published per week</h2>
        {!d.series.length ? <p className="mt-2 text-body">no updates in this range yet.</p> : <div role="img" aria-label={`bar chart of updates per week: ${d.series.map((s) => `${s.week} ${s.posts}`).join(", ")}`} className="mt-3 flex h-44 items-end gap-2">{d.series.map((s) => <div key={s.week} className="flex flex-1 flex-col items-center gap-1"><span className="text-xs font-semibold">{s.posts}</span><div className="w-full rounded-t-lg bg-primary" style={{ height: `${(s.posts / max) * 100}%` }} /><span className="text-[10px] text-body">{s.week.slice(5)}</span></div>)}</div>}
        {d.series.length > 0 && <table className="mt-4 w-full text-left text-sm"><thead><tr className="text-body"><th className="py-1">week</th><th>loves</th><th>comments</th></tr></thead><tbody>{d.series.map((s) => <tr key={s.week} className="border-t border-hairline"><td className="py-1">{s.week}</td><td>{s.loves}</td><td>{s.comments}</td></tr>)}</tbody></table>}
      </>}
    </>
  );
}

export function Feedback() {
  const { org, role, ctx, grants } = useOrgCtx();
  const [items, setItems] = useState<FeedbackItem[] | null>(null); const [f, setF] = useState("all"); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { if (org) orgService.feedback(ctx).then(setItems).catch((e) => setErr(msg(e, "could not load feedback."))); }, [ctx, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!org) return <NoOrg />;
  if (!can(role, "analytics", grants)) return <Locked what="feedback" />;
  const upd = (id: string, p: Partial<FeedbackItem>) => { setItems((l) => l?.map((x) => (x._id === id ? { ...x, ...p } : x)) ?? null); void orgService.patchFeedback(ctx, id, p).catch((e) => setErr(msg(e, "could not save that change."))); };
  const list = (items ?? []).filter((i) => (f === "all" || i.status === f) && i.text.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1 className="text-3xl">feedback</h1><p className="mt-1 text-xs text-body">feedback is private to your team.</p>
      <div className="mt-3 flex flex-wrap gap-2">{["all", "new", "reviewed"].map((s) => <button key={s} aria-pressed={f === s} className={chip(f === s)} onClick={() => setF(s)}>{s}</button>)}<input aria-label="search feedback" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-3 py-1.5 text-sm" /></div>
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>{!items && !err && <div className="mt-3"><Loading /></div>}{items && !list.length && <p className="mt-4 text-body">no feedback yet. people can send it from your public page.</p>}
      <ul className="mt-3 grid gap-3">{list.map((i) => (
        <li key={i._id} className="rounded-2xl border-2 border-hairline p-4"><span className="text-xs font-bold text-primary">{i.category}{i.rating ? ` · ${i.rating}/5` : ""} · {i.status} · {new Date(i.createdAt).toLocaleDateString("en")}</span><p className="mt-1 break-words">{i.text}</p>
          <label className="mt-2 block text-sm font-semibold">internal note<input className={inputCls} defaultValue={i.note} onBlur={(e) => e.target.value !== i.note && upd(i._id, { note: e.target.value })} /></label>
          <Button variant="outline" className="mt-2 py-1.5 text-sm" onClick={() => upd(i._id, { status: i.status === "new" ? "reviewed" : "new" })}>{i.status === "new" ? "mark as reviewed" : "mark as new"}</Button></li>))}</ul>
    </>
  );
}

export function OrgSettings() {
  const { ctx, org, role, grants } = useOrgCtx(); const { setMyOrgs, myOrgs, setCtx } = useApp(); const nav = useNavigate();
  const [r, setR] = useState<Rules | null>(null); const [idn, setIdn] = useState({ name: "", description: "", bio: "", logo: "", banner: "" }); const [pub, setPub] = useState(false); const [cats, setCats] = useState(""); const [tip, setTip] = useState({ mode: "shared", pct: 70, paypal: "" });
  const [saved, setSaved] = useState(""); const [typed, setTyped] = useState(""); const [members, setMembers] = useState<Member[]>([]); const [newOwner, setNewOwner] = useState(""); const [del, setDel] = useState(false);
  useEffect(() => {
    if (!org) return;
    void orgService.get(ctx).then((o) => { setR(o.rules); setCats(o.rules.categories.join(", ")); setIdn({ name: o.name, description: o.description, bio: o.bio, logo: o.logo ?? "", banner: o.banner ?? "" }); setPub(o.feedbackPublic); setTip({ mode: o.tipMode, pct: o.tipOrgPercent, paypal: o.paypalEmail ?? "" }); }).catch((e) => setSaved(msg(e, "could not load settings.")));
    if (role === "owner") void orgService.members(ctx).then((m) => setMembers(m.filter((x) => x.role !== "owner"))).catch(() => undefined);
  }, [ctx, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!org) return <NoOrg />;
  if (!can(role, "settings", grants)) return <Locked what="organization settings" />;
  if (!r) return <Loading />;
  const sec = "mt-8 border-t-2 border-hairline pt-5";
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => { setR({ ...r, [k]: v }); setSaved("unsaved changes."); };
  const save = async () => {
    try { await orgService.saveRules(ctx, { ...r, categories: cats.split(",").map((c) => c.trim()).filter(Boolean) }); await orgService.saveIdentity(ctx, { name: idn.name, description: idn.description, bio: idn.bio, ...(idn.logo ? { logo: idn.logo } : {}), ...(idn.banner ? { banner: idn.banner } : {}) }); await orgService.setFeedbackPublic(ctx, pub); await orgService.saveTips(ctx, tip.mode, tip.pct, tip.paypal); setMyOrgs(myOrgs.map((o) => (o.id === ctx ? { ...o, name: idn.name } : o))); setSaved("saved."); }
    catch (e) { setSaved(msg(e, "could not save.")); }
  };
  const after = () => { const rest = myOrgs.filter((o) => o.id !== ctx); setMyOrgs(rest); setCtx("personal"); nav("/app"); };
  return (
    <>
      <h1 className="text-3xl">settings</h1><p role="status" className="text-sm font-semibold text-primary">{saved}</p><Button className="mt-2" onClick={() => void save()}>save changes</Button>
      <section className={sec}><h2 className="text-xl">identity</h2>
        <div className="mt-2 flex flex-wrap items-center gap-4">{idn.logo && <img src={idn.logo} alt="logo" width={56} height={56} className="size-14 rounded-2xl object-cover" />}<ImagePicker kind="logo" label="upload a logo" onUploaded={(url) => { setIdn({ ...idn, logo: url }); setSaved("unsaved changes."); }} />{idn.banner && <img src={idn.banner} alt="banner" width={160} height={56} className="h-14 w-40 rounded-xl object-cover" />}<ImagePicker kind="banner" label="upload a banner" onUploaded={(url) => { setIdn({ ...idn, banner: url }); setSaved("unsaved changes."); }} /></div>
        <label className="mt-2 block text-sm font-semibold">name<input className={inputCls} value={idn.name} onChange={(e) => setIdn({ ...idn, name: e.target.value })} /></label>
        <label className="mt-3 block text-sm font-semibold">short description<input className={inputCls} value={idn.description} onChange={(e) => setIdn({ ...idn, description: e.target.value })} /></label>
        <label className="mt-3 block text-sm font-semibold">biography<textarea className={`${inputCls} min-h-24`} value={idn.bio} onChange={(e) => setIdn({ ...idn, bio: e.target.value })} /></label></section>
      <section className={sec}><h2 className="text-xl">publishing rules</h2><p className="text-sm text-body">the formatter and the ai follow these every time. every organization sets its own.</p>
        <Switch label="lowercase updates" on={r.lowercase} set={(v) => set("lowercase", v)} /><Switch label="number updates" on={r.numbering} set={(v) => set("numbering", v)} /><Switch label="credit the poster" on={r.attribution} set={(v) => set("attribution", v)} /><Switch label="require approval before publishing" on={r.requireReview} set={(v) => set("requireReview", v)} /><Switch label="use our recent updates as style examples for ai" on={r.useExamples} set={(v) => set("useExamples", v)} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">number prefix<input className={inputCls} value={r.prefix} onChange={(e) => set("prefix", e.target.value)} /></label>
          <label className="text-sm font-semibold">next number (set by the server)<input className={inputCls} value={r.next} readOnly /></label>
          <label className="text-sm font-semibold">poster name<input className={inputCls} value={r.handle} onChange={(e) => set("handle", e.target.value)} /></label>
          <label className="text-sm font-semibold">footer<input className={inputCls} value={r.footer} onChange={(e) => set("footer", e.target.value)} /></label></div>
        <label className="mt-3 block text-sm font-semibold">required link<input className={inputCls} value={r.link} onChange={(e) => set("link", e.target.value)} /></label>
        <label className="mt-3 block text-sm font-semibold">categories (comma separated, the ai picks one)<input className={inputCls} value={cats} onChange={(e) => { setCats(e.target.value); setSaved("unsaved changes."); }} placeholder="scholarship update, hackathon update, community update" /></label>
        <label className="mt-3 block text-sm font-semibold">tone<input className={inputCls} value={r.tone} onChange={(e) => set("tone", e.target.value)} placeholder="friendly, short, direct" /></label>
        <label className="mt-3 block text-sm font-semibold">ai instructions<textarea className={`${inputCls} min-h-24`} value={r.instructions} onChange={(e) => set("instructions", e.target.value)} /></label>
        <p className="text-xs text-body">only your published updates and these rules are sent to the ai service. drafts, documents and messages never are.</p></section>
      <section className={sec}><h2 className="text-xl">tips</h2><p className="text-sm text-body">how tips on your updates are shared. the platform fee is taken first and is set by the platform.</p>
        <fieldset className="mt-2 grid gap-2"><legend className="sr-only">tip distribution</legend>{[["attribution", "organization receives all, poster is credited by name"], ["shared", "share between the organization and the poster"], ["org", "organization receives all, poster is not shown"]].map(([v, l]) => <label key={v} className="flex gap-2 font-semibold"><input type="radio" name="tip" checked={tip.mode === v} onChange={() => { setTip({ ...tip, mode: v }); setSaved("unsaved changes."); }} />{l}</label>)}</fieldset>
        {tip.mode === "shared" && <label className="mt-3 block text-sm font-semibold">organization share (%)<input type="number" min={0} max={100} className={inputCls} value={tip.pct} onChange={(e) => { setTip({ ...tip, pct: Math.min(100, Math.max(0, Number(e.target.value))) }); setSaved("unsaved changes."); }} /></label>}<label className="mt-3 block text-sm font-semibold">paypal email for payouts<input type="email" className={inputCls} value={tip.paypal} onChange={(e) => { setTip({ ...tip, paypal: e.target.value }); setSaved("unsaved changes."); }} /></label></section>
      <section className={sec}><h2 className="text-xl">feedback</h2><Switch label="show feedback publicly" on={pub} set={(v) => { setPub(v); setSaved("unsaved changes."); }} /></section>
      {role === "owner" && <section className={`${sec} rounded-2xl`}><h2 className="text-xl text-[#d02b2b]">danger zone</h2>
        <label className="mt-3 block text-sm font-semibold">type {org.handle} to confirm<input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
        <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-sm font-semibold">new owner<select className={inputCls} value={newOwner} onChange={(e) => setNewOwner(e.target.value)}><option value="">choose a member</option>{members.map((m) => <option key={m.userId} value={m.userId}>{m.user?.name || m.user?.username}</option>)}</select></label>
          <Button variant="outline" disabled={typed !== org.handle || !newOwner} onClick={() => void orgService.transfer(ctx, newOwner, typed).then(() => { setSaved("ownership transferred. you are now an admin."); setMyOrgs(myOrgs.map((o) => (o.id === ctx ? { ...o, role: "admin" } : o))); }).catch((e) => setSaved(msg(e, "could not transfer.")))}>transfer ownership</Button></div>
        <Button className="mt-3" disabled={typed !== org.handle} onClick={() => setDel(true)}>delete organization</Button></section>}
      <ConfirmDialog open={del} title="delete this organization?" body="its updates, drafts, documents, members and invitations are removed for good." confirm="delete forever" onClose={() => setDel(false)} onConfirm={() => { setDel(false); void orgService.remove(ctx, typed).then(after).catch((e) => setSaved(msg(e, "could not delete."))); }} />
    </>
  );
}
