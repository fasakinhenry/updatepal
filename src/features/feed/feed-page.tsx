import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { api, type Update } from "@/lib/mock";
import { useApp, usePersisted } from "@/app/state";
import { Button } from "@/components/ui/button";
import { UpdateCard } from "./update-card";
import { can, useOrgCtx } from "@/features/org/model";

const cats = ["all", "scholarship", "internship", "hackathon", "fellowship", "grant"];

export function FeedPage() {
  const { followed } = useApp();
  const [sp] = useSearchParams();
  const topic = sp.get("topic");
  const [tab, setTab] = useState<"you" | "following">("you");
  const [cat, setCat] = useState("all");
  const [n, setN] = useState(3);
  const [items, setItems] = useState<Update[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const load = useCallback(() => { setStatus("loading"); api.updates().then((d) => { setItems(d); setStatus("ok"); }).catch(() => setStatus("error")); }, []);
  useEffect(() => { load(); }, [load]);
  const shown = items.filter((u) => (tab === "you" || followed.includes(u.org)) && (cat === "all" || u.cat === cat) && (!topic || u.tags.includes(topic)));
  const tabBtn = (t: "you" | "following", l: string) => <button role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 border-b-4 py-3 font-display font-bold ${tab === t ? "border-primary" : "border-transparent text-body"}`}>{l}</button>;
  return (
    <>
      <div role="tablist" className="flex">{tabBtn("you", "for you")}{tabBtn("following", "following")}</div>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">{cats.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${cat === c ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`}>{c}</button>)}</div>
        <button aria-label="refresh feed" onClick={load} className="ml-auto grid size-10 shrink-0 place-items-center rounded-full border border-lilac"><ArrowsClockwise /></button>
      </div>
      <p className="mt-2 text-xs text-body">demo data for development.{topic && <> showing #{topic}. <Link to="/app" className="font-semibold text-primary">clear</Link></>}</p>
      {status === "loading" && [0, 1, 2].map((k) => <div key={k} className="mt-5 h-36 animate-pulse rounded-2xl bg-hairline" aria-hidden />)}
      {status === "error" && <div role="alert" className="mt-6 rounded-2xl bg-hairline p-6"><p className="font-semibold">we could not load your feed.</p><Button className="mt-3" onClick={load}>try again</Button></div>}
      {status === "ok" && !shown.length && <div className="mt-6 rounded-2xl bg-cream p-6"><p className="font-display text-xl font-bold">nothing here yet.</p><p className="mt-1 text-body">{tab === "following" ? "follow organizations in discover to fill this tab." : "try another category."}</p>{tab === "following" && <Button to="/app/discover" className="mt-3">find organizations</Button>}</div>}
      {status === "ok" && shown.slice(0, n).map((u) => <UpdateCard key={u.id} u={u} />)}
      {status === "ok" && shown.length > n && <Button variant="outline" className="mt-5 w-full" onClick={() => setN(n + 3)}>load more</Button>}
    </>
  );
}

export function UpdateDetail() {
  const { id } = useParams();
  const { org, role } = useOrgCtx();
  const blocked = !!org && !can(role, "publish");
  const [item, setItem] = useState<Update | null | undefined>(undefined);
  const [list, setList] = usePersisted<string[]>(`ub-comments-${id}`, []);
  const [t, setT] = useState("");
  useEffect(() => { api.updates().then((d) => setItem(d.find((x) => x.id === id) ?? null)); }, [id]);
  if (item === undefined) return <div className="h-40 animate-pulse rounded-2xl bg-hairline" aria-hidden />;
  if (item === null) return <p role="alert">this update could not be found. <Link to="/app" className="font-semibold text-primary">back to feed</Link></p>;
  return (
    <>
      <UpdateCard u={item} full />
      <h2 className="mt-6 text-xl">discussion</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { setList([...list, t.trim()]); setT(""); } }} className="mt-3 flex gap-2">
        <input aria-label="add a comment" value={t} onChange={(e) => setT(e.target.value)} placeholder={org ? `comment as ${org.name}` : "add a comment"} disabled={blocked} className="w-full rounded-xl border border-lilac bg-white px-4 py-3" /><Button type="submit" disabled={blocked}>post</Button>
      </form>
      <p className="mt-2 text-xs text-body">comments stay on this device until the backend connects.</p>
      {blocked && <p role="status" className="text-xs font-semibold text-primary">your role cannot comment for this organization.</p>}
      <ul className="mt-3 grid gap-2">{list.map((c, k) => <li key={k} className="break-words rounded-2xl bg-hairline px-4 py-2.5">{c}</li>)}</ul>
      {!list.length && <p className="mt-3 text-body">no comments yet. start the conversation.</p>}
    </>
  );
}
