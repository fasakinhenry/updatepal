import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { chip, inputCls } from "@/components/common/states";
import { ConfirmDialog, useToast } from "@/components/common/toast";
import { ApiError, download, post, put, request, saveBlob } from "@/lib/http";
import { money } from "@/features/payments/payments-service";

const msg = (e: unknown, d = "something went wrong.") => (e instanceof ApiError ? e.message : d);
const Load = () => <div className="h-28 animate-pulse rounded-2xl bg-hairline" aria-hidden />;
const date = (s?: string | null) => (s ? new Date(s).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : "never");
const bytes = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} gb` : n > 1e6 ? `${(n / 1e6).toFixed(1)} mb` : `${Math.round(n / 1e3)} kb`);
const Stat = ({ k, v, hint }: { k: string; v: ReactNode; hint?: string }) => <div className="rounded-2xl border-2 border-hairline p-3"><dd className="font-display text-2xl font-bold">{v}</dd><dt className="text-xs text-body">{k}</dt>{hint && <p className="text-[10px] text-body">{hint}</p>}</div>;
const Err = ({ e }: { e: string }) => <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{e}</p>;
const Badge = ({ children, bad }: { children: ReactNode; bad?: boolean }) => <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bad ? "bg-pink text-on-primary" : "bg-hairline text-primary"}`}>{children}</span>;

