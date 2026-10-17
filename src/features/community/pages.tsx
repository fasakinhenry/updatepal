import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ConfirmDialog } from "@/components/common/toast";
import { Quotes, Heart, BookmarkSimple } from "@phosphor-icons/react";
import { avatar, chats, notifications, orgs, people, stories, updates } from "@/lib/mock";
import { useApp, usePersisted } from "@/app/state";
import { Button } from "@/components/ui/button";
import { UpdateCard } from "@/features/feed/update-card";
import { Tabs } from "@/components/ui/tabs";
import { VoiceNote } from "./voice";

const Empty = ({ title, hint, to, cta }: { title: string; hint: string; to: string; cta: string }) => (
  <div className="rounded-2xl bg-cream p-6"><p className="font-display text-xl font-bold">{title}</p><p className="mt-1 text-body">{hint}</p><Button to={to} className="mt-3">{cta}</Button></div>
);

export function Testimonials() {
  const { bookmarks, toggleBookmark } = useApp();
  const [mine] = usePersisted<{ id: string; name: string; title: string; body: string; refs: string[]; imgs?: string[] }[]>("ub-mystories", []);
  const [cele, setCele] = usePersisted<string[]>("ub-celebrated", []);
  return (
    <>
      <h1 className="text-3xl">stories</h1>
      <p className="mt-1 text-body">real outcomes from people who used these opportunities.</p>
      <Button to="/app/testimonials/new" className="mt-3">share your story</Button>
      <p className="mt-1 text-xs text-body">demo stories. yours appear first.</p>
      {mine.map((s) => <article key={s.id} className="mt-5 rounded-3xl border-2 border-primary p-5"><p className="font-semibold">{s.name}</p><h2 className="mt-1 text-xl">{s.title}</h2><p className="mt-1 whitespace-pre-line break-words">{s.body}</p>{s.imgs?.length ? <div className="mt-3 flex flex-wrap gap-2">{s.imgs.map((src, k) => <img key={k} src={src} alt="" width={120} height={120} loading="lazy" className="size-28 rounded-xl object-cover" />)}</div> : null}<p className="mt-2 flex flex-wrap gap-2">{s.refs.map((r) => <Link key={r} to={`/app/update/${r}`} className="rounded-xl bg-hairline px-3 py-1 text-sm font-semibold text-primary">{updates.find((u) => u.id === r)?.title ?? r}</Link>)}</p></article>)}
      {stories.map((s) => {
        const ref = updates.find((u) => u.id === s.ref); const on = cele.includes(s.id);
        return (
          <article key={s.id} className="mt-5 rounded-3xl border-2 border-pink bg-hairline p-5 shadow-[3px_4px_0_0_#ed0578]">
            <div className="flex items-center gap-3"><img src={avatar(s.name)} alt="" width={40} height={40} className="size-10 rounded-full bg-white" /><p className="font-semibold">{s.name}</p><Quotes className="ml-auto text-primary" weight="fill" size={24} /></div>
            <h2 className="mt-3 text-xl">{s.title}</h2><p className="mt-1 break-words text-ink">{s.body}</p>
            {ref && <Link to={`/app/update/${ref.id}`} className="mt-3 inline-block rounded-xl bg-white px-3 py-2 text-sm font-semibold text-primary">referenced: {ref.title}</Link>}
            <div className="mt-3 flex gap-2">
              <button aria-pressed={on} onClick={() => setCele(on ? cele.filter((x) => x !== s.id) : [...cele, s.id])} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold"><Heart weight={on ? "fill" : "regular"} />celebrate</button>
              <button aria-pressed={bookmarks.includes(s.id)} onClick={() => toggleBookmark(s.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold"><BookmarkSimple weight={bookmarks.includes(s.id) ? "fill" : "regular"} />save</button>
            </div>
          </article>
        );
      })}
    </>
  );
}

export function Notifications() {
  const { read, markRead } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState("all");
  const list = notifications.filter((n) => f === "all" || n.type === f);
  return (
    <>
      <div className="flex items-center"><h1 className="text-3xl">alerts</h1><button className="ml-auto text-sm font-semibold text-primary" onClick={() => markRead(notifications.map((n) => n.id))}>mark all as read</button></div>
      <div className="mt-3 flex gap-2">{["all", "updates", "social", "orgs"].map((t) => <button key={t} aria-pressed={f === t} onClick={() => setF(t)} className={`rounded-full border px-3 py-1 text-sm font-semibold ${f === t ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`}>{t}</button>)}</div>
      {!list.length && <p className="mt-4 text-body">you are all caught up.</p>}
      <ul className="mt-3 divide-y-2 divide-hairline">{list.map((n) => (
        <li key={n.id}><button onClick={() => { markRead([n.id]); nav(n.to); }} className="flex w-full items-center gap-3 py-3 text-left"><span className={`size-2.5 shrink-0 rounded-full ${read.includes(n.id) ? "bg-transparent" : "bg-primary"}`} aria-hidden /><span className="break-words font-semibold">{n.text}</span>{!read.includes(n.id) && <span className="sr-only">(unread)</span>}</button></li>))}
      </ul>
    </>
  );
}

export function Bookmarks() {
  const { bookmarks, bdates } = useApp();
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("newest");
  const ups = updates.filter((u) => bookmarks.includes(u.id));
  const sts = stories.filter((s) => bookmarks.includes(s.id));
  const at = (id: string) => bdates[id] ?? "";
  const sorted = [...ups].sort((a, b) => (sort === "oldest" ? at(a.id).localeCompare(at(b.id)) : at(b.id).localeCompare(at(a.id))));
  const groups = sorted.reduce<Record<string, typeof ups>>((m, u) => { const k = at(u.id) ? new Date(at(u.id)).toLocaleString("en", { month: "long", year: "numeric" }).toLowerCase() : "earlier"; (m[k] ??= []).push(u); return m; }, {});
  return (
    <>
      <h1 className="text-3xl">bookmarks</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {["all", "updates", "testimonials"].map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 text-sm font-semibold ${kind === k ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`}>{k}</button>)}
        <select aria-label="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto rounded-full border border-lilac bg-white px-3 py-1 text-sm font-semibold"><option value="newest">newest saved</option><option value="oldest">oldest saved</option></select>
      </div>
      <p className="mt-2 text-xs text-body">sorting by popularity arrives with real engagement data.</p>
      {!ups.length && !sts.length && <div className="mt-4"><Empty title="nothing saved yet." hint="save updates and stories to find them here." to="/app" cta="browse the feed" /></div>}
      {kind !== "testimonials" && Object.entries(groups).map(([month, list]) => <section key={month} aria-labelledby={`m-${month}`}><h2 id={`m-${month}`} className="mt-6 text-sm font-bold text-primary">{month}</h2>{list.map((u) => <div key={u.id}><UpdateCard u={u} />{at(u.id) && <p className="-mt-3 mb-2 text-xs text-body">saved {new Date(at(u.id)).toLocaleDateString("en")}</p>}</div>)}</section>)}
      {kind !== "updates" && sts.map((s) => <Link key={s.id} to="/app/testimonials" className="mt-4 block rounded-2xl bg-hairline p-4 font-semibold">{s.title}<span className="block text-sm font-normal text-body">{s.name}</span></Link>)}
    </>
  );
}

export function Messages() {
  const [open, setOpen] = useState<string | null>(null);
  const [voice, setVoice] = useState<{ url: string; sec: number }[]>([]);
  const [act, setAct] = useState("");
  const [t, setT] = useState("");
  const [local, setLocal] = usePersisted<Record<string, string[]>>("ub-msgs", {});
  const chat = chats.find((c) => c.id === open);
  return (
    <>
      <h1 className="text-3xl">messages</h1>
      <p className="mt-1 text-xs text-body">demo conversations. messages are not delivered or encrypted until the backend and a reviewed encryption protocol are connected.</p>
      {!chat ? (
        <ul className="mt-4 divide-y-2 divide-hairline">{chats.map((c) => <li key={c.id}><button onClick={() => setOpen(c.id)} className="flex w-full items-center gap-3 py-3 text-left"><img src={avatar(c.name)} alt="" width={44} height={44} className="size-11 rounded-full bg-hairline" /><span className="min-w-0"><span className="block font-semibold">{c.name}</span><span className="block truncate text-sm text-body">{c.last}</span></span><span className="ml-auto text-xs text-body">{c.time}</span></button></li>)}</ul>
      ) : (
        <section className="mt-4" aria-label={`conversation with ${chat.name}`}>
          <div className="flex gap-4 text-sm font-semibold"><button className="text-primary" onClick={() => setOpen(null)}>back to inbox</button><button className="ml-auto text-primary" onClick={() => setAct("report")}>report</button><button className="text-[#d02b2b]" onClick={() => setAct("block")}>block</button></div>
          <ConfirmDialog open={!!act} title={act === "block" ? `block ${chat.name}?` : `report ${chat.name}?`} body={act === "block" ? "they will not be able to message you. this is a demo and is not saved on a server." : "tell moderators about this conversation. demo only, nothing is sent."} confirm={act} onClose={() => setAct("")} onConfirm={() => { setAct(""); setOpen(null); }} />
          <ul className="mt-3 grid gap-2"><li className="max-w-[80%] rounded-2xl bg-hairline px-4 py-2.5">{chat.last}</li>{(local[chat.id] ?? []).map((m, k) => <li key={k} className="ml-auto max-w-[80%] break-words rounded-2xl bg-primary px-4 py-2.5 text-on-primary">{m}</li>)}</ul>
          <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { setLocal({ ...local, [chat.id]: [...(local[chat.id] ?? []), t.trim()] }); setT(""); } }} className="mt-4 flex gap-2"><input aria-label="message" value={t} onChange={(e) => setT(e.target.value)} className="w-full rounded-full border border-lilac px-4 py-3" /><Button type="submit">send</Button></form>
          {voice.map((v, k) => <p key={k} className="mt-2 ml-auto w-fit rounded-2xl bg-primary p-2 text-on-primary"><audio controls src={v.url} className="h-9 max-w-full" /><span className="block text-xs">voice note {v.sec}s (demo, not delivered)</span></p>)}
          <VoiceNote onSend={(url, sec) => setVoice([...voice, { url, sec }])} />
          <p className="text-xs text-body">attachments are not available in this demo.</p>
        </section>
      )}
    </>
  );
}

type MyStory = { id: string; title: string; body: string; refs: string[] };
export function Profile() {
  const { user, bookmarks, reshared, followed } = useApp();
  const [vis, setVis] = usePersisted("ub-visibility", "public");
  const [mine] = usePersisted<MyStory[]>("ub-mystories", []);
  const storyList = mine.length ? mine.map((s) => <article key={s.id} className="mt-3 rounded-2xl border-2 border-hairline p-4"><h3 className="text-lg">{s.title}</h3><p className="mt-1 whitespace-pre-line break-words text-body">{s.body}</p></article>) : <Empty title="no stories yet." hint="share how an opportunity changed things for you." to="/app/testimonials/new" cta="share your story" />;
  const name = (id: string) => orgs.find((o) => o.id === id)?.name ?? people.find((p) => p.id === id)?.name ?? id;
  const tabs = [
    { id: "activity", label: "activity", content: <>{reshared.map((id) => { const u = updates.find((x) => x.id === id); return u ? <div key={id}><p className="text-xs font-semibold text-body">you reshared</p><UpdateCard u={u} /></div> : null; })}{mine.length > 0 && storyList}{!reshared.length && !mine.length && <p className="text-body">public activity like reshares and stories shows here. private messages and documents never do.</p>}</> },
    { id: "updates", label: "updates", content: <p className="text-body">updates you publish for an organization appear here once publishing is connected.</p> },
    { id: "testimonials", label: "testimonials", content: storyList },
    { id: "following", label: "following", content: <ul className="grid gap-2">{followed.map((id) => <li key={id} className="rounded-xl bg-hairline px-4 py-2 font-semibold">{name(id)}</li>)}{!followed.length && <li className="text-body">you are not following anyone yet.</li>}</ul> },
    { id: "media", label: "media", content: <p className="text-body">posts with images or video will appear in this gallery. media upload needs the backend.</p> },
  ];
  return (
    <>
      <div className="h-32 rounded-3xl bg-primary" aria-hidden />
      <img src={user?.avatar} alt="" width={96} height={96} className="-mt-12 ml-5 size-24 rounded-full border-4 border-white bg-hairline object-cover" />
      <h1 className="mt-2 text-3xl">{user?.name || "your profile"}</h1>
      <p className="text-body">@{user?.username || "username"}</p>
      <p className="mt-3 whitespace-pre-line break-words">{user?.bio || "add a bio in onboarding."}</p>
      <p className="mt-3 text-sm font-semibold">{bookmarks.length} saved items · {followed.length} following</p>
      <label className="mt-5 block text-sm font-semibold">profile visibility
        <select value={vis} onChange={(e) => setVis(e.target.value)} className="mt-1 block rounded-xl border border-lilac bg-white px-3 py-2"><option value="public">public</option><option value="followers">followers only</option><option value="members">organization members</option><option value="private">private</option></select>
      </label>
      <p className="mt-1 text-xs text-body">{{ public: "anyone can see your profile.", followers: "only followers can see your activity.", members: "only people in your organizations can see it.", private: "only you can see it." }[vis]} this setting is saved on your device. real enforcement needs the backend.</p>
      <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" to="/app/org/new">create an organization</Button><Button variant="outline" to="/app/settings">settings</Button><Button variant="outline" to="/app/wallet">wallet</Button><Button variant="outline" to="/app/bookmarks">bookmarks</Button></div>
      <div className="mt-6"><Tabs label="profile sections" tabs={tabs} /></div>
    </>
  );
}
