import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Quotes, Heart, BookmarkSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { chip, inputCls } from "@/components/common/states";
import { useToast } from "@/components/common/toast";
import { ImagePicker } from "@/components/common/image-picker";
import { useApp, usePersisted } from "@/app/state";
import { ApiError } from "@/lib/http";
import { avatar } from "@/lib/types";
import { feedService, type FeedItem, type Saved } from "@/features/feed/feed-service";
import { UpdateCard } from "@/features/feed/update-card";
import { social, type Note, type Story } from "./social-service";

const Empty = ({ title, hint, to, cta }: { title: string; hint: string; to: string; cta: string }) => (
  <div className="rounded-2xl bg-cream p-6"><p className="font-display text-xl font-bold">{title}</p><p className="mt-1 text-body">{hint}</p><Button to={to} className="mt-3">{cta}</Button></div>
);
const Loading = () => <div className="h-28 animate-pulse rounded-2xl bg-hairline" aria-hidden />;
const msg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);

export function StoryCard({ s, onChange }: { s: Story; onChange: (s: Story) => void }) {
  const [err, setErr] = useState("");
  const flip = async (k: "celebrated" | "bookmarked") => {
    const next = { ...s, [k]: !s[k], celebrations: s.celebrations + (k === "celebrated" ? (s.celebrated ? -1 : 1) : 0) };
    onChange(next);
    try { await (k === "celebrated" ? social.celebrate(s.id, !s.celebrated) : social.bookmarkStory(s.id, !s.bookmarked)); } catch { onChange(s); setErr("could not save that. try again."); }
  };
  return (
    <article className="mt-5 rounded-3xl border-2 border-pink bg-hairline p-5 shadow-[3px_4px_0_0_#ed0578]">
      <div className="flex items-center gap-3"><img src={s.author?.avatar || avatar(s.author?.username ?? s.id)} alt="" width={40} height={40} className="size-10 rounded-full bg-white object-cover" /><p className="font-semibold">{s.author?.username ? <Link to={`/app/u/${s.author.username}`}>{s.author.name || s.author.username}</Link> : "member"}</p><Quotes className="ml-auto text-primary" weight="fill" size={24} /></div>
      {s.title && <h2 className="mt-3 text-xl">{s.title}</h2>}<p className="mt-1 whitespace-pre-line break-words text-ink">{s.body}</p>
      {s.images.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{s.images.map((src, k) => <img key={k} src={src} alt="" loading="lazy" width={400} height={300} className="aspect-[4/3] w-full rounded-xl object-cover" />)}</div>}
      <p className="mt-3 flex flex-wrap gap-2">{s.refs.map((r) => <Link key={r.id} to={`/app/update/${r.id}`} className="rounded-xl bg-white px-3 py-1 text-sm font-semibold text-primary">{r.title}</Link>)}</p>
      <div className="mt-3 flex gap-2">
        <button aria-pressed={s.celebrated} onClick={() => void flip("celebrated")} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold"><Heart weight={s.celebrated ? "fill" : "regular"} />celebrate{s.celebrations ? ` ${s.celebrations}` : ""}</button>
        <button aria-pressed={s.bookmarked} onClick={() => void flip("bookmarked")} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold"><BookmarkSimple weight={s.bookmarked ? "fill" : "regular"} />save</button>
      </div>
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
    </article>
  );
}

