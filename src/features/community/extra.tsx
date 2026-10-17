import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";
import { inputCls } from "@/components/common/states";
import { useApp, usePersisted } from "@/app/state";
import { stories, updates } from "@/lib/mock";

export function ResetPage() {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState(""); const [done, setDone] = useState(false);
  const toast = useToast();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("use at least 8 characters.");
    if (pw !== pw2) return setErr("the two passwords do not match.");
    setErr(""); setDone(true); toast("password updated (demo)");
  };
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-4xl">choose a new password.</h1>
      <p className="mt-2 text-sm text-body">demo page. in production the reset token in the link is checked by the server and expires.</p>
      {done ? <p role="status" className="mt-6 font-semibold">all set. <Link to="/auth" className="text-primary">sign in</Link></p> : (
        <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
          <label className="text-sm font-semibold">new password<input type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <label className="text-sm font-semibold">confirm password<input type="password" autoComplete="new-password" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
          <Button type="submit">update password</Button>
        </form>)}
    </main>
  );
}

type Story = { id: string; name: string; title: string; body: string; refs: string[]; imgs?: string[] };
// shrink to a small jpeg so a few images fit in local storage during development
const shrink = async (f: File) => { const b = await createImageBitmap(f); const k = Math.min(1, 640 / Math.max(b.width, b.height)); const c = document.createElement("canvas"); c.width = Math.round(b.width * k); c.height = Math.round(b.height * k); c.getContext("2d")?.drawImage(b, 0, 0, c.width, c.height); b.close(); return c.toDataURL("image/jpeg", 0.7); };
export function StoryComposer() {
  const { user, bookmarks } = useApp();
  const [sp] = useSearchParams();
  const nav = useNavigate(); const toast = useToast();
  const [mine, setMine] = usePersisted<Story[]>("ub-mystories", []);
  const first = sp.get("ref");
  const [d, setD] = usePersisted("ub-storydraft", { title: "", body: "", refs: [] as string[], imgs: [] as string[] });
  const refs = first && !d.refs.includes(first) && updates.some((u) => u.id === first) ? [...d.refs, first] : d.refs;
  const [q, setQ] = useState(""); const [url, setUrl] = useState(""); const [err, setErr] = useState(""); const [prev, setPrev] = useState(false);
  const imgs = d.imgs ?? [];
  const addImg = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 5e6) return setErr("choose an image under 5 mb.");
    if (imgs.length >= 4) return setErr("you can attach up to 4 images.");
    try { const u = await shrink(f); setD((x) => ({ ...x, imgs: [...(x.imgs ?? []), u] })); setErr(""); } catch { setErr("we could not read that image."); }
  };
  const add = (id: string) => setD({ ...d, refs: refs.includes(id) ? refs : [...refs, id] });
  const paste = () => {
    try {
      const u = new URL(url);
      const id = u.origin === location.origin ? u.pathname.match(/^\/app\/update\/([\w-]+)$/)?.[1] : undefined;
      if (id && updates.some((x) => x.id === id)) { add(id); setUrl(""); setErr(""); } else setErr("we could not find that update. paste a link copied from an updatebase update.");
    } catch { setErr("that is not a valid link."); }
  };
  const publish = () => {
    if (d.body.trim().length < 20) return setErr("tell a bit more. at least 20 characters.");
    if (!refs.length) return setErr("attach at least one update your story is about.");
    setMine([{ id: crypto.randomUUID(), name: user?.name || "you", title: d.title.trim() || "my story", body: d.body.trim(), refs, imgs }, ...mine]);
    setD({ title: "", body: "", refs: [], imgs: [] }); toast("story published (demo, saved on this device)"); nav("/app/testimonials");
  };
  const found = q.trim() ? updates.filter((u) => u.title.includes(q.toLowerCase())) : [];
  const pick = (title: string, list: typeof updates) => list.length > 0 && <div className="mt-2"><p className="text-xs font-semibold text-body">{title}</p><div className="mt-1 flex flex-wrap gap-2">{list.map((u) => <button key={u.id} onClick={() => add(u.id)} className="rounded-full border border-lilac px-3 py-1 text-sm font-semibold text-primary">{u.title}</button>)}</div></div>;
  return (
    <>
      <h1 className="text-3xl">share your story</h1><p className="mt-1 text-body">connect it to the opportunity that made the difference.</p>
      <label className="mt-4 block text-sm font-semibold">title (optional)<input className={inputCls} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
      <label className="mt-4 block text-sm font-semibold">your story<textarea className={`${inputCls} min-h-36`} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} /></label>
      <div className="mt-2"><label className="cursor-pointer text-sm font-semibold text-primary">add an image (up to 4)<input type="file" accept="image/*" className="sr-only" onChange={addImg} /></label>
        <ul className="mt-2 flex flex-wrap gap-2">{imgs.map((src, k) => <li key={k} className="relative"><img src={src} alt={`attached image ${k + 1}`} width={80} height={80} className="size-20 rounded-xl object-cover" /><button aria-label={`remove image ${k + 1}`} onClick={() => setD({ ...d, imgs: imgs.filter((_, j) => j !== k) })} className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-night text-xs text-on-primary">x</button></li>)}</ul>
        <p className="text-xs text-body">images are resized and kept on this device for now. video needs the backend.</p></div>
      <h2 className="mt-6 text-lg">opportunities this story is about</h2>
      <ul className="mt-2 flex flex-wrap gap-2">{refs.map((id) => <li key={id} className="inline-flex items-center gap-2 rounded-full bg-hairline px-3 py-1 text-sm font-semibold">{updates.find((u) => u.id === id)?.title}<button aria-label="remove" onClick={() => setD({ ...d, refs: refs.filter((x) => x !== id) })}>x</button></li>)}</ul>
      {pick("from your bookmarks", updates.filter((u) => bookmarks.includes(u.id)))}
      {pick("recent updates", updates.slice(0, 3))}
      <label className="mt-3 block text-sm font-semibold">search<input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="search updates" /></label>{pick("results", found)}
      <div className="mt-3 flex gap-2"><input aria-label="paste an update link" className={`${inputCls} mt-0`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="paste an updatebase update link" /><Button variant="outline" onClick={paste}>add</Button></div>
      <p role="alert" className="mt-2 text-sm font-semibold text-[#d02b2b]">{err}</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setPrev(!prev)}>{prev ? "hide preview" : "preview"}</Button><Button onClick={publish}>publish story</Button></div>
      <p className="mt-1 text-xs text-body">your draft saves on this device as you type.</p>
      {prev && <article className="mt-4 rounded-3xl border-2 border-pink bg-hairline p-5"><h2 className="text-xl">{d.title || "my story"}</h2><p className="mt-2 whitespace-pre-line break-words">{d.body}</p>{imgs.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{imgs.map((src, k) => <img key={k} src={src} alt="" width={120} height={120} className="size-28 rounded-xl object-cover" />)}</div>}</article>}
    </>
  );
}

export function CommunityPage() {
  const threads = [["how do i prepare a chevening essay?", "u1"], ["remote internships for beginners, tips?", "u2"], ["forming a hackathon team in akure", "u3"]];
  return (
    <>
      <h1 className="text-3xl">community</h1><p className="mt-1 text-xs text-body">demo content. real discussions arrive with the backend.</p>
      <h2 className="mt-6 text-xl">conversations about opportunities</h2>
      <ul className="mt-2 divide-y-2 divide-hairline">{threads.map(([t, id]) => <li key={id}><Link to={`/app/update/${id}`} className="block py-3 font-semibold">{t}</Link></li>)}</ul>
      <h2 className="mt-6 text-xl">recently shared stories</h2>
      <ul className="mt-2 grid gap-2">{stories.map((s) => <li key={s.id}><Link to="/app/testimonials" className="block rounded-2xl bg-hairline p-3 font-semibold">{s.title}<span className="block text-sm font-normal text-body">{s.name}</span></Link></li>)}</ul>
      <h2 className="mt-6 text-xl">helpful resources</h2><p className="mt-2 text-body">organizations will be able to share public guides and templates here.</p>
      <Button to="/app/testimonials/new" className="mt-4">share your story</Button>
    </>
  );
}
