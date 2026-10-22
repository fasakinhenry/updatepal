import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router";
import { House, MagnifyingGlass, Quotes, Bell, ChatCircle, BookmarkSimple, SignOut, Buildings, PencilLine, Files, CalendarBlank, UsersThree, ChartBar, Megaphone, Wallet, GearSix, ShieldCheck, Moon, Sun, WifiSlash, type Icon } from "@phosphor-icons/react";
import { useApp, usePersisted } from "@/app/state";
import { can, useOrgCtx, type Cap } from "@/features/org/model";
import { orgService } from "@/features/org/org-service";
import { authService } from "@/features/auth/auth-service";
import { CookieBanner } from "@/features/legal/legal";

type Item = [string, string, Icon, Cap?];
const personal: Item[] = [["feed", "/app", House], ["discover", "/app/discover", MagnifyingGlass], ["stories", "/app/stories", Quotes], ["alerts", "/app/notifications", Bell], ["messages", "/app/messages", ChatCircle]];
const orgItems: Item[] = [["overview", "/app/org", Buildings], ["feed", "/app", House], ["publish", "/app/org/publish", PencilLine, "publish"], ["documents", "/app/org/documents", Files, "documents"], ["calendar", "/app/org/calendar", CalendarBlank, "publish"], ["members", "/app/org/members", UsersThree, "members"], ["alerts", "/app/org/notifications", Bell], ["analytics", "/app/org/analytics", ChartBar, "analytics"], ["feedback", "/app/org/feedback", Megaphone, "analytics"], ["wallet", "/app/org/wallet", Wallet, "wallet"], ["settings", "/app/org/settings", GearSix, "settings"]];

function Theme() {
  const [t, setT] = usePersisted("ub-theme", "system");
  useEffect(() => { document.documentElement.classList.toggle("dark", t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches)); }, [t]);
  const dark = document.documentElement.classList.contains("dark");
  return <button aria-label={dark ? "switch to light theme" : "switch to dark theme"} onClick={() => setT(dark ? "light" : "dark")} className="grid size-10 shrink-0 place-items-center rounded-full border border-lilac">{dark ? <Sun /> : <Moon />}</button>;
}

export function Shell() {
  const { user, setUser, unread, setMyOrgs, config } = useApp();
  const nav_ = useNavigate();
  const { ctx, setCtx, all, org, role, grants } = useOrgCtx();
  const [q, setQ] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { if (user) void orgService.mine().then(setMyOrgs).catch(() => undefined); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => setOnline(navigator.onLine); addEventListener("online", f); addEventListener("offline", f); return () => { removeEventListener("online", f); removeEventListener("offline", f); }; }, []);
  const items = (org ? orgItems : personal).filter(([, , , c]) => !c || can(role, c, grants));
  const link = (a: boolean) => `flex items-center gap-3 rounded-full px-4 py-2.5 font-semibold ${a ? "bg-primary text-on-primary" : "hover:bg-primary/[.07]"}`;
  const out = () => { void authService.logout(); setUser(null); nav_("/"); };
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-2 overflow-y-auto border-r-2 border-hairline p-4 lg:flex">
        <Link to="/app" className="mb-4 flex items-center gap-2 px-2 font-display text-xl font-bold"><img src="/favicon.svg" alt="" width={28} height={28} />updatebase</Link>
        <nav aria-label="primary" className="grid gap-1">
          {items.map(([l, to, Ic]) => <NavLink viewTransition key={to} to={to} end className={({ isActive }) => link(isActive)}><Ic size={22} weight="fill" />{l}{l === "alerts" && !org && unread > 0 && <span className="ml-auto rounded-full bg-pink px-2 text-xs text-on-primary">{unread}</span>}</NavLink>)}
          {!org && <><NavLink to="/app/bookmarks" className={({ isActive }) => link(isActive)}><BookmarkSimple size={22} weight="fill" />bookmarks</NavLink><NavLink to="/app/wallet" className={({ isActive }) => link(isActive)}><Wallet size={22} weight="fill" />wallet</NavLink><NavLink to="/app/settings" className={({ isActive }) => link(isActive)}><GearSix size={22} weight="fill" />settings</NavLink>{user?.isAdmin && <NavLink to="/admin" className={({ isActive }) => link(isActive)}><ShieldCheck size={22} weight="fill" />admin</NavLink>}</>}
        </nav>
        <div className="mt-auto grid gap-3">
          <label className="text-xs font-semibold text-body">acting as
            <select value={org ? ctx : "personal"} onChange={(e) => { setCtx(e.target.value); nav_(e.target.value === "personal" ? "/app" : "/app/org"); }} className="mt-1 w-full rounded-xl border border-lilac bg-white px-3 py-2 text-sm text-ink">
              <option value="personal">personal account</option>
              {all.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.role})</option>)}
            </select>
          </label>
          <Link to="/app/org/new" className="px-2 text-sm font-semibold text-primary">create an organization</Link>
          <Link to="/app/profile" className="flex items-center gap-2 rounded-full p-1 font-semibold"><img src={user?.avatar} alt="" width={36} height={36} className="size-9 rounded-full bg-hairline object-cover" /><span className="truncate">{user?.username || user?.name || "you"}</span></Link>
          <button onClick={out} className="flex items-center gap-2 px-2 text-sm font-semibold text-body"><SignOut />sign out</button>
        </div>
      </aside>
      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-hairline bg-white/95 px-4 py-3 backdrop-blur">
          <Link to="/app" className="font-display text-lg font-bold lg:hidden">updatebase</Link>
          <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav_(`/app/discover?q=${encodeURIComponent(q.trim())}`); }} className="ml-auto w-full max-w-md">
            <input aria-label="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search opportunities, people, organizations" className="w-full rounded-full border border-lilac bg-white px-4 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary" />
          </form>
          <Theme />
          <Link to="/app/profile" className="lg:hidden" aria-label="profile"><img src={user?.avatar} alt="" width={36} height={36} className="size-9 rounded-full bg-hairline object-cover" /></Link>
        </header>
        {config.announcement && <p role="status" className="bg-night px-4 py-2 text-center text-sm font-semibold text-on-primary">{config.announcement}</p>}
        {!online && <p role="status" className="flex items-center gap-2 bg-pink px-4 py-2 text-sm font-semibold text-on-primary"><WifiSlash />you are offline. changes will not save until you reconnect.</p>}
        {org && <p className="bg-primary px-4 py-2 text-sm font-semibold text-on-primary">acting as {org.name}, your role: {role}</p>}
        {org && <nav aria-label="organization sections" className="flex gap-2 overflow-x-auto border-b-2 border-hairline px-4 py-2 lg:hidden">{items.map(([l, to]) => <NavLink key={to} to={to} end className={({ isActive }) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${isActive ? "bg-primary text-on-primary" : "border border-lilac text-primary"}`}>{l}</NavLink>)}</nav>}
        <div className="mx-auto max-w-3xl px-4 py-6"><Outlet /></div>
      </div>
      {!org && <nav aria-label="mobile" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t-2 border-hairline bg-white lg:hidden">
        {personal.map(([l, to, Ic]) => <NavLink key={to} to={to} end className={({ isActive }) => `relative grid min-h-14 place-items-center py-2 text-xs font-semibold ${isActive ? "text-primary" : "text-body"}`}><Ic size={24} weight="fill" />{l}{l === "alerts" && unread > 0 && <span className="absolute right-4 top-1 size-2.5 rounded-full bg-pink" aria-label="unread alerts" />}</NavLink>)}
      </nav>}
      <CookieBanner />
    </div>
  );
}
