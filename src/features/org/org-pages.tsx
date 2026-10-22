import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Copy, ArrowCounterClockwise, Trash, FolderSimple, FileText, Plus, Warning, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Locked, NoOrg, chip, inputCls } from "@/components/common/states";
import { ConfirmDialog, useToast } from "@/components/common/toast";
import { useApp } from "@/app/state";
import { aiService } from "@/features/ai/ai-service";
import { ImagePicker } from "@/components/common/image-picker";
import { ApiError } from "@/lib/http";
import { avatar } from "@/lib/types";
import { can, caps, channels, roles, useOrgCtx, type Channel, type Doc, type DocKind, type Draft, type Invite, type Member, type Role, type Status, type Vis } from "./model";
import { orgService, type CalItem, type Overview as Ov } from "./org-service";

const msg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);
const Loading = () => <div className="h-28 animate-pulse rounded-2xl bg-hairline" aria-hidden />;
const statuses: Status[] = ["draft", "review", "approved", "scheduled", "published"];

export function Overview() {
  const { org, role, ctx, grants } = useOrgCtx();
  const [o, setO] = useState<Ov | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (org) { setO(null); orgService.overview(ctx).then(setO).catch((e) => setErr(msg(e, "could not load the overview."))); } }, [ctx, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!org) return <NoOrg />;
  const card = "rounded-2xl border-2 border-hairline p-4";
  return (
    <>
      <div className="flex items-center gap-3"><img src={avatar(org.handle ?? org.id, "initials")} alt="" width={56} height={56} className="size-14 rounded-2xl" /><div><h1 className="text-3xl">{org.name}</h1><p className="text-sm text-body">@{org.handle} · your role: {role}</p></div></div>
      <div className="mt-5 flex flex-wrap gap-2">{can(role, "publish", grants) && <Button to="/app/org/publish">post an update</Button>}{can(role, "documents", grants) && <Button to="/app/org/documents" variant="outline">open documents</Button>}<Button to={`/app/o/${org.handle}`} variant="outline">public page</Button></div>
      <p role="alert" className="mt-3 text-sm font-semibold text-[#d02b2b]">{err}</p>
      {!o && !err && <div className="mt-6"><Loading /></div>}
      {o && <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className={card}><h2 className="text-lg">audience</h2><p className="mt-2 text-body"><b className="text-ink">{o.followers}</b> followers · <b className="text-ink">{o.published30}</b> updates in the last 30 days</p></section>
        {(can(role, "publish", grants) || can(role, "review", grants)) && <section className={card}><h2 className="text-lg">drafts needing attention</h2>{o.drafts.length ? <ul className="mt-2 grid gap-1">{o.drafts.map((d) => <li key={d._id}><Link to={`/app/org/publish?draft=${d._id}`} className="font-semibold text-primary">{d.title || "untitled"}</Link> <span className="text-xs text-body">{d.status}</span></li>)}</ul> : <p className="mt-2 text-body">none right now.</p>}<p className="mt-2 text-sm text-body">{o.scheduled} scheduled (scheduled is not published yet)</p></section>}
        {can(role, "members", grants) && <section className={card}><h2 className="text-lg">pending invitations</h2><p className="mt-2 text-body">{o.pendingInvites} waiting. <Link to="/app/org/members" className="font-semibold text-primary">manage</Link></p></section>}
        <section className={card}><h2 className="text-lg">recent comments</h2>{o.comments.length ? <ul className="mt-2 grid gap-1">{o.comments.map((c) => <li key={c._id} className="truncate"><Link to={`/app/update/${c.update}`} className="text-primary">{c.body}</Link></li>)}</ul> : <p className="mt-2 text-body">no comments yet.</p>}</section>
        {can(role, "documents", grants) && <section className={card}><h2 className="text-lg">recent documents</h2>{o.docs.length ? <ul className="mt-2">{o.docs.map((d) => <li key={d._id} className="truncate">{d.name}</li>)}</ul> : <p className="mt-2 text-body">no documents yet.</p>}</section>}
      </div>}
    </>
  );
}

