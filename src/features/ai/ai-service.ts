import { post } from "@/lib/http";

export type Turn = { key: string; question: string; answer: string };
export type Next = { done: boolean; key?: string; question?: string; suggestions?: string[]; example?: string; bio?: string; aiUsed: boolean };
export const aiService = {
  profileNext: (name: string, turns: Turn[]) => post<Next>("/ai/profile/next", { name, turns }),
  profileBio: (name: string, turns: Turn[]) => post<{ bio: string; aiUsed: boolean }>("/ai/profile/bio", { name, turns }),
  orgBio: (name: string, answers: { q: string; a: string }[]) => post<{ bio: string; aiUsed: boolean }>("/ai/org/bio", { name, answers }),
};
