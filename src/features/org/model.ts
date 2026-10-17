// org domain types, capability model, demo data and the mock formatter.
// ui checks capabilities, never role names. the backend must enforce them.
import { useApp } from "@/app/state";
import { orgs as seed, type Org } from "@/lib/mock";

export type Role = "owner" | "admin" | "delegate" | "reviewer" | "documents" | "member";
export type Cap = "publish" | "review" | "documents" | "members" | "settings" | "analytics" | "wallet";
export const caps: Record<Role, Cap[]> = {
  owner: ["publish", "review", "documents", "members", "settings", "analytics", "wallet"],
  admin: ["publish", "review", "documents", "members", "analytics"],
  delegate: ["publish"], reviewer: ["review"], documents: ["documents"], member: [],
};
export const can = (r: Role | undefined, c: Cap) => !!r && caps[r].includes(c);
export const roles = Object.keys(caps) as Role[];

export function useOrgCtx() {
  const { ctx, setCtx, myOrgs } = useApp();
  const all: Org[] = [...seed.filter((o) => o.role), ...myOrgs];
  const org = all.find((o) => o.id === ctx);
  return { ctx, setCtx, all, org, role: org?.role as Role | undefined };
}

export type Member = { id: string; name: string; handle: string; role: Role; joined: string };
export const members0: Member[] = [
  { id: "m1", name: "fasakin henry", handle: "henqsoft", role: "owner", joined: "jan 2025" },
  { id: "m2", name: "sade bello", handle: "sade_b", role: "delegate", joined: "mar 2025" },
  { id: "m3", name: "tobi adeyemi", handle: "tobi_a", role: "reviewer", joined: "jun 2025" },
  { id: "m4", name: "ngozi eze", handle: "ngozi_e", role: "documents", joined: "aug 2025" },
];
export type InviteStatus = "pending" | "accepted" | "declined" | "expired" | "revoked";
export type Invite = { id: string; to: string; via: "email" | "username" | "link"; role: Role; status: InviteStatus };
export const invites0: Invite[] = [
  { id: "i1", to: "amaka@example.com", via: "email", role: "delegate", status: "pending" },
  { id: "i2", to: "kunle_o", via: "username", role: "member", status: "declined" },
  { id: "i3", to: "invite link (7 days)", via: "link", role: "member", status: "expired" },
];
export type DocKind = "folder" | "pdf" | "docx" | "xlsx" | "pptx" | "csv" | "txt" | "image";
export type Doc = { id: string; name: string; kind: DocKind; parent: string | null; size: number; by: string; modified: string; vis: "public" | "members" | "restricted" | "private" };
export const docs0: Doc[] = [
  { id: "f1", name: "brand kit", kind: "folder", parent: null, size: 0, by: "henqsoft", modified: "oct 10", vis: "members" },
  { id: "f2", name: "past updates", kind: "folder", parent: null, size: 0, by: "sade_b", modified: "oct 14", vis: "members" },
  { id: "d1", name: "publishing rules.pdf", kind: "pdf", parent: null, size: 220e3, by: "henqsoft", modified: "oct 2", vis: "members" },
  { id: "d2", name: "sponsor list.xlsx", kind: "xlsx", parent: null, size: 48e3, by: "ngozi_e", modified: "sep 28", vis: "restricted" },
  { id: "d3", name: "logo.png", kind: "image", parent: "f1", size: 90e3, by: "henqsoft", modified: "oct 10", vis: "public" },
];
export type Status = "draft" | "review" | "approved" | "scheduled" | "published";
export type Channel = "updatebase" | "whatsapp" | "facebook" | "instagram" | "linkedin" | "x";
export const channels: { id: Channel; label: string; max: number; integrated: boolean }[] = [
  { id: "whatsapp", label: "whatsapp", max: 4096, integrated: false }, { id: "updatebase", label: "updatebase", max: 3000, integrated: true },
  { id: "linkedin", label: "linkedin", max: 3000, integrated: false }, { id: "facebook", label: "facebook", max: 5000, integrated: false },
  { id: "instagram", label: "instagram", max: 2200, integrated: false }, { id: "x", label: "x", max: 280, integrated: false },
];
export type Draft = { id: string; title: string; source: string; body: string; status: Status; channel: Channel; date?: string };
export type Rules = { lowercase: boolean; numbering: boolean; prefix: string; next: number; footer: string; link: string; attribution: boolean; handle: string; instructions: string };
export const defaultRules: Rules = { lowercase: true, numbering: true, prefix: "✅", next: 153, footer: "from FUTA Techies", link: "https://bit.ly/futatechies2", attribution: true, handle: "HENQSOFT", instructions: "keep eligibility, deadlines, links and rewards exactly as written. short, friendly, lowercase." };

const cats: [RegExp, string][] = [[/scholar|fellowship|grant|bursary/i, "🎓 scholarship update"], [/hackathon|competition|challenge/i, "🚀 hackathon update"], [/intern/i, "💼 internship update"], [/job|hiring|vacanc|engineer|developer/i, "💻 tech opportunity"]];
/** deterministic stand-in for the backend ai formatter. never invents facts, flags what is missing. */
export function formatUpdate(src: string, r: Rules, ch: Channel, hint = ""): { text: string; warnings: string[] } {
  const clean = src.replace(/\r/g, "").trim();
  if (!clean) return { text: "", warnings: ["paste an announcement first."] };
  const urls = [...new Set(clean.match(/https?:\/\/\S+/g) ?? [])];
  const lines = clean.replace(/https?:\/\/\S+/g, "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const cat = cats.find(([re]) => re.test(clean))?.[1] ?? "📢 community update";
  const dl = clean.match(/(?:deadline|closes?|apply (?:by|before))[:\s-]+([^\n.]+)/i)?.[1]?.trim();
  // the deadline and links are re-added in the footer, so drop lines that only carry them
  let rest = lines.slice(1).filter((l) => !/^(deadline|closes?)[:\s-]/i.test(l) && !/(apply|register|link|visit)( at| here| via| on| through)?:?$/i.test(l));
  if (/short/i.test(hint)) rest = rest.slice(0, 2);
  const title = ch === "whatsapp" ? `*${lines[0]}*` : lines[0];
  const dlLine = dl ? `⏰ deadline: ${dl}` : "";
  const top = [cat, /deadline/i.test(hint) ? dlLine : "", title, rest.join("\n")].filter(Boolean).join("\n\n");
  const tail = [/deadline/i.test(hint) ? "" : dlLine, ...urls.map((u) => `🔗 ${u}`), r.link ? `join the community: ${r.link}` : "", r.numbering ? `${r.prefix} ${r.next}` : "", [r.attribution ? r.handle : "", r.footer].filter(Boolean).join(" ")].filter(Boolean).join("\n");
  const text = `${r.lowercase ? top.toLowerCase() : top}\n\n${tail}`;
  const max = channels.find((c) => c.id === ch)!;
  const warnings = [!dl && "no deadline found in the source. check it before posting.", !urls.length && "no registration link found in the source.", text.length > max.max && `over the ${max.label} limit of ${max.max} characters. shorten it before posting.`].filter(Boolean) as string[];
  return { text, warnings };
}
