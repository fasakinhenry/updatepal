import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { LockKey } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/common/states";
import { ConfirmDialog, useToast } from "@/components/common/toast";
import { useApp } from "@/app/state";
import { ApiError, post, put, request } from "@/lib/http";
import { avatar, type PersonLite } from "@/lib/types";
import { social } from "@/features/social/social-service";
import { clearLocal, createKeys, decryptText, encryptText, loadLocal, restoreKeys, safetyNumber, saveLocal, sharedKey, type Wrapped } from "./e2ee";

type Convo = { id: string; user?: PersonLite; lastAt?: string; unread: boolean };
type Raw = { _id: string; sender: string; ct: string; iv: string; spk: string; rpk: string; createdAt: string };
type Shown = { id: string; mine: boolean; text: string; at: string; ok: boolean };
const msg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);
const Loading = () => <div className="h-28 animate-pulse rounded-2xl bg-hairline" aria-hidden />;

export function Messages() {
  const { user } = useApp(); const toast = useToast(); const [sp, setSp] = useSearchParams();
  const [phase, setPhase] = useState<"loading" | "setup" | "locked" | "ready">("loading");
  const [server, setServer] = useState<Wrapped | null>(null); const [priv, setPriv] = useState<CryptoKey | null>(null); const [pub, setPub] = useState("");
  const [pass, setPass] = useState(""); const [pass2, setPass2] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [reset, setReset] = useState(false);
  const boot = useCallback(async () => {
    if (!user) return;
    try {
      const { keys } = await request<{ keys: Wrapped | null }>("/keys/me");
      if (!keys) { setPhase("setup"); return; }
      setServer(keys); const local = await loadLocal(user.id);
      if (local && local.pub === keys.publicKey) { setPriv(local.priv); setPub(local.pub); setPhase("ready"); } else setPhase("locked");
    } catch (e) { setErr(msg(e, "could not load your encryption settings.")); setPhase("setup"); }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void boot(); }, [boot]);

  const setup = async (replace = false) => {
    if (pass.length < 8) return setErr("use at least 8 characters for your messaging passcode.");
    if (pass !== pass2) return setErr("the two passcodes do not match.");
    setBusy(true); setErr("");
    try {
      const k = await createKeys(pass);
      await put("/keys/me", { ...k.backup, replace });
      await saveLocal(user!.id, { priv: k.priv, pub: k.pub }); setPriv(k.priv); setPub(k.pub); setServer(k.backup); setPass(""); setPass2(""); setReset(false); setPhase("ready");
    } catch (e) { setErr(msg(e, "could not set up encrypted messaging.")); } finally { setBusy(false); }
  };
  const unlock = async () => {
    if (!server) return; setBusy(true); setErr("");
    try { const k = await restoreKeys(server, pass); await saveLocal(user!.id, { priv: k, pub: server.publicKey }); setPriv(k); setPub(server.publicKey); setPass(""); setPhase("ready"); }
    catch { setErr("that passcode did not unlock your keys."); } finally { setBusy(false); }
  };
  const forget = async () => { await clearLocal(user!.id); setPriv(null); setPhase("locked"); toast("keys removed from this device"); };

  if (phase === "loading") return <><h1 className="text-3xl">messages</h1><div className="mt-4"><Loading /></div></>;
  if (phase === "setup" || phase === "locked") {
    const isSetup = phase === "setup";
    return (
      <>
        <h1 className="text-3xl">messages</h1>
        <div className="mt-4 rounded-3xl bg-cream p-6">
          <LockKey size={32} weight="fill" className="text-primary" />
          <h2 className="mt-2 text-2xl">{isSetup ? "set up encrypted messaging" : "unlock your messages"}</h2>
          <p className="mt-2 text-body">{isSetup ? "messages are encrypted on your device with keys the server never sees. choose a messaging passcode. it is separate from your password and is never sent to us." : "enter your messaging passcode to restore your keys on this device."}</p>
          {isSetup && <p className="mt-2 text-sm font-semibold">if you forget this passcode, nobody can recover your old messages, including us.</p>}
          <label className="mt-4 block text-sm font-semibold">messaging passcode<input type="password" autoComplete="new-password" className={inputCls} value={pass} onChange={(e) => setPass(e.target.value)} /></label>
          {isSetup && <label className="mt-3 block text-sm font-semibold">confirm passcode<input type="password" autoComplete="new-password" className={inputCls} value={pass2} onChange={(e) => setPass2(e.target.value)} /></label>}
          <p role="alert" className="mt-2 text-sm font-semibold text-[#d02b2b]">{err}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void (isSetup ? setup() : unlock())}>{busy ? "working..." : isSetup ? "turn on encryption" : "unlock"}</Button>{!isSetup && <Button variant="outline" onClick={() => setReset(true)}>i forgot my passcode</Button>}</div>
          <p className="mt-3 text-xs text-body">built with standard browser cryptography. it has not been independently audited yet.</p>
        </div>
        <ConfirmDialog open={reset} title="reset your encryption keys?" body="you will get new keys. messages you already sent or received become unreadable for you. this cannot be undone." confirm="reset keys" confirmDisabled={pass.length < 8 || pass !== pass2} onClose={() => setReset(false)} onConfirm={() => void setup(true)}>
          <label className="mt-3 block text-sm font-semibold">new passcode<input type="password" className={inputCls} value={pass} onChange={(e) => setPass(e.target.value)} /></label><label className="mt-3 block text-sm font-semibold">confirm new passcode<input type="password" className={inputCls} value={pass2} onChange={(e) => setPass2(e.target.value)} /></label>
        </ConfirmDialog>
      </>
    );
  }
  return <Chat priv={priv!} pub={pub} sp={sp} clearSp={() => setSp({})} onForget={() => void forget()} />;
}