function Bars({ title, data }: { title: string; data: { day: string; n: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <figure className="rounded-2xl border-2 border-hairline p-4"><figcaption className="text-sm font-semibold">{title} <span className="font-normal text-body">(total {data.reduce((a, d) => a + d.n, 0)})</span></figcaption>
      {data.length ? <div role="img" aria-label={`${title}: ${data.map((d) => `${d.day} ${d.n}`).join(", ")}`} className="mt-3 flex h-24 items-end gap-0.5">{data.map((d) => <div key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t bg-primary" style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }} />)}</div> : <p className="mt-2 text-sm text-body">no data in this range.</p>}</figure>
  );
}
const Rank = ({ title, rows }: { title: string; rows: { key: string; n: number }[] }) => <section className="rounded-2xl border-2 border-hairline p-4"><h3 className="text-base">{title}</h3>{rows.length ? <ul className="mt-2 grid gap-1 text-sm">{rows.map((r) => <li key={r.key} className="flex justify-between gap-2"><span className="truncate">{r.key}</span><b>{r.n}</b></li>)}</ul> : <p className="mt-2 text-sm text-body">nothing yet.</p>}</section>;

type Ov = { totals: Record<string, number>; active: { dau: number; wau: number; mau: number; returning: number }; funnel: Record<string, number>; money: { tips: { currency: string; minor: number }[]; fees: { currency: string; balance: number }[]; pendingWithdrawals: number }; series: Record<"signups" | "updates" | "stories" | "comments", { day: string; n: number }[]>; interests: { key: string; n: number }[]; countries: { key: string; n: number }[]; topOrgs: { id: string; name: string; followers: number }[]; topUpdates: { id: string; title: string; loves: number; comments: number }[]; authMix: { google: number; password: number } };
function OverviewTab() {
  const [days, setDays] = useState(30); const [d, setD] = useState<Ov | null>(null); const [err, setErr] = useState("");
  useEffect(() => { setD(null); request<Ov>(`/admin/overview?days=${days}`).then(setD).catch((e) => setErr(msg(e))); }, [days]);
  if (err) return <Err e={err} />; if (!d) return <Load />;
  const t = d.totals, pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
  return (
    <div className="grid gap-6">
      <div className="flex gap-2">{[7, 30, 90].map((n) => <button key={n} aria-pressed={days === n} onClick={() => setDays(n)} className={chip(days === n)}>last {n} days</button>)}</div>
      <section aria-label="totals"><h2 className="text-xl">platform</h2><dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat k="users" v={t.users} /><Stat k="organizations" v={t.orgs} /><Stat k="updates" v={t.updates} /><Stat k="stories" v={t.stories} /><Stat k="comments" v={t.comments} /><Stat k="follows" v={t.follows} /><Stat k="bookmarks" v={t.bookmarks} /><Stat k="open reports" v={t.openReports} /><Stat k="drafts" v={t.drafts} /><Stat k="scheduled" v={t.scheduled} /><Stat k="conversations" v={t.conversations} hint="content is encrypted" /><Stat k="messages" v={t.messages} hint="count only" /><Stat k="suspended users" v={t.suspended} /><Stat k="file storage" v={bytes(t.storageBytes)} /></dl></section>
      <section aria-label="activity"><h2 className="text-xl">activity</h2><dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat k="active today" v={d.active.dau} /><Stat k="active this week" v={d.active.wau} /><Stat k="active this month" v={d.active.mau} /><Stat k="returning (7d, joined 30d+ ago)" v={d.active.returning} /></dl><p className="mt-1 text-xs text-body">activity counts people who used the app, measured by their last seen time.</p></section>
      <section aria-label="funnel"><h2 className="text-xl">signup funnel</h2><dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat k="registered" v={d.funnel.registered} /><Stat k="verified email" v={d.funnel.verified} hint={pct(d.funnel.verified, d.funnel.registered)} /><Stat k="finished onboarding" v={d.funnel.onboarded} hint={pct(d.funnel.onboarded, d.funnel.registered)} /><Stat k="in an organization" v={d.funnel.inAnOrg} hint={pct(d.funnel.inAnOrg, d.funnel.registered)} /></dl></section>
      <div className="grid gap-3 sm:grid-cols-2"><Bars title="signups per day" data={d.series.signups} /><Bars title="updates per day" data={d.series.updates} /><Bars title="stories per day" data={d.series.stories} /><Bars title="comments per day" data={d.series.comments} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><Rank title="top organizations by followers" rows={d.topOrgs.map((o) => ({ key: o.name, n: o.followers }))} /><Rank title="top updates by loves" rows={d.topUpdates.map((u) => ({ key: u.title, n: u.loves }))} /><Rank title="interests" rows={d.interests} /><Rank title="countries" rows={d.countries} /></div>
      <section><h2 className="text-xl">sign in methods</h2><dl className="mt-2 grid grid-cols-2 gap-3"><Stat k="with google" v={d.authMix.google} /><Stat k="with a password" v={d.authMix.password} /></dl></section>
      <section><h2 className="text-xl">money</h2><dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{d.money.tips.map((t) => <Stat key={`t${t.currency}`} k={`tips paid (${t.currency})`} v={money(t.minor, t.currency)} />)}{d.money.fees.map((t) => <Stat key={`f${t.currency}`} k={`platform fees (${t.currency})`} v={money(t.balance, t.currency)} />)}<Stat k="withdrawals waiting" v={d.money.pendingWithdrawals} /></dl></section>
    </div>
  );
}

type U = { id: string; email: string; name?: string; username?: string; verified: boolean; onboarded: boolean; suspended: boolean; suspendedReason?: string; createdAt: string; lastSeenAt?: string; hasGoogle: boolean; hasKeys: boolean; isAdmin: boolean; country?: string; visibility: string };
type UD = { user: U; orgs: { role: string; org?: { name: string; handle: string } }[]; counts: Record<string, number> };
function UsersTab() {
  const toast = useToast();
  const [q, setQ] = useState(""); const [filter, setFilter] = useState("all"); const [items, setItems] = useState<U[] | null>(null); const [cursor, setCursor] = useState<string | null>(null); const [total, setTotal] = useState(0); const [err, setErr] = useState("");
  const [sel, setSel] = useState<UD | null>(null); const [dlg, setDlg] = useState<"" | "suspend" | "delete">(""); const [reason, setReason] = useState(""); const [typed, setTyped] = useState("");
  const load = useCallback((more?: string | null) => {
    const p = new URLSearchParams({ filter }); if (q) p.set("q", q); if (more) p.set("cursor", more);
    request<{ items: U[]; nextCursor: string | null; total: number }>(`/admin/users?${p}`).then((r) => { setItems((l) => (more ? [...(l ?? []), ...r.items] : r.items)); setCursor(r.nextCursor); setTotal(r.total); setErr(""); }).catch((e) => setErr(msg(e)));
  }, [q, filter]);
  useEffect(() => { const t = setTimeout(() => load(), 250); return () => clearTimeout(t); }, [load]);
  const open = (id: string) => request<UD>(`/admin/users/${id}`).then(setSel).catch((e) => setErr(msg(e)));
  const act = async (action: string, extra: Record<string, unknown> = {}) => { if (!sel) return; try { await post(`/admin/users/${sel.user.id}/action`, { action, ...extra }); toast(`done: ${action}`); setDlg(""); setReason(""); setTyped(""); if (action === "delete") setSel(null); else void open(sel.user.id); load(); } catch (e) { setErr(msg(e)); } };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2"><input aria-label="search users" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search email, name or username" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-4 py-2" /><select aria-label="filter users" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-full border border-lilac bg-white px-3 py-2">{["all", "unverified", "not_onboarded", "suspended", "inactive"].map((f) => <option key={f}>{f}</option>)}</select><Button variant="outline" className="py-1.5 text-sm" onClick={() => void download("/admin/users.csv").then((b) => saveBlob(b, "users.csv")).catch((e) => setErr(msg(e)))}>export csv</Button></div>
      <p className="mt-1 text-xs text-body">{total} users in total. exports and bank detail views are written to the audit log.</p><Err e={err} />
      {!items && <Load />}
      <ul className="mt-3 divide-y-2 divide-hairline">{items?.map((u) => <li key={u.id}><button onClick={() => void open(u.id)} className="flex w-full flex-wrap items-center gap-2 py-3 text-left"><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{u.name || u.username || "no name"} <span className="font-normal text-body">{u.email}</span></span><span className="block text-xs text-body">joined {date(u.createdAt)} · last seen {date(u.lastSeenAt)}</span></span>{u.isAdmin && <Badge>admin</Badge>}{!u.verified && <Badge bad>unverified</Badge>}{u.suspended && <Badge bad>suspended</Badge>}{!u.onboarded && <Badge>new</Badge>}</button></li>)}</ul>
      {cursor && <Button variant="outline" className="mt-3 w-full" onClick={() => load(cursor)}>load more</Button>}
      {sel && <aside aria-label="user details" className="mt-5 rounded-2xl border-2 border-pink bg-hairline p-4">
        <h3 className="text-xl">{sel.user.name || sel.user.username || sel.user.email}</h3><p className="text-sm text-body">{sel.user.email} · {sel.user.country ?? "no country"} · profile {sel.user.visibility}{sel.user.hasGoogle ? " · google linked" : ""}{sel.user.hasKeys ? " · encrypted messaging on" : ""}</p>
        {sel.user.suspended && <p className="mt-1 text-sm font-semibold text-pink">suspended: {sel.user.suspendedReason || "no reason given"}</p>}
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">{Object.entries(sel.counts).map(([k, v]) => <Stat key={k} k={k} v={v} />)}</dl>
        <p className="mt-3 text-sm">organizations: {sel.orgs.length ? sel.orgs.map((o) => `${o.org?.name ?? "deleted"} (${o.role})`).join(", ") : "none"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sel.user.suspended ? <Button className="py-1.5 text-sm" onClick={() => void act("unsuspend")}>unsuspend</Button> : <Button variant="outline" className="py-1.5 text-sm" disabled={sel.user.isAdmin} onClick={() => setDlg("suspend")}>suspend</Button>}
          <Button variant="outline" className="py-1.5 text-sm" onClick={() => void act("logout")}>sign out everywhere</Button>
          {!sel.user.verified && <Button variant="outline" className="py-1.5 text-sm" onClick={() => void act("verify")}>mark email verified</Button>}
          <Button variant="outline" className="py-1.5 text-sm" disabled={sel.user.isAdmin} onClick={() => setDlg("delete")}>delete user</Button><Button variant="outline" className="py-1.5 text-sm" onClick={() => setSel(null)}>close</Button></div>
      </aside>}
      <ConfirmDialog open={dlg === "suspend"} title="suspend this user?" body="they are signed out and cannot use the app until you unsuspend them." confirm="suspend" onClose={() => setDlg("")} onConfirm={() => void act("suspend", { reason })}><label className="mt-3 block text-sm font-semibold">reason<input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></label></ConfirmDialog>
      <ConfirmDialog open={dlg === "delete"} title="delete this user?" body="their profile, stories, comments and saved items are removed for good. type their email to confirm." confirm="delete forever" confirmDisabled={typed !== sel?.user.email} onClose={() => setDlg("")} onConfirm={() => void act("delete", { confirm: typed })}><label className="mt-3 block text-sm font-semibold">email<input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} /></label></ConfirmDialog>
    </div>
  );
}

type O = { id: string; name: string; handle: string; category?: string; suspended: boolean; createdAt: string; owner?: string; members: number; updates: number; followers: number };
function OrgsTab() {
  const toast = useToast(); const [q, setQ] = useState(""); const [items, setItems] = useState<O[] | null>(null); const [cursor, setCursor] = useState<string | null>(null); const [err, setErr] = useState(""); const [dlg, setDlg] = useState<{ o: O; kind: "suspend" | "delete" } | null>(null); const [text, setText] = useState("");
  const load = useCallback((more?: string | null) => { const p = new URLSearchParams(); if (q) p.set("q", q); if (more) p.set("cursor", more); request<{ items: O[]; nextCursor: string | null }>(`/admin/orgs?${p}`).then((r) => { setItems((l) => (more ? [...(l ?? []), ...r.items] : r.items)); setCursor(r.nextCursor); }).catch((e) => setErr(msg(e))); }, [q]);
  useEffect(() => { const t = setTimeout(() => load(), 250); return () => clearTimeout(t); }, [load]);
  const act = async (o: O, action: string, extra: Record<string, unknown> = {}) => { try { await post(`/admin/orgs/${o.id}/action`, { action, ...extra }); toast(`done: ${action}`); setDlg(null); setText(""); load(); } catch (e) { setErr(msg(e)); } };
  return (
    <div><input aria-label="search organizations" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search name or handle" className="w-full rounded-full border border-lilac bg-white px-4 py-2" /><Err e={err} />{!items && <Load />}
      <ul className="mt-3 divide-y-2 divide-hairline">{items?.map((o) => <li key={o.id} className="flex flex-wrap items-center gap-2 py-3"><div className="min-w-0 flex-1"><p className="truncate font-semibold">{o.name} <span className="font-normal text-body">@{o.handle}</span></p><p className="text-xs text-body">{o.category} · owner {o.owner} · {o.members} members · {o.followers} followers · {o.updates} updates · created {date(o.createdAt)}</p></div>{o.suspended && <Badge bad>suspended</Badge>}
        {o.suspended ? <Button className="py-1 text-sm" onClick={() => void act(o, "unsuspend")}>unsuspend</Button> : <Button variant="outline" className="py-1 text-sm" onClick={() => setDlg({ o, kind: "suspend" })}>suspend</Button>}<Button variant="outline" className="py-1 text-sm" onClick={() => setDlg({ o, kind: "delete" })}>delete</Button></li>)}</ul>
      {cursor && <Button variant="outline" className="mt-3 w-full" onClick={() => load(cursor)}>load more</Button>}
      <ConfirmDialog open={dlg?.kind === "suspend"} title="suspend this organization?" body="its updates are hidden and it cannot publish. the owner is notified." confirm="suspend" onClose={() => setDlg(null)} onConfirm={() => dlg && void act(dlg.o, "suspend", { reason: text })}><label className="mt-3 block text-sm font-semibold">reason<input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} /></label></ConfirmDialog>
      <ConfirmDialog open={dlg?.kind === "delete"} title="delete this organization?" body="everything it owns is removed for good. type its handle to confirm." confirm="delete forever" confirmDisabled={text !== dlg?.o.handle} onClose={() => setDlg(null)} onConfirm={() => dlg && void act(dlg.o, "delete", { confirm: text })}><label className="mt-3 block text-sm font-semibold">handle<input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} /></label></ConfirmDialog></div>
  );
}

