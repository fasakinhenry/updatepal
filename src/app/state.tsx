import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "@/features/auth/auth-service";
import { feedService } from "@/features/feed/feed-service";
import { social } from "@/features/social/social-service";
import type { Org } from "@/lib/types";
import { request } from "@/lib/http";
import { startRealtime } from "@/lib/realtime";

export type Provider = { id: "bachs" | "paypal"; label: string; currency: string; minTipMinor: number; batch: boolean };
export type Config = { announcement: string; maintenance: boolean; registrationOpen: boolean; payments: { enabled: boolean; feeBps: number; withdrawals: boolean; providers: Provider[]; withdrawalMethods: { id: "bank" | "paypal"; currency: string; minMinor: number }[] } };
const noConfig: Config = { announcement: "", maintenance: false, registrationOpen: true, payments: { enabled: false, feeBps: 0, withdrawals: false, providers: [], withdrawalMethods: [] } };

export function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }, [key, v]);
  return [v, setV] as const;
}

export type User = { id: string; email: string; name: string; username: string; avatar: string; bio: string; onboarded: boolean; acceptsDms: boolean; visibility: string; interests: string[]; hasGoogle: boolean; hasPassword: boolean; isAdmin: boolean; payments: { preferred: string | null; paypalEmail: string }; prefs: { updates: boolean; comments: boolean; mentions: boolean; follows: boolean }; links: string[] };
type Hydrate = { id: string; loved?: boolean; bookmarked?: boolean }[];
type Ctx = {
  user: User | null; setUser: (u: User | null) => void; ready: boolean;
  liked: string[]; bookmarks: string[]; toggleLike: (id: string) => Promise<void>; toggleBookmark: (id: string) => void; hydrate: (items: Hydrate) => void;
  follows: string[]; isFollowing: (kind: "org" | "user", id: string) => boolean; toggleFollow: (kind: "org" | "user", id: string) => Promise<void>;
  myOrgs: Org[]; setMyOrgs: (o: Org[]) => void; addOrg: (o: Org) => void; ctx: string; setCtx: (c: string) => void;
  unread: number; refreshUnread: () => void; config: Config;
};
const C = createContext<Ctx | null>(null);
const flip = (a: string[], id: string) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);

export function AppProvider({ children }: { children: ReactNode }) {
  // the user lives in memory only. the session comes back from the httpOnly refresh cookie.
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [liked, setL] = useState<string[]>([]);
  const [bookmarks, setB] = useState<string[]>([]);
  const [follows, setF] = useState<string[]>([]);
  const [myOrgs, setMyOrgs] = useState<Org[]>([]);
  const [ctx, setCtx] = usePersisted("ub-ctx", "personal");
  const [unread, setUnread] = useState(0);
  const [config, setConfig] = useState<Config>(noConfig);
  useEffect(() => { void request<Config>("/config").then(setConfig).catch(() => undefined); }, []);

  useEffect(() => { void authService.restore().then(setUser).finally(() => setReady(true)); }, []);
  useEffect(() => { if (user) void social.follows().then((r) => setF(r.items.map((f) => `${f.kind}:${f.target}`))).catch(() => undefined); else { setF([]); setL([]); setB([]); setMyOrgs([]); } }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const refreshUnread = useCallback(() => { if (user) void social.unreadCount().then(setUnread).catch(() => undefined); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { refreshUnread(); const t = setInterval(refreshUnread, 120_000); return () => clearInterval(t); }, [refreshUnread]);
  // live pings: tell open pages something changed so they can refresh
  useEffect(() => { if (!user) return; return startRealtime((e) => { if (e === "notification") refreshUnread(); window.dispatchEvent(new CustomEvent(`ub:${e}`)); }); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hydrate = (items: Hydrate) => {
    const ids = items.map((i) => i.id);
    setL((l) => [...l.filter((x) => !ids.includes(x)), ...items.filter((i) => i.loved).map((i) => i.id)]);
    setB((b) => [...b.filter((x) => !ids.includes(x)), ...items.filter((i) => i.bookmarked).map((i) => i.id)]);
  };
  const toggleLike = async (id: string) => {
    const on = !liked.includes(id);
    setL((l) => flip(l, id)); // optimistic
    try { await feedService.love(id, on); } catch (e) { setL((l) => flip(l, id)); throw e; } // rollback
  };
  const toggleBookmark = (id: string) => {
    const on = !bookmarks.includes(id);
    setB((b) => flip(b, id));
    feedService.bookmark(id, on).catch(() => setB((b) => flip(b, id)));
  };
  const toggleFollow = async (kind: "org" | "user", id: string) => {
    const key = `${kind}:${id}`, on = !follows.includes(key);
    setF((f) => flip(f, key));
    try { await social.follow(kind, id, on); } catch (e) { setF((f) => flip(f, key)); throw e; }
  };
  return (
    <C.Provider value={{ user, setUser, ready, liked, bookmarks, toggleLike, toggleBookmark, hydrate, follows, isFollowing: (k, id) => follows.includes(`${k}:${id}`), toggleFollow, myOrgs, setMyOrgs, addOrg: (o) => setMyOrgs((m) => [...m, o]), ctx, setCtx, unread, refreshUnread, config }}>
      {children}
    </C.Provider>
  );
}
export function useApp() { const c = useContext(C); if (!c) throw new Error("AppProvider missing"); return c; }
