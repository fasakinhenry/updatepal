import { Button } from "@/components/ui/button";

export const inputCls = "mt-1 w-full rounded-xl border border-lilac bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-primary";
export const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${on ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`;

export function Locked({ what }: { what: string }) {
  return <div role="status" className="rounded-2xl bg-hairline p-6"><p className="font-display text-xl font-bold">not available for your role.</p><p className="mt-1 text-body">{what} needs a permission you do not have in this organization. ask an owner or admin. the server enforces this too.</p></div>;
}
export function NoOrg() {
  return <div className="rounded-2xl bg-cream p-6"><p className="font-display text-xl font-bold">switch to an organization first.</p><p className="mt-1 text-body">use the "acting as" menu, or create one.</p><Button to="/app/org/new" className="mt-3">create an organization</Button></div>;
}