type R = { id: string; kind: string; target: string; reason: string; status: string; resolution?: string; note?: string; createdAt: string; reporter?: string; preview: string };
type C = { id: string; title: string; body: string; hidden: boolean; createdAt: string };
function ModerationTab() {
  const toast = useToast(); const [status, setStatus] = useState("open"); const [rs, setRs] = useState<R[] | null>(null); const [err, setErr] = useState(""); const [kind, setKind] = useState("updates"); const [cq, setCq] = useState(""); const [hid, setHid] = useState(false); const [cs, setCs] = useState<C[] | null>(null); const [note, setNote] = useState("");
  const loadR = useCallback(() => { setRs(null); request<{ items: R[] }>(`/admin/reports?status=${status}`).then((r) => setRs(r.items)).catch((e) => setErr(msg(e))); }, [status]);
  useEffect(() => { loadR(); }, [loadR]);
  const loadC = useCallback(() => { setCs(null); const p = new URLSearchParams({ kind }); if (cq) p.set("q", cq); if (hid) p.set("hidden", "1"); request<{ items: C[] }>(`/admin/content?${p}`).then((r) => setCs(r.items)).catch((e) => setErr(msg(e))); }, [kind, cq, hid]);
  useEffect(() => { const t = setTimeout(loadC, 250); return () => clearTimeout(t); }, [loadC]);
  const resolve = async (r: R, action: string) => { try { await post(`/admin/reports/${r.id}/resolve`, { action, note }); toast("report resolved"); setNote(""); loadR(); } catch (e) { setErr(msg(e)); } };
  const toggle = async (c: C) => { try { await post(`/admin/content/${kind}/${c.id}/hidden`, { hidden: !c.hidden }); loadC(); } catch (e) { setErr(msg(e)); } };
  return (
    <div className="grid gap-8"><Err e={err} />
      <section><h2 className="text-xl">reports</h2><div className="mt-2 flex gap-2">{["open", "resolved", "all"].map((s) => <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)} className={chip(status === s)}>{s}</button>)}</div>{!rs && <div className="mt-3"><Load /></div>}{rs && !rs.length && <p className="mt-3 text-body">no reports here.</p>}
        <ul className="mt-3 grid gap-3">{rs?.map((r) => <li key={r.id} className="rounded-2xl border-2 border-hairline p-4"><p className="text-xs font-bold text-primary">{r.kind} · {r.status}{r.resolution ? ` (${r.resolution})` : ""} · {date(r.createdAt)} · by {r.reporter ?? "deleted user"}</p><p className="mt-1 font-semibold">{r.preview || r.target}</p><p className="mt-1 break-words text-body">{r.reason}</p>{r.note && <p className="text-xs text-body">note: {r.note}</p>}
          {r.status === "open" && <div className="mt-3 flex flex-wrap items-center gap-2"><input aria-label="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="note (optional)" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-3 py-1.5 text-sm" /><Button variant="outline" className="py-1 text-sm" onClick={() => void resolve(r, "dismiss")}>dismiss</Button>{["update", "story", "comment"].includes(r.kind) && <Button variant="outline" className="py-1 text-sm" onClick={() => void resolve(r, "hide")}>hide content</Button>}<Button className="py-1 text-sm" onClick={() => void resolve(r, "suspend_user")}>suspend user</Button></div>}</li>)}</ul></section>
      <section><h2 className="text-xl">content</h2><div className="mt-2 flex flex-wrap items-center gap-2">{["updates", "stories", "comments"].map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>{k}</button>)}<input aria-label="search content" value={cq} onChange={(e) => setCq(e.target.value)} placeholder="search" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-3 py-1.5 text-sm" /><label className="flex items-center gap-1 text-sm font-semibold"><input type="checkbox" checked={hid} onChange={(e) => setHid(e.target.checked)} />hidden only</label></div>{!cs && <div className="mt-3"><Load /></div>}
        <ul className="mt-3 divide-y-2 divide-hairline">{cs?.map((c) => <li key={c.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.title || c.body.slice(0, 60)}</p><p className="truncate text-xs text-body">{c.body} · {date(c.createdAt)}</p></div>{c.hidden && <Badge bad>hidden</Badge>}<Button variant="outline" className="py-1 text-sm" onClick={() => void toggle(c)}>{c.hidden ? "restore" : "hide"}</Button></li>)}</ul></section>
    </div>
  );
}

