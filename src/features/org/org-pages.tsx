import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Copy, ArrowCounterClockwise, Trash, FolderSimple, FileText, Plus, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Demo, Locked, NoOrg, chip, inputCls } from "@/components/common/states";
import { usePersisted, useApp } from "@/app/state";
import { useToast } from "@/components/common/toast";
import { avatar } from "@/lib/mock";
import { can, caps, channels, defaultRules, docs0, formatUpdate, invites0, members0, roles, useOrgCtx, type Channel, type Doc, type Draft, type Invite, type Role, type Rules, type Status } from "./model";

const statuses: Status[] = ["draft", "review", "approved", "scheduled", "published"];
const useDrafts = (id: string) => usePersisted<Draft[]>(`ub-drafts-${id}`, []);

export function Overview() {
  const { org, role, ctx } = useOrgCtx();
  const [drafts] = useDrafts(ctx);
  if (!org) return <NoOrg />;
  const need = drafts.filter((d) => d.status === "draft" || d.status === "review");
  const card = "rounded-2xl border-2 border-hairline p-4";
  return (
    <>
      <div className="flex items-center gap-3"><img src={avatar(org.id, "initials")} alt="" width={56} height={56} className="size-14 rounded-2xl" /><div><h1 className="text-3xl">{org.name}</h1><p className="text-sm text-body">@{org.id} · your role: {role}</p></div></div>
      <Demo />
      <div className="mt-5 flex flex-wrap gap-2">{can(role, "publish") && <Button to="/app/org/publish">post an update</Button>}{can(role, "documents") && <Button to="/app/org/documents" variant="outline">open documents</Button>}<Button to="/app" variant="outline">browse feed</Button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className={card}><h2 className="text-lg">drafts needing attention</h2>{need.length ? <ul className="mt-2 grid gap-1">{need.slice(0, 4).map((d) => <li key={d.id}><Link to={`/app/org/publish?draft=${d.id}`} className="font-semibold text-primary">{d.title || "untitled"}</Link> <span className="text-xs text-body">{d.status}</span></li>)}</ul> : <p className="mt-2 text-body">none right now. start one from the publish page.</p>}</section>
        <section className={card}><h2 className="text-lg">scheduled</h2><p className="mt-2 text-body">{drafts.filter((d) => d.status === "scheduled").length || "no"} scheduled posts. scheduled is not the same as published.</p></section>
        <section className={card}><h2 className="text-lg">pending invitations</h2><p className="mt-2 text-body">{invites0.filter((i) => i.status === "pending").length} waiting. <Link to="/app/org/members" className="font-semibold text-primary">manage</Link></p></section>
        <section className={card}><h2 className="text-lg">recent comments</h2><p className="mt-2 text-body">"is the deadline extended?" on chevening update (demo).</p></section>
      </div>
    </>
  );
}

