import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api, avatar, orgs, people, type Hit } from "@/lib/mock";
import { useApp } from "@/app/state";
import { Button } from "@/components/ui/button";

const topics = ["scholarship", "remote", "hackathon", "internship", "fellowship", "grant", "masters", "design"];
const kinds = ["all", "organizations", "people", "opportunities", "testimonials"] as const;

export function DiscoverPage() {
  const { followed, toggleFollow } = useApp();
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const [text, setText] = useState(q);
  const [who, setWho] = useState<"mixed" | "orgs" | "people">("mixed");
  const [kind, setKind] = useState<(typeof kinds)[number]>("all");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!q) return;
    let live = true;
    api.search(q).then((h) => { if (live) { setHits(h); setErr(false); } }).catch(() => live && setErr(true));
    return () => { live = false; };
  }, [q]);
  const sugg = [
    ...(who !== "people" ? orgs.map((o) => ({ id: o.id, name: o.name, desc: "organization", org: true })) : []),
    ...(who !== "orgs" ? people.map((p) => ({ id: p.id, name: p.name, desc: p.bio, org: false })) : []),
  ];
  const shown = hits?.filter((h) => kind === "all" || h.kind === kind);
  return (
    <>
      <form role="search" onSubmit={(e) => { e.preventDefault(); setHits(null); setSp(text ? { q: text } : {}); }} className="flex gap-2">
        <input aria-label="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="try: remote internships for beginners" className="w-full rounded-full border border-lilac px-4 py-3" />
        <Button type="submit">search</Button>
      </form>
      <p className="mt-1 text-xs text-body">keyword matching for now. natural-language search connects with the backend.</p>
      {q ? (
        <section className="mt-5" aria-live="polite">
          <div className="flex gap-2 overflow-x-auto pb-1">{kinds.map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${kind === k ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`}>{k}</button>)}</div>
          {err && <p role="alert" className="mt-4 font-semibold">search failed. try again.</p>}
          {!err && !shown && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-hairline" aria-hidden />}
          {shown && !shown.length && <p className="mt-4 text-body">no results for "{q}". try fewer or broader words.</p>}
          <ul className="mt-3 divide-y-2 divide-hairline">{shown?.map((h) => <li key={h.kind + h.id}><Link to={h.to} className="block py-3"><span className="text-xs font-bold text-primary">{h.kind}</span><p className="font-semibold">{h.title}</p></Link></li>)}</ul>
        </section>
      ) : (
        <>
          <h2 className="mt-6 text-xl">who to follow</h2>
          <div className="mt-2 flex gap-2">{(["mixed", "orgs", "people"] as const).map((w) => <button key={w} aria-pressed={who === w} onClick={() => setWho(w)} className={`rounded-full border px-3 py-1 text-sm font-semibold ${who === w ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`}>{w}</button>)}</div>
          <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">{sugg.map((s) => (
            <li key={s.id} className="w-44 shrink-0 snap-start rounded-2xl border-2 border-hairline p-4 text-center">
              <img src={avatar(s.id, s.org ? "initials" : "thumbs")} alt="" width={56} height={56} className="mx-auto size-14 rounded-full" />
              <p className="mt-2 truncate font-semibold">{s.name}</p><p className="truncate text-xs text-body">{s.desc}</p>
              <Button variant={followed.includes(s.id) ? "outline" : "primary"} className="mt-3 w-full py-1.5 text-sm" aria-pressed={followed.includes(s.id)} onClick={() => toggleFollow(s.id)}>{followed.includes(s.id) ? "following" : "follow"}</Button>
            </li>))}</ul>
          <h2 className="mt-6 text-xl">popular topics</h2>
          <ul className="mt-3 flex flex-wrap gap-2">{topics.map((t) => <li key={t}><Link to={`/app?topic=${t}`} className="rounded-full bg-hairline px-4 py-2 font-semibold text-primary">#{t}</Link></li>)}</ul>
        </>
      )}
    </>
  );
}