export function Stories() {
  const [items, setItems] = useState<Story[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const load = useCallback(() => { setSt("loading"); social.stories().then((r) => { setItems(r.items); setCursor(r.nextCursor); setSt("ok"); }).catch(() => setSt("error")); }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <h1 className="text-3xl">stories</h1><p className="mt-1 text-body">real outcomes from people who used these opportunities.</p>
      <Button to="/app/stories/new" className="mt-3">share your story</Button>
      {st === "loading" && <div className="mt-5"><Loading /></div>}
      {st === "error" && <div role="alert" className="mt-5 rounded-2xl bg-hairline p-5"><p className="font-semibold">we could not load stories.</p><Button className="mt-2" onClick={load}>try again</Button></div>}
      {st === "ok" && !items.length && <div className="mt-5"><Empty title="no stories yet." hint="be the first to share how an opportunity helped you." to="/app/stories/new" cta="share your story" /></div>}
      {items.map((s) => <StoryCard key={s.id} s={s} onChange={(n) => setItems((l) => l.map((x) => (x.id === n.id ? n : x)))} />)}
      {cursor && <Button variant="outline" className="mt-5 w-full" onClick={() => void social.stories(cursor).then((r) => { setItems((l) => [...l, ...r.items]); setCursor(r.nextCursor); })}>load more</Button>}
    </>
  );
}

export function StoryComposer() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const toast = useToast();
  const [d, setD] = usePersisted("ub-storydraft", { title: "", body: "", refs: [] as { id: string; title: string }[], images: [] as string[] });
  const [saved, setSaved] = useState<Saved[]>([]); const [recent, setRecent] = useState<FeedItem[]>([]); const [found, setFound] = useState<FeedItem[]>([]);
  const [q, setQ] = useState(""); const [url, setUrl] = useState(""); const [err, setErr] = useState(""); const [prev, setPrev] = useState(false); const [busy, setBusy] = useState(false);
  const add = useCallback((u: { id: string; title: string }) => setD((x) => (x.refs.some((r) => r.id === u.id) ? x : { ...x, refs: [...x.refs, { id: u.id, title: u.title }] })), [setD]);
  useEffect(() => {
    feedService.saved().then(setSaved).catch(() => undefined);
    feedService.list({ tab: "you", cat: "all", topic: null }).then((r) => setRecent(r.items.slice(0, 5))).catch(() => undefined);
    const ref = sp.get("ref"); if (ref) feedService.get(ref).then(add).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (q.trim().length < 2) return void setFound([]);
    const t = setTimeout(() => { void social.search(q, {}).then((h) => setFound(h.updates.map((u) => ({ id: u._id, title: u.title, org: "", cat: u.cat ?? "", body: "", date: "", tags: [] })))).catch(() => undefined); }, 350);
    return () => clearTimeout(t);
  }, [q]);
  const paste = async () => {
    try {
      const u = new URL(url); const id = u.origin === location.origin ? u.pathname.match(/^\/app\/update\/([a-f0-9]{24})$/)?.[1] : undefined;
      if (!id) throw new Error("bad");
      add(await feedService.get(id)); setUrl(""); setErr("");
    } catch { setErr("we could not find that update. paste a link copied from an updatebase update."); }
  };
  const publish = async () => {
    if (d.body.trim().length < 20) return setErr("tell a bit more. at least 20 characters.");
    if (!d.refs.length) return setErr("attach at least one update your story is about.");
    setBusy(true);
    try { await social.createStory({ title: d.title, body: d.body, refs: d.refs.map((r) => r.id), images: d.images ?? [] }); setD({ title: "", body: "", refs: [], images: [] }); toast("story published"); nav("/app/stories"); }
    catch (e) { setErr(msg(e, "could not publish. your story is still here.")); } finally { setBusy(false); }
  };
  const pick = (title: string, list: { id: string; title: string }[]) => list.length > 0 && <div className="mt-2"><p className="text-xs font-semibold text-body">{title}</p><div className="mt-1 flex flex-wrap gap-2">{list.map((u) => <button key={u.id} onClick={() => add(u)} className="rounded-full border border-lilac px-3 py-1 text-sm font-semibold text-primary">{u.title}</button>)}</div></div>;
  return (
    <>
      <h1 className="text-3xl">share your story</h1><p className="mt-1 text-body">connect it to the opportunity that made the difference.</p>
      <label className="mt-4 block text-sm font-semibold">title (optional)<input className={inputCls} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
      <label className="mt-4 block text-sm font-semibold">your story<textarea className={`${inputCls} min-h-36`} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} /></label>
      <div className="mt-3"><ImagePicker kind="story" label="add an image (up to 4)" onUploaded={(url) => (d.images ?? []).length < 4 && setD({ ...d, images: [...(d.images ?? []), url] })} />
        <ul className="mt-2 flex flex-wrap gap-2">{(d.images ?? []).map((src, k) => <li key={k} className="relative"><img src={src} alt={`attached image ${k + 1}`} width={80} height={80} className="size-20 rounded-xl object-cover" /><button aria-label={`remove image ${k + 1}`} onClick={() => setD({ ...d, images: (d.images ?? []).filter((_, j) => j !== k) })} className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-night text-xs text-on-primary">x</button></li>)}</ul></div>
      <h2 className="mt-6 text-lg">opportunities this story is about</h2>
      <ul className="mt-2 flex flex-wrap gap-2">{d.refs.map((r) => <li key={r.id} className="inline-flex items-center gap-2 rounded-full bg-hairline px-3 py-1 text-sm font-semibold">{r.title}<button aria-label={`remove ${r.title}`} onClick={() => setD({ ...d, refs: d.refs.filter((x) => x.id !== r.id) })}>x</button></li>)}</ul>
      {pick("from your bookmarks", saved.flatMap((s) => (s.update ? [s.update] : [])))}{pick("recent updates", recent)}
      <label className="mt-3 block text-sm font-semibold">search<input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="search updates" /></label>{pick("results", found)}
      <div className="mt-3 flex gap-2"><input aria-label="paste an update link" className={`${inputCls} mt-0`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="paste an updatebase update link" /><Button variant="outline" onClick={() => void paste()}>add</Button></div>
      <p role="alert" className="mt-2 text-sm font-semibold text-[#d02b2b]">{err}</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setPrev(!prev)}>{prev ? "hide preview" : "preview"}</Button><Button onClick={() => void publish()} disabled={busy}>{busy ? "publishing..." : "publish story"}</Button></div>
      <p className="mt-1 text-xs text-body">your draft saves on this device as you type. video is not supported yet.</p>
      {prev && <article className="mt-4 rounded-3xl border-2 border-pink bg-hairline p-5"><h2 className="text-xl">{d.title || "my story"}</h2><p className="mt-2 whitespace-pre-line break-words">{d.body}</p></article>}
    </>
  );
}

export function Notifications() {
  const nav = useNavigate(); const { refreshUnread } = useApp();
  const [items, setItems] = useState<Note[] | null>(null); const [f, setF] = useState("all"); const [err, setErr] = useState(false);
  useEffect(() => { const load = () => void social.notes().then(setItems).catch(() => setErr(true)); load(); window.addEventListener("ub:notification", load); return () => window.removeEventListener("ub:notification", load); }, []);
  const mark = async (ids?: string[]) => { await social.markRead(ids).catch(() => undefined); setItems((l) => l?.map((n) => (!ids || ids.includes(n._id) ? { ...n, read: true } : n)) ?? null); refreshUnread(); };
  const types = ["all", ...new Set((items ?? []).map((n) => n.type))];
  const list = (items ?? []).filter((n) => f === "all" || n.type === f);
  return (
    <>
      <div className="flex items-center"><h1 className="text-3xl">alerts</h1><button className="ml-auto text-sm font-semibold text-primary" onClick={() => void mark()}>mark all as read</button></div>
      <div className="mt-3 flex gap-2 overflow-x-auto">{types.map((t) => <button key={t} aria-pressed={f === t} onClick={() => setF(t)} className={chip(f === t)}>{t}</button>)}</div>
      {err && <p role="alert" className="mt-4 font-semibold">could not load alerts.</p>}{!items && !err && <div className="mt-4"><Loading /></div>}
      {items && !list.length && <p className="mt-4 text-body">you are all caught up.</p>}
      <ul className="mt-3 divide-y-2 divide-hairline">{list.map((n) => <li key={n._id}><button onClick={() => { void mark([n._id]); nav(n.link); }} className="flex w-full items-center gap-3 py-3 text-left"><span className={`size-2.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} aria-hidden /><span className="break-words font-semibold">{n.text}</span>{!n.read && <span className="sr-only">(unread)</span>}</button></li>)}</ul>
    </>
  );
}

export function Bookmarks() {
  const { hydrate, bookmarks } = useApp();
  const [items, setItems] = useState<Saved[] | null>(null); const [kind, setKind] = useState("all"); const [sort, setSort] = useState("newest"); const [err, setErr] = useState(false);
  useEffect(() => { feedService.saved().then((s) => { setItems(s); hydrate(s.flatMap((x) => (x.update ? [{ id: x.update.id, loved: x.update.loved, bookmarked: true }] : []))); }).catch(() => setErr(true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const list = (items ?? []).filter((x) => (x.update ? bookmarks.includes(x.update.id) : true) && (kind === "all" || (kind === "updates" ? x.kind === "update" : x.kind === "story"))).sort((a, b) => (sort === "popular" ? (b.update?.loves ?? b.story?.celebrations ?? 0) - (a.update?.loves ?? a.story?.celebrations ?? 0) : sort === "oldest" ? a.savedAt.localeCompare(b.savedAt) : b.savedAt.localeCompare(a.savedAt)));
  const groups = list.reduce<Record<string, Saved[]>>((m, x) => { (m[new Date(x.savedAt).toLocaleString("en", { month: "long", year: "numeric" }).toLowerCase()] ??= []).push(x); return m; }, {});
  return (
    <>
      <h1 className="text-3xl">bookmarks</h1>
      <div className="mt-3 flex flex-wrap gap-2">{["all", "updates", "testimonials"].map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k === "testimonials" ? "stories" : k)} className={chip(kind === (k === "testimonials" ? "stories" : k))}>{k}</button>)}
        <select aria-label="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto rounded-full border border-lilac bg-white px-3 py-1 text-sm font-semibold"><option value="newest">newest saved</option><option value="oldest">oldest saved</option><option value="popular">most popular</option></select></div>
      {err && <p role="alert" className="mt-4 font-semibold">could not load bookmarks.</p>}{!items && !err && <div className="mt-4"><Loading /></div>}
      {items && !list.length && <div className="mt-4"><Empty title="nothing saved yet." hint="save updates and stories to find them here." to="/app" cta="browse the feed" /></div>}
      {Object.entries(groups).map(([month, l]) => <section key={month} aria-labelledby={`m-${month}`}><h2 id={`m-${month}`} className="mt-6 text-sm font-bold text-primary">{month}</h2>
        {l.map((x) => x.update ? <div key={x.update.id}><UpdateCard u={x.update} /><p className="-mt-3 mb-2 text-xs text-body">saved {new Date(x.savedAt).toLocaleDateString("en")}</p></div> : x.story ? <StoryCard key={x.story.id} s={x.story} onChange={(n) => setItems((all) => all?.map((y) => (y.story?.id === n.id ? { ...y, story: n } : y)) ?? null)} /> : null)}</section>)}
    </>
  );
}
