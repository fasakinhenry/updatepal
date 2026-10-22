// capability model (mirrors the backend, which is the real enforcement), shared org types and the org context hook.
import { useApp } from "@/app/state";
import type { OrgRole } from "@/lib/types";

export type Role = OrgRole;
export type Cap = "publish" | "review" | "documents" | "members" | "settings" | "analytics" | "wallet";
export const caps: Record<Role, Cap[]> = {
  owner: ["publish", "review", "documents", "members", "settings", "analytics", "wallet"],
  admin: ["publish", "review", "documents", "members", "analytics"],
  delegate: ["publish"], reviewer: ["review"], documents: ["documents"], member: [],
};
/** a role gives base capabilities. owners can grant individual members more. the server enforces the real rules. */
export const can = (r: Role | undefined, c: Cap, grants?: readonly string[]) => !!r && (caps[r].includes(c) || !!grants?.includes(c));
export const roles = Object.keys(caps) as Role[];

export function useOrgCtx() {
  const { ctx, setCtx, myOrgs } = useApp();
  const org = myOrgs.find((o) => o.id === ctx);
  return { ctx, setCtx, all: myOrgs, org, role: org?.role as Role | undefined, grants: org?.grants ?? [], channelsAssigned: org?.channels ?? [] };
}

export type Status = "draft" | "review" | "approved" | "scheduled" | "published";
export type Channel = "updatebase" | "whatsapp" | "facebook" | "instagram" | "linkedin" | "x";
export const channels: { id: Channel; max: number; integrated: boolean }[] = [
  { id: "whatsapp", max: 4096, integrated: false }, { id: "updatebase", max: 3000, integrated: true }, { id: "linkedin", max: 3000, integrated: false },
  { id: "facebook", max: 5000, integrated: false }, { id: "instagram", max: 2200, integrated: false }, { id: "x", max: 280, integrated: false },
];
export type Draft = { id: string; title: string; source: string; body: string; status: Status; channel: Channel; scheduledFor?: string };
export type Rules = { lowercase: boolean; numbering: boolean; prefix: string; next: number; footer: string; link: string; attribution: boolean; handle: string; instructions: string; tone: string; categories: string[]; maxLength: number; useExamples: boolean; requireReview: boolean };
export type Member = { userId: string; role: Role; grants?: string[]; channels?: string[]; joined: string; user?: { name?: string; username?: string; avatar?: string } };
export type InviteStatus = "pending" | "accepted" | "declined" | "expired" | "revoked";
export type Invite = { _id: string; email?: string; username?: string; via: "email" | "username" | "link"; role: Role; status: InviteStatus; expiresAt: string };
export type DocKind = "folder" | "pdf" | "docx" | "xlsx" | "pptx" | "csv" | "txt" | "image";
export type Vis = "public" | "members" | "restricted" | "private";
export type Doc = { _id: string; name: string; kind: DocKind; size: number; vis: Vis; uploadedBy?: string; updatedAt: string };
