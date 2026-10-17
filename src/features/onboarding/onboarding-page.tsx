import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { ArrowsClockwise, MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { usePersisted, useApp } from "@/app/state";
import { avatar } from "@/lib/mock";

type A = Record<string, string>;
type Msg = { from: "ai" | "me"; text: string };
const topics = ["scholarships", "jobs", "internships", "fellowships", "competitions", "hackathons", "bounties", "grants", "events", "career development", "research", "entrepreneurship", "technology", "other"];
const field = "mt-1 w-full rounded-xl border border-lilac bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-primary";
const steps = [
  { key: "interests", q: () => "hi, i am ub. what kinds of opportunities do you want to see?", ex: "" },
  { key: "stage", q: () => "where are you right now?", ex: "", sugg: ["student", "graduate", "early-career professional", "experienced professional", "other"] },
  { key: "where", q: (a: A) => (a.stage === "student" ? "what do you study, and where?" : "what do you do, and where?"), ex: "computer science at futa" },
  { key: "goals", q: (a: A) => `what do you want to achieve next${a.interests ? ` with ${a.interests.split(", ")[0]}` : ""}?`, ex: "win a funded masters in data science by 2028" },
];
const bio = (n: string, a: A) => `${n || "this member"} is ${a.stage === "student" ? "a student" : "a " + (a.stage || "member of the community")}${a.where ? `, ${a.where}` : ""}. interested in ${a.interests || "new opportunities"}.${a.goals ? ` next goal: ${a.goals}.` : ""}`;

export function OnboardingPage() {
  const { user, setUser } = useApp();
  const nav = useNavigate();
  const [step, setStep] = usePersisted("ub-step", 0);
  const [d, setD] = usePersisted("ub-draft", { name: "", username: "", gender: "", dob: "", seed: user?.email ?? "ub", upload: "", loc: { city: "", country: "", remote: true, relocate: false, shared: false } });
  const [chat, setChat] = usePersisted<{ msgs: Msg[]; a: A; i: number; nudged: string[]; bio: string }>("ub-chat", { msgs: [], a: {}, i: 0, nudged: [], bio: "" });
  const [text, setText] = useState("");
  const [pick, setPick] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [err, setErr] = useState("");
  const pic = d.upload || avatar(d.seed);

  useEffect(() => { if (step === 1 && chat.msgs.length === 0) setChat({ ...chat, msgs: [{ from: "ai", text: steps[0].q({}) }] }); }, [step, chat, setChat]);

  const idStep = () => {
    if (d.name.trim().length < 2) return setErr("enter your full name.");
    if (!/^[a-z0-9_]{3,20}$/i.test(d.username)) return setErr("usernames use 3 to 20 letters, numbers or underscores.");
    setErr(""); setStep(1);
  };
  const answer = (t: string, viaPill = false) => {
    const s = steps[chat.i]; const clean = t.trim();
    if (!clean) return;
    const msgs: Msg[] = [...chat.msgs, { from: "me", text: clean }];
    const vague = !viaPill && s.ex && clean.split(/\s+/).length < 3 && !chat.nudged.includes(s.key);
    setText(""); setPick([]); setTyping(true);
    setTimeout(() => {
      setTyping(false);
      if (vague) return setChat({ ...chat, nudged: [...chat.nudged, s.key], msgs: [...msgs, { from: "ai", text: `thanks. a little more detail helps me write a bio that sounds like you. for example: ${s.ex}` }] });
      const a = { ...chat.a, [s.key]: clean }; const n = chat.i + 1;
      if (n >= steps.length) return setChat({ ...chat, a, i: n, msgs: [...msgs, { from: "ai", text: "that is enough for a first draft. here is your bio." }], bio: bio(d.name, a) });
      setChat({ ...chat, a, i: n, msgs: [...msgs, { from: "ai", text: steps[n].q(a) }] });
    }, 600);
  };
  const upload = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 2e6) return setErr("choose an image under 2 mb.");
    const r = new FileReader(); r.onload = () => setD({ ...d, upload: String(r.result) }); r.readAsDataURL(f);
  };
  const locate = () => navigator.geolocation?.getCurrentPosition(() => setD({ ...d, loc: { ...d.loc, shared: true } }), () => setErr("location access was declined. you can enter a city instead."));
  const finish = () => {
    if (!user) return;
    setUser({ ...user, name: d.name, username: d.username, avatar: pic, bio: chat.bio, onboarded: true });
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) void import("canvas-confetti").then((m) => m.default({ particleCount: 90, spread: 70, origin: { y: 0.7 } }));
    nav("/app");
  };
  const done = chat.i >= steps.length;
  const cur = steps[Math.min(chat.i, steps.length - 1)];

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
              <div className="grid gap-2 text-sm font-semibold">
                <button className="inline-flex items-center gap-2 text-primary" onClick={() => setD({ ...d, upload: "", seed: Math.random().toString(36).slice(2) })}><ArrowsClockwise weight="bold" />shuffle avatar</button>
                <label className="cursor-pointer text-primary">upload a photo (optional)<input type="file" accept="image/*" className="sr-only" onChange={upload} /></label>
                {d.upload && <button className="text-left text-primary" onClick={() => setD({ ...d, upload: "" })}>use generated avatar instead</button>}
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-semibold">full name<input className={field} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} autoComplete="name" /></label>
              <label className="text-sm font-semibold">username<input className={field} value={d.username} onChange={(e) => setD({ ...d, username: e.target.value })} autoComplete="username" /></label>
              <label className="text-sm font-semibold">gender<select className={field} value={d.gender} onChange={(e) => setD({ ...d, gender: e.target.value })}><option value="">prefer not to say</option><option>female</option><option>male</option><option>non-binary</option></select></label>
              <label className="text-sm font-semibold">date of birth<input type="date" className={field} value={d.dob} onChange={(e) => setD({ ...d, dob: e.target.value })} /></label>
            </div>
            <Button arrow className="mt-6" onClick={idStep}>continue</Button>
          </section>
        )}

        {step === 1 && (
          <section className="mt-4 rounded-3xl bg-white p-6" aria-label="profile conversation">
            <ol className="grid gap-3" aria-live="polite">
              {chat.msgs.map((m, k) => <li key={k} className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${m.from === "ai" ? "bg-hairline text-ink" : "ml-auto bg-primary text-on-primary"}`}>{m.text}</li>)}
              {typing && <li className="text-sm text-body">ub is typing...</li>}
            </ol>
            {!done && !typing && (
              <div className="mt-5">
                {cur.key === "interests" ? (
                  <>
                    <div className="flex flex-wrap gap-2">{topics.map((t) => <button key={t} aria-pressed={pick.includes(t)} onClick={() => setPick(pick.includes(t) ? pick.filter((x) => x !== t) : [...pick, t])} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${pick.includes(t) ? "border-primary bg-primary text-on-primary" : "border-lilac text-primary"}`}>{t}</button>)}</div>
                    <Button className="mt-4" disabled={!pick.length} onClick={() => answer(pick.join(", "), true)}>send {pick.length || ""} picks</Button>
                  </>
                ) : (
                  <>
                    {"sugg" in cur && cur.sugg && <div className="mb-3 flex flex-wrap gap-2">{cur.sugg.map((s) => <button key={s} onClick={() => answer(s, true)} className="rounded-full border border-lilac px-3 py-1.5 text-sm font-semibold text-primary">{s}</button>)}</div>}
                    <form onSubmit={(e) => { e.preventDefault(); answer(text); }} className="flex gap-2"><input aria-label="your answer" className={`${field} mt-0`} value={text} onChange={(e) => setText(e.target.value)} placeholder={cur.ex ? `e.g. ${cur.ex}` : "type your answer"} /><Button type="submit">send</Button></form>
                  </>
                )}
              </div>
            )}
            {done && (
              <div className="mt-5">
                <label className="text-sm font-semibold">your bio (edit freely)<textarea className={`${field} min-h-28`} value={chat.bio} onChange={(e) => setChat({ ...chat, bio: e.target.value })} /></label>
                <p className="mt-1 text-xs text-body">built only from your answers. nothing is added.</p>
                <Button arrow className="mt-4" onClick={() => setStep(2)}>continue</Button>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="mt-4 rounded-3xl bg-white p-6">
            <h1 className="text-3xl">where should we look?</h1>
            <p className="mt-2 text-body">location helps us show opportunities near you. we only ask when you tap the button, and you can skip it.</p>
            <Button variant="outline" className="mt-4" onClick={locate}><MapPin weight="fill" />use my current location</Button>
            {d.loc.shared && <p role="status" className="mt-2 text-sm font-semibold text-primary">location access granted. we do not save your exact position.</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">city or region<input className={field} value={d.loc.city} onChange={(e) => setD({ ...d, loc: { ...d.loc, city: e.target.value } })} /></label>
              <label className="text-sm font-semibold">country<input className={field} value={d.loc.country} onChange={(e) => setD({ ...d, loc: { ...d.loc, country: e.target.value } })} /></label>
            </div>
            <label className="mt-4 flex gap-2 text-sm font-semibold"><input type="checkbox" checked={d.loc.remote} onChange={(e) => setD({ ...d, loc: { ...d.loc, remote: e.target.checked } })} />include remote opportunities</label>
            <label className="mt-2 flex gap-2 text-sm font-semibold"><input type="checkbox" checked={d.loc.relocate} onChange={(e) => setD({ ...d, loc: { ...d.loc, relocate: e.target.checked } })} />i am willing to relocate</label>
            <div className="mt-6 flex gap-3"><Button arrow onClick={finish}>enter updatebase</Button><Button variant="outline" onClick={finish}>skip for now</Button></div>
          </section>
        )}
        {step > 0 && <button className="mt-4 text-sm font-semibold text-primary" onClick={() => setStep(step - 1)}>back</button>}
      </div>
    </main>
  );
}
