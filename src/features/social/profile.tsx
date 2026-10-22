import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmDialog, useToast } from "@/components/common/toast";
import { ImagePicker } from "@/components/common/image-picker";
import { inputCls } from "@/components/common/states";
import { useApp } from "@/app/state";
import { ApiError } from "@/lib/http";
import { avatar } from "@/lib/types";
import { authService } from "@/features/auth/auth-service";
import { feedService, type FeedItem } from "@/features/feed/feed-service";
import { UpdateCard } from "@/features/feed/update-card";
import { saveBlob } from "@/lib/http";
import { social, type Profile, type OrgLite } from "./social-service";

const msg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);

export function ProfilePage({ self }: { self?: boolean }) {
  const { username: param } = useParams();
  const { user, isFollowing, toggleFollow } = useApp();
  const nav = useNavigate(); const toast = useToast();
  const username = self ? user?.username : param;
  const [p, setP] = useState<Profile | null>(null); const [conn, setConn] = useState<{ kind: "followers" | "following"; items: { _id: string; name?: string; username?: string }[] } | null>(null); const [err, setErr] = useState(""); const [act, setAct] = useState<"" | "block" | "report">(""); const [reason, setReason] = useState("");
  useEffect(() => { if (!username) return; setP(null); social.profile(username).then(setP).catch((e) => setErr(msg(e, "we could not load this profile."))); }, [username]);
  if (err) return <p role="alert">{err} <Link to="/app" className="font-semibold text-primary">back to feed</Link></p>;
  if (!p) return <div className="h-40 animate-pulse rounded-2xl bg-hairline" aria-hidden />;
  const isSelf = !!user && p.id === user.id;
  const following = !!p.id && isFollowing("user", p.id);
  const tabs = [
    { id: "updates", label: "updates", content: p.updates?.length ? <ul className="divide-y-2 divide-hairline">{p.updates.map((u) => <li key={u._id}><Link to={`/app/update/${u._id}`} className="block py-3 font-semibold">{u.title}<span className="block text-xs font-normal text-body">{u.cat}</span></Link></li>)}</ul> : <p className="text-body">no published updates.</p> },
    { id: "stories", label: "testimonials", content: p.stories?.length ? <div className="grid gap-3">{p.stories.map((s) => <article key={s._id} className="rounded-2xl border-2 border-hairline p-4"><h3 className="text-lg">{s.title || "story"}</h3><p className="mt-1 whitespace-pre-line break-words text-body">{s.body}</p></article>)}</div> : <p className="text-body">no stories shared yet.</p> },
  ];
  return (
    <>
      <div className="h-32 rounded-3xl bg-primary" aria-hidden />
      <img src={p.avatar || avatar(p.username ?? "member")} alt="" width={96} height={96} className="-mt-12 ml-5 size-24 rounded-full border-4 border-white bg-hairline object-cover" />
      <h1 className="mt-2 text-3xl">{p.name || p.username}</h1><p className="text-body">@{p.username}</p>
      {p.restricted ? <p className="mt-4 rounded-2xl bg-hairline p-4 font-semibold">this profile is not visible to you. {p.visibility === "private" ? "" : "follow to ask for access."}</p> : <>
        {p.bio && <p className="mt-3 whitespace-pre-line break-words">{p.bio}</p>}
        {p.interests && p.interests.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{p.interests.map((i) => <li key={i} className="rounded-full bg-hairline px-3 py-1 text-sm font-semibold text-primary">{i}</li>)}</ul>}
        {p.links && p.links.length > 0 && <ul className="mt-3 flex flex-wrap gap-3 text-sm">{p.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-primary underline">{l.replace(/^https:\/\//, "")}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul>}
        <p className="mt-3 text-sm font-semibold"><button className="underline" onClick={() => p.username && void social.connections(p.username, "followers").then((items) => setConn({ kind: "followers", items })).catch(() => toast("could not load that list"))}>{p.followers ?? 0} followers</button> · <button className="underline" onClick={() => p.username && void social.connections(p.username, "following").then((items) => setConn({ kind: "following", items })).catch(() => toast("could not load that list"))}>{p.followingCount ?? 0} following</button></p>
        {conn && <div className="mt-2 rounded-2xl bg-hairline p-3"><p className="text-xs font-bold text-primary">{conn.kind} <button className="ml-2 underline" onClick={() => setConn(null)}>close</button></p>{!conn.items.length && <p className="text-sm text-body">nobody to show.</p>}<ul className="mt-1 grid gap-1">{conn.items.map((x) => <li key={x._id}><Link to={`/app/u/${x.username}`} className="font-semibold">{x.name || x.username}</Link></li>)}</ul></div>}
      </>}
      <div className="mt-4 flex flex-wrap gap-2">
        {isSelf ? <Button variant="outline" to="/app/settings">edit profile and settings</Button> : <>
          {p.id && <Button variant={following ? "outline" : "primary"} aria-pressed={following} onClick={() => void toggleFollow("user", p.id!).catch(() => toast("could not update follow"))}>{following ? "following" : "follow"}</Button>}
          {p.acceptsDms === false ? <p className="self-center text-sm text-body">this person is not accepting messages.</p> : !p.restricted && <Button variant="outline" to={`/app/messages?to=${p.username}`}>message</Button>}
          <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(`${location.origin}/app/u/${p.username}`).then(() => toast("link copied")); }}>copy link</Button>
          <Button variant="outline" onClick={() => setAct("report")}>report</Button><Button variant="outline" onClick={() => setAct("block")}>block</Button>
        </>}
      </div>
      {!p.restricted && <div className="mt-6"><Tabs label="profile sections" tabs={tabs} /></div>}
      <ConfirmDialog open={act === "block"} title={`block ${p.username}?`} body="you will not be able to message each other." confirm="block" onClose={() => setAct("")} onConfirm={() => { if (p.id) void social.block(p.id, true).then(() => { toast("blocked"); nav("/app"); }).catch(() => toast("could not block")); setAct(""); }} />
      <ConfirmDialog open={act === "report"} title={`report ${p.username}?`} body="tell moderators what is wrong." confirm="send report" confirmDisabled={reason.trim().length < 3} onClose={() => setAct("")} onConfirm={() => { if (p.id) void social.report("user", p.id, reason).then(() => toast("report sent")).catch(() => toast("could not send the report")); setReason(""); setAct(""); }}><label className="mt-3 block text-sm font-semibold">reason<textarea className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></label></ConfirmDialog>
    </>
  );
}

