import { del, download, patch, post, request, upload } from "@/lib/http";
import type { Org } from "@/lib/types";
import type { Channel, Doc, DocKind, Draft, Invite, Member, Role, Rules, Vis } from "./model";

type ApiOrg = { _id: string; handle: string; name: string };
type ApiDraft = { _id: string; title: string; source: string; body: string; channel: Channel; status: Draft["status"]; scheduledFor?: string };
const toDraft = (d: ApiDraft): Draft => ({ id: d._id, title: d.title, source: d.source, body: d.body, channel: d.channel, status: d.status, scheduledFor: d.scheduledFor });
const isServerId = (id: string) => /^[a-f0-9]{24}$/.test(id);
export type Meta = { title: string; cat: string; tags: string[]; deadline?: string; images?: string[] };
export type Formatted = { text: string; warnings: string[]; category: string; aiUsed: boolean; usedExamples: number };
export type Overview = { followers: number; published30: number; drafts: { _id: string; title: string; status: string }[]; scheduled: number; pendingInvites: number; comments: { _id: string; body: string; update: string }[]; docs: { _id: string; name: string }[] };
export type CalItem = { id: string; kind: "published" | "scheduled" | "planned"; title: string; date: string; channel: string };
export type FeedbackItem = { _id: string; category: string; rating?: number; text: string; status: "new" | "reviewed"; note: string; createdAt: string };

