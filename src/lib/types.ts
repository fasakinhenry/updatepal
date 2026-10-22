import { env } from "./env";

export const avatar = (seed: string, style = "thumbs") => `${env.dicebear}/${style}/svg?seed=${encodeURIComponent(seed)}`;
export type OrgRole = "owner" | "admin" | "delegate" | "reviewer" | "documents" | "member";
export type Org = { id: string; name: string; handle?: string; role?: OrgRole; grants?: string[]; channels?: string[] };
export type Update = { id: string; org: string; orgName?: string; orgHandle?: string; cat: string; title: string; body: string; date: string; deadline?: string; place?: string; link?: string; tags: string[]; images?: string[]; number?: number; loves?: number; comments?: number };
export type PersonLite = { _id: string; name?: string; username?: string; avatar?: string; bio?: string };
export const day = (iso: string) => new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" }).toLowerCase();
