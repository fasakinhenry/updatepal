import { post, request } from "@/lib/http";

export const money = (minor: number, currency = "NGN") => new Intl.NumberFormat("en", { style: "currency", currency }).format(minor / 100);
export type Quote = { currency: string; amount: number; fee: number; orgShare: number; posterShare: number; feeBps: number };
export type Entry = { _id: string; type: string; amount: number; currency?: string; note?: string; createdAt: string };
export type Wd = { _id: string; amount: number; currency: string; method: "bank" | "paypal"; status: "requested" | "paid" | "rejected"; createdAt: string; reference?: string; note?: string; bank?: { bankName?: string; last4?: string }; paypal?: { hint?: string } };
export type WalletData = { wallets: { currency: string; balance: number }[]; entries: Entry[]; withdrawals: Wd[]; minimums: Record<string, number>; withdrawalsEnabled: boolean };
export type PlanItem = { update?: { id: string; title: string; org: string; cat: string; why: string[] }; amount: number; reason: string };
export type Plan = { currency: string; summary: string; aiUsed: boolean; items: PlanItem[] };
export type WithdrawBody = { org?: string; amount: number } & ({ method: "bank"; bankCode: string; bankName?: string; accountNumber: string; accountName: string } | { method: "paypal"; paypalEmail: string });

export const paymentsService = {
  quote: (update: string, amount: number, provider: string) => request<Quote>(`/payments/tips/quote?update=${update}&amount=${amount}&provider=${provider}`),
  tip: (update: string, amount: number, provider: string) => post<{ checkoutUrl: string }>("/payments/tips", { update, amount, provider }),
  plan: (b: { instruction: string; budget: number; provider: string }) => post<Plan>("/payments/tips/plan", b),
  batch: (provider: string, items: { update: string; amount: number }[]) => post<{ checkoutUrl: string }>("/payments/tips/batch", { provider, items }),
  capture: (orderId: string) => post<{ completed: boolean; credited: number; total: number }>("/payments/paypal/capture", { orderId }),
  wallet: (org?: string) => request<WalletData>(`/payments/wallet${org ? `?org=${org}` : ""}`),
  withdraw: (b: WithdrawBody) => post("/payments/wallet/withdrawals", b),
};