export const orgService = {
  async mine(): Promise<Org[]> { return (await request<{ items: { role: Role; grants?: string[]; channels?: string[]; org: ApiOrg }[] }>("/orgs/mine")).items.map((i) => ({ id: i.org._id, name: i.org.name, handle: i.org.handle, role: i.role, grants: i.grants, channels: i.channels })); },
  async create(f: { name: string; handle: string; category: string; description: string; bio: string; logo?: string }): Promise<Org> { const o = (await post<{ org: ApiOrg }>("/orgs", f)).org; return { id: o._id, name: o.name, handle: o.handle, role: "owner" }; },
  async get(orgId: string) {
    const r = await request<{ org: { name: string; description: string; bio: string; handle: string; feedbackPublic: boolean; logo?: string; banner?: string; tipMode: string; tipOrgPercent: number; paypalEmail?: string; nextNumber: number; rules?: Partial<Rules> } }>(`/orgs/${orgId}`);
    const rules: Rules = { lowercase: false, numbering: false, prefix: "", footer: "", link: "", attribution: false, handle: "", instructions: "", tone: "", categories: [], maxLength: 900, useExamples: true, requireReview: false, ...r.org.rules, next: r.org.nextNumber };
    return { ...r.org, rules };
  },
  saveRules: (orgId: string, rules: Rules) => { const { next, ...rest } = rules; void next; return patch(`/orgs/${orgId}`, { rules: rest }); },
  format: (orgId: string, source: string, channel: Channel, hint: string) => post<Formatted & { numberIsPreview: boolean }>(`/orgs/${orgId}/format`, { source, channel, hint }),
  async drafts(orgId: string) { return (await request<{ items: ApiDraft[] }>(`/orgs/${orgId}/drafts`)).items.map(toDraft); },
  async saveDraft(orgId: string, d: Draft): Promise<Draft> {
    if (isServerId(d.id)) return toDraft((await patch<{ draft: ApiDraft }>(`/orgs/${orgId}/drafts/${d.id}`, { title: d.title, source: d.source, body: d.body, channel: d.channel, status: d.status === "scheduled" || d.status === "published" ? undefined : d.status })).draft);
    return toDraft((await post<{ draft: ApiDraft }>(`/orgs/${orgId}/drafts`, { title: d.title, source: d.source, body: d.body, channel: d.channel })).draft);
  },
  async schedule(orgId: string, id: string, when: Date, meta: Meta) { return toDraft((await patch<{ draft: ApiDraft }>(`/orgs/${orgId}/drafts/${id}`, { status: "scheduled", scheduledFor: when.toISOString(), meta })).draft); },
  async setStatus(orgId: string, id: string, status: Draft["status"]) { return toDraft((await patch<{ draft: ApiDraft }>(`/orgs/${orgId}/drafts/${id}`, { status })).draft); },
  deleteDraft: (orgId: string, id: string) => del(`/orgs/${orgId}/drafts/${id}`),
  async publish(orgId: string, id: string, meta: Meta) { return (await post<{ update: { _id: string; number?: number } }>(`/orgs/${orgId}/drafts/${id}/publish`, meta)).update; },
  overview: (orgId: string) => request<Overview>(`/orgs/${orgId}/overview`),
  analytics: (orgId: string, days: number) => request<{ series: { week: string; posts: number; loves: number; comments: number }[]; followers: { total: number; new: number } }>(`/orgs/${orgId}/analytics?days=${days}`),
  analyticsCsv: (orgId: string, days: number) => download(`/orgs/${orgId}/analytics.csv?days=${days}`),
  async calendar(orgId: string, month: string) { return (await request<{ items: CalItem[] }>(`/orgs/${orgId}/calendar?month=${month}`)).items; },
  async feedback(orgId: string) { return (await request<{ items: FeedbackItem[] }>(`/orgs/${orgId}/feedback`)).items; },
  patchFeedback: (orgId: string, id: string, b: { status?: string; note?: string }) => patch(`/orgs/${orgId}/feedback/${id}`, b),
  async members(orgId: string) { return (await request<{ items: Member[] }>(`/orgs/${orgId}/members`)).items; },
  setMember: (orgId: string, userId: string, b: { role?: Role; grants?: string[]; channels?: string[] }) => patch(`/orgs/${orgId}/members/${userId}`, b),
  removeMember: (orgId: string, userId: string) => del(`/orgs/${orgId}/members/${userId}`),
  async invites(orgId: string) { return (await request<{ items: Invite[] }>(`/orgs/${orgId}/invitations`)).items; },
  invite: (orgId: string, b: { via: "email" | "username" | "link"; email?: string; username?: string; role: Role }) => post<{ link?: string }>(`/orgs/${orgId}/invitations`, b),
  revokeInvite: (orgId: string, id: string) => del(`/orgs/${orgId}/invitations/${id}`),
  async docs(orgId: string, parent: string | null) { return (await request<{ items: Doc[] }>(`/orgs/${orgId}/documents${parent ? `?parent=${parent}` : ""}`)).items; },
  createDoc: (orgId: string, b: { name: string; kind: DocKind; parent: string | null; vis: Vis }) => post<{ document: Doc }>(`/orgs/${orgId}/documents`, b),
  uploadDoc: (orgId: string, id: string, file: File) => upload(`/orgs/${orgId}/documents/${id}/content`, file),
  downloadDoc: (orgId: string, id: string) => download(`/orgs/${orgId}/documents/${id}/content`),
  setDocVis: (orgId: string, id: string, vis: Vis) => patch(`/orgs/${orgId}/documents/${id}`, { vis }),
  deleteDoc: (orgId: string, id: string) => del(`/orgs/${orgId}/documents/${id}`),
  transfer: (orgId: string, userId: string, confirm: string) => post(`/orgs/${orgId}/transfer`, { userId, confirm }),
  remove: (orgId: string, confirm: string) => del(`/orgs/${orgId}`, { confirm }),
  saveTips: (orgId: string, tipMode: string, tipOrgPercent: number, paypalEmail: string) => patch(`/orgs/${orgId}`, { tipMode, tipOrgPercent, paypalEmail }),
  setFeedbackPublic: (orgId: string, on: boolean) => patch(`/orgs/${orgId}`, { feedbackPublic: on }),
  saveIdentity: (orgId: string, b: { name: string; description: string; bio: string; logo?: string; banner?: string }) => patch(`/orgs/${orgId}`, b),
};