type Pay = { providers: string[]; configured: boolean; paypalPayouts: boolean; byStatus: { status: string; provider: string; currency: string; n: number; minor: number }[]; tips: { _id: string; amount: number; currency: string; provider?: string; status: string; createdAt: string; reference: string }[]; withdrawals: { _id: string; kind: string; owner: string; amount: number; currency: string; method: string; status: string; createdAt: string; bank?: { bankName?: string; last4?: string }; paypal?: { hint?: string }; reference?: string }[]; mismatches: { kind: string; owner: string; currency: string; balance: number }[] };
function PaymentsTab() {
  const toast = useToast(); const [d, setD] = useState<Pay | null>(null); const [err, setErr] = useState(""); const [ref, setRef] = useState<Record<string, string>>({}); const [shown, setShown] = useState<Record<string, string>>({});
  const load = useCallback(() => { request<Pay>("/admin/payments").then(setD).catch((e) => setErr(msg(e))); }, []);
  useEffect(() => { load(); }, [load]);
  const reveal = async (id: string) => { try { const r = await post<{ method: string; paypalEmail?: string; accountNumber?: string; bankCode?: string; bankName?: string; accountName?: string }>(`/admin/withdrawals/${id}/reveal`); setShown({ ...shown, [id]: r.method === "paypal" ? `paypal: ${r.paypalEmail}` : `${r.accountName} · ${r.bankName ?? r.bankCode} · ${r.accountNumber}` }); } catch (e) { setErr(msg(e)); } };
  const decide = async (id: string, decision: "paid" | "rejected") => { try { await post(`/admin/withdrawals/${id}/decide`, { decision, reference: ref[id], note: decision === "rejected" ? "rejected by an admin" : undefined }); toast(`withdrawal ${decision}`); load(); } catch (e) { setErr(msg(e)); } };
  const viaPaypal = async (id: string) => { try { await post(`/admin/withdrawals/${id}/paypal-payout`); toast("paypal payout sent"); load(); } catch (e) { setErr(msg(e)); } };
  if (!d) return <><Err e={err} /><Load /></>;
  return (
    <div className="grid gap-6"><Err e={err} />
      <section><h2 className="text-xl">providers</h2><p className="mt-1 text-sm">{d.configured ? d.providers.join(", ") : "none configured, tipping is off"}{d.paypalPayouts ? " · paypal payouts api on" : ""}</p><p className="text-xs text-body">bank withdrawals are paid by hand from the provider dashboard, then marked paid here with the payout reference. paypal withdrawals can be paid by hand or through the paypal payouts api when it is enabled.</p></section>
      <section><h2 className="text-xl">tips by status</h2><dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{d.byStatus.map((s, i) => <Stat key={i} k={`${s.status} · ${s.provider ?? "?"}`} v={s.n} hint={money(s.minor, s.currency)} />)}{!d.byStatus.length && <p className="text-body">no tips yet.</p>}</dl></section>
      <section><h2 className="text-xl">withdrawal requests</h2>{!d.withdrawals.length && <p className="mt-2 text-body">none.</p>}
        <ul className="mt-2 grid gap-3">{d.withdrawals.map((w) => <li key={w._id} className="rounded-2xl border-2 border-hairline p-4"><p><b>{money(w.amount, w.currency)}</b> from {w.kind} {w.owner.slice(-6)} <Badge bad={w.status === "requested"}>{w.status}</Badge> <Badge>{w.method}</Badge></p><p className="text-xs text-body">{date(w.createdAt)} · {w.method === "paypal" ? w.paypal?.hint : `${w.bank?.bankName} ****${w.bank?.last4}`}{w.reference ? ` · ref ${w.reference}` : ""}</p>{shown[w._id] && <p className="mt-1 rounded-lg bg-hairline p-2 text-sm font-semibold">{shown[w._id]}</p>}
          {w.status === "requested" && <div className="mt-2 flex flex-wrap items-center gap-2"><Button variant="outline" className="py-1 text-sm" onClick={() => void reveal(w._id)}>show payout details</Button>{w.method === "paypal" && d.paypalPayouts && <Button className="py-1 text-sm" onClick={() => void viaPaypal(w._id)}>pay via paypal</Button>}<input aria-label="payout reference" value={ref[w._id] ?? ""} onChange={(e) => setRef({ ...ref, [w._id]: e.target.value })} placeholder="payout reference" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-3 py-1.5 text-sm" /><Button variant="outline" className="py-1 text-sm" disabled={!ref[w._id]} onClick={() => void decide(w._id, "paid")}>mark paid</Button><Button variant="outline" className="py-1 text-sm" onClick={() => void decide(w._id, "rejected")}>reject</Button></div>}</li>)}</ul></section>
      <section><h2 className="text-xl">reconciliation</h2>{d.mismatches.length ? <><p className="text-sm font-semibold text-pink">these wallets do not match their ledger. investigate before paying out.</p><ul className="mt-1 text-sm">{d.mismatches.map((m, i) => <li key={i}>{m.kind} {m.owner}: {money(m.balance, m.currency)}</li>)}</ul></> : <p className="mt-1 text-sm text-body">all wallet balances match the ledger.</p>}</section>
      <section><h2 className="text-xl">recent tips</h2><ul className="mt-2 divide-y-2 divide-hairline text-sm">{d.tips.map((t) => <li key={t._id} className="flex justify-between py-2"><span>{date(t.createdAt)} · {t.provider} · {t.reference}</span><span><b>{money(t.amount, t.currency)}</b> <Badge bad={t.status === "mismatch"}>{t.status}</Badge></span></li>)}</ul></section>
    </div>
  );
}

type Sys = { uptimeSeconds: number; runtime: string; db: string; mode: string; due: number; scheduledTotal: number; integrations: { ai: { provider: string; model: string | null; configured: boolean }; email: boolean; google: boolean; payments: { providers: string[]; configured: boolean; paypalPayouts: boolean }; withdrawalEncryption: boolean }; storage: { files: number; bytes: number; driver: string }; clientOrigin: string };
type AiD = { status: { provider: string; model: string | null; configured: boolean }; enabled: boolean; last30d: { total: number; failed: number; avgMs: number }; byKind: { kind: string; n: number; failed: number }[]; byDay: { day: string; n: number }[]; byProvider: { key: string; n: number }[]; note: string };
type Setx = { registrationOpen: boolean; aiEnabled: boolean; maintenance: boolean; announcement: string; tippingEnabled: boolean; platformFeeBps: number; minTipKobo: number; minWithdrawalKobo: number; minTipPaypalMinor: number; minWithdrawalPaypalMinor: number };
function SystemTab() {
  const toast = useToast(); const [sys, setSys] = useState<Sys | null>(null); const [ai, setAi] = useState<AiD | null>(null); const [s, setS] = useState<Setx | null>(null); const [err, setErr] = useState(""); const [ann, setAnn] = useState(""); const [confirm, setConfirm] = useState<string>("");
  const load = useCallback(() => { void request<Sys>("/admin/system").then(setSys).catch((e) => setErr(msg(e))); void request<AiD>("/admin/ai").then(setAi).catch(() => undefined); void request<{ settings: Setx }>("/admin/settings").then((r) => { setS(r.settings); setAnn(r.settings.announcement); }).catch(() => undefined); }, []);
  useEffect(() => { load(); }, [load]);
  const set = async (key: string, value: boolean | string | number) => { try { const r = await put<{ settings: Setx }>("/admin/settings", { key, value }); setS(r.settings); toast("saved"); } catch (e) { setErr(msg(e)); } };
  const sw = (key: keyof Setx, label: string, hint?: string, risky?: boolean) => s && <label className="flex min-h-11 items-center justify-between gap-3 border-b-2 border-hairline py-2 font-semibold"><span>{label}{hint && <span className="block text-xs font-normal text-body">{hint}</span>}</span><input type="checkbox" role="switch" checked={s[key] as boolean} onChange={(e) => (risky && e.target.checked ? setConfirm(key) : void set(key, e.target.checked))} className="size-5 accent-[#6903d3]" /></label>;
  return (
    <div className="grid gap-8"><Err e={err} />
      {s && <section><h2 className="text-xl">platform controls</h2>
        {sw("registrationOpen", "allow new sign ups")}{sw("aiEnabled", "ai features", "when off, everything uses rule based fallbacks")}{sw("tippingEnabled", "tipping")}{sw("maintenance", "maintenance mode", "pauses the app for everyone except admins", true)}
        <label className="mt-3 block text-sm font-semibold">announcement banner (shown to everyone, empty to hide)<input className={inputCls} value={ann} onChange={(e) => setAnn(e.target.value)} maxLength={300} /></label><Button className="mt-2 py-1.5 text-sm" onClick={() => void set("announcement", ann)}>save banner</Button>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-semibold">platform fee (basis points, 100 = 1%)<input type="number" min={0} max={5000} className={inputCls} defaultValue={s.platformFeeBps} onBlur={(e) => Number(e.target.value) !== s.platformFeeBps && void set("platformFeeBps", Number(e.target.value))} /></label><label className="text-sm font-semibold">minimum tip (naira)<input type="number" min={1} className={inputCls} defaultValue={s.minTipKobo / 100} onBlur={(e) => Number(e.target.value) * 100 !== s.minTipKobo && void set("minTipKobo", Math.round(Number(e.target.value) * 100))} /></label><label className="text-sm font-semibold">minimum tip, paypal (cents)<input type="number" min={1} className={inputCls} defaultValue={s.minTipPaypalMinor} onBlur={(e) => Number(e.target.value) !== s.minTipPaypalMinor && void set("minTipPaypalMinor", Math.round(Number(e.target.value)))} /></label><label className="text-sm font-semibold">minimum withdrawal, paypal (cents)<input type="number" min={1} className={inputCls} defaultValue={s.minWithdrawalPaypalMinor} onBlur={(e) => Number(e.target.value) !== s.minWithdrawalPaypalMinor && void set("minWithdrawalPaypalMinor", Math.round(Number(e.target.value)))} /></label><label className="text-sm font-semibold">minimum withdrawal (naira)<input type="number" min={1} className={inputCls} defaultValue={s.minWithdrawalKobo / 100} onBlur={(e) => Number(e.target.value) * 100 !== s.minWithdrawalKobo && void set("minWithdrawalKobo", Math.round(Number(e.target.value) * 100))} /></label></div><p className="mt-1 text-xs text-body">fee changes apply to new tips only. every change is written to the audit log.</p></section>}
      {ai && <section><h2 className="text-xl">ai</h2><p className="mt-1 text-sm">provider <b>{ai.status.provider}</b> · model <b>{ai.status.model ?? "none"}</b> · {ai.status.configured ? "key configured" : "no key, fallbacks in use"} · {ai.enabled ? "enabled" : "turned off"}</p><p className="text-xs text-body">{ai.note} to switch provider, change AI_PROVIDER and the key in your server environment and restart.</p>
        <dl className="mt-2 grid grid-cols-3 gap-3"><Stat k="calls (30d)" v={ai.last30d.total} /><Stat k="failed or invalid" v={ai.last30d.failed} hint={ai.last30d.total ? `${Math.round((ai.last30d.failed / ai.last30d.total) * 100)}%` : ""} /><Stat k="average time" v={`${ai.last30d.avgMs} ms`} /></dl>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><Bars title="ai calls per day" data={ai.byDay} /><Rank title="by feature" rows={ai.byKind.map((k) => ({ key: `${k.kind}${k.failed ? ` (${k.failed} failed)` : ""}`, n: k.n }))} /></div>
        <p className="mt-2 text-xs text-body">gemini's free tier may use your prompts to improve google products. do not rely on it for private content. switch to a paid provider for stricter privacy.</p></section>}
      {sys && <section><h2 className="text-xl">system</h2><dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat k="database" v={sys.db} /><Stat k="uptime" v={`${Math.round(sys.uptimeSeconds / 3600)} h`} /><Stat k="runtime" v={sys.runtime} /><Stat k="mode" v={sys.mode} /><Stat k="scheduled posts" v={sys.scheduledTotal} hint={sys.due ? `${sys.due} overdue` : "none overdue"} /><Stat k="files" v={sys.storage.files} hint={`${bytes(sys.storage.bytes)} on ${sys.storage.driver}`} /></dl>
        <ul className="mt-3 grid gap-1 text-sm"><li>email: {sys.integrations.email ? "configured" : "not configured (links print to the server log in development)"}</li><li>google sign in: {sys.integrations.google ? "configured" : "off"}</li><li>payments: {sys.integrations.payments.configured ? sys.integrations.payments.providers.join(", ") : "not configured"}</li><li>withdrawal encryption key: {sys.integrations.withdrawalEncryption ? "set" : "missing, withdrawals disabled"}</li><li>frontend origin: {sys.clientOrigin}</li></ul></section>}
      <ConfirmDialog open={!!confirm} title="turn on maintenance mode?" body="everyone except admins will be blocked until you turn it off." confirm="turn on" onClose={() => setConfirm("")} onConfirm={() => { void set(confirm, true); setConfirm(""); }} />
    </div>
  );
}

type Au = { _id: string; actorEmail?: string; action: string; target?: string; detail?: unknown; ip?: string; createdAt: string };
function AuditTab() {
  const [items, setItems] = useState<Au[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => { request<{ items: Au[] }>("/admin/audit").then((r) => setItems(r.items)).catch((e) => setErr(msg(e))); }, []);
  return <div><p className="text-sm text-body">every admin action is recorded here and cannot be edited from the app.</p><Err e={err} />{!items && !err && <Load />}<ul className="mt-3 divide-y-2 divide-hairline text-sm">{items?.map((a) => <li key={a._id} className="py-2"><b>{a.action}</b> <span className="text-body">{a.target}</span><span className="block text-xs text-body">{date(a.createdAt)} · {a.actorEmail} · {a.ip}{a.detail ? ` · ${JSON.stringify(a.detail)}` : ""}</span></li>)}</ul></div>;
}

export function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3"><h1 className="text-3xl">admin</h1><Link to="/app" className="ml-auto text-sm font-semibold text-primary">back to the app</Link></div>
      <p className="mt-1 text-xs text-body">only your verified admin email can see this area. messages are end to end encrypted, so only counts are shown, never content.</p>
      <div className="mt-5"><Tabs label="admin sections" tabs={[
        { id: "overview", label: "overview", content: <OverviewTab /> }, { id: "users", label: "users", content: <UsersTab /> }, { id: "orgs", label: "organizations", content: <OrgsTab /> },
        { id: "moderation", label: "moderation", content: <ModerationTab /> }, { id: "payments", label: "payments", content: <PaymentsTab /> }, { id: "system", label: "ai and system", content: <SystemTab /> }, { id: "audit", label: "audit log", content: <AuditTab /> },
      ]} /></div>
    </main>
  );
}
