import { del, put, post, request } from "@/lib/http";
import { day, type Update } from "@/lib/types";
import { presentStory, type ApiStory, type Story } from "@/features/social/social-service";

type ApiUpdate = { _id: string; org?: { _id: string; handle: string; name: string }; cat?: string; title: string; body: string; createdAt: string; deadline?: string; place?: string; link?: string; tags?: string[]; number?: number; images?: string[]; counts?: { loves: number; comments: number }; loved?: boolean; bookmarked?: boolean };
export type FeedItem = Update & { loved?: boolean; bookmarked?: boolean };
export const toUpdate = (x: ApiUpdate): FeedItem => ({
  id: x._id, org: x.org?._id ?? "", orgName: x.org?.name, orgHandle: x.org?.handle, cat: x.cat ?? "update", title: x.title, body: x.body, date: day(x.createdAt),
  deadline: x.deadline, place: x.place, link: x.link, tags: x.tags ?? [], images: x.images ?? [], number: x.number, loves: x.counts?.loves, comments: x.counts?.comments, loved: x.loved, bookmarked: x.bookmarked,
});
export type Comment = { _id: string; body: string; createdAt: string; parent?: string; author?: { name?: string; username?: string; avatar?: string }; org?: { name: string; handle: string } };
export type Saved = { kind: "update" | "story"; savedAt: string; update?: FeedItem; story?: Story };

export const feedService = {
  async list(q: { tab: "you" | "following"; cat: string; topic: string | null; org?: string; cursor?: string | null }) {
    const p = new URLSearchParams({ tab: q.tab === "you" ? "for-you" : "following", limit: "10" });
    if (q.cat !== "all") p.set("cat", q.cat);
    if (q.topic) p.set("topic", q.topic);
    if (q.org) p.set("org", q.org);
    if (q.cursor) p.set("cursor", q.cursor);
    const r = await request<{ items: ApiUpdate[]; nextCursor: string | null }>(`/feed?${p}`);
    return { items: r.items.map(toUpdate), nextCursor: r.nextCursor };
  },
  async get(id: string) { return toUpdate((await request<{ update: ApiUpdate }>(`/updates/${id}`)).update); },
  love: (id: string, on: boolean) => (on ? put(`/updates/${id}/love`) : del(`/updates/${id}/love`)),
  bookmark: (id: string, on: boolean) => (on ? put(`/updates/${id}/bookmark`) : del(`/updates/${id}/bookmark`)),
  async comments(id: string) { return (await request<{ items: Comment[] }>(`/updates/${id}/comments`)).items; },
  async comment(id: string, body: string, asOrg?: string, parent?: string) { return (await post<{ comment: Comment }>(`/updates/${id}/comments`, { body, asOrg, parent })).comment; },
  async saved(): Promise<Saved[]> {
    const r = await request<{ items: { kind: "update" | "story"; savedAt: string; update?: ApiUpdate; story?: ApiStory }[] }>("/bookmarks");
    return r.items.map((i) => ({ kind: i.kind, savedAt: i.savedAt, update: i.update && toUpdate(i.update), story: i.story && presentStory(i.story) }));
  },
};
