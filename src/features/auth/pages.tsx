import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";
import { inputCls } from "@/components/common/states";
import { useApp } from "@/app/state";
import { ApiError, post } from "@/lib/http";
import { authService } from "./auth-service";

export function ResetPage() {
  const token = useSearchParams()[0].get("token") ?? "";
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState(""); const [done, setDone] = useState(false); const toast = useToast();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return setErr("this link is missing its token. request a new reset email.");
    if (pw.length < 8) return setErr("use at least 8 characters.");
    if (pw !== pw2) return setErr("the two passwords do not match.");
    try { await authService.reset(token, pw); setErr(""); setDone(true); toast("password updated"); } catch (x) { setErr(x instanceof ApiError ? x.message : "something went wrong. try again."); }
  };
  return (
    <main className="mx-auto max-w-md px-6 py-16"><h1 className="text-4xl">choose a new password.</h1>
      {done ? <p role="status" className="mt-6 font-semibold">all set. you were signed out everywhere. <Link to="/auth" className="text-primary">sign in</Link></p> : (
        <form onSubmit={(e) => void submit(e)} noValidate className="mt-6 grid gap-4">
          <label className="text-sm font-semibold">new password<input type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <label className="text-sm font-semibold">confirm password<input type="password" autoComplete="new-password" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p><Button type="submit">update password</Button>
        </form>)}
    </main>
  );
}

export function VerifyPage() {
  const nav = useNavigate(); const { setUser } = useApp();
  const token = useSearchParams()[0].get("token") ?? "";
  const [state, setState] = useState<"working" | "error">(token ? "working" : "error");
  const [msg, setMsg] = useState(token ? "" : "this link is missing its token.");
  const ran = useRef(false); // strict mode runs effects twice, and the token works only once
  useEffect(() => {
    if (!token || ran.current) return; ran.current = true;
    authService.verify(token).then((u) => { setUser(u); nav(u.onboarded ? "/app" : "/onboarding", { replace: true }); }).catch((x) => { setState("error"); setMsg(x instanceof ApiError ? x.message : "something went wrong."); });
  }, [token, nav, setUser]);
  return <main className="mx-auto max-w-md px-6 py-16"><h1 className="text-4xl">{state === "working" ? "verifying your email..." : "we could not verify that link."}</h1>{state === "error" && <><p role="alert" className="mt-3 text-body">{msg}</p><Link to="/auth" className="mt-4 inline-block font-semibold text-primary">back to sign in</Link></>}</main>;
}

export function InvitePage() {
  const { user } = useApp();
  const token = useSearchParams()[0].get("token") ?? "";
  const [msg, setMsg] = useState(""); const [done, setDone] = useState(false);
  const act = async (kind: "accept" | "decline") => {
    try { await post(`/invitations/${kind}`, { token }); setDone(true); setMsg(kind === "accept" ? "you joined the organization. switch to it from the sidebar." : "invitation declined."); }
    catch (x) { setMsg(x instanceof ApiError ? x.message : "something went wrong. try again."); }
  };
  return (
    <main className="mx-auto max-w-md px-6 py-16"><h1 className="text-4xl">you have been invited.</h1>
      {!token ? <p role="alert" className="mt-3 text-body">this link is missing its token.</p> : !user ? <p className="mt-3 text-body">sign in first, then open this link again. <Link to="/auth" className="font-semibold text-primary">sign in</Link></p>
        : <><p className="mt-3 text-body">joining adds you to the organization with the role it offered you. opening a link never joins you by itself.</p>{!done && <div className="mt-5 flex gap-2"><Button onClick={() => void act("accept")}>accept</Button><Button variant="outline" onClick={() => void act("decline")}>decline</Button></div>}</>}
      <p role="status" className="mt-3 font-semibold text-primary">{msg}</p>{done && <Link to="/app" className="mt-3 inline-block font-semibold text-primary">go to the app</Link>}
    </main>
  );
}