function Chat({ priv, pub, sp, clearSp, onForget }: { priv: CryptoKey; pub: string; sp: URLSearchParams; clearSp: () => void; onForget: () => void }) {
  const { user } = useApp(); const toast = useToast();
  const [convos, setConvos] = useState<Convo[] | null>(null); const [open, setOpen] = useState<Convo | null>(null); const [peerKey, setPeerKey] = useState(""); const [list, setList] = useState<Shown[]>([]);
  const [t, setT] = useState(""); const [to, setTo] = useState(""); const [err, setErr] = useState(""); const [act, setAct] = useState<"" | "block" | "report">(""); const [reason, setReason] = useState(""); const [safety, setSafety] = useState("");
  const end = useRef<HTMLLIElement>(null); const keys = useRef(new Map<string, CryptoKey>());
  const loadConvos = useCallback(() => request<{ items: Convo[] }>("/conversations").then((r) => setConvos(r.items)).catch(() => setErr("could not load your conversations.")), []);
  useEffect(() => { void loadConvos(); }, [loadConvos]);
  const openWith = useCallback(async (c: Convo, peerPub?: string) => {
    try {
      const k = peerPub ?? (await request<{ publicKey: string }>(`/keys/${c.user?._id}/public`)).publicKey;
      setPeerKey(k); setOpen(c); setList([]); setSafety(""); keys.current.clear(); setErr("");
    } catch (e) { setErr(msg(e, "could not open this conversation.")); }
  }, []);
  const start = useCallback(async (username: string) => {
    try { const r = await post<{ id: string; peerId: string; peerKey: string }>("/conversations", { username }); await openWith({ id: r.id, unread: false, user: { _id: r.peerId, username } }, r.peerKey); void loadConvos(); }
    catch (e) { setErr(msg(e, "could not start that conversation.")); }
  }, [openWith, loadConvos]);
  useEffect(() => { const u = sp.get("to"); if (u) { void start(u); clearSp(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const keyFor = useCallback(async (convoId: string, pk: string) => { let k = keys.current.get(pk); if (!k) { k = await sharedKey(priv, pk, convoId); keys.current.set(pk, k); } return k; }, [priv]);
  useEffect(() => { // new messages arrive through live pings, with slow polling as a backup
    if (!open) return;
    const pull = async () => {
      try {
        const r = await request<{ items: Raw[] }>(`/conversations/${open.id}/messages`);
        const shown = await Promise.all(r.items.map(async (m): Promise<Shown> => {
          const mine = m.sender === user?.id; const pk = mine ? m.rpk : m.spk;
          try { return { id: m._id, mine, at: m.createdAt, ok: true, text: await decryptText(await keyFor(open.id, pk), open.id, m) }; }
          catch { return { id: m._id, mine, at: m.createdAt, ok: false, text: "this message cannot be decrypted with your current keys." }; }
        }));
        setList(shown); void post(`/conversations/${open.id}/read`);
      } catch { /* keep the last list */ }
    };
    void pull(); const i = setInterval(() => void pull(), 30_000); const live = () => void pull(); window.addEventListener("ub:message", live);
    return () => { clearInterval(i); window.removeEventListener("ub:message", live); };
  }, [open?.id, keyFor]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [list.length]);

  const send = async (retry = true): Promise<void> => {
    if (!open || !t.trim()) return;
    try {
      const k = await keyFor(open.id, peerKey); const e = await encryptText(k, open.id, t.trim());
      await post(`/conversations/${open.id}/messages`, { ...e, spk: pub, rpk: peerKey });
      setList((l) => [...l, { id: crypto.randomUUID(), mine: true, text: t.trim(), at: new Date().toISOString(), ok: true }]); setT(""); setErr("");
    } catch (x) {
      if (x instanceof ApiError && x.code === "stale_key" && retry && open.user?._id) { const fresh = (await request<{ publicKey: string }>(`/keys/${open.user._id}/public`)).publicKey; setPeerKey(fresh); keys.current.clear(); setErr("their keys changed. check the safety number, then send again."); return; }
      setErr(msg(x, "could not send. your message is still here."));
    }
  };
  const peerId = open?.user?._id;
  return (
    <>
      <h1 className="text-3xl">messages</h1>
      <p className="mt-1 flex items-center gap-1 text-xs text-body"><LockKey weight="fill" className="text-primary" />end to end encrypted on your device. we can see who messages whom and when, not what. not independently audited yet.</p>
      <p role="alert" className="text-sm font-semibold text-[#d02b2b]">{err}</p>
      {!open ? (
        <>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (to.trim()) void start(to.trim().replace(/^@/, "")); }}><input aria-label="username to message" value={to} onChange={(e) => setTo(e.target.value)} placeholder="message someone by username" className={`${inputCls} mt-0`} /><Button type="submit">start</Button></form>
          {!convos && <div className="mt-4"><Loading /></div>}{convos && !convos.length && <p className="mt-4 text-body">no conversations yet. find people in discover and message them from their profile.</p>}
          <ul className="mt-3 divide-y-2 divide-hairline">{convos?.map((c) => <li key={c.id}><button onClick={() => void openWith(c)} className="flex w-full items-center gap-3 py-3 text-left"><img src={c.user?.avatar || avatar(c.user?.username ?? c.id)} alt="" width={44} height={44} className="size-11 rounded-full bg-hairline object-cover" /><span className="min-w-0"><span className="block font-semibold">{c.user?.name || c.user?.username}{c.unread && <span className="ml-2 text-xs text-primary">new</span>}</span><span className="block text-sm text-body">encrypted message · {c.lastAt ? new Date(c.lastAt).toLocaleDateString("en") : ""}</span></span></button></li>)}</ul>
          <button className="mt-6 text-sm font-semibold text-body" onClick={onForget}>remove keys from this device</button>
        </>
      ) : (
        <section className="mt-4" aria-label={`conversation with ${open.user?.username}`}>
          <div className="flex flex-wrap gap-4 text-sm font-semibold"><button className="text-primary" onClick={() => { setOpen(null); setList([]); void loadConvos(); }}>back to inbox</button><span className="truncate">{open.user?.name || open.user?.username}</span><button className="text-primary" onClick={() => void safetyNumber(pub, peerKey).then(setSafety)}>safety number</button>{peerId && <><button className="ml-auto text-primary" onClick={() => setAct("report")}>report</button><button className="text-[#d02b2b]" onClick={() => setAct("block")}>block</button></>}</div>
          {safety && <p className="mt-2 rounded-xl bg-hairline p-3 text-sm">compare this number with {open.user?.username} in person or on a call. if it matches, nobody has swapped a key.<br /><b className="font-display text-lg tracking-wider">{safety}</b></p>}
          <ul className="mt-3 grid max-h-[55vh] gap-2 overflow-y-auto">{list.map((m) => <li key={m.id} className={`max-w-[80%] break-words rounded-2xl px-4 py-2.5 ${m.mine ? "ml-auto bg-primary text-on-primary" : "bg-hairline"} ${m.ok ? "" : "italic opacity-70"}`}>{m.text}</li>)}{!list.length && <li className="text-body">say hello. only you and {open.user?.username} can read this.</li>}<li ref={end} /></ul>
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="mt-4 flex gap-2"><input aria-label="message" value={t} onChange={(e) => setT(e.target.value)} className="w-full rounded-full border border-lilac bg-white px-4 py-3" /><Button type="submit">send</Button></form>
          <ConfirmDialog open={act === "block"} title={`block ${open.user?.username}?`} body="you will not be able to message each other." confirm="block" onClose={() => setAct("")} onConfirm={() => { if (peerId) void social.block(peerId, true).then(() => { toast("blocked"); setOpen(null); void loadConvos(); }).catch((e) => setErr(msg(e, "could not block."))); setAct(""); }} />
          <ConfirmDialog open={act === "report"} title={`report ${open.user?.username}?`} body="messages are encrypted, so moderators only see what you write here. describe what happened." confirm="send report" confirmDisabled={reason.trim().length < 3} onClose={() => setAct("")} onConfirm={() => { if (peerId) void social.report("user", peerId, reason).then(() => toast("report sent")).catch((e) => setErr(msg(e, "could not send the report."))); setReason(""); setAct(""); }}><label className="mt-3 block text-sm font-semibold">what happened<textarea className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></label></ConfirmDialog>
        </section>
      )}
    </>
  );
}