const qs = ["what does your organization do?", "who does it serve?", "what do you publish?", "what tone should updates use?", "which channels do you publish on?"];
const ex = ["a student tech community in akure", "undergraduates in computer science", "scholarships, hackathons and internships", "friendly, lowercase, short", "whatsapp and updatebase"];
export function CreateOrg() {
  const { addOrg, setCtx } = useApp(); const nav = useNavigate();
  const [step, setStep] = useState(0); const [f, setF] = useState({ name: "", handle: "", cat: "community", desc: "", logo: "" }); const [err, setErr] = useState("");
  const [qi, setQi] = useState(0); const [ans, setAns] = useState<string[]>([]); const [text, setText] = useState(""); const [bio, setBio] = useState(""); const [busy, setBusy] = useState(false); const [ai, setAi] = useState(false);
  const next1 = () => {
    if (f.name.trim().length < 2) return setErr("enter the organization name.");
    if (!/^[a-z0-9_-]{3,24}$/.test(f.handle)) return setErr("handles use 3 to 24 lowercase letters, numbers, dashes or underscores.");
    setErr(""); setStep(1);
  };
  const answer = async () => {
    if (!text.trim()) return;
    const a = [...ans, text.trim()]; setAns(a); setText("");
    if (qi + 1 < qs.length) return setQi(qi + 1);
    setBusy(true);
    try { const r = await aiService.orgBio(f.name, a.map((x, i) => ({ q: qs[i], a: x }))); setBio(r.bio); setAi(r.aiUsed); } catch (e) { setErr(msg(e, "could not write the biography. you can write it yourself.")); setBio(""); setQi(qs.length); } finally { setBusy(false); }
  };
  const finish = async () => {
    setBusy(true);
    try { const o = await orgService.create({ name: f.name, handle: f.handle, category: f.cat, description: f.desc, bio, logo: f.logo || undefined }); addOrg(o); setCtx(o.id); nav("/app/org"); }
    catch (e) { setErr(msg(e, "could not create the organization. try again.")); setStep(0); } finally { setBusy(false); }
  };
  return (
    <>
      <h1 className="text-3xl">create an organization</h1><p className="mt-1 text-sm font-semibold text-body">step {step + 1} of 3</p>
      <p role="alert" className="mt-2 text-sm font-semibold text-[#d02b2b]">{err}</p>
      {step === 0 && <section className="mt-3 grid gap-4">
        <label className="text-sm font-semibold">name<input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="text-sm font-semibold">handle<input className={inputCls} value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase() })} /></label>
        <label className="text-sm font-semibold">category<select className={inputCls} value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{["community", "student association", "nonprofit", "company", "creator"].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm font-semibold">short description<textarea className={inputCls} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></label>
        <div className="flex items-center gap-3">{f.logo && <img src={f.logo} alt="logo preview" width={56} height={56} className="size-14 rounded-2xl object-cover" />}<ImagePicker kind="logo" label={f.logo ? "change logo" : "upload a logo (optional)"} onUploaded={(url) => setF({ ...f, logo: url })} /></div><Button arrow onClick={next1}>continue</Button>
      </section>}
      {step === 1 && <section className="mt-3">
        <ul className="grid gap-2">{ans.map((a, k) => <li key={k} className="rounded-2xl bg-hairline p-3"><span className="block text-xs font-semibold text-body">{qs[k]}</span>{a}</li>)}</ul>
        {busy && <p role="status" className="mt-3 text-sm font-semibold text-primary">writing your biography...</p>}
        {!bio && !busy && qi < qs.length && <form onSubmit={(e) => { e.preventDefault(); void answer(); }} className="mt-3"><label className="text-sm font-semibold">{qs[qi]}<input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder={`e.g. ${ex[qi]}`} /></label><Button type="submit" className="mt-3">send</Button></form>}
        {(bio || (qi >= qs.length && !busy)) && <div className="mt-3"><label className="text-sm font-semibold">biography (edit freely)<textarea className={`${inputCls} min-h-28`} value={bio} onChange={(e) => setBio(e.target.value)} /></label><p className="text-xs text-body">{ai ? "written by ai from your answers only." : "built from your answers."} no claims about size or reach are added.</p><div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => { setBio(""); setAns([]); setQi(0); setErr(""); }}>start over</Button><Button arrow onClick={() => setStep(2)}>continue</Button></div></div>}
      </section>}
      {step === 2 && <section className="mt-3"><h2 className="text-xl">invite your team</h2><p className="text-body">you can invite people by email, username or link from the members page right after you create the organization.</p><div className="mt-4"><Button arrow disabled={busy} onClick={() => void finish()}>{busy ? "creating..." : "create organization"}</Button></div></section>}
    </>
  );
}