const steps = [
  ["what does your organization do?", "a student tech community in akure"], ["who does it serve?", "undergraduates in computer science"],
  ["what do you publish?", "scholarships, hackathons and internships"], ["what tone should updates use?", "friendly, lowercase, short"],
  ["which channels do you publish on?", "whatsapp and updatebase"],
];
export function CreateOrg() {
  const { addOrg, setCtx } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", handle: "", cat: "community", desc: "", logo: "" });
  const [err, setErr] = useState("");
  const [qi, setQi] = useState(0);
  const [ans, setAns] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [bio, setBio] = useState("");
  const [inv, setInv] = useState("");
  const logo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2e6) return setErr("choose an image under 2 mb.");
    const r = new FileReader(); r.onload = () => setF({ ...f, logo: String(r.result) }); r.readAsDataURL(file); setErr("");
  };
  const next1 = () => {
    if (f.name.trim().length < 2) return setErr("enter the organization name.");
    if (!/^[a-z0-9_-]{3,24}$/.test(f.handle)) return setErr("handles use 3 to 24 lowercase letters, numbers, dashes or underscores.");
    setErr(""); setStep(1);
  };
  const answer = () => {
    if (!text.trim()) return;
    const a = [...ans, text.trim()]; setAns(a); setText("");
    if (qi + 1 < steps.length) setQi(qi + 1); else setBio(`${f.name} ${a[0]}. it serves ${a[1]}. it publishes ${a[2]}, in a ${a[3]} tone, on ${a[4]}.`);
  };
  const finish = () => { addOrg({ id: f.handle, name: f.name.toLowerCase(), role: "owner" }); setCtx(f.handle); nav("/app/org"); };
  return (
    <>
      <h1 className="text-3xl">create an organization</h1><p className="mt-1 text-sm font-semibold text-body">step {step + 1} of 3</p>
      <p role="alert" className="mt-2 text-sm font-semibold text-[#d02b2b]">{err}</p>
      {step === 0 && <section className="mt-3 grid gap-4">
        <div className="flex items-center gap-3"><img src={f.logo || avatar(f.handle || "org", "initials")} alt="logo preview" width={64} height={64} className="size-16 rounded-2xl bg-hairline object-cover" /><label className="cursor-pointer text-sm font-semibold text-primary">upload logo<input type="file" accept="image/*" className="sr-only" onChange={logo} /></label></div>
        <label className="text-sm font-semibold">name<input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="text-sm font-semibold">handle<input className={inputCls} value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase() })} /></label>
        <label className="text-sm font-semibold">category<select className={inputCls} value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{["community", "student association", "nonprofit", "company", "creator"].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm font-semibold">short description<textarea className={inputCls} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></label>
        <Button arrow onClick={next1}>continue</Button>
      </section>}
      {step === 1 && <section className="mt-3">
        <ul className="grid gap-2">{ans.map((a, k) => <li key={k} className="rounded-2xl bg-hairline p-3"><span className="block text-xs font-semibold text-body">{steps[k][0]}</span>{a}</li>)}</ul>
        {!bio ? <form onSubmit={(e) => { e.preventDefault(); answer(); }} className="mt-3"><label className="text-sm font-semibold">{steps[qi][0]}<input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder={`e.g. ${steps[qi][1]}`} /></label><Button type="submit" className="mt-3">send</Button></form>
          : <div className="mt-3"><label className="text-sm font-semibold">proposed biography (edit freely)<textarea className={`${inputCls} min-h-28`} value={bio} onChange={(e) => setBio(e.target.value)} /></label><p className="text-xs text-body">built only from your answers. no claims about size or reach are added.</p><div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => { setBio(""); setAns([]); setQi(0); }}>start over</Button><Button arrow onClick={() => setStep(2)}>continue</Button></div></div>}
      </section>}
      {step === 2 && <section className="mt-3"><h2 className="text-xl">invite your team</h2><p className="text-body">optional. you can do this later from members.</p>
        <label className="mt-3 block text-sm font-semibold">email or username<input className={inputCls} value={inv} onChange={(e) => setInv(e.target.value)} /></label>
        <p className="mt-1 text-xs text-body">invites are sent when the backend connects.</p>
        <div className="mt-4 flex gap-2"><Button arrow onClick={finish}>create organization</Button><Button variant="outline" onClick={finish}>skip</Button></div></section>}
    </>
  );
}

