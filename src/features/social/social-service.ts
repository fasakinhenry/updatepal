import { del, download, patch, post, put, request } from "@/lib/http";
import type { PersonLite } from "@/lib/types";

export type ApiStory = { _id: string; title: string; body: string; images?: string[]; createdAt: string; celebrations: number; celebrated?: boolean; bookmarked?: boolean; author?: PersonLite; refs: { id: string; title: string }[] };
export type Story = { id: string; title: string; body: string; images: string[]; createdAt: string; celebrations: number; celebrated: boolean; bookmarked: boolean; author?: PersonLite; refs: { id: string; title: string }[] };
export const presentStory = (s: ApiStory): Story => ({ id: s._id, title: s.title, body: s.body, images: s.images ?? [], createdAt: s.createdAt, celebrations: s.celebrations, celebrated: !!s.celebrated, bookmarked: !!s.bookmarked, author: s.author, refs: s.refs });
export type Note = { _id: string; type: string; text: string; link: string; read: boolean; createdAt: string };
export type OrgLite = { _id: string; handle: string; name: string; logo?: string; banner?: string; description?: string };
export type Profile = { restricted: boolean; id?: string; username?: string; name?: string; avatar?: string; bio?: string; interests?: string[]; links?: string[]; visibility?: string; acceptsDms?: boolean; following?: boolean; followers?: number; followingCount?: number; stories?: { _id: string; title: string; body: string; createdAt: string }[]; updates?: { _id: string; title: string; cat?: string; createdAt: string }[] };
export type Hit = { orgs: OrgLite[]; people: PersonLite[]; updates: { _id: string; title: string; cat?: string; place?: string }[]; stories: { _id: string; title: string }[]; terms: string[]; aiUsed: boolean };

export const social = {
  follows: () => request<{ items: { kind: "org" | "user"; target: string }[] }>("/users/me/follows"),
  follow: (kind: "org" | "user", target: string, on: boolean) => (on ? put("/users/follows", { kind, target }) : del("/users/follows", { kind, target })),
  discover: () => request<{ orgs: OrgLite[]; people: PersonLite[]; topics: string[]; recent: OrgLite[] }>("/discover"),
  search: (q: string, f: { place?: string; remote?: boolean }) => { const p = new URLSearchParams({ q }); if (f.place) p.set("place", f.place); if (f.remote) p.set("remote", "1"); return request<Hit>(`/search?${p}`); },
  async stories(cursor?: string | null, mine?: boolean) { const p = new URLSearchParams({ limit: "10" }); if (cursor) p.set("cursor", cursor); if (mine) p.set("mine", "1"); const r = await request<{ items: ApiStory[]; nextCursor: string | null }>(`/stories?${p}`); return { items: r.items.map(presentStory), nextCursor: r.nextCursor }; },
  createStory: (b: { title: string; body: string; refs: string[]; images: string[] }) => post("/stories", b),
  celebrate: (id: string, on: boolean) => (on ? put(`/stories/${id}/celebrate`) : del(`/stories/${id}/celebrate`)),
  bookmarkStory: (id: string, on: boolean) => (on ? put(`/stories/${id}/bookmark`) : del(`/stories/${id}/bookmark`)),
  notes: async (org?: string) => (await request<{ items: Note[]; unread: number }>(`/notifications${org ? `?org=${org}` : ""}`)).items,
  async unreadCount() { return (await request<{ unread: number }>("/notifications?unread=1")).unread; },
  markRead: (ids?: string[]) => post("/notifications/read", ids ? { ids } : {}),
  block: (userId: string, on: boolean) => (on ? put(`/blocks/${userId}`) : del(`/blocks/${userId}`)),
  report: (kind: "user" | "update" | "story" | "message" | "org", target: string, reason: string) => post("/reports", { kind, target, reason }),
  profile: async (username: string) => (await request<{ profile: Profile }>(`/users/by-username/${encodeURIComponent(username)}`)).profile,
  connections: async (username: string, kind: "followers" | "following") => (await request<{ items: PersonLite[] }>(`/users/by-username/${encodeURIComponent(username)}/connections?kind=${kind}`)).items,
  exportMe: () => download("/users/me/export"),
  deleteMe: () => del("/users/me", { confirm: "delete" }),
  orgPage: (handle: string) => request<{ org: OrgLite & { bio?: string; banner?: string }; followers: number }>(`/orgs/by-handle/${encodeURIComponent(handle)}`),
  sendFeedback: (handle: string, b: { category: string; rating?: number; text: string }) => post(`/orgs/by-handle/${encodeURIComponent(handle)}/feedback`, b),
  patchOrg: (id: string, b: Record<string, unknown>) => patch(`/orgs/${id}`, b),
};