export function Publish() {
  const { ctx, role, org, grants } = useOrgCtx(); const [sp] = useSearchParams(); const toast = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]); const [id, setId] = useState<string>(() => crypto.randomUUID());
  const [src, setSrc] = useState(""); const [body, setBody] = useState(""); const [hist, setHist] = useState<string[]>([]); const [saved, setSaved] = useState("");
  const [ch, setCh] = useState<Channel>("whatsapp"); const [status, setStatus] = useState<Status>("draft"); const [hint, setHint] = useState("");
  const [warn, setWarn] = useState<string[]>([]); const [info, setInfo] = useState(""); const [cat, setCat] = useState("community update"); const [title, setTitle] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit"); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [when, setWhen] = useState(""); const [confirm, setConfirm] = useState(false);
  const [media, setMedia] = useState<{ name: string; size: number; url: string }[]>([]); const [mErr, setMErr] = useState(""); const [imgs, setImgs] = useState<string[]>([]);
  const load = useCallback((d: Draft) => { setId(d.id); setSrc(d.source); setBody(d.body); setSaved(d.body); setCh(d.channel); setStatus(d.status); setTitle(d.title); }, []);
  useEffect(() => {
    if (!org) return;
    void orgService.drafts(ctx).then((l) => { setDrafts(l); const d = l.find((x) => x.id === sp.get("draft")); if (d) load(d); }).catch((e) => setNote(msg(e, "could not load drafts.")));
    const date = sp.get("date"); if (date) setWhen(`${date}T09:00`);
  }, [ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!org) return <NoOrg />;
  if (!can(role, "publish", grants) && !can(role, "review", grants)) return <Locked what="the publishing workspace" />;
  const max = channels.find((c) => c.id === ch)!.max;
  const titleOf = () => (title || body.split("\n").find((l) => l.trim().length > 3 && l.trim() !== cat) || "untitled").replace(/\*/g, "").slice(0, 120);
  const run = async (h = hint, c = ch) => {
    setBusy(true); setInfo("");
    try { const r = await orgService.format(ctx, src, c, h); setWarn(r.warnings); setCat(r.category); setInfo(r.aiUsed ? `formatted by ai with your rules${r.usedExamples ? ` and ${r.usedExamples} of your recent updates as style examples` : ""}.` : "formatted with your rules. ai is not available right now."); if (r.text) { setHist([...hist, body]); setBody(r.text); } }
    catch (e) { setWarn([msg(e, "formatting failed. you can still write and publish by hand.")]); } finally { setBusy(false); }
  };
  const persist = async (d: Draft) => { const s = await orgService.saveDraft(ctx, d); setId(s.id); setDrafts((l) => [s, ...l.filter((x) => x.id !== id && x.id !== s.id)]); setSaved(body); return s; };
  const save = async () => { try { await persist({ id, title: titleOf(), source: src, body, status, channel: ch }); setNote("draft saved."); } catch (e) { setNote(msg(e, "could not save the draft.")); } };
  const meta = () => ({ title: titleOf(), cat, tags: [cat.split(" ")[0].toLowerCase()], images: imgs });
  const publish = async () => {
    setConfirm(false); setBusy(true);
    try { const s = await persist({ id, title: titleOf(), source: src, body, status: status === "published" ? "draft" : status, channel: ch }); const u = await orgService.publish(ctx, s.id, meta()); setStatus("published"); setDrafts((l) => l.map((x) => (x.id === s.id ? { ...x, status: "published" } : x))); setNote(`published${u.number ? ` as update ${u.number}` : ""}. it is now in the feed.`); toast("published"); }
    catch (e) { setNote(msg(e, "could not publish. try again.")); } finally { setBusy(false); }
  };
  const schedule = async () => {
    const d = new Date(when); if (!when || isNaN(+d)) return setNote("pick a date and time first.");
    setBusy(true);
    try { const s = await persist({ id, title: titleOf(), source: src, body, status: "draft", channel: ch }); const r = await orgService.schedule(ctx, s.id, d, meta()); setStatus("scheduled"); setDrafts((l) => l.map((x) => (x.id === r.id ? r : x))); setNote(`scheduled for ${d.toLocaleString()}. it publishes automatically while the server is running.`); }
    catch (e) { setNote(msg(e, "could not schedule.")); } finally { setBusy(false); }
  };
  const changeStatus = async (s: Status) => { setStatus(s); if (/^[a-f0-9]{24}$/.test(id) && s !== "scheduled" && s !== "published") { try { await orgService.setStatus(ctx, id, s); setNote(`marked as ${s}.`); } catch (e) { setNote(msg(e, "could not change the status.")); } } };
  const copy = async () => { try { await navigator.clipboard.writeText(body); setNote(`copied. paste it into ${ch}.`); } catch { setNote("could not copy. select the text and copy it manually."); } };
  const addMedia = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; setMErr("");
    if (!(f.type.startsWith("image/") || f.type === "application/pdf" || f.type.startsWith("video/"))) return setMErr("use an image, pdf or video file.");
    if (f.size > (f.type.startsWith("video/") ? 50e6 : 10e6)) return setMErr("that file is too large. images and pdfs: 10 mb, video: 50 mb.");
    setMedia([...media, { name: f.name, size: f.size, url: URL.createObjectURL(f) }]); e.target.value = "";
  };
  const hints = [["shorten it", "make it shorter"], ["stress the deadline", "deadline first"], ["more engaging", "make it more engaging"]];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl">publish</h1>{body !== saved && <span role="status" className="rounded-full bg-hairline px-3 py-1 text-xs font-bold text-primary">unsaved changes</span>}</div>
      <p className="mt-1 text-sm text-body">formatting uses {org.name}'s saved rules. nothing is published without you pressing publish.</p>
      <div role="tablist" className="mt-3 flex lg:hidden">{(["edit", "preview"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 border-b-4 py-2 font-semibold ${tab === t ? "border-primary" : "border-transparent text-body"}`}>{t}</button>)}</div>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className={tab === "preview" ? "hidden lg:block" : ""}>
          <label className="text-sm font-semibold">raw announcement<textarea className={`${inputCls} min-h-40`} value={src} onChange={(e) => setSrc(e.target.value)} placeholder="paste the original announcement here" /></label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button onClick={() => void run("")} disabled={!src.trim() || busy}><Sparkle weight="fill" />{busy ? "formatting..." : "format update"}</Button>
            <label className="text-sm font-semibold">channel <select value={ch} onChange={(e) => { const c = e.target.value as Channel; setCh(c); if (src.trim()) void run(hint, c); }} className="rounded-xl border border-lilac bg-white px-2 py-2">{channels.map((c) => <option key={c.id}>{c.id}</option>)}</select></label>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">{hints.map(([l, h]) => <button key={l} className={chip(false)} disabled={!src.trim() || busy} onClick={() => { setHint(h); void run(h); }}>{l}</button>)}</div>
          <p className="mt-1 text-xs text-body">quick changes apply to this draft only. organization rules are edited in settings.</p>
          {info && <p role="status" className="mt-1 text-xs font-semibold text-primary">{info}</p>}
          <label className="mt-4 block text-sm font-semibold">final text (edit freely)<textarea className={`${inputCls} min-h-64`} value={body} onChange={(e) => setBody(e.target.value)} /></label>
          <p className="text-xs text-body">{body.length} / {max} characters · the update number is assigned by the server when you publish</p>
          {warn.map((w) => <p key={w} role="alert" className="mt-1 flex gap-1 text-sm font-semibold text-[#d02b2b]"><Warning className="mt-0.5 shrink-0" />{w}</p>)}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void copy()} disabled={!body}><Copy />copy</Button>
            <Button variant="outline" onClick={() => void save()} disabled={!body || busy}>save draft</Button>
            <Button variant="outline" disabled={!hist.length} onClick={() => { setBody(hist[hist.length - 1]); setHist(hist.slice(0, -1)); }}><ArrowCounterClockwise />undo</Button>
            <Button variant="outline" disabled={!src} onClick={() => { setHist([...hist, body]); setBody(src); }}>revert to source</Button>
          </div>
          <p role="status" className="mt-1 text-sm font-semibold text-primary">{note}</p>
          <label className="mt-4 block text-sm font-semibold">update title<input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titleOf()} /></label>
          <label className="mt-3 block text-sm font-semibold">workflow status<select value={status} onChange={(e) => void changeStatus(e.target.value as Status)} className={inputCls}>{statuses.map((s) => <option key={s} disabled={(s === "approved" && !can(role, "review", grants)) || s === "published" || s === "scheduled"}>{s}</option>)}</select></label>
          {channels.find((c) => c.id === ch)!.integrated
            ? <div className="mt-3 flex flex-wrap items-end gap-2"><Button disabled={!body || busy || !can(role, "publish", grants)} onClick={() => setConfirm(true)}>publish now</Button>
                <label className="text-sm font-semibold">or schedule<input type="datetime-local" className={`${inputCls} mt-1`} value={when} onChange={(e) => setWhen(e.target.value)} /></label><Button variant="outline" disabled={!body || busy || !can(role, "publish", grants)} onClick={() => void schedule()}>schedule</Button></div>
            : <p className="mt-3 text-sm text-body">{ch} has no direct integration. copy the text above and post it there yourself. to also share it on updatebase, switch the channel to updatebase.</p>}
          <section className="mt-4"><p className="text-sm font-semibold">images for the updatebase post (up to 4)</p><ImagePicker kind="update" label="add an image" onUploaded={(url) => imgs.length < 4 && setImgs([...imgs, url])} />
            <ul className="mt-2 flex flex-wrap gap-2">{imgs.map((src, k) => <li key={src} className="relative"><img src={src} alt={`image ${k + 1}`} width={80} height={80} className="size-20 rounded-xl object-cover" /><button aria-label={`remove image ${k + 1}`} onClick={() => setImgs(imgs.filter((x) => x !== src))} className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-night text-xs text-on-primary">x</button></li>)}</ul></section>
          <section className="mt-4"><label className="cursor-pointer text-sm font-semibold text-primary">attach media for download or manual posting<input type="file" className="sr-only" accept="image/*,application/pdf,video/*" onChange={addMedia} /></label><p role="alert" className="text-sm font-semibold text-[#d02b2b]">{mErr}</p>
            <ul className="mt-2 grid gap-2">{media.map((m) => <li key={m.url} className="flex items-center gap-3 rounded-xl border-2 border-hairline p-2">{/\.(png|jpe?g|webp|gif)$/i.test(m.name) && <img src={m.url} alt="" width={40} height={40} className="size-10 rounded object-cover" />}<span className="min-w-0 flex-1 truncate text-sm">{m.name}</span><a href={m.url} download={m.name} className="text-sm font-semibold text-primary">download</a><button aria-label={`remove ${m.name}`} onClick={() => { URL.revokeObjectURL(m.url); setMedia(media.filter((x) => x.url !== m.url)); }}><Trash /></button></li>)}</ul>
            <p className="text-xs text-body">media stays in this tab. it is not uploaded.</p></section>
        </div>
        <div className={tab === "edit" ? "hidden lg:block" : ""}>
          <h2 className="text-sm font-semibold">{ch} preview</h2>
          <div className="mt-2 rounded-3xl bg-cream p-4"><div className="rounded-2xl rounded-tl-sm bg-white p-4"><p className="whitespace-pre-wrap break-words text-sm">{body || "your formatted update shows here."}</p></div></div>
          <h2 className="mt-6 text-sm font-semibold">drafts</h2>{!drafts.length && <p className="text-sm text-body">no saved drafts yet.</p>}
          <ul className="mt-2 grid gap-2">{drafts.map((d) => <li key={d.id} className="flex items-center gap-2 rounded-xl border-2 border-hairline p-2 text-sm"><button className="min-w-0 flex-1 truncate text-left font-semibold" onClick={() => load(d)}>{d.title || "untitled"}</button><span className="rounded-full bg-hairline px-2 py-0.5 text-xs">{d.status}</span>{d.status !== "published" && <button aria-label={`delete draft ${d.title}`} onClick={() => void orgService.deleteDraft(ctx, d.id).then(() => setDrafts((l) => l.filter((x) => x.id !== d.id))).catch((e) => setNote(msg(e, "could not delete.")))}><Trash /></button>}</li>)}</ul>
        </div>
      </div>
      <ConfirmDialog open={confirm} title="publish this update?" body="it goes to the updatebase feed and your followers are notified. this cannot be undone." confirm="publish" onClose={() => setConfirm(false)} onConfirm={() => void publish()} />
    </>
  );
}

const kb = (n: number) => (n ? `${Math.max(1, Math.round(n / 1e3))} kb` : "");
const visLabel: Record<Vis, string> = { public: "public", members: "members only", restricted: "restricted", private: "private draft" };
const kindOf = (name: string): DocKind | null => ({ pdf: "pdf", docx: "docx", xlsx: "xlsx", pptx: "pptx", csv: "csv", txt: "txt", png: "image", jpg: "image", jpeg: "image", webp: "image" } as Record<string, DocKind>)[name.split(".").pop()?.toLowerCase() ?? ""] ?? null;
export function Documents() {
  const { ctx, role, org, grants } = useOrgCtx(); const toast = useToast();
  const [path, setPath] = useState<{ id: string; name: string }[]>([]); const [docs, setDocs] = useState<Doc[] | null>(null); const [q, setQ] = useState(""); const [grid, setGrid] = useState(false);
  const [sel, setSel] = useState<Doc | null>(null); const [url, setUrl] = useState(""); const [del, setDel] = useState<Doc | null>(null); const [err, setErr] = useState(""); const [name, setName] = useState(""); const [vis, setVis] = useState<Vis>("members"); const [busy, setBusy] = useState(false);
  const cwd = path.length ? path[path.length - 1].id : null;
  const reload = useCallback(() => { if (org) orgService.docs(ctx, cwd).then(setDocs).catch((e) => setErr(msg(e, "could not load documents."))); }, [ctx, cwd, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDocs(null); reload(); }, [reload]);
  const list = useMemo(() => (docs ?? []).filter((d) => d.name.toLowerCase().includes(q.toLowerCase())), [docs, q]);
  if (!org) return <NoOrg />;
  if (!can(role, "documents", grants)) return <Locked what="the document library" />;
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setErr("");
    const kind = kindOf(f.name); if (!kind) return setErr("supported: pdf, docx, xlsx, pptx, csv, txt and images.");
    if (f.size > 25e6) return setErr("files can be up to 25 mb.");
    setBusy(true);
    try { const r = await orgService.createDoc(ctx, { name: f.name, kind, parent: cwd, vis }); await orgService.uploadDoc(ctx, r.document._id, f); toast("uploaded"); reload(); } catch (x) { setErr(msg(x, "upload failed. try again.")); } finally { setBusy(false); }
  };
  const mkdir = async () => { if (!name.trim()) return; try { await orgService.createDoc(ctx, { name, kind: "folder", parent: cwd, vis: "members" }); setName(""); reload(); } catch (x) { setErr(msg(x, "could not create the folder.")); } };
  const open = async (d: Doc) => {
    if (d.kind === "folder") return setPath([...path, { id: d._id, name: d.name }]);
    setSel(d); setUrl("");
    if (d.kind === "image" || d.kind === "pdf") { try { const b = await orgService.downloadDoc(ctx, d._id); setUrl(URL.createObjectURL(new Blob([b], { type: d.kind === "pdf" ? "application/pdf" : "image/*" }))); } catch { /* no preview */ } }
  };
  const dl = async (d: Doc) => { try { const b = await orgService.downloadDoc(ctx, d._id); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = d.name; a.click(); } catch (x) { setErr(msg(x, "could not download. the file may not have uploaded.")); } };
  return (
    <>
      <h1 className="text-3xl">documents</h1><p className="mt-1 text-xs text-body">files are stored privately on the server and only served to people with access.</p>
      <nav aria-label="breadcrumb" className="mt-3 flex flex-wrap gap-1 text-sm font-semibold"><button className="text-primary" onClick={() => setPath([])}>all files</button>{path.map((c, i) => <span key={c.id}>/ <button className="text-primary" onClick={() => setPath(path.slice(0, i + 1))}>{c.name}</button></span>)}</nav>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input aria-label="search in this folder" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search this folder" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-4 py-2" />
        <button className={chip(grid)} onClick={() => setGrid(!grid)} aria-pressed={grid}>grid</button>
        <select aria-label="visibility for new uploads" value={vis} onChange={(e) => setVis(e.target.value as Vis)} className="rounded-full border border-lilac bg-white px-3 py-2 text-sm">{(Object.keys(visLabel) as Vis[]).map((v) => <option key={v} value={v}>{visLabel[v]}</option>)}</select>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary"><Plus weight="bold" />{busy ? "uploading..." : "upload"}<input type="file" className="sr-only" onChange={(e) => void upload(e)} disabled={busy} /></label>
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void mkdir(); }}><input aria-label="new folder name" value={name} onChange={(e) => setName(e.target.value)} placeholder="new folder" className="rounded-full border border-lilac bg-white px-4 py-2 text-sm" /><Button type="submit" variant="outline" className="py-1.5 text-sm">create folder</Button></form>
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
      {!docs && <div className="mt-4"><Loading /></div>}{docs && !list.length && <p className="mt-4 rounded-2xl bg-cream p-4 text-body">nothing here. upload a file or create a folder.</p>}
      <ul className={`mt-3 ${grid ? "grid grid-cols-2 gap-3" : "divide-y-2 divide-hairline"}`}>{list.map((d) => (
        <li key={d._id} className={grid ? "rounded-2xl border-2 border-hairline p-3" : "py-2"}><div className="flex items-center gap-3">
          {d.kind === "folder" ? <FolderSimple size={28} weight="fill" className="shrink-0 text-primary" /> : <FileText size={28} className="shrink-0 text-body" />}
          <button className="min-w-0 flex-1 text-left" onClick={() => void open(d)}><span className="block truncate font-semibold">{d.name}</span><span className="block truncate text-xs text-body">{d.kind} {kb(d.size)} · {new Date(d.updatedAt).toLocaleDateString("en")} · {visLabel[d.vis]}</span></button>
          <button aria-label={`delete ${d.name}`} onClick={() => setDel(d)}><Trash /></button></div></li>))}</ul>
      {sel && <aside aria-label="document details" className="mt-5 rounded-2xl border-2 border-pink bg-hairline p-4">
        <h2 className="break-words text-xl">{sel.name}</h2>
        <dl className="mt-2 grid grid-cols-2 gap-1 text-sm"><dt className="text-body">type</dt><dd>{sel.kind}</dd><dt className="text-body">size</dt><dd>{kb(sel.size) || "empty"}</dd><dt className="text-body">modified</dt><dd>{new Date(sel.updatedAt).toLocaleString("en")}</dd><dt className="text-body">visibility</dt><dd><select aria-label="change visibility" value={sel.vis} onChange={(e) => void orgService.setDocVis(ctx, sel._id, e.target.value as Vis).then(() => { setSel({ ...sel, vis: e.target.value as Vis }); reload(); }).catch((x) => setErr(msg(x, "could not change visibility.")))} className="rounded-lg border border-lilac bg-white px-2 py-1">{(Object.keys(visLabel) as Vis[]).map((v) => <option key={v} value={v}>{visLabel[v]}</option>)}</select></dd></dl>
        {url && sel.kind === "image" && <img src={url} alt={sel.name} width={320} height={256} className="mt-3 max-h-64 w-auto rounded-xl object-contain" />}{url && sel.kind === "pdf" && <iframe src={url} title={`preview of ${sel.name}`} className="mt-3 h-72 w-full rounded-xl bg-white" />}
        {!url && <p className="mt-2 text-sm text-body">{sel.kind === "image" || sel.kind === "pdf" ? "loading preview, or the file has no content yet." : "this format cannot be previewed. download it to open it."}</p>}
        <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => void dl(sel)}>download</Button><Button variant="outline" onClick={() => void navigator.clipboard.writeText(`${location.origin}/app/org/documents`).then(() => toast("internal link copied"))}>copy internal link</Button><Button variant="outline" onClick={() => setSel(null)}>close</Button></div>
      </aside>}
      <ConfirmDialog open={!!del} title={`delete ${del?.name}?`} body="this removes the file for everyone. folders must be empty first." confirm="delete" onClose={() => setDel(null)} onConfirm={() => { const d = del; setDel(null); if (d) void orgService.deleteDoc(ctx, d._id).then(() => { setSel(null); reload(); }).catch((x) => setErr(msg(x, "could not delete."))); }} />
    </>
  );
}

export function CalendarPage() {
  const { ctx, role, org, grants } = useOrgCtx();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); const [all, setItems] = useState<CalItem[] | null>(null); const [err, setErr] = useState(""); const [st, setSt] = useState("all");
  const items = all && all.filter((i) => st === "all" || i.kind === st);
  useEffect(() => { if (org) { setItems(null); orgService.calendar(ctx, month).then(setItems).catch((e) => setErr(msg(e, "could not load the calendar."))); } }, [ctx, month, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!org) return <NoOrg />;
  if (!can(role, "publish", grants) && !can(role, "review", grants)) return <Locked what="the content calendar" />;
  const [y, m] = month.split("-").map(Number);
  const dim = new Date(y, m, 0).getDate(), lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const shift = (n: number) => { const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const on = (d: number) => (items ?? []).filter((i) => new Date(i.date).getDate() === d);
  const tone = (k: CalItem["kind"]) => (k === "published" ? "bg-[#e3f6df] text-[#1f6b2c]" : "bg-hairline text-primary");
  return (
    <>
      <h1 className="text-3xl">content calendar</h1>
      <div className="mt-3 flex items-center gap-3"><Button variant="outline" className="py-1.5 text-sm" onClick={() => shift(-1)}>previous</Button><span className="font-semibold">{new Date(y, m - 1).toLocaleString("en", { month: "long", year: "numeric" }).toLowerCase()}</span><Button variant="outline" className="py-1.5 text-sm" onClick={() => shift(1)}>next</Button></div>
      <div className="mt-3 flex gap-2">{["all", "published", "scheduled", "planned"].map((k) => <button key={k} aria-pressed={st === k} onClick={() => setSt(k)} className={chip(st === k)}>{k}</button>)}</div>
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
      {!items && !err && <div className="mt-4"><Loading /></div>}
      {items && <>
        <ul className="mt-4 grid gap-2 md:hidden">{items.length ? [...items].sort((a, b) => a.date.localeCompare(b.date)).map((i) => <li key={`${i.kind}${i.id}`} className="rounded-xl border-2 border-hairline p-3"><span className="font-semibold">{new Date(i.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</span> · {i.title}<span className="block text-xs text-body">{i.kind === "published" ? "published" : i.kind === "scheduled" ? "scheduled, not published yet" : "planned"} on {i.channel}</span></li>) : <li className="text-body">nothing planned this month.</li>}</ul>
        <div className="mt-4 hidden grid-cols-7 gap-1 md:grid" role="grid" aria-label={month}>{Array.from({ length: lead }, (_, k) => <div key={`b${k}`} />)}{Array.from({ length: dim }, (_, k) => k + 1).map((d) => (
          <div key={d} role="gridcell" className="min-h-20 rounded-xl border-2 border-hairline p-1.5 text-xs"><Link to={`/app/org/publish?date=${month}-${String(d).padStart(2, "0")}`} className="font-bold text-primary" aria-label={`create content for day ${d}`}>{d}</Link>
            {on(d).map((i) => <p key={`${i.kind}${i.id}`} className={`mt-1 truncate rounded px-1 py-0.5 font-semibold ${tone(i.kind)}`}>{i.kind === "published" ? "published: " : i.kind === "scheduled" ? "scheduled: " : "planned: "}{i.title}</p>)}</div>))}</div></>}
    </>
  );
}

export function Members() {
  const { ctx, role, org, grants } = useOrgCtx(); const toast = useToast();
  const [list, setList] = useState<Member[] | null>(null); const [inv, setInv] = useState<Invite[]>([]); const [to, setTo] = useState(""); const [irole, setIrole] = useState<Role>("member"); const [note, setNote] = useState(""); const [link, setLink] = useState("");
  const [rm, setRm] = useState<Member | null>(null); const [roleF, setRoleF] = useState("all"); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  const reload = useCallback(() => { if (!org) return; void orgService.members(ctx).then(setList).catch((e) => setErr(msg(e, "could not load members."))); void orgService.invites(ctx).then(setInv).catch(() => undefined); }, [ctx, org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  if (!org) return <NoOrg />;
  if (!can(role, "members", grants)) return <Locked what="member management" />;
  const shown = (list ?? []).filter((m) => (roleF === "all" || m.role === roleF) && `${m.user?.name ?? ""} ${m.user?.username ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const send = async (via: "email" | "username" | "link") => {
    setNote(""); setLink("");
    try {
      const r = await orgService.invite(ctx, { via, role: irole, ...(via === "email" ? { email: to.trim() } : via === "username" ? { username: to.trim().replace(/^@/, "") } : {}) });
      setTo(""); setNote(via === "link" ? "link created. share it only with the person you invite." : "invitation sent."); if (r.link) setLink(r.link); reload();
    } catch (e) { setNote(msg(e, "could not create the invitation.")); }
  };
  return (
    <>
      <h1 className="text-3xl">members</h1><p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
      <div className="mt-3 flex flex-wrap gap-2"><input aria-label="search members" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search members" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-4 py-2" /><select aria-label="filter by role" value={roleF} onChange={(e) => setRoleF(e.target.value)} className="rounded-full border border-lilac bg-white px-3 py-2"><option>all</option>{roles.map((x) => <option key={x}>{x}</option>)}</select></div>
      {!list && <div className="mt-3"><Loading /></div>}
      <ul className="mt-3 divide-y-2 divide-hairline">{shown.map((m) => (
        <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3"><img src={m.user?.avatar || avatar(m.user?.username ?? m.userId)} alt="" width={40} height={40} className="size-10 rounded-full bg-hairline object-cover" /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{m.user?.name || m.user?.username}</p><p className="text-xs text-body">@{m.user?.username} · joined {new Date(m.joined).toLocaleDateString("en")}</p></div>
          {m.role === "owner" ? <span className="rounded-full bg-hairline px-3 py-1 text-sm font-semibold">owner</span> : <select aria-label={`role for ${m.user?.name ?? m.userId}`} value={m.role} onChange={(e) => void orgService.setMember(ctx, m.userId, { role: e.target.value as Role }).then(reload).catch((x) => setErr(msg(x, "could not change the role.")))} className="rounded-xl border border-lilac bg-white px-2 py-1">{roles.filter((x) => x !== "owner").map((x) => <option key={x}>{x}</option>)}</select>}
          {m.role !== "owner" && <button className="text-sm font-semibold text-primary" onClick={() => setRm(m)}>remove</button>}
          <p className="w-full text-xs text-body">can: {[...new Set([...caps[m.role], ...(m.grants ?? [])])].join(", ") || "view member resources"}{m.channels?.length ? ` · channels: ${m.channels.join(", ")}` : ""}</p>
          {m.role !== "owner" && <details className="w-full"><summary className="cursor-pointer text-sm font-semibold text-primary">permissions</summary>
            <fieldset className="mt-2"><legend className="text-xs font-semibold text-body">extra things this person can do, on top of their role</legend><div className="mt-1 flex flex-wrap gap-3">{(["publish", "review", "documents", "members", "analytics"] as const).map((c) => <label key={c} className="flex items-center gap-1 text-sm"><input type="checkbox" disabled={caps[m.role].includes(c)} checked={caps[m.role].includes(c) || !!m.grants?.includes(c)} onChange={(e) => void orgService.setMember(ctx, m.userId, { grants: e.target.checked ? [...(m.grants ?? []), c] : (m.grants ?? []).filter((g) => g !== c) }).then(reload).catch((x) => setErr(msg(x, "could not change permissions.")))} />{c}</label>)}</div></fieldset>
            <fieldset className="mt-2"><legend className="text-xs font-semibold text-body">channels they can publish to (none selected means all)</legend><div className="mt-1 flex flex-wrap gap-3">{channels.map((c) => <label key={c.id} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!m.channels?.includes(c.id)} onChange={(e) => void orgService.setMember(ctx, m.userId, { channels: e.target.checked ? [...(m.channels ?? []), c.id] : (m.channels ?? []).filter((g) => g !== c.id) }).then(reload).catch((x) => setErr(msg(x, "could not change channels.")))} />{c.id}</label>)}</div></fieldset></details>}</li>))}</ul>
      <h2 className="mt-8 text-xl">invitations</h2>
      <div className="mt-2 flex flex-wrap gap-2"><input aria-label="email or username" value={to} onChange={(e) => setTo(e.target.value)} placeholder="email or username" className="min-w-0 flex-1 rounded-full border border-lilac bg-white px-4 py-2" /><select aria-label="role for the invitation" value={irole} onChange={(e) => setIrole(e.target.value as Role)} className="rounded-full border border-lilac bg-white px-3 py-2">{roles.filter((x) => x !== "owner").map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="mt-2 flex flex-wrap gap-2"><Button disabled={!to.includes("@")} onClick={() => void send("email")}>invite by email</Button><Button variant="outline" disabled={!to.trim() || to.includes("@")} onClick={() => void send("username")}>invite by username</Button><Button variant="outline" onClick={() => void send("link")}>create invite link</Button></div>
      <p role="status" className="mt-1 text-sm font-semibold text-primary">{note}</p>
      {link && <div className="mt-2 flex items-center gap-2 rounded-xl bg-hairline p-3 text-sm"><span className="min-w-0 flex-1 break-all">{link}</span><Button variant="outline" className="py-1 text-sm" onClick={() => void navigator.clipboard.writeText(link).then(() => toast("link copied"))}>copy</Button></div>}
      <p className="mt-1 text-xs text-body">phone invitations are not available. opening an invite link never grants membership by itself.</p>
      <ul className="mt-3 grid gap-2">{inv.map((i) => <li key={i._id} className="flex items-center gap-2 rounded-xl border-2 border-hairline p-2 text-sm"><span className="min-w-0 flex-1 truncate">{i.email ?? i.username ?? "invite link"} <span className="text-body">({i.via}, {i.role})</span></span><span className="rounded-full bg-hairline px-2 py-0.5 text-xs font-bold">{i.status}</span>{i.status === "pending" && <button className="font-semibold text-primary" onClick={() => void orgService.revokeInvite(ctx, i._id).then(reload)}>revoke</button>}</li>)}</ul>
      <ConfirmDialog open={!!rm} title={`remove ${rm?.user?.name ?? "this member"}?`} body="they lose access to this organization right away." confirm="remove" onClose={() => setRm(null)} onConfirm={() => { const m = rm; setRm(null); if (m) void orgService.removeMember(ctx, m.userId).then(reload).catch((x) => setErr(msg(x, "could not remove the member."))); }} />
    </>
  );
}
