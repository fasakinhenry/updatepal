import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type Org } from "@/lib/mock";

export function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }, [key, v]);
  return [v, setV] as const;
}

export type User = { email: string; name: string; username: string; avatar: string; bio: string; onboarded: boolean };
type Ctx = {
  user: User | null; setUser: (u: User | null) => void;
  bookmarks: string[]; toggleBookmark: (id: string) => void;
  liked: string[]; toggleLike: (id: string) => Promise<void>;
  followed: string[]; toggleFollow: (id: string) => void;
  read: string[]; markRead: (ids: string[]) => void;
  bdates: Record<string, string>;
  reshared: string[]; toggleReshare: (id: string) => void;
  ctx: string; setCtx: (c: string) => void; myOrgs: Org[]; addOrg: (o: Org) => void;
};
const C = createContext<Ctx | null>(null);
const flip = (a: string[], id: string) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = usePersisted<User | null>("ub-user", null);
  const [bookmarks, setB] = usePersisted<string[]>("ub-bookmarks", []);
  const [liked, setL] = usePersisted<string[]>("ub-liked", []);
  const [followed, setF] = usePersisted<string[]>("ub-followed", ["futa-techies", "tech4dev"]);
  const [read, setR] = usePersisted<string[]>("ub-read", []);
  const [bdates, setBD] = usePersisted<Record<string, string>>("ub-bdates", {});
  const [reshared, setRS] = usePersisted<string[]>("ub-reshared", []);
  const [ctx, setCtx] = usePersisted("ub-ctx", "personal");
  const [myOrgs, setMy] = usePersisted<Org[]>("ub-myorgs", []);
  const toggleLike = async (id: string) => {
    setL((l) => flip(l, id)); // optimistic
    try { await api.react(); } catch (e) { setL((l) => flip(l, id)); throw e; } // rollback
  };
  return (
    <C.Provider value={{ user, setUser, bookmarks, toggleBookmark: (id) => { if (!bookmarks.includes(id)) setBD((d) => ({ ...d, [id]: new Date().toISOString() })); setB((b) => flip(b, id)); }, bdates, reshared, toggleReshare: (id) => setRS((r) => flip(r, id)), liked, toggleLike, followed, toggleFollow: (id) => setF((f) => flip(f, id)), read, markRead: (ids) => setR((r) => [...new Set([...r, ...ids])]), ctx, setCtx, myOrgs, addOrg: (o) => setMy((m) => [...m, o]) }}>
      {children}
    </C.Provider>
  );
}
export function useApp() { const c = useContext(C); if (!c) throw new Error("AppProvider missing"); return c; }
