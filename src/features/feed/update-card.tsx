import { useState } from "react";
import { Link } from "react-router";
import { Heart, ChatCircleDots, BookmarkSimple, ShareNetwork, Repeat, Quotes, Coins, ArrowSquareOut, MapPin, CalendarBlank } from "@phosphor-icons/react";
import { avatar, orgs, type Update } from "@/lib/mock";
import { useApp } from "@/app/state";
import { TipDialog } from "./tip-dialog";

const act = "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-primary/[.07] disabled:opacity-55";

export function UpdateCard({ u, full }: { u: Update; full?: boolean }) {
  const { liked, toggleLike, bookmarks, toggleBookmark, reshared, toggleReshare } = useApp();
  const [open, setOpen] = useState(!!full);
  const [note, setNote] = useState("");
  const [tip, setTip] = useState(false);
  const org = orgs.find((o) => o.id === u.org);
  const isLiked = liked.includes(u.id), isSaved = bookmarks.includes(u.id);
  const long = u.body.length > 160;
  const share = async () => {
    const url = `${location.origin}/app/update/${u.id}`;
    try { if (navigator.share) await navigator.share({ title: u.title, url }); else { await navigator.clipboard.writeText(url); setNote("link copied."); } } catch { /* cancelled */ }
  };
  return (
    <article className="border-b-2 border-hairline py-5">
      <header className="flex items-center gap-3">
        <img src={avatar(u.org, "initials")} alt="" width={40} height={40} className="size-10 rounded-full" />
        <div className="min-w-0"><p className="truncate font-semibold">{org?.name}</p><p className="text-xs text-body">{u.date}</p></div>
        <span className="ml-auto rounded-lg bg-hairline px-2.5 py-1 text-xs font-bold text-primary">{u.cat}</span>
      </header>
      <h2 className="mt-3 text-xl"><Link to={`/app/update/${u.id}`} className="hover:text-primary">{u.title}</Link></h2>
      <p className={`mt-2 whitespace-pre-line break-words text-body ${open ? "" : "line-clamp-3"}`}>{u.body}</p>
      {long && !full && <button className="mt-1 text-sm font-semibold text-primary" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "show less" : "read more"}</button>}
      {(u.deadline || u.place) && <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">{u.deadline && <span className="inline-flex items-center gap-1"><CalendarBlank />closes {u.deadline}</span>}{u.place && <span className="inline-flex items-center gap-1"><MapPin />{u.place}</span>}</p>}
      {u.link && <a href={u.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline">apply at source<ArrowSquareOut /><span className="sr-only">(opens in a new tab)</span></a>}
      <ul className="mt-3 flex flex-wrap gap-2">{u.tags.map((t) => <li key={t}><Link to={`/app?topic=${t}`} className="rounded-full border border-lilac px-2.5 py-0.5 text-xs font-semibold text-primary">#{t}</Link></li>)}</ul>
      <div className="mt-3 flex flex-wrap items-center gap-1 -ml-3">
        <button className={`${act} ${isLiked ? "text-pink" : ""}`} aria-pressed={isLiked} onClick={() => toggleLike(u.id).catch(() => setNote("could not save your reaction. check your connection and try again."))}><Heart weight={isLiked ? "fill" : "regular"} size={20} />love</button>
        <Link to={`/app/update/${u.id}`} className={act}><ChatCircleDots size={20} />comment</Link>
        <button className={`${act} ${reshared.includes(u.id) ? "text-primary" : ""}`} aria-pressed={reshared.includes(u.id)} onClick={() => toggleReshare(u.id)}><Repeat size={20} />{reshared.includes(u.id) ? "reshared" : "reshare"}</button>
        <Link to={`/app/testimonials/new?ref=${u.id}`} className={act}><Quotes size={20} />quote</Link>
        <button className={`${act} ${isSaved ? "text-primary" : ""}`} aria-pressed={isSaved} onClick={() => toggleBookmark(u.id)}><BookmarkSimple weight={isSaved ? "fill" : "regular"} size={20} />save</button>
        <button className={act} onClick={share}><ShareNetwork size={20} />share</button>
        <button className={act} onClick={() => setTip(true)}><Coins size={20} />tip</button>
        <TipDialog u={u} open={tip} onClose={() => setTip(false)} />
      </div>
      <p role="status" className="text-sm font-semibold text-primary">{note}</p>
    </article>
  );
}
