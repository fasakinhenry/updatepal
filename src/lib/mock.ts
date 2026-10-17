import { env } from "@/lib/env";
// typed demo data and adapters. replace the functions in `api` with real http calls later.
export type Org = { id: string; name: string; role?: "owner" | "admin" | "delegate" };
export type Update = { id: string; org: string; cat: string; title: string; body: string; date: string; deadline?: string; place?: string; link?: string; tags: string[] };
export type Person = { id: string; name: string; handle: string; bio: string };
export type Hit = { kind: "organizations" | "people" | "opportunities" | "testimonials"; id: string; title: string; sub: string; to: string };

export const avatar = (seed: string, style = "thumbs") =>
  `${env.dicebear}/${style}/svg?seed=${encodeURIComponent(seed)}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const orgs: Org[] = [
  { id: "futa-techies", name: "futa techies", role: "owner" },
  { id: "gdg-akure", name: "gdg akure", role: "delegate" },
  { id: "tech4dev", name: "tech4dev" },
  { id: "paystack", name: "paystack" },
];
export const people: Person[] = [
  { id: "tobi", name: "tobi adeyemi", handle: "tobi_a", bio: "msc applicant, data science" },
  { id: "ngozi", name: "ngozi eze", handle: "ngozi_e", bio: "frontend engineer, fellowship alumna" },
  { id: "sade", name: "sade bello", handle: "sade_b", bio: "final year, computer science" },
];
export const updates: Update[] = [
  { id: "u1", org: "futa-techies", cat: "scholarship", title: "chevening 2027/28 is open", date: "oct 15", deadline: "nov 5", place: "united kingdom", link: "https://www.chevening.org", tags: ["scholarship", "masters", "uk"],
    body: "fully funded masters in the uk.\n\nyou need 2 years of work experience and 3 university choices.\n\nprepare your references early and read the eligibility notes before you apply. join the community for reminders and review help." },
  { id: "u2", org: "paystack", cat: "internship", title: "product design internship", date: "oct 14", deadline: "nov 12", place: "lagos or remote", tags: ["internship", "design", "remote"], body: "6 month paid internship on the product design team. portfolio required." },
  { id: "u3", org: "gdg-akure", cat: "hackathon", title: "campus hack challenge", date: "oct 12", deadline: "nov 20", place: "akure", tags: ["hackathon", "cash prize"], body: "48 hour build weekend with a cash prize pool. teams of up to 4." },
  { id: "u4", org: "tech4dev", cat: "fellowship", title: "women in stem fellowship", date: "oct 10", deadline: "dec 1", place: "remote", link: "https://example.org/apply", tags: ["fellowship", "remote", "women"], body: "12 week mentorship program with a stipend. beginners are welcome." },
  { id: "u5", org: "futa-techies", cat: "grant", title: "student founder grant", date: "oct 8", deadline: "dec 9", tags: ["grant", "entrepreneurship"], body: "seed grants for student led startups. submit a one page plan." },
];
export const stories = [
  { id: "s1", name: "tobi adeyemi", title: "how i prepared for chevening", body: "i started with the eligibility notes, then drafted my essays four times with feedback from the community.", ref: "u1" },
  { id: "s2", name: "ngozi eze", title: "what the fellowship changed for me", body: "mentorship gave me a portfolio review and my first remote role.", ref: "u4" },
];
export const notifications = [
  { id: "n1", type: "updates", text: "futa techies posted a scholarship update", to: "/app/update/u1" },
  { id: "n2", type: "social", text: "tobi_a started following you", to: "/app/profile" },
  { id: "n3", type: "social", text: "ngozi_e commented on your testimonial", to: "/app/testimonials" },
  { id: "n4", type: "orgs", text: "gdg akure invited you as a delegate", to: "/app/org" },
];
export const chats = [
  { id: "c1", name: "tobi adeyemi", last: "did you see the chevening update?", time: "2h" },
  { id: "c2", name: "ngozi eze", last: "happy to review your portfolio", time: "1d" },
];

export const api = {
  async updates() { await wait(600); return updates; },
  async react(): Promise<void> { await wait(250); if (!navigator.onLine) throw new Error("offline"); },
  async search(q: string): Promise<Hit[]> {
    await wait(400);
    const all = [
      ...orgs.map((o) => ({ kind: "organizations" as const, id: o.id, title: o.name, sub: "organization", to: "/app" })),
      ...people.map((p) => ({ kind: "people" as const, id: p.id, title: p.name, sub: p.bio, to: "/app/profile" })),
      ...updates.map((u) => ({ kind: "opportunities" as const, id: u.id, title: u.title, sub: `${u.cat} ${u.place ?? ""} ${u.tags.join(" ")} ${u.body}`, to: `/app/update/${u.id}` })),
      ...stories.map((s) => ({ kind: "testimonials" as const, id: s.id, title: s.title, sub: s.body, to: "/app/testimonials" })),
    ];
    const t = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return all.filter((h) => t.some((w) => `${h.title} ${h.sub}`.toLowerCase().includes(w)));
  },
};
