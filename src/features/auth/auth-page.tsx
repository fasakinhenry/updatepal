import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { CaretLeft, CaretRight, EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useApp, type User } from "@/app/state";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { authService } from "./auth-service";

const slides = [
  ["discover", "find scholarships, jobs and grants from organizations you follow."],
  ["publish", "paste an announcement and get a branded update in your style."],
  ["collaborate", "invite delegates, review drafts and publish together."],
  ["celebrate", "read stories from people who got in, and share yours."],
];
type Mode = "signin" | "signup" | "forgot" | "verify";

declare global {
  interface Window { google?: { accounts: { id: { initialize(o: { client_id: string; callback: (r: { credential: string }) => void }): void; renderButton(el: HTMLElement, o: { theme: string; size: string; text: string; width: number }): void } } } }
}
// google identity button. the id token is sent to the backend, which verifies it. nothing is trusted client side.
function GoogleButton({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken); cb.current = onToken;
  useEffect(() => {
    const init = () => { window.google?.accounts.id.initialize({ client_id: env.googleClientId, callback: (r) => cb.current(r.credential) }); if (ref.current) window.google?.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", text: "continue_with", width: 360 }); };
    if (window.google) return init();
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = init; document.head.appendChild(s);
  }, []);
  return <div ref={ref} className="min-h-11" />;
}

export function AuthPage() {
  const { setUser } = useApp();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [i, setI] = useState(0);

  const finish = (u: User) => { setUser(u); nav(u.onboarded ? "/app" : "/onboarding"); };
  const fail = (e: unknown) => {
    if (e instanceof ApiError) { if (e.code === "email_not_verified") return setMode("verify"); return setErr(e.message); }
    setErr("something went wrong. your details are still here, try again.");
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("enter a valid email address.");
    if (mode !== "forgot" && pw.length < 8) return setErr("use at least 8 characters for your password.");
    setBusy(true);
    try {
      if (mode === "forgot") { await authService.forgot(email); setMsg("if that email has an account, a reset link is on its way."); }
      else if (mode === "signup") { await authService.register(email, pw); setMode("verify"); }
      else finish(await authService.login(email, pw));
    } catch (x) { fail(x); } finally { setBusy(false); }
  };
  const google = async (token: string) => { setBusy(true); setErr(""); try { finish(await authService.google(token)); } catch (x) { fail(x); } finally { setBusy(false); } };
  const resend = async () => { setErr(""); setMsg(""); try { await authService.resend(email); setMsg("sent. check your inbox and spam folder."); } catch (x) { fail(x); } };
  const field = "mt-1 w-full rounded-xl border border-lilac bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main className="flex flex-col justify-center px-6 py-10 sm:px-16">
        <Link to="/" className="mb-10 flex items-center gap-2 font-display text-xl font-bold"><img src="/favicon.svg" alt="" width={28} height={28} />updatebase</Link>
        <h1 className="text-4xl">{{ signin: "welcome back.", signup: "create your account.", forgot: "reset your password.", verify: "check your email." }[mode]}</h1>
        {mode === "verify" ? (
          <div className="mt-6 max-w-md">
            <p className="text-body">we sent a verification link to {email || "your email"}. open it to confirm your address, then sign in.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => void resend()}>resend email</Button><Button variant="outline" onClick={() => setMode("signin")}>back to sign in</Button>
            </div>
            <p role="status" className="mt-2 text-sm font-semibold text-primary">{msg}</p><p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
          </div>
        ) : (
          <div className="mt-6 max-w-md">
            {mode !== "forgot" && (
              <>
                {env.googleClientId ? <GoogleButton onToken={(t) => void google(t)} /> : null}
                {env.googleClientId && <p className="my-5 text-center text-sm text-body">or use email</p>}
              </>
            )}
            <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
              <label className="text-sm font-semibold">email<input className={field} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              {mode !== "forgot" && <label className="text-sm font-semibold">password<input className={field} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} /></label>}
              <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
              <p role="status" className="text-sm font-semibold text-primary">{msg}</p>
              <Button type="submit" arrow disabled={busy} className="w-full justify-between text-lg"><span className="flex-1 text-center">{busy ? "please wait..." : { signin: "sign in", signup: "create account", forgot: "send reset link", verify: "" }[mode]}</span></Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-primary">
              {mode === "signin" && <><button onClick={() => setMode("signup")}>new here? create an account</button><button onClick={() => setMode("forgot")}>forgot password</button></>}
              {mode !== "signin" && <button onClick={() => setMode("signin")}>back to sign in</button>}
            </div>
          </div>
        )}
      </main>
      <aside className="hidden flex-col justify-center bg-cream p-16 lg:flex" aria-roledescription="carousel" aria-label="product highlights">
        <div role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} aria-live="polite" className="rounded-[2rem] border-2 border-pink bg-hairline p-10 shadow-[3px_4px_0_0_#ed0578]">
          <EnvelopeSimple size={40} weight="fill" className="text-primary" />
          <h2 className="mt-4 text-4xl">{slides[i][0]}</h2>
          <p className="mt-3 max-w-sm text-lg text-ink">{slides[i][1]}</p>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button aria-label="previous slide" className="grid size-11 place-items-center rounded-full border border-lilac bg-white" onClick={() => setI((i + slides.length - 1) % slides.length)}><CaretLeft weight="bold" /></button>
          <button aria-label="next slide" className="grid size-11 place-items-center rounded-full border border-lilac bg-white" onClick={() => setI((i + 1) % slides.length)}><CaretRight weight="bold" /></button>
          <span className="text-sm font-semibold text-body">{i + 1} / {slides.length}</span>
        </div>
      </aside>
    </div>
  );
}
