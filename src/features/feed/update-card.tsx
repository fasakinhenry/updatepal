import { useState } from "react";
import { Link } from "react-router";
import { Heart, ChatCircleDots, BookmarkSimple, ShareNetwork, Quotes, Coins, DotsThree, ArrowSquareOut, MapPin, CalendarBlank } from "@phosphor-icons/react";
import { avatar, type Update } from "@/lib/types";
import { useApp } from "@/app/state";
import { Sheet } from "@/components/ui/sheet";
import { inputCls } from "@/components/common/states";
import { useToast } from "@/components/common/toast";
import { social } from "@/features/social/social-service";
import { TipDialog } from "@/features/payments/tip-dialog";

const act = "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-primary/[.07]";

export function UpdateCard({ u, full }: { u: Update & { loved?: boolean }; full?: boolean }) {
  const { liked, toggleLike, bookmarks, toggleBookmark, config } = useApp();
  const [tip, setTip] = useState(false); const [more, setMore] = useState(false); const [reporting, setReporting] = useState(false); const [reason, setReason] = useState(""); const toast = useToast();
  const [open, setOpen] = useState(!!full);
  const [note, setNote] = useState("");
  const isLiked = liked.includes(u.id), isSaved = bookmarks.includes(u.id);
  const long = u.body.length > 160;
  const share = async () => {
    const url = `${location.origin}/app/update/${u.id}`;
    try { if (navigator.share) await navigator.share({ title: u.title, url }); else { await navigator.clipboard.writeText(url); setNote("link copied."); } } catch { /* cancelled */ }
  };
  return (
    <article className="border-b-2 border-hairline py-5">
      <header className="flex items-center gap-3">
        <img src={avatar(u.orgHandle ?? u.org, "initials")} alt="" width={40} height={40} className="size-10 rounded-full" />
        <div className="min-w-0"><p className="truncate font-semibold">{u.orgHandle ? <Link to={`/app/o/${u.orgHandle}`} className="hover:text-primary">{u.orgName}</Link> : u.orgName}</p><p className="text-xs text-body">{u.date}{u.number ? ` · #${u.number}` : ""}</p></div>
        <span className="ml-auto max-w-[40%] truncate rounded-lg bg-hairline px-2.5 py-1 text-xs font-bold text-primary">{u.cat}</span>
      </header>
      <h2 className="mt-3 text-xl"><Link to={`/app/update/${u.id}`} className="hover:text-primary">{u.title}</Link></h2>
      <p className={`mt-2 whitespace-pre-line break-words text-body ${open ? "" : "line-clamp-3"}`}>{u.body}</p>
      {long && !full && <button className="mt-1 text-sm font-semibold text-primary" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "show less" : "read more"}</button>}
      {u.images && u.images.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{u.images.map((src, k) => <img key={k} src={src} alt="" loading="lazy" width={400} height={300} className="aspect-[4/3] w-full rounded-xl object-cover" />)}</div>}
      {(u.deadline || u.place) && <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">{u.deadline && <span className="inline-flex items-center gap-1"><CalendarBlank />closes {u.deadline}</span>}{u.place && <span className="inline-flex items-center gap-1"><MapPin />{u.place}</span>}</p>}
      {u.link && <a href={u.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline">apply at source<ArrowSquareOut /><span className="sr-only">(opens in a new tab)</span></a>}
      {u.tags.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{u.tags.map((t) => <li key={t}><Link to={`/app?topic=${encodeURIComponent(t)}`} className="rounded-full border border-lilac px-2.5 py-0.5 text-xs font-semibold text-primary">#{t}</Link></li>)}</ul>}
      <div className="-ml-3 mt-3 flex flex-wrap items-center gap-1">
        <button className={`${act} ${isLiked ? "text-pink" : ""}`} aria-pressed={isLiked} onClick={() => toggleLike(u.id).catch(() => setNote("could not save your reaction. check your connection and try again."))}><Heart weight={isLiked ? "fill" : "regular"} size={20} />love{u.loves ? ` ${Math.max(0, u.loves + (isLiked && !u.loved ? 1 : 0) - (!isLiked && u.loved ? 1 : 0))}` : ""}</button>
        <Link to={`/app/update/${u.id}`} className={act}><ChatCircleDots size={20} />comment{u.comments ? ` ${u.comments}` : ""}</Link>
        <Link to={`/app/stories/new?ref=${u.id}`} className={act}><Quotes size={20} />quote</Link>
        <button className={`${act} ${isSaved ? "text-primary" : ""}`} aria-pressed={isSaved} onClick={() => toggleBookmark(u.id)}><BookmarkSimple weight={isSaved ? "fill" : "regular"} size={20} />save</button>
        <button className={act} onClick={() => void share()}><ShareNetwork size={20} />share</button>
        {config.payments.enabled && <button className={act} onClick={() => setTip(true)}><Coins size={20} />tip</button>}
        <button className={`${act} ml-auto`} aria-label="more actions" onClick={() => setMore(true)}><DotsThree size={22} weight="bold" /></button>
      </div>
      {config.payments.enabled && <TipDialog updateId={u.id} orgName={u.orgName ?? "this organization"} open={tip} onClose={() => setTip(false)} />}
      <p role="status" className="text-sm font-semibold text-primary">{note}</p>
      <Sheet open={more} title="more" onClose={() => { setMore(false); setReporting(false); }}>
        {!reporting ? <div className="grid gap-1 font-semibold">
          <button className="rounded-xl px-3 py-3 text-left hover:bg-primary/[.07]" onClick={() => { void navigator.clipboard.writeText(`${location.origin}/app/update/${u.id}`).then(() => toast("link copied")); setMore(false); }}>copy link</button>
          {u.link && <a className="rounded-xl px-3 py-3 hover:bg-primary/[.07]" href={u.link} target="_blank" rel="noopener noreferrer">open the source (new tab)</a>}
          <button className="rounded-xl px-3 py-3 text-left text-[#d02b2b] hover:bg-primary/[.07]" onClick={() => setReporting(true)}>report this update</button></div>
          : <div><label className="block text-sm font-semibold">what is wrong with it?<textarea className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <button className="mt-3 rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary disabled:opacity-55" disabled={reason.trim().length < 3} onClick={() => void social.report("update", u.id, reason).then(() => { toast("report sent"); setReason(""); setMore(false); setReporting(false); }).catch(() => toast("could not send the report"))}>send report</button></div>}
      </Sheet>
    </article>
  );
}
