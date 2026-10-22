import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useApp } from "@/app/state";
import { Button } from "@/components/ui/button";
import { chip } from "@/components/common/states";
import { avatar } from "@/lib/types";
import { social, type Hit } from "@/features/social/social-service";

type Disc = Awaited<ReturnType<typeof social.discover>>;
const kinds = ["all", "organizations", "people", "opportunities", "testimonials"] as const;

export function DiscoverPage() {
  const { isFollowing, toggleFollow } = useApp();
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const [text, setText] = useState(q); const [place, setPlace] = useState(""); const [remote, setRemote] = useState(false);
  const [who, setWho] = useState<"mixed" | "orgs" | "people">("mixed");
  const [kind, setKind] = useState<(typeof kinds)[number]>("all");
  const [hits, setHits] = useState<Hit | null>(null); const [disc, setDisc] = useState<Disc | null>(null); const [err, setErr] = useState(false);
  useEffect(() => { social.discover().then(setDisc).catch(() => setErr(true)); }, []);
  useEffect(() => {
    if (!q) return void setHits(null);
    let live = true; setHits(null); setErr(false);
    social.search(q, { place, remote }).then((h) => live && setHits(h)).catch(() => live && setErr(true));
    return () => { live = false; };
  }, [q, place, remote]);
  const sugg = disc ? [...(who !== "people" ? disc.orgs.map((o) => ({ id: o._id, name: o.name, desc: o.description || "organization", org: true })) : []), ...(who !== "orgs" ? disc.people.map((p) => ({ id: p._id, name: p.name || p.username || "member", desc: p.bio || `@${p.username}`, org: false })) : [])] : [];
  const show = (k: (typeof kinds)[number]) => kind === "all" || kind === k;
  return (
    <>
      <form role="search" onSubmit={(e) => { e.preventDefault(); setSp(text.trim() ? { q: text.trim() } : {}); }} className="flex gap-2">
        <input aria-label="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="try: remote internships for beginners" className="w-full rounded-full border border-lilac bg-white px-4 py-3" /><Button type="submit">search</Button>
      </form>
      {q ? (
        <section className="mt-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2"><input aria-label="filter by location" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="location" className="w-32 rounded-full border border-lilac bg-white px-3 py-1.5 text-sm" /><label className="flex items-center gap-1 text-sm font-semibold"><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />remote only</label></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{kinds.map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>{k}</button>)}</div>
          {err && <p role="alert" className="mt-4 font-semibold">search failed. try again.</p>}
          {!err && !hits && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-hairline" aria-hidden />}
          {hits && <p className="mt-3 text-xs text-body">matched on: {hits.terms.join(", ")}{hits.aiUsed ? " (keywords picked by ai)" : ""}</p>}
          {hits && !hits.orgs.length && !hits.people.length && !hits.updates.length && !hits.stories.length && <p className="mt-4 text-body">no results for "{q}". try fewer or broader words.</p>}
          {hits && <ul className="mt-2 divide-y-2 divide-hairline">
            {show("organizations") && hits.orgs.map((o) => <li key={o._id}><Link to={`/app/o/${o.handle}`} className="block py-3"><span className="text-xs font-bold text-primary">organization</span><p className="font-semibold">{o.name}</p></Link></li>)}
            {show("people") && hits.people.map((p) => <li key={p._id}><Link to={`/app/u/${p.username}`} className="block py-3"><span className="text-xs font-bold text-primary">person</span><p className="font-semibold">{p.name || p.username}</p></Link></li>)}
            {show("opportunities") && hits.updates.map((u) => <li key={u._id}><Link to={`/app/update/${u._id}`} className="block py-3"><span className="text-xs font-bold text-primary">{u.cat ?? "opportunity"}</span><p className="font-semibold">{u.title}</p>{u.place && <p className="text-xs text-body">{u.place}</p>}</Link></li>)}
            {show("testimonials") && hits.stories.map((s) => <li key={s._id}><Link to="/app/stories" className="block py-3"><span className="text-xs font-bold text-primary">story</span><p className="font-semibold">{s.title}</p></Link></li>)}
          </ul>}
        </section>
      ) : (
        <>
          <h2 className="mt-6 text-xl">who to follow</h2>
          <div className="mt-2 flex gap-2">{(["mixed", "orgs", "people"] as const).map((w) => <button key={w} aria-pressed={who === w} onClick={() => setWho(w)} className={chip(who === w)}>{w}</button>)}</div>
          {!disc && !err && <div className="mt-3 h-32 animate-pulse rounded-2xl bg-hairline" aria-hidden />}
          {disc && !sugg.length && <p className="mt-3 text-body">no suggestions yet. as more people and organizations join, they show up here.</p>}
          <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">{sugg.map((s) => { const kindKey = s.org ? "org" : "user"; return (
            <li key={s.id} className="w-44 shrink-0 snap-start rounded-2xl border-2 border-hairline p-4 text-center">
              <img src={avatar(s.id, s.org ? "initials" : "thumbs")} alt="" width={56} height={56} className="mx-auto size-14 rounded-full" />
              <p className="mt-2 truncate font-semibold">{s.name}</p><p className="truncate text-xs text-body">{s.desc}</p>
              <Button variant={isFollowing(kindKey, s.id) ? "outline" : "primary"} className="mt-3 w-full py-1.5 text-sm" aria-pressed={isFollowing(kindKey, s.id)} onClick={() => void toggleFollow(kindKey, s.id).catch(() => undefined)}>{isFollowing(kindKey, s.id) ? "following" : "follow"}</Button>
            </li>); })}</ul>
          {disc && disc.topics.length > 0 && <><h2 className="mt-6 text-xl">popular topics</h2><ul className="mt-3 flex flex-wrap gap-2">{disc.topics.map((t) => <li key={t}><Link to={`/app?topic=${encodeURIComponent(t)}`} className="rounded-full bg-hairline px-4 py-2 font-semibold text-primary">#{t}</Link></li>)}</ul></>}
          {disc && disc.recent.length > 0 && <><h2 className="mt-6 text-xl">recently active organizations</h2><ul className="mt-3 grid gap-2">{disc.recent.map((o) => <li key={o._id}><Link to={`/app/o/${o.handle}`} className="block rounded-2xl bg-hairline px-4 py-3 font-semibold">{o.name}</Link></li>)}</ul></>}
        </>
      )}
    </>
  );
}
