import { useEffect, useState } from "react";
import { Link } from "react-router";
import { List, X, Sparkle, BookmarkSimple, UsersThree, FileText, Quotes, CaretDown, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button, Container, Pill } from "@/components/ui/button";
import { Mascot } from "./mascot";
import { faqs, opportunities, stories } from "./data";
import { avatar } from "@/lib/mock";
import { startMotion } from "./motion";

const links = [["discover", "#discover"], ["publish", "#publish"], ["organizations", "#orgs"], ["faq", "#faq"]];
const Em = ({ children }: { children: string }) => <em className="font-accent font-medium italic tracking-normal">{children}</em>;

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full bg-cream/95 px-5 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <img src="/favicon.svg" alt="" width={28} height={28} /> updatebase
        </Link>
        <nav aria-label="main" className="hidden gap-8 text-sm font-semibold md:flex">
          {links.map(([l, h]) => <a key={h} href={h} className="hover:text-primary">{l}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <Button to="/auth" variant="outline" className="hidden sm:inline-flex">log in</Button>
          <Button to="/auth" arrow className="hidden sm:inline-flex">get started</Button>
          <button className="grid size-10 place-items-center rounded-full md:hidden" aria-expanded={open} aria-label="menu" onClick={() => setOpen(!open)}>
            {open ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mx-auto mt-2 grid max-w-6xl gap-1 rounded-3xl bg-cream p-4 md:hidden">
          {links.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-primary/[.07]">{l}</a>)}
          <Button to="/auth" arrow className="mt-2">get started</Button>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="-mt-[76px] overflow-hidden bg-cream pb-20 pt-32 text-center">
      <Container>
        <Pill><Sparkle weight="fill" /> built for communities that share opportunities</Pill>
        <h1 className="mx-auto mt-5 max-w-3xl text-[2.75rem] leading-[0.98] sm:text-7xl">
          every opportunity deserves an <Em>updatebase.</Em>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-body">discover opportunities, grow your community, and manage every update from one place.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button to="/auth" arrow className="text-lg">get started</Button>
          <Button to="#discover" variant="outline" className="text-lg">explore opportunities</Button>
        </div>

        <div className="relative mx-auto mt-14 max-w-xl text-left">
          <Mascot className="absolute -left-6 bottom-10 hidden w-36 animate-bob lg:block lg:-left-44 lg:w-44" />
          <div className="rounded-[28px] bg-white/60 p-2.5">
            <div className="rounded-3xl bg-white p-5 shadow-[0_8px_18px_rgba(0,0,0,.04)]">
              <p className="text-xs font-semibold text-body">raw announcement</p>
              <p className="mt-1 line-clamp-3 text-sm text-ink">Applications for the Chevening Scholarship 2027/28 are open to professionals with 2 years of work experience. Deadline: 5 November...</p>
              <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 border-t border-dashed border-pink/40" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-hairline px-3 py-1.5 text-sm font-bold text-primary ring-2 ring-hairline"><Sparkle weight="fill" /> formatted in your style</span>
                <span className="h-px flex-1 border-t border-dashed border-pink/40" /></div>
              <div className="rounded-2xl border-2 border-hairline p-4">
                <div className="flex items-center justify-between"><span className="rounded-lg bg-[#d5f1ff] px-2.5 py-1 text-sm font-bold text-[#2597d0]">scholarship update</span><span className="font-display text-xl font-bold">15</span></div>
                <h3 className="mt-3 text-lg">chevening 2027/28 is open</h3>
                <p className="mt-1 text-sm text-body">fully funded masters in the uk. apply before 5 november. join the community for more.</p>
                <p className="mt-3 text-xs font-semibold text-primary">from futa techies</p>
              </div>
            </div>
            <div className="mt-2.5 rounded-3xl bg-white p-3">
              <Button arrow className="w-full justify-between py-2 text-lg"><span className="flex-1 text-center">publish update</span></Button>
              <p className="mt-2 text-center text-xs font-semibold text-body">saved as draft, copy for whatsapp, or share to the feed</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Stamps() {
  return (
    <section id="discover" className="scroll-mt-20 bg-[#f6f6f4] py-20">
      <Container>
        <h2 className="mx-auto max-w-2xl text-center text-4xl sm:text-5xl">opportunities worth <Em>following.</Em></h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-body">scholarships, jobs, internships, competitions, fellowships and grants, posted by organizations you trust.</p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {opportunities.map((o, i) => (
            <li key={o.title} className={`rounded-2xl border-2 border-dashed border-lilac bg-white p-2 ${i % 2 ? "lg:rotate-2" : "lg:-rotate-2"} transition hover:rotate-0`}>
              <div className={`grid h-24 place-items-center rounded-xl ${o.tone}`}><BookmarkSimple size={32} weight="fill" className="text-ink/70" /></div>
              <div className="p-2 pt-3">
                <p className="text-xs font-bold text-primary">{o.kind}</p>
                <h3 className="mt-1 text-base leading-tight">{o.title}</h3>
                <p className="mt-2 text-xs text-body">{o.org} · {o.due}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function Steps() {
  const s = [[UsersThree, "join and follow", "create an account, pick your location and follow organizations."], [Sparkle, "discover and apply", "browse your feed, bookmark updates and apply with confidence."], [Quotes, "share your outcome", "post a testimonial so the next person knows what worked."]] as const;
  return (
    <section className="py-20"><Container>
      <h2 className="max-w-xl text-4xl sm:text-5xl">from joining to <Em>winning</Em>, in three steps.</h2>
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {s.map(([Icon, t, d], i) => (
          <li key={t} className="rounded-3xl border-2 border-hairline p-6">
            <span className="font-display text-sm font-bold text-primary">step {i + 1}</span>
            <Icon size={36} weight="duotone" className="mt-4 text-primary" />
            <h3 className="mt-3 text-xl">{t}</h3><p className="mt-2 text-body">{d}</p>
          </li>
        ))}
      </ol>
    </Container></section>
  );
}

function Publish() {
  return (
    <section id="publish" className="scroll-mt-20 bg-night py-20 text-on-primary">
      <Container className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-4xl sm:text-5xl">one paste. one <Em>consistent</Em> update.</h2>
          <p className="mt-4 max-w-md text-on-primary/75">stop copying announcements into an ai chat. paste once, let your organization's rules shape the post, review it with your team, then copy or publish.</p>
          <ul className="mt-6 grid gap-3 font-semibold">
            {["your branding and numbering, applied every time", "drafts and reviews shared with delegates", "copy for whatsapp or publish to the feed"].map((t) => <li key={t} className="flex gap-3"><PaperPlaneTilt weight="fill" className="mt-1 shrink-0 text-lilac" />{t}</li>)}
          </ul>
          <Button to="/auth" variant="light" arrow className="mt-8">create your organization</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/15 p-4"><p className="text-xs font-semibold text-lilac">before</p><p className="mt-2 text-sm text-on-primary/70">PAYSTACK IS HIRING!!! Product Design Intern. Lagos/Remote. 6 months. Apply via the link below before 12th November...</p></div>
          <div className="rounded-2xl bg-white p-4 text-ink"><p className="text-xs font-semibold text-primary">after, update 16</p><h3 className="mt-2 text-lg">product design internship</h3><p className="mt-1 text-sm text-body">paystack, lagos or remote, 6 months. apply by 12 november.</p><p className="mt-3 text-xs font-semibold text-primary">from futa techies</p></div>
        </div>
      </Container>
    </section>
  );
}

function Collab() {
  const flow = ["draft", "in review", "approved", "scheduled", "published"];
  const crew = [["sade_b", "drafted the update"], ["tobi_a", "reviewed and approved"], ["henqsoft", "scheduled it for friday"]];
  return (
    <section className="bg-cream py-20"><Container>
      <h2 className="max-w-2xl text-4xl sm:text-5xl">your whole team, <Em>one workflow.</Em></h2>
      <p className="mt-3 max-w-xl text-body">delegates draft, reviewers approve, owners publish. every step is visible, and nothing goes out without a person pressing the button.</p>
      <ol className="mt-8 flex flex-wrap gap-2">{flow.map((f, i) => <li key={f} className={`rounded-full px-4 py-2 text-sm font-bold ${i === 1 ? "bg-primary text-on-primary" : "border border-lilac bg-white text-primary"}`}>{f}</li>)}</ol>
      <ul className="mt-6 grid gap-3 sm:grid-cols-3">{crew.map(([n, a]) => <li key={n} className="flex items-center gap-3 rounded-2xl bg-white p-4"><img src={avatar(n)} alt="" width={44} height={44} className="size-11 rounded-full bg-hairline" /><p className="text-sm"><b>{n}</b><br />{a}</p></li>)}</ul>
    </Container></section>
  );
}

function Preview() {
  return (
    <section className="py-20"><Container>
      <h2 className="max-w-xl text-4xl sm:text-5xl">see it <Em>in action.</Em></h2>
      <p className="mt-2 text-xs text-body">illustrative preview with demo content.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border-2 border-hairline p-5"><span className="rounded-lg bg-[#d5f1ff] px-2.5 py-1 text-xs font-bold text-[#2597d0]">scholarship</span><h3 className="mt-3 text-xl">chevening 2027/28 is open</h3><p className="mt-2 text-body">fully funded masters in the uk. apply before 5 november.</p><p className="mt-3 text-sm font-semibold text-primary">closes nov 5 · united kingdom</p></article>
        <div className="rounded-3xl bg-night p-5 text-on-primary"><p className="text-sm font-semibold text-lilac">organization overview</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">{[["drafts", "3"], ["scheduled", "2"], ["invites", "1"]].map(([k, v]) => <div key={k} className="rounded-2xl border border-on-primary/15 p-3"><dd className="font-display text-3xl font-bold">{v}</dd><dt className="text-xs text-on-primary/70">{k}</dt></div>)}</dl>
          <p className="mt-4 text-sm text-on-primary/70">next up: campus hack challenge, friday 9:00.</p></div>
      </div>
    </Container></section>
  );
}

function Orgs() {
  const f = [[FileText, "documents in one place", "keep rules, templates and past updates inside your organization."], [UsersThree, "delegates with roles", "invite your team, review drafts and publish together."], [BookmarkSimple, "a page people follow", "your own public page, branding and audience."]] as const;
  return (
    <section id="orgs" className="scroll-mt-20 bg-cream py-20"><Container>
      <h2 className="max-w-2xl text-4xl sm:text-5xl">for communities, companies, associations and <Em>nonprofits.</Em></h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {f.map(([Icon, t, d]) => <div key={t} className="rounded-3xl bg-white p-6"><Icon size={32} weight="fill" className="text-primary" /><h3 className="mt-4 text-xl">{t}</h3><p className="mt-2 text-body">{d}</p></div>)}
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {stories.map((s) => (
          <figure key={s.name} className="rounded-3xl border-2 border-pink bg-hairline p-6 shadow-[3px_4px_0_0_#ed0578]">
            <Quotes size={28} weight="fill" className="text-primary" />
            <blockquote className="mt-3 text-lg font-semibold text-ink">{s.line}</blockquote>
            <figcaption className="mt-4 text-sm text-body">{s.name}, {s.tag}</figcaption>
          </figure>
        ))}
      </div>
    </Container></section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-20"><Container className="max-w-3xl">
      <h2 className="text-center text-4xl sm:text-5xl">questions, <Em>answered.</Em></h2>
      <div className="mt-10 divide-y divide-hairline border-y-2 border-hairline">
        {faqs.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold">{q}<CaretDown className="shrink-0 transition group-open:rotate-180" /></summary>
            <p className="mt-3 text-body">{a}</p>
          </details>
        ))}
      </div>
    </Container></section>
  );
}

function Cta() {
  return (
    <section className="px-3 pb-16 sm:px-6"><div className="mx-auto max-w-6xl rounded-[2rem] bg-primary px-6 py-16 text-center text-on-primary">
      <h2 className="mx-auto max-w-2xl text-4xl sm:text-6xl">your next opportunity is already <Em>posted.</Em></h2>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/auth" variant="light" arrow className="text-lg">join updatebase</Button>
        <Button to="/auth" variant="soft" className="text-lg">create an organization</Button>
      </div>
    </div></section>
  );
}

const legalTo = (i: string) => (i.includes("privacy") ? "/legal/privacy" : i.includes("terms") ? "/legal/terms" : i.includes("cookie") ? "/legal/cookies" : "/");

function Footer() {
  const cols = [["product", ["feed", "discover", "testimonials", "notifications"]], ["organizations", ["publishing", "documents", "delegates", "analytics"]], ["company", ["about", "help and contact", "privacy policy", "terms of service", "cookie preferences"]]] as const;
  return (
    <footer className="overflow-hidden rounded-t-[2.5rem] bg-night text-on-primary">
      <Container className="pt-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div><Mascot className="w-28" /><p className="mt-4 max-w-xs text-on-primary/70">every opportunity deserves an updatebase.</p><Button to="/auth" arrow className="mt-6">get started</Button></div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map(([t, items]) => (
              <nav key={t} aria-label={t}><h3 className="font-display text-base text-lilac">{t}</h3>
                <ul className="mt-3 grid gap-2 text-on-primary/80">{items.map((i) => <li key={i}><Link to={legalTo(i)} className="hover:text-on-primary">{i}</Link></li>)}</ul></nav>
            ))}
          </div>
        </div>
        <p aria-hidden className="mt-14 select-none text-center font-display text-[clamp(3.5rem,19vw,16rem)] font-bold leading-[0.8] tracking-tighter text-primary">updatebase</p>
      </Container>
      <p className="bg-night py-5 text-center text-xs text-on-primary/50">© {new Date().getFullYear()} updatebase. all rights reserved.</p>
    </footer>
  );
}

export function LandingPage() {
  useEffect(() => {
    let stop = () => {}; let live = true;
    void startMotion(document.getElementById("root")!).then((s) => { if (live) stop = s; else s(); });
    return () => { live = false; stop(); };
  }, []);
  return (
    <>
      <Header />
      <main><Hero /><Stamps /><Steps /><Preview /><Publish /><Collab /><Orgs /><Faq /><Cta /></main>
      <Footer />
    </>
  );
}