export function OrgPage() {
  const { handle = "" } = useParams();
  const { isFollowing, toggleFollow, hydrate } = useApp(); const toast = useToast();
  const [d, setD] = useState<{ org: OrgLite & { bio?: string }; followers: number } | null>(null); const [ups, setUps] = useState<FeedItem[]>([]); const [err, setErr] = useState("");
  const [fb, setFb] = useState({ category: "general", rating: 0, text: "" }); const [fbMsg, setFbMsg] = useState("");
  useEffect(() => {
    social.orgPage(handle).then((r) => { setD(r); void feedService.list({ tab: "you", cat: "all", topic: null, org: r.org._id }).then((f) => { setUps(f.items); hydrate(f.items); }); }).catch((e) => setErr(msg(e, "organization not found.")));
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <p role="alert">{err} <Link to="/app" className="font-semibold text-primary">back to feed</Link></p>;
  if (!d) return <div className="h-40 animate-pulse rounded-2xl bg-hairline" aria-hidden />;
  const on = isFollowing("org", d.org._id);
  const sendFb = async () => { try { await social.sendFeedback(handle, { category: fb.category, rating: fb.rating || undefined, text: fb.text }); setFb({ category: "general", rating: 0, text: "" }); setFbMsg("thank you. your feedback was sent privately to the team."); } catch (e) { setFbMsg(msg(e, "could not send feedback. your text is still here.")); } };
  return (
    <>
      {d.org.banner ? <img src={d.org.banner} alt="" width={800} height={224} className="h-28 w-full rounded-3xl object-cover" /> : <div className="h-28 rounded-3xl bg-primary" aria-hidden />}
      <img src={d.org.logo || avatar(d.org.handle, "initials")} alt="" width={80} height={80} className="-mt-10 ml-5 size-20 rounded-2xl border-4 border-white bg-hairline object-cover" />
      <h1 className="mt-2 text-3xl">{d.org.name}</h1><p className="text-body">@{d.org.handle} · {d.followers} followers</p>
      {(d.org.bio || d.org.description) && <p className="mt-3 whitespace-pre-line break-words">{d.org.bio || d.org.description}</p>}
      <Button className="mt-4" variant={on ? "outline" : "primary"} aria-pressed={on} onClick={() => void toggleFollow("org", d.org._id).catch(() => toast("could not update follow"))}>{on ? "following" : "follow"}</Button>
      <h2 className="mt-8 text-xl">updates</h2>{!ups.length && <p className="mt-2 text-body">no updates published yet.</p>}{ups.map((u) => <UpdateCard key={u.id} u={u} />)}
      <section className="mt-8 rounded-2xl border-2 border-hairline p-5"><h2 className="text-xl">send feedback</h2><p className="text-sm text-body">goes privately to the organization's team.</p>
        <label className="mt-3 block text-sm font-semibold">category<select className={inputCls} value={fb.category} onChange={(e) => setFb({ ...fb, category: e.target.value })}>{["general", "content", "community", "bug"].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="mt-3 block text-sm font-semibold">rating (optional)<select className={inputCls} value={fb.rating} onChange={(e) => setFb({ ...fb, rating: Number(e.target.value) })}><option value={0}>no rating</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <label className="mt-3 block text-sm font-semibold">your feedback<textarea className={`${inputCls} min-h-24`} value={fb.text} onChange={(e) => setFb({ ...fb, text: e.target.value })} /></label>
        <Button className="mt-3" disabled={fb.text.trim().length < 5} onClick={() => void sendFb()}>send feedback</Button><p role="status" className="mt-2 text-sm font-semibold text-primary">{fbMsg}</p></section>
    </>
  );
}

function Switch({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return <label className="flex min-h-11 items-center justify-between gap-3 border-b-2 border-hairline py-2 font-semibold"><span>{label}</span><input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} className="size-5 accent-[#6903d3]" /></label>;
}
export function PersonalSettings() {
  const { user, setUser } = useApp(); const nav = useNavigate(); const toast = useToast();
  const { config } = useApp();
  const [f, setF] = useState({ name: user?.name ?? "", username: user?.username ?? "", bio: user?.bio ?? "" });
  const [pay, setPay] = useState({ preferred: user?.payments.preferred ?? "", paypalEmail: user?.payments.paypalEmail ?? "" }); const [err, setErr] = useState(""); const [typed, setTyped] = useState("");
  const [links, setLinks] = useState((user?.links ?? []).join("\n")); const [sessions, setSessions] = useState<{ id: string; userAgent?: string; createdAt?: string; current: boolean }[]>([]); const [pw, setPw] = useState({ current: "", next: "" });
  useEffect(() => { void authService.sessions().then(setSessions).catch(() => undefined); }, []);
  if (!user) return null;
  const saveProfile = async () => { try { setUser(await authService.updateMe(f)); setErr(""); toast("profile saved"); } catch (e) { setErr(msg(e, "could not save your profile.")); } };
  const savePay = async () => { try { setUser(await authService.updateMe({ payments: { ...(pay.preferred ? { preferred: pay.preferred } : {}), paypalEmail: pay.paypalEmail } })); toast("payment settings saved"); } catch (e) { setErr(msg(e, "could not save payment settings.")); } };
  const pref = async (p: Record<string, unknown>) => { try { setUser(await authService.updateMe(p)); } catch (e) { toast(msg(e, "could not save that setting.")); } };
  return (
    <>
      <h1 className="text-3xl">settings</h1>
      <section className="mt-5"><h2 className="text-xl">profile</h2>
        <label className="mt-2 block text-sm font-semibold">name<input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="mt-3 block text-sm font-semibold">username<input className={inputCls} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
        <label className="mt-3 block text-sm font-semibold">bio<textarea className={`${inputCls} min-h-24`} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
        <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p><Button className="mt-2" onClick={() => void saveProfile()}>save profile</Button></section>
      <section className="mt-8"><h2 className="text-xl">privacy and messages</h2>
        <label className="mt-2 block text-sm font-semibold">who can see your profile<select value={user.visibility} onChange={(e) => void pref({ visibility: e.target.value })} className={inputCls}><option value="public">anyone</option><option value="followers">followers only</option><option value="members">people in my organizations</option><option value="private">only me</option></select></label>
        <Switch label="accept direct messages" on={user.acceptsDms} set={(v) => void pref({ acceptsDms: v })} />{!user.acceptsDms && <p className="text-sm text-body">people will see that you are not accepting messages.</p>}</section>
      <section className="mt-8"><h2 className="text-xl">photo and links</h2>
        <div className="mt-2 flex items-center gap-3"><img src={user.avatar} alt="your photo" width={64} height={64} className="size-16 rounded-full bg-hairline object-cover" /><ImagePicker kind="avatar" label="upload a new photo" onUploaded={(url) => void pref({ avatar: url })} /></div>
        <label className="mt-3 block text-sm font-semibold">links shown on your profile (one https link per line, up to 4)<textarea className={`${inputCls} min-h-20`} value={links} onChange={(e) => setLinks(e.target.value)} /></label>
        <Button className="mt-2" variant="outline" onClick={() => void pref({ links: links.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4) })}>save links</Button></section>
      <section className="mt-8"><h2 className="text-xl">notifications</h2><p className="text-sm text-body">choose what you want to be told about.</p>
        {([["updates", "new updates from organizations I follow"], ["comments", "comments and replies"], ["mentions", "mentions"], ["follows", "new followers"]] as const).map(([k, l]) => <Switch key={k} label={l} on={user.prefs[k]} set={(v) => void pref({ prefs: { [k]: v } })} />)}</section>
      <section className="mt-8"><h2 className="text-xl">payments</h2><p className="mt-1 text-sm text-body">choose how you like to pay for tips, and where paypal payouts should go.</p>
        {config.payments.providers.length ? <fieldset className="mt-2 grid gap-2"><legend className="sr-only">preferred payment method</legend>{config.payments.providers.map((p) => <label key={p.id} className="flex gap-2 font-semibold"><input type="radio" name="pay" checked={pay.preferred === p.id} onChange={() => setPay({ ...pay, preferred: p.id })} />{p.id === "paypal" ? "paypal" : "card or bank transfer"} ({p.currency})</label>)}</fieldset> : <p className="mt-2 text-body">payments are not turned on yet.</p>}
        <label className="mt-3 block text-sm font-semibold">paypal email (for payouts)<input type="email" className={inputCls} value={pay.paypalEmail} onChange={(e) => setPay({ ...pay, paypalEmail: e.target.value })} /></label><Button className="mt-2" onClick={() => void savePay()}>save payment settings</Button></section>
      <section className="mt-8"><h2 className="text-xl">account</h2><p className="mt-1 text-body">signed in as {user.email}. {user.hasPassword ? "email and password sign in is on." : ""} {user.hasGoogle ? "google sign in is linked." : "google can be linked by signing in with google using this same verified email."}</p>
        <p className="mt-2 text-sm text-body">theme: use the sun and moon button in the top bar. cookies: <Link to="/legal/cookies" className="font-semibold text-primary">preferences</Link>.</p>
        <Button variant="outline" className="mt-3" onClick={() => void social.exportMe().then((b) => saveBlob(b, "updatebase-export.json")).catch(() => toast("could not export your data"))}>export my data</Button></section>
      <section className="mt-8"><h2 className="text-xl">security</h2>
        <form className="mt-2 grid gap-3" onSubmit={(e) => { e.preventDefault(); void authService.changePassword({ current: pw.current || undefined, password: pw.next }).then(() => { toast("password changed. sign in again."); setUser(null); nav("/auth"); }).catch((x) => setErr(msg(x, "could not change the password."))); }}>
          {user.hasPassword && <label className="text-sm font-semibold">current password<input type="password" autoComplete="current-password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>}
          <label className="text-sm font-semibold">{user.hasPassword ? "new password" : "set a password"}<input type="password" autoComplete="new-password" className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
          <Button type="submit" variant="outline" disabled={pw.next.length < 8}>{user.hasPassword ? "change password" : "set password"}</Button></form>
        <p className="mt-1 text-xs text-body">changing your password signs you out on every device.</p>
        <h3 className="mt-4 text-base">signed in on</h3><ul className="mt-1 divide-y-2 divide-hairline text-sm">{sessions.map((x) => <li key={x.id} className="flex items-center gap-2 py-2"><span className="min-w-0 flex-1 truncate">{x.userAgent?.slice(0, 60) ?? "unknown device"}{x.current ? " (this device)" : ""}<span className="block text-xs text-body">{x.createdAt ? new Date(x.createdAt).toLocaleString("en") : ""}</span></span>{!x.current && <button className="font-semibold text-primary" onClick={() => void authService.revokeSession(x.id).then(() => setSessions((l) => l.filter((y) => y.id !== x.id)))}>sign out</button>}</li>)}</ul></section>
      <section className="mt-8 border-t-2 border-hairline pt-5"><h2 className="text-xl text-[#d02b2b]">delete account</h2><p className="text-sm text-body">this removes your profile, stories, comments and saved items. you must first transfer or delete organizations you own.</p>
        <label className="mt-2 block text-sm font-semibold">type delete to confirm<input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
        <Button className="mt-2" disabled={typed !== "delete"} onClick={() => void social.deleteMe().then(() => { setUser(null); nav("/"); }).catch((e) => setErr(msg(e, "could not delete your account.")))}>delete my account</Button></section>
    </>
  );
}
