import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowsClockwise, MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/common/states";
import { useApp, usePersisted } from "@/app/state";
import { ApiError } from "@/lib/http";
import { avatar } from "@/lib/types";
import { aiService, type Turn } from "@/features/ai/ai-service";
import { authService } from "@/features/auth/auth-service";
import { ImagePicker } from "@/components/common/image-picker";

type Q = { key: string; question: string; suggestions?: string[]; example?: string };
type Chat = { turns: Turn[]; current: Q | null; bio: string; ai: boolean };
const topics = ["scholarships", "jobs", "internships", "fellowships", "competitions", "hackathons", "bounties", "grants", "events", "career development", "research", "entrepreneurship", "technology", "other"];
const first: Q = { key: "interests", question: "hi, i am ub. what kinds of opportunities do you want to see?" };
const blank: Chat = { turns: [], current: first, bio: "", ai: false };

export function OnboardingPage() {
  const { user, setUser } = useApp(); const nav = useNavigate();
  const [step, setStep] = usePersisted("ub-step", 0);
  const [d, setD] = usePersisted("ub-draft", { name: "", username: "", gender: "", dob: "", seed: user?.email ?? "ub", photo: "", city: "", country: "", remote: true, relocate: false });
  const [chat, setChat] = usePersisted<Chat>("ub-chat", blank);
  const [text, setText] = useState(""); const [pick, setPick] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [located, setLocated] = useState(false);
  const pic = d.photo || avatar(d.seed);

  const idStep = () => {
    if (d.name.trim().length < 2) return setErr("enter your full name.");
    if (!/^[a-z0-9_]{3,20}$/i.test(d.username)) return setErr("usernames use 3 to 20 letters, numbers or underscores.");
    setErr(""); setStep(1);
  };
  const ask = async (turns: Turn[]) => {
    setBusy(true); setErr("");
    try {
      const r = await aiService.profileNext(d.name, turns);
      if (r.done) setChat({ turns, current: null, bio: r.bio ?? "", ai: r.aiUsed });
      else setChat({ turns, current: { key: r.key ?? "more", question: r.question ?? "tell me a little more.", suggestions: r.suggestions, example: r.example }, bio: "", ai: r.aiUsed });
    } catch (e) { setChat({ ...chat, turns }); setErr(e instanceof ApiError ? e.message : "could not reach the server. your answer is saved, try again."); } finally { setBusy(false); }
  };
  const answer = (t: string) => {
    const a = t.trim(); if (!a || !chat.current || busy) return;
    setText(""); setPick([]); void ask([...chat.turns, { key: chat.current.key, question: chat.current.question, answer: a }]);
  };
  const edit = (i: number) => { const t = chat.turns[i]; setChat({ turns: chat.turns.slice(0, i), current: { key: t.key, question: t.question }, bio: "", ai: false }); };
  const regen = async () => { setBusy(true); try { const r = await aiService.profileBio(d.name, chat.turns); setChat({ ...chat, bio: r.bio, ai: r.aiUsed }); } catch (e) { setErr(e instanceof ApiError ? e.message : "could not rewrite the bio."); } finally { setBusy(false); } };
  const locate = () => navigator.geolocation?.getCurrentPosition(() => { setLocated(true); setErr(""); }, () => setErr("location access was declined. you can enter a city instead."));
  const finish = async () => {
    setBusy(true);
    try {
      const interests = (chat.turns.find((t) => t.key === "interests")?.answer ?? "").split(", ").filter(Boolean);
      const u = await authService.updateMe({ name: d.name.trim(), username: d.username.toLowerCase(), bio: chat.bio, avatar: pic, interests, gender: d.gender || undefined, dob: d.dob || undefined, location: { city: d.city, country: d.country, remote: d.remote, relocate: d.relocate }, onboarded: true });
      ["ub-step", "ub-draft", "ub-chat"].forEach((k) => localStorage.removeItem(k));
      setUser(u);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) void import("canvas-confetti").then((m) => m.default({ particleCount: 90, spread: 70, origin: { y: 0.7 } }));
      nav("/app");
    } catch (e) { setErr(e instanceof ApiError ? e.message : "could not save your profile. try again."); if (e instanceof ApiError && e.code === "username_taken") setStep(0); } finally { setBusy(false); }
  };
  const done = !chat.current;
  const cur = chat.current;

  return (
    <main className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3} aria-label="onboarding progress"><div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
        <p className="mt-2 text-sm font-semibold text-body">step {step + 1} of 3</p>
        <p role="alert" className="mt-2 text-sm font-semibold text-[#d02b2b]">{err}</p>

        {step === 0 && (
          <section className="mt-4 rounded-3xl bg-white p-6">
            <h1 className="text-3xl">let's set up your profile.</h1>
            <div className="mt-5 flex items-center gap-4">
              <img src={pic} alt="your avatar preview" width={88} height={88} className="size-22 rounded-full bg-hairline object-cover" />
              <div className="grid gap-2 text-sm font-semibold"><button className="inline-flex items-center gap-2 text-primary" onClick={() => setD({ ...d, seed: Math.random().toString(36).slice(2) })}><ArrowsClockwise weight="bold" />shuffle avatar</button><ImagePicker kind="avatar" label="upload a photo" onUploaded={(url) => setD({ ...d, photo: url })} />{user?.hasGoogle && user.avatar && !user.avatar.includes("dicebear") && d.photo !== user.avatar && <button className="text-left text-primary" onClick={() => setD({ ...d, photo: user.avatar })}>use my google picture</button>}{d.photo && <button className="text-left text-primary" onClick={() => setD({ ...d, photo: "" })}>use a generated avatar instead</button>}</div>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-semibold">full name<input className={inputCls} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoComplete="name" /></label>
              <label className="text-sm font-semibold">username<input className={inputCls} value={d.username} onChange={(e) => setD({ ...d, username: e.target.value })} autoComplete="username" /></label>
              <label className="text-sm font-semibold">gender<select className={inputCls} value={d.gender} onChange={(e) => setD({ ...d, gender: e.target.value })}><option value="">prefer not to say</option><option>female</option><option>male</option><option>non-binary</option></select></label>
              <label className="text-sm font-semibold">date of birth<input type="date" className={inputCls} value={d.dob} onChange={(e) => setD({ ...d, dob: e.target.value })} /></label>
            </div>
            <Button arrow className="mt-6" onClick={idStep}>continue</Button>
          </section>
        )}

        {step === 1 && (
          <section className="mt-4 rounded-3xl bg-white p-6" aria-label="profile conversation">
            <ol className="grid gap-3" aria-live="polite">
              {chat.turns.map((t, i) => <li key={i} className="grid gap-2"><p className="max-w-[85%] rounded-2xl bg-hairline px-4 py-2.5">{t.question}</p><p className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-on-primary">{t.answer}<button className="ml-3 text-xs underline" onClick={() => edit(i)}>change</button></p></li>)}
              {cur && <li className="max-w-[85%] rounded-2xl bg-hairline px-4 py-2.5">{cur.question}</li>}
              {busy && <li className="text-sm text-body">ub is thinking...</li>}
            </ol>
            {cur && !busy && (
              <div className="mt-5">
                {cur.key === "interests" ? (
                  <><div className="flex flex-wrap gap-2">{topics.map((t) => <button key={t} aria-pressed={pick.includes(t)} onClick={() => setPick(pick.includes(t) ? pick.filter((x) => x !== t) : [...pick, t])} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${pick.includes(t) ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`}>{t}</button>)}</div><Button className="mt-4" disabled={!pick.length} onClick={() => answer(pick.join(", "))}>send {pick.length || ""} picks</Button></>
                ) : (
                  <>{cur.suggestions && <div className="mb-3 flex flex-wrap gap-2">{cur.suggestions.map((s) => <button key={s} onClick={() => answer(s)} className="rounded-full border border-lilac px-3 py-1.5 text-sm font-semibold text-primary">{s}</button>)}</div>}
                    <form onSubmit={(e) => { e.preventDefault(); answer(text); }} className="flex gap-2"><input aria-label="your answer" className={`${inputCls} mt-0`} value={text} onChange={(e) => setText(e.target.value)} placeholder={cur.example ? `e.g. ${cur.example}` : "type your answer"} /><Button type="submit">send</Button></form></>
                )}
              </div>
            )}
            {done && (
              <div className="mt-5">
                <label className="text-sm font-semibold">your bio (edit freely)<textarea className={`${inputCls} min-h-28`} value={chat.bio} onChange={(e) => setChat({ ...chat, bio: e.target.value })} /></label>
                <p className="mt-1 text-xs text-body">{chat.ai ? "written by ai" : "built"} from your answers only. nothing is added.</p>
                <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => void regen()} disabled={busy}>rewrite bio</Button><Button arrow onClick={() => setStep(2)}>continue</Button></div>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="mt-4 rounded-3xl bg-white p-6">
            <h1 className="text-3xl">where should we look?</h1>
            <p className="mt-2 text-body">location helps us show opportunities near you. we only ask when you tap the button, and you can skip it.</p>
            <Button variant="outline" className="mt-4" onClick={locate}><MapPin weight="fill" />use my current location</Button>
            {located && <p role="status" className="mt-2 text-sm font-semibold text-primary">location access granted. we do not save your exact position. add a city below to save a preference.</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">city or region<input className={inputCls} value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} /></label><label className="text-sm font-semibold">country<input className={inputCls} value={d.country} onChange={(e) => setD({ ...d, country: e.target.value })} /></label></div>
            <label className="mt-4 flex gap-2 text-sm font-semibold"><input type="checkbox" checked={d.remote} onChange={(e) => setD({ ...d, remote: e.target.checked })} />include remote opportunities</label>
            <label className="mt-2 flex gap-2 text-sm font-semibold"><input type="checkbox" checked={d.relocate} onChange={(e) => setD({ ...d, relocate: e.target.checked })} />i am willing to relocate</label>
            <div className="mt-6 flex gap-3"><Button arrow disabled={busy} onClick={() => void finish()}>{busy ? "saving..." : "enter updatebase"}</Button><Button variant="outline" disabled={busy} onClick={() => void finish()}>skip for now</Button></div>
          </section>
        )}
        {step > 0 && <button className="mt-4 text-sm font-semibold text-primary" onClick={() => setStep(step - 1)}>back</button>}
      </div>
    </main>
  );
}
