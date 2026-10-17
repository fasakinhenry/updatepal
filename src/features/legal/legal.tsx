import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { usePersisted } from "@/app/state";

const docs: Record<string, [string, string[]]> = {
  privacy: ["privacy policy", ["we collect the details you give us, like your name, username and the updates you publish.", "we use them to run updatebase, personalize opportunities and keep the platform safe.", "you can ask to export or delete your data from settings."]],
  terms: ["terms of service", ["you are responsible for what you publish and for keeping your account secure.", "organizations are responsible for their members and the content they post.", "we may remove content that breaks the rules or the law."]],
  cookies: ["cookie policy", ["necessary storage keeps you signed in and remembers your theme. it cannot be turned off.", "optional analytics and marketing storage stays off unless you allow it."]],
};
type Consent = { done: boolean; analytics: boolean; marketing: boolean };
const init: Consent = { done: false, analytics: false, marketing: false };

export function CookiePrefs({ onDone }: { onDone?: () => void }) {
  const [c, setC] = usePersisted<Consent>("ub-consent", init);
  const save = (n: Partial<Consent>) => { setC({ ...c, ...n, done: true }); onDone?.(); };
  const row = (k: "analytics" | "marketing", t: string, d: string) => <label className="flex gap-3 rounded-2xl border-2 border-hairline p-3"><input type="checkbox" checked={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.checked })} /><span><span className="block font-semibold">{t}</span><span className="text-sm text-body">{d}</span></span></label>;
  return (
    <div className="grid gap-3">
      <p className="rounded-2xl bg-hairline p-3 text-sm"><b>necessary</b>: sign in, theme and security. always on.</p>
      {row("analytics", "analytics", "helps us see which pages are useful. no scripts load in this build.")}
      {row("marketing", "marketing", "used for campaigns. no scripts load in this build.")}
      <div className="flex flex-wrap gap-2"><Button onClick={() => save({})}>save choices</Button><Button variant="outline" onClick={() => save({ analytics: false, marketing: false })}>reject optional</Button><Button variant="outline" onClick={() => save({ analytics: true, marketing: true })}>accept all</Button></div>
    </div>
  );
}

export function CookieBanner() {
  const [c, setC] = usePersisted<Consent>("ub-consent", init);
  const [more, setMore] = useState(false);
  if (c.done) return null;
  return (
    <section aria-label="cookie preferences" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-lg rounded-3xl border-2 border-pink bg-white p-4 shadow-[3px_4px_0_0_#ed0578] lg:bottom-4">
      <p className="font-semibold">cookies, your call.</p><p className="text-sm text-body">we use necessary storage to run the app. optional analytics and marketing stay off unless you allow them.</p>
      {more ? <div className="mt-3"><CookiePrefs /></div> : <div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => setC({ done: true, analytics: true, marketing: true })}>accept all</Button><Button variant="outline" onClick={() => setC({ ...init, done: true })}>reject optional</Button><Button variant="outline" onClick={() => setMore(true)}>customize</Button></div>}
    </section>
  );
}

export function LegalPage() {
  const { doc = "" } = useParams();
  const d = docs[doc];
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link to="/" className="font-semibold text-primary">back home</Link>
      {!d ? <p className="mt-6">that page does not exist.</p> : <>
        <h1 className="mt-4 text-4xl">{d[0]}</h1>
        <p className="mt-3 rounded-2xl bg-hairline p-3 text-sm font-semibold">draft for legal review. not final, and not reviewed by a lawyer.</p>
        {d[1].map((p) => <p key={p} className="mt-4 text-body">{p}</p>)}
        {doc === "cookies" && <section className="mt-8"><h2 className="mb-3 text-2xl">your choices</h2><CookiePrefs /></section>}
      </>}
    </main>
  );
}
