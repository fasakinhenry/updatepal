import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useApp } from "@/app/state";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/common/states";
import { ApiError } from "@/lib/http";
import { avatar } from "@/lib/types";
import { can, useOrgCtx } from "@/features/org/model";
import { feedService, type Comment, type FeedItem } from "./feed-service";
import { UpdateCard } from "./update-card";

const cats = ["all", "scholarship", "internship", "hackathon", "fellowship", "grant", "job", "event"];

export function FeedPage() {
  const { hydrate } = useApp();
  const [sp] = useSearchParams();
  const topic = sp.get("topic");
  const [tab, setTab] = useState<"you" | "following">("you");
  const [cat, setCat] = useState("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const load = useCallback(() => {
    setStatus("loading");
    feedService.list({ tab, cat, topic }).then((d) => { setItems(d.items); setCursor(d.nextCursor); hydrate(d.items); setStatus("ok"); }).catch(() => setStatus("error"));
  }, [tab, cat, topic]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  const more = () => feedService.list({ tab, cat, topic, cursor }).then((d) => { setItems((x) => [...x, ...d.items]); setCursor(d.nextCursor); hydrate(d.items); }).catch(() => setStatus("error"));
  const tabBtn = (t: "you" | "following", l: string) => <button role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 border-b-4 py-3 font-display font-bold ${tab === t ? "border-primary" : "border-transparent text-body"}`}>{l}</button>;
  return (
    <>
      <div role="tablist" className="flex">{tabBtn("you", "for you")}{tabBtn("following", "following")}</div>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">{cats.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${cat === c ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`}>{c}</button>)}</div>
        <button aria-label="refresh feed" onClick={load} className="ml-auto grid size-10 shrink-0 place-items-center rounded-full border border-lilac"><ArrowsClockwise /></button>
      </div>
      {topic && <p className="mt-2 text-sm text-body">showing #{topic}. <Link to="/app" className="font-semibold text-primary">clear</Link></p>}
      {status === "loading" && [0, 1, 2].map((k) => <div key={k} className="mt-5 h-36 animate-pulse rounded-2xl bg-hairline" aria-hidden />)}
      {status === "error" && <div role="alert" className="mt-6 rounded-2xl bg-hairline p-6"><p className="font-semibold">we could not load your feed.</p><Button className="mt-3" onClick={load}>try again</Button></div>}
      {status === "ok" && !items.length && <div className="mt-6 rounded-2xl bg-cream p-6"><p className="font-display text-xl font-bold">nothing here yet.</p><p className="mt-1 text-body">{tab === "following" ? "follow organizations to see their updates here." : "updates will appear as organizations publish them."}</p><Button to="/app/discover" className="mt-3">find organizations</Button></div>}
      {status === "ok" && items.map((u) => <UpdateCard key={u.id} u={u} />)}
      {status === "ok" && cursor && <Button variant="outline" className="mt-5 w-full" onClick={() => void more()}>load more</Button>}
    </>
  );
}

export function UpdateDetail() {
  const { id = "" } = useParams();
  const { hydrate } = useApp();
  const { org, role, grants } = useOrgCtx();
  const [item, setItem] = useState<FeedItem | null | undefined>(undefined);
  const [list, setList] = useState<Comment[]>([]);
  const [t, setT] = useState(""); const [err, setErr] = useState(""); const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const blocked = !!org && !can(role, "publish", grants);
  useEffect(() => {
    feedService.get(id).then((u) => { setItem(u); hydrate([u]); }).catch(() => setItem(null));
    feedService.comments(id).then(setList).catch(() => undefined);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (item === undefined) return <div className="h-40 animate-pulse rounded-2xl bg-hairline" aria-hidden />;
  if (item === null) return <p role="alert">this update could not be found. <Link to="/app" className="font-semibold text-primary">back to feed</Link></p>;
  const post = async () => {
    if (!t.trim()) return;
    try { const c = await feedService.comment(id, t.trim(), org?.id, replyTo?._id); setList([...list, { ...c, parent: replyTo?._id }]); setT(""); setReplyTo(null); setErr(""); } catch (e) { setErr(e instanceof ApiError ? e.message : "could not post. your text is still here."); }
  };
  return (
    <>
      <UpdateCard u={item} full />
      <h2 className="mt-6 text-xl">discussion</h2>
      <form onSubmit={(e) => { e.preventDefault(); void post(); }} className="mt-3 flex gap-2">
        <input aria-label="add a comment" value={t} onChange={(e) => setT(e.target.value)} placeholder={replyTo ? "write a reply" : org ? `comment as ${org.name}` : "add a comment (use @username to mention)"} disabled={blocked} className={`${inputCls} mt-0`} /><Button type="submit" disabled={blocked}>post</Button>
      </form>
      {replyTo && <p className="mt-1 text-xs text-body">replying to {replyTo.author?.name ?? replyTo.org?.name ?? "a comment"} <button className="font-semibold text-primary" onClick={() => setReplyTo(null)}>cancel</button></p>}
      {blocked && <p role="status" className="text-xs font-semibold text-primary">your role cannot comment for this organization.</p>}
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
      <ul className="mt-3 grid gap-2">{list.filter((c) => !c.parent).map((c) => {
        const row = (x: Comment, nested?: boolean) => <li key={x._id} className={`flex gap-3 rounded-2xl bg-hairline px-4 py-3 ${nested ? "ml-8" : ""}`}><img src={avatar(x.org?.handle ?? x.author?.username ?? x._id, x.org ? "initials" : "thumbs")} alt="" width={32} height={32} className="size-8 rounded-full bg-white" /><div className="min-w-0"><p className="text-xs font-semibold text-body">{x.org?.name ?? x.author?.name ?? x.author?.username ?? "member"}</p><p className="break-words">{x.body}</p>{!nested && <button className="text-xs font-semibold text-primary" onClick={() => setReplyTo(x)}>reply</button>}</div></li>;
        return [row(c), ...list.filter((r) => r.parent === c._id).map((r) => row(r, true))];
      })}</ul>
      {!list.length && <p className="mt-3 text-body">no comments yet. start the conversation.</p>}
    </>
  );
}