export function Publish() {
  const { ctx, role, org } = useOrgCtx();
  const [sp] = useSearchParams();
  const [rules] = usePersisted<Rules>(`ub-rules-${ctx}`, defaultRules);
  const [drafts, setDrafts] = useDrafts(ctx);
  const [id, setId] = useState<string>(() => crypto.randomUUID());
  const [src, setSrc] = useState("");
  const [body, setBody] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [saved, setSaved] = useState("");
  const [ch, setCh] = useState<Channel>("whatsapp");
  const [status, setStatus] = useState<Status>("draft");
  const [hint, setHint] = useState("");
  const [warn, setWarn] = useState<string[]>([]);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [note, setNote] = useState("");
  const [media, setMedia] = useState<{ name: string; size: number; url: string }[]>([]);
  const [mErr, setMErr] = useState("");
  useEffect(() => { const d = drafts.find((x) => x.id === sp.get("draft")); if (d) { setId(d.id); setSrc(d.source); setBody(d.body); setSaved(d.body); setCh(d.channel); setStatus(d.status); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!org) return <NoOrg />;
  if (!can(role, "publish") && !can(role, "review")) return <Locked what="the publishing workspace" />;
  const maxLen = channels.find((c) => c.id === ch)!.max;
  const run = (h = hint, c = ch) => { const r = formatUpdate(src, rules, c, h); setWarn(r.warnings); if (r.text) { setHist([...hist, body]); setBody(r.text); } };
  const save = () => { const t = body.split("\n").find((l) => l.length > 3 && !/update|opportunity/.test(l.slice(0, 12))) ?? "untitled"; const d: Draft = { id, title: t.slice(0, 60), source: src, body, status, channel: ch }; setDrafts([d, ...drafts.filter((x) => x.id !== id)]); setSaved(body); setNote("draft saved on this device."); };
  const copy = async () => { try { await navigator.clipboard.writeText(body); setNote("copied. paste it into " + ch + "."); } catch { setNote("could not copy. select the text and copy it manually."); } };
  const addMedia = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; setMErr("");
    const ok = f.type.startsWith("image/") || f.type === "application/pdf" || f.type.startsWith("video/");
    if (!ok) return setMErr("use an image, pdf or video file.");
    if (f.size > (f.type.startsWith("video/") ? 50e6 : 10e6)) return setMErr("that file is too large. images and pdfs: 10 mb, video: 50 mb.");
    setMedia([...media, { name: f.name, size: f.size, url: URL.createObjectURL(f) }]); e.target.value = "";
  };
  const rmMedia = (u: string) => { URL.revokeObjectURL(u); setMedia(media.filter((m) => m.url !== u)); };
  const hints = [["shorten it", "make it shorter"], ["stress the deadline", "deadline first"]];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl">publish</h1>{body !== saved && <span role="status" className="rounded-full bg-hairline px-3 py-1 text-xs font-bold text-primary">unsaved changes</span>}</div>
      <p className="mt-1 text-sm text-body">formatting uses {org.name}'s saved rules. nothing is published without you.</p>
      <div role="tablist" className="mt-3 flex lg:hidden">{(["edit", "preview"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 border-b-4 py-2 font-semibold ${tab === t ? "border-primary" : "border-transparent text-body"}`}>{t}</button>)}</div>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className={tab === "preview" ? "hidden lg:block" : ""}>
          <label className="text-sm font-semibold">raw announcement<textarea className={`${inputCls} min-h-40`} value={src} onChange={(e) => setSrc(e.target.value)} placeholder="paste the original announcement here" /></label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button onClick={() => run("")} disabled={!src.trim()}>format update</Button>
            <label className="text-sm font-semibold">channel <select value={ch} onChange={(e) => { const c = e.target.value as Channel; setCh(c); if (src.trim()) run(hint, c); }} className="rounded-xl border border-lilac bg-white px-2 py-2">{channels.map((c) => <option key={c.id}>{c.id}</option>)}</select></label>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">{hints.map(([l, h]) => <button key={l} className={chip(false)} onClick={() => { setHint(h); run(h); }}>{l}</button>)}</div>
          <p className="mt-1 text-xs text-body">quick changes apply to this draft only. org rules are edited in settings.</p>
          <label className="mt-4 block text-sm font-semibold">final text (edit freely)<textarea className={`${inputCls} min-h-64`} value={body} onChange={(e) => setBody(e.target.value)} /></label>
          <p className="text-xs text-body">{body.length} / {maxLen} characters{rules.numbering && " · numbering is a draft preview, the server assigns the final number"}</p>
          {warn.map((w) => <p key={w} role="alert" className="mt-1 flex gap-1 text-sm font-semibold text-[#d02b2b]"><Warning className="mt-0.5 shrink-0" />{w}</p>)}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={copy} disabled={!body}><Copy />copy</Button>
            <Button variant="outline" onClick={save} disabled={!body}>save draft</Button>
            <Button variant="outline" disabled={!hist.length} onClick={() => { setBody(hist[hist.length - 1]); setHist(hist.slice(0, -1)); }}><ArrowCounterClockwise />undo</Button>
            <Button variant="outline" disabled={!src} onClick={() => { setHist([...hist, body]); setBody(src); }}>revert to source</Button>
          </div>
          <p role="status" className="mt-1 text-sm font-semibold text-primary">{note}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled title="needs the backend and a connected channel">schedule</Button><Button variant="outline" disabled title="needs the backend and a connected channel">publish</Button></div>
          <p className="mt-1 text-xs text-body">{channels.find((c) => c.id === ch)!.integrated ? "publishing to updatebase connects with the backend." : "this channel has no integration. copy the text and post it manually."}</p>
          <label className="mt-4 block text-sm font-semibold">workflow status<select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={inputCls}>{statuses.map((s) => <option key={s} disabled={(s === "approved" && !can(role, "review")) || s === "published"}>{s}</option>)}</select></label>
          <section className="mt-4"><label className="cursor-pointer text-sm font-semibold text-primary">attach media<input type="file" className="sr-only" accept="image/*,application/pdf,video/*" onChange={addMedia} /></label>
            <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{mErr}</p>
            <ul className="mt-2 grid gap-2">{media.map((m) => <li key={m.url} className="flex items-center gap-3 rounded-xl border-2 border-hairline p-2">{/\.(png|jpe?g|webp|gif)$/i.test(m.name) && <img src={m.url} alt="" width={40} height={40} className="size-10 rounded object-cover" />}<span className="min-w-0 flex-1 truncate text-sm">{m.name}</span><a href={m.url} download={m.name} className="text-sm font-semibold text-primary">download</a><button aria-label={`remove ${m.name}`} onClick={() => rmMedia(m.url)}><Trash /></button></li>)}</ul>
            <p className="text-xs text-body">files stay in this browser tab. real uploads need the backend.</p></section>
        </div>
        <div className={tab === "edit" ? "hidden lg:block" : ""}>
          <h2 className="text-sm font-semibold">{ch} preview</h2>
          <div className="mt-2 rounded-3xl bg-cream p-4"><div className="rounded-2xl rounded-tl-sm bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,.05)]"><p className="whitespace-pre-wrap break-words text-sm">{body || "your formatted update shows here."}</p></div></div>
          <h2 className="mt-6 text-sm font-semibold">drafts</h2>
          {!drafts.length && <p className="text-sm text-body">no saved drafts yet.</p>}
          <ul className="mt-2 grid gap-2">{drafts.map((d) => <li key={d.id} className="flex items-center gap-2 rounded-xl border-2 border-hairline p-2 text-sm"><button className="min-w-0 flex-1 truncate text-left font-semibold" onClick={() => { setId(d.id); setSrc(d.source); setBody(d.body); setSaved(d.body); setCh(d.channel); setStatus(d.status); }}>{d.title}</button><span className="rounded-full bg-hairline px-2 py-0.5 text-xs">{d.status}</span><button className="text-primary" onClick={() => setDrafts([{ ...d, id: crypto.randomUUID(), title: `${d.title} (copy)` }, ...drafts])}>duplicate</button></li>)}</ul>
        </div>
      </div>
    </>
  );
}

const kb = (n: number) => (n ? `${Math.max(1, Math.round(n / 1e3))} kb` : "");
const visLabel: Record<Doc["vis"], string> = { public: "public", members: "members only", restricted: "restricted", private: "private draft" };
export function Documents() {
  const toast = useToast();
  const { ctx, role, org } = useOrgCtx();
  const [docs, setDocs] = usePersisted<Doc[]>(`ub-docs-${ctx}`, docs0); // metadata only, never file contents
  const [cwd, setCwd] = useState<string | null>(null);
  const [q, setQ] = useState(""); const [grid, setGrid] = useState(false); const [sel, setSel] = useState<Doc | null>(null);
  const [confirm, setConfirm] = useState(""); const [err, setErr] = useState(""); const [name, setName] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({}); // in-tab previews only, never persisted
  const crumbs = useMemo(() => { const out: Doc[] = []; let c = docs.find((d) => d.id === cwd); while (c) { out.unshift(c); c = docs.find((d) => d.id === c?.parent); } return out; }, [docs, cwd]);
  if (!org) return <NoOrg />;
  if (!can(role, "documents")) return <><Locked what="the document library" /><Button className="mt-3" onClick={() => toast("access request sent to the owners (demo)")}>request access</Button></>;
  const list = docs.filter((d) => d.parent === cwd && d.name.includes(q.toLowerCase())).sort((a, b) => Number(b.kind === "folder") - Number(a.kind === "folder") || a.name.localeCompare(b.name));
  const upload = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; setErr("");
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const kind = ({ pdf: "pdf", docx: "docx", xlsx: "xlsx", pptx: "pptx", csv: "csv", txt: "txt", png: "image", jpg: "image", jpeg: "image" } as const)[ext as "pdf"];
    if (!kind) return setErr("supported: pdf, docx, xlsx, pptx, csv, txt and images.");
    if (f.size > 25e6) return setErr("files can be up to 25 mb.");
    const nid = crypto.randomUUID(); setUrls({ ...urls, [nid]: URL.createObjectURL(f) }); setDocs([...docs, { id: nid, name: f.name.toLowerCase(), kind, parent: cwd, size: f.size, by: "you", modified: "today", vis: "private" }]); e.target.value = "";
  };
  const mkdir = () => { if (!name.trim()) return; setDocs([...docs, { id: crypto.randomUUID(), name: name.trim().toLowerCase(), kind: "folder", parent: cwd, size: 0, by: "you", modified: "today", vis: "members" }]); setName(""); };
  return (
    <>
      <h1 className="text-3xl">documents</h1><Demo>file contents are not stored in the browser. uploads here add demo entries only. real storage needs the backend.</Demo>
      <nav aria-label="breadcrumb" className="mt-3 flex flex-wrap gap-1 text-sm font-semibold"><button className="text-primary" onClick={() => setCwd(null)}>all files</button>{crumbs.map((c) => <span key={c.id}>/ <button className="text-primary" onClick={() => setCwd(c.id)}>{c.name}</button></span>)}</nav>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input aria-label="search in this folder" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search this folder" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-4 py-2" />
        <button className={chip(grid)} onClick={() => setGrid(!grid)} aria-pressed={grid}>grid</button>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary"><Plus weight="bold" />upload<input type="file" className="sr-only" onChange={upload} /></label>
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); mkdir(); }}><input aria-label="new folder name" value={name} onChange={(e) => setName(e.target.value)} placeholder="new folder" className="rounded-full border border-lilac bg-white px-4 py-2 text-sm" /><Button type="submit" variant="outline" className="py-1.5 text-sm">create folder</Button></form>
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
      {!list.length && <p className="mt-4 rounded-2xl bg-cream p-4 text-body">nothing here. upload a file or create a folder.</p>}
      <ul className={`mt-3 ${grid ? "grid grid-cols-2 gap-3" : "divide-y-2 divide-hairline"}`}>{list.map((d) => (
        <li key={d.id} className={grid ? "rounded-2xl border-2 border-hairline p-3" : "py-2"}>
          <div className="flex items-center gap-3">
            {d.kind === "folder" ? <FolderSimple size={28} weight="fill" className="shrink-0 text-primary" /> : <FileText size={28} className="shrink-0 text-body" />}
            <button className="min-w-0 flex-1 text-left" onClick={() => (d.kind === "folder" ? setCwd(d.id) : setSel(d))}><span className="block truncate font-semibold">{d.name}</span><span className="block truncate text-xs text-body">{d.kind} {kb(d.size)} · {d.by} · {d.modified} · {visLabel[d.vis]}</span></button>
            <button aria-label={`delete ${d.name}`} onClick={() => setConfirm(d.id)}><Trash /></button>
          </div>
          {confirm === d.id && <div role="alertdialog" aria-label="confirm delete" className="mt-2 flex items-center gap-2 text-sm"><span>delete {d.name}?</span><Button className="py-1 text-sm" onClick={() => { setDocs(docs.filter((x) => x.id !== d.id && x.parent !== d.id)); setConfirm(""); }}>delete</Button><Button variant="outline" className="py-1 text-sm" onClick={() => setConfirm("")}>cancel</Button></div>}
        </li>))}</ul>
      {sel && <aside aria-label="document details" className="mt-5 rounded-2xl border-2 border-pink bg-hairline p-4">
        <h2 className="text-xl break-words">{sel.name}</h2>
        <dl className="mt-2 grid grid-cols-2 gap-1 text-sm"><dt className="text-body">type</dt><dd>{sel.kind}</dd><dt className="text-body">size</dt><dd>{kb(sel.size)}</dd><dt className="text-body">uploaded by</dt><dd>{sel.by}</dd><dt className="text-body">modified</dt><dd>{sel.modified}</dd><dt className="text-body">visibility</dt><dd>{visLabel[sel.vis]}</dd><dt className="text-body">versions</dt><dd>1 (history needs the backend)</dd></dl>
        {urls[sel.id] && sel.kind === "image" && <img src={urls[sel.id]} alt={sel.name} width={320} height={256} className="mt-3 max-h-64 w-auto rounded-xl object-contain" />}
        {urls[sel.id] && sel.kind === "pdf" && <iframe src={urls[sel.id]} title={`preview of ${sel.name}`} className="mt-3 h-72 w-full rounded-xl bg-white" />}
        <p className="mt-2 text-sm text-body">{urls[sel.id] ? "this preview exists only in this tab." : sel.kind === "pdf" || sel.kind === "image" ? "preview loads from secure storage once the backend is connected." : "this format cannot be previewed here. use download once storage is connected."}</p>
        <p className="mt-2 text-sm"><span className="font-semibold">who has access:</span> {members0.filter((m) => can(m.role, "documents")).map((m) => m.name).join(", ")}</p>
        <Button variant="outline" className="mr-2 mt-3" onClick={() => void navigator.clipboard.writeText(`${location.origin}/app/org/documents`).catch(() => undefined)}>copy internal link</Button>
        <Button variant="outline" className="mt-3" onClick={() => setSel(null)}>close</Button>
      </aside>}
    </>
  );
}

export function CalendarPage() {
  const { ctx, role, org } = useOrgCtx();
  const [drafts] = useDrafts(ctx);
  if (!org) return <NoOrg />;
  if (!can(role, "publish")) return <Locked what="the content calendar" />;
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const items = [{ d: 20, t: "campus hack challenge", s: "scheduled", c: "whatsapp" }, { d: 5, t: "chevening update", s: "published", c: "updatebase" }, ...drafts.filter((x) => x.date).map((x) => ({ d: Number(x.date), t: x.title, s: x.status, c: x.channel }))];
  return (
    <>
      <h1 className="text-3xl">content calendar</h1><Demo>october 2026. demo items. scheduled posts run only when the backend connects.</Demo>
      <ul className="mt-4 grid gap-2 md:hidden">{items.sort((a, b) => a.d - b.d).map((i) => <li key={i.t} className="rounded-xl border-2 border-hairline p-3"><span className="font-semibold">oct {i.d}</span> · {i.t}<span className="block text-xs text-body">{i.s} on {i.c}</span></li>)}</ul>
      <div className="mt-4 hidden grid-cols-7 gap-1 md:grid" role="grid" aria-label="october 2026">{days.map((d) => (
        <div key={d} role="gridcell" className="min-h-20 rounded-xl border-2 border-hairline p-1.5 text-xs"><Link to={`/app/org/publish?date=${d}`} className="font-bold text-primary" aria-label={`create content for october ${d}`}>{d}</Link>
          {items.filter((i) => i.d === d).map((i) => <p key={i.t} className={`mt-1 truncate rounded px-1 py-0.5 font-semibold ${i.s === "published" ? "bg-[#e3f6df] text-[#1f6b2c]" : "bg-hairline text-primary"}`}>{i.s === "published" ? "published: " : "planned: "}{i.t}</p>)}</div>))}</div>
    </>
  );
}

export function Members() {
  const { ctx, role, org } = useOrgCtx();
  const [list, setList] = usePersisted(`ub-members-${ctx}`, members0);
  const [inv, setInv] = usePersisted<Invite[]>(`ub-invites-${ctx}`, invites0);
  const [to, setTo] = useState(""); const [r, setR] = useState("");
  const [rm, setRm] = useState(""); const [roleF, setRoleF] = useState("all"); const [q, setQ] = useState("");
  if (!org) return <NoOrg />;
  if (!can(role, "members")) return <Locked what="member management" />;
  const shown = list.filter((m) => (roleF === "all" || m.role === roleF) && `${m.name} ${m.handle}`.includes(q.toLowerCase()));
  const send = () => { if (!to.trim()) return setR("enter an email or username."); const via = to.includes("@") ? "email" : "username"; setInv([{ id: crypto.randomUUID(), to: to.trim(), via, role: "member", status: "pending" }, ...inv]); setTo(""); setR("invitation added. it sends when the backend connects."); };
  return (
    <>
      <h1 className="text-3xl">members</h1><Demo />
      <div className="mt-3 flex flex-wrap gap-2"><input aria-label="search members" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search members" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-4 py-2" /><select aria-label="filter by role" value={roleF} onChange={(e) => setRoleF(e.target.value)} className="rounded-full border border-lilac bg-white px-3 py-2"><option>all</option>{roles.map((x) => <option key={x}>{x}</option>)}</select></div>
      <ul className="mt-3 divide-y-2 divide-hairline">{shown.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center gap-3 py-3"><img src={avatar(m.handle)} alt="" width={40} height={40} className="size-10 rounded-full bg-hairline" /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{m.name}</p><p className="text-xs text-body">@{m.handle} · joined {m.joined}</p></div>
          {m.role === "owner" ? <span className="rounded-full bg-hairline px-3 py-1 text-sm font-semibold">owner</span> : <select aria-label={`role for ${m.name}`} value={m.role} onChange={(e) => setList(list.map((x) => (x.id === m.id ? { ...x, role: e.target.value as Role } : x)))} className="rounded-xl border border-lilac bg-white px-2 py-1">{roles.filter((x) => x !== "owner").map((x) => <option key={x}>{x}</option>)}</select>}
          {m.role !== "owner" && (rm === m.id ? <span className="flex items-center gap-1 text-sm">remove? <button className="font-semibold text-[#d02b2b]" onClick={() => { setList(list.filter((x) => x.id !== m.id)); setRm(""); }}>yes</button><button onClick={() => setRm("")}>no</button></span> : <button className="text-sm font-semibold text-primary" onClick={() => setRm(m.id)}>remove</button>)}
          <p className="w-full text-xs text-body">can: {caps[m.role].join(", ") || "view member resources"}</p></li>))}</ul>
      <h2 className="mt-8 text-xl">invitations</h2>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}><input aria-label="email or username" value={to} onChange={(e) => setTo(e.target.value)} placeholder="email or username" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-4 py-2" /><Button type="submit">invite</Button></form>
      <p role="status" className="mt-1 text-sm font-semibold text-primary">{r}</p>
      <p className="mt-1 text-xs text-body">invite links and phone invites need server side token and verification checks. visiting a link never grants membership by itself.</p>
      <ul className="mt-3 grid gap-2">{inv.map((i) => <li key={i.id} className="flex items-center gap-2 rounded-xl border-2 border-hairline p-2 text-sm"><span className="min-w-0 flex-1 truncate">{i.to} <span className="text-body">({i.via}, {i.role})</span></span><span className="rounded-full bg-hairline px-2 py-0.5 text-xs font-bold">{i.status}</span>{i.status === "pending" && <button className="font-semibold text-primary" onClick={() => setInv(inv.map((x) => (x.id === i.id ? { ...x, status: "revoked" } : x)))}>revoke</button>}</li>)}</ul>
    </>
  );
}
