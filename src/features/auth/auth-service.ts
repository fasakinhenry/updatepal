import type { User } from "@/app/state";
import { patch, post, refresh, request, setToken } from "@/lib/http";
import { avatar } from "@/lib/types";

type ApiUser = { id: string; email: string; name?: string; username?: string; avatar?: string; bio?: string; onboarded: boolean; acceptsDms?: boolean; visibility?: string; interests?: string[]; hasGoogle?: boolean; hasPassword?: boolean; isAdmin?: boolean; payments?: { preferred: string | null; paypalEmail: string }; prefs?: User["prefs"]; links?: string[] };
type Session = { accessToken: string; user: ApiUser };
export const toUser = (u: ApiUser): User => ({ id: u.id, email: u.email, name: u.name ?? "", username: u.username ?? "", avatar: u.avatar || avatar(u.email), bio: u.bio ?? "", onboarded: u.onboarded, acceptsDms: u.acceptsDms ?? true, visibility: u.visibility ?? "public", interests: u.interests ?? [], hasGoogle: !!u.hasGoogle, hasPassword: !!u.hasPassword, isAdmin: !!u.isAdmin, payments: u.payments ?? { preferred: null, paypalEmail: "" }, prefs: u.prefs ?? { updates: true, comments: true, mentions: true, follows: true }, links: u.links ?? [] });
const open = (s: Session) => { setToken(s.accessToken); return toUser(s.user); };

export const authService = {
  register: (email: string, password: string) => post("/auth/register", { email, password }),
  resend: (email: string) => post("/auth/resend-verification", { email }),
  async login(email: string, password: string) { return open(await post<Session>("/auth/login", { email, password })); },
  async google(idToken: string) { return open(await post<Session>("/auth/google", { idToken })); },
  async verify(token: string) { return open(await post<Session>("/auth/verify-email", { token })); },
  forgot: (email: string) => post("/auth/forgot-password", { email }),
  reset: (token: string, password: string) => post("/auth/reset-password", { token, password }),
  async logout() { setToken(""); await post("/auth/logout").catch(() => undefined); },
  /** on page load: trade the refresh cookie for an access token and the latest profile. */
  async restore(): Promise<User | null> {
    if (!(await refresh())) return null;
    try { return toUser((await request<{ user: ApiUser }>("/users/me")).user); } catch { return null; }
  },
  changePassword: (b: { current?: string; password: string }) => post("/auth/change-password", b),
  sessions: async () => (await request<{ items: { id: string; userAgent?: string; createdAt?: string; current: boolean }[] }>("/auth/sessions")).items,
  revokeSession: (id: string) => request(`/auth/sessions/${id}`, { method: "DELETE" }),
  async updateMe(p: Record<string, unknown>): Promise<User> { return toUser((await patch<{ user: ApiUser }>("/users/me", p)).user); },
};
