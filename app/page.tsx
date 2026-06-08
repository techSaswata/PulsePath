import Link from "next/link";
import { Icons } from "@/components/landing/icons";
import { HeroPreview } from "@/components/landing/HeroPreview";

export default function Landing() {
  return (
    <div className="space-y-20 pb-10">
      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorks />
      <Accessibility />
      <FinalCta />
    </div>
  );
}

/* ------------------------------------------------------------------ Hero */
function Hero() {
  return (
    <section className="grid items-center gap-10 pt-6 lg:grid-cols-2 lg:pt-10">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-1 text-xs font-medium text-muted">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Multi-agent clinical reasoning · evidence-backed · safety-first
        </span>
        <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
          Reach the right care —{" "}
          <span className="text-brand-600">before the waiting room.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          PulsePath is a conversational triage assistant. Describe your symptoms in plain language or
          by voice; it asks the right follow-up questions, weighs the evidence with a team of AI
          clinicians, applies hard emergency guardrails, and tells you exactly where to go — and why.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/triage" className="btn-primary px-5 py-3 text-base">
            Start a triage <Icons.arrow className="h-4 w-4" />
          </Link>
          <Link href="/simulation" className="btn-ghost px-5 py-3 text-base">
            See the simulation
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">
          Free to try · no sign-up · works in your browser. Not a substitute for professional care.
        </p>
      </div>
      <div className="lg:pl-6">
        <HeroPreview />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Trust strip */
function TrustStrip() {
  const stats = [
    { v: "100%", l: "Emergency recall in the test set" },
    { v: "5", l: "Specialist AI agents that debate" },
    { v: "7", l: "Hard guardrail conditions" },
    { v: "NHS · WHO · CDC · NICE", l: "Guideline evidence base" },
  ];
  return (
    <section className="grid grid-cols-2 gap-4 rounded-2xl border border-hairline bg-white p-6 shadow-card md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.l} className="text-center">
          <p className="text-xl font-bold text-brand-600 sm:text-2xl">{s.v}</p>
          <p className="mt-1 text-xs text-muted">{s.l}</p>
        </div>
      ))}
    </section>
  );
}

/* --------------------------------------------------------------- Features */
const FEATURES = [
  { icon: Icons.chat, title: "Conversational intake", desc: "Describe symptoms naturally. Adaptive clarifying questions narrow to what matters — each with its clinical rationale shown.", tag: "Triage agent", href: "/triage" },
  { icon: Icons.agents, title: "Multi-agent reasoning", desc: "Symptom, Risk, Differential, Safety and Final-Decision agents debate before any conclusion — you see the full transcript.", tag: "5-agent debate", href: "/triage" },
  { icon: Icons.shield, title: "Emergency guardrails", desc: "Deterministic rules for stroke, heart attack, sepsis, meningitis and more. They can raise urgency but the AI can never talk them down.", tag: "Cannot be overridden", href: "/triage" },
  { icon: Icons.insight, title: "Confidence & explainability", desc: "Every result shows a calibrated confidence score and the ranked top-5 reasons — plus what could change the assessment.", tag: "Transparent", href: "/triage" },
  { icon: Icons.mic, title: "Voice doctor", desc: "Speak your symptoms and hear the guidance spoken back. Feels like talking to a real nurse.", tag: "Speech in & out", href: "/triage" },
  { icon: Icons.body, title: "Body diagram input", desc: "Tap head, chest, abdomen or limbs to mark where it hurts. Location becomes context for the reasoning.", tag: "Visual input", href: "/triage" },
  { icon: Icons.timeline, title: "Symptom timeline", desc: "“Started 3 days ago → worsened yesterday → fever today.” Progression is captured and visualised automatically.", tag: "Progression", href: "/triage" },
  { icon: Icons.book, title: "Evidence-backed (RAG)", desc: "Recommendations are grounded in NHS, WHO, CDC and NICE guidance retrieved from a clinical vector store — with citations.", tag: "Cited guidance", href: "/triage" },
  { icon: Icons.users, title: "Similar previous cases", desc: "Surfaces the most similar prior presentations and how they were triaged, to support the reasoning.", tag: "Case retrieval", href: "/triage" },
  { icon: Icons.dashboard, title: "Provider dashboard", desc: "Clinicians see the structured summary, symptoms, timeline, risk factors, urgency and red flags at a glance.", tag: "For providers", href: "/dashboard" },
  { icon: Icons.file, title: "PDF handoff report", desc: "One click generates a clean, structured handoff report for the receiving clinician.", tag: "Auto-generated", href: "/triage" },
  { icon: Icons.clock, title: "Continuous monitoring", desc: "Self-care cases get scheduled re-checks at 6h / 24h / 72h, and automatically escalate if symptoms worsen.", tag: "Follow-up & escalation", href: "/triage" },
  { icon: Icons.flask, title: "Triage simulation engine", desc: "Generate thousands of synthetic patients, run triage in batch, and inspect the confusion matrix and emergency recall.", tag: "Validation", href: "/simulation" },
];

function Features() {
  return (
    <section>
      <SectionHead
        eyebrow="Everything in one assistant"
        title="A complete triage product, not a chatbot"
        sub="Thirteen capabilities working together — from the first symptom to the clinician handoff and beyond."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.title}
            href={f.href}
            className="group card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-float"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <f.icon />
              </span>
              <span className="chip !border-brand-100 !bg-brand-50 !text-brand-700">{f.tag}</span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink">{f.title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{f.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">
              Try it <Icons.arrow className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ How it works */
function HowItWorks() {
  const steps = [
    { n: 1, t: "Tell us what's wrong", d: "Type or speak your symptoms. Mark pain on the body diagram. PulsePath builds a structured profile as you talk." },
    { n: 2, t: "Answer a few smart questions", d: "It asks only the most useful follow-ups — each with the reason it's asking — to narrow the urgency." },
    { n: 3, t: "The AI care team reasons", d: "Five specialist agents debate, cross-checked by hard safety guardrails and grounded in clinical guidelines." },
    { n: 4, t: "Get a clear next step", d: "A care level, confidence, the top reasons, what to do, red flags to watch — and a report for your provider." },
  ];
  return (
    <section>
      <SectionHead eyebrow="How it works" title="From symptom to safe next step in minutes" />
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="card relative p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {s.n}
            </span>
            <h3 className="mt-3 text-base font-semibold text-ink">{s.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Accessibility */
function Accessibility() {
  const points = [
    "Voice input and spoken responses for hands-free, low-literacy and low-vision use",
    "Keyboard-navigable controls and clear focus states throughout",
    "High-contrast urgency colours paired with text labels (never colour alone)",
    "Plain-language guidance — no jargon, with a reason behind every question",
    "Quick-reply chips so answering is one tap, not a paragraph",
    "Works on any device in the browser — nothing to install",
  ];
  return (
    <section className="overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-brand-50 to-white p-6 shadow-card sm:p-10">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <SectionHead
            eyebrow="Designed for everyone"
            title="Accessible by default"
            sub="Triage only helps if everyone can use it. PulsePath is built for clarity and reach."
            left
          />
        </div>
        <ul className="grid gap-3 sm:grid-cols-1">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 rounded-xl bg-white/70 p-3 text-sm text-ink">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Final CTA */
function FinalCta() {
  return (
    <section className="rounded-2xl bg-brand-600 px-6 py-12 text-center shadow-float sm:px-10">
      <h2 className="text-3xl font-bold tracking-tight text-white">Not sure how urgent it is?</h2>
      <p className="mx-auto mt-3 max-w-xl text-brand-100">
        Let PulsePath help you decide where to go — calmly, clearly, and safely.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/triage" className="btn bg-white px-6 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50">
          Start your triage <Icons.arrow className="h-4 w-4" />
        </Link>
        <Link href="/dashboard" className="btn border border-white/40 px-6 py-3 text-base font-semibold text-white hover:bg-white/10">
          Provider view
        </Link>
      </div>
      <p className="mt-6 text-xs text-brand-200">
        In a life-threatening emergency, call your local emergency number immediately.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ shared */
function SectionHead({ eyebrow, title, sub, left }: { eyebrow: string; title: string; sub?: string; left?: boolean }) {
  return (
    <div className={left ? "" : "mx-auto max-w-2xl text-center"}>
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-base text-muted">{sub}</p>}
    </div>
  );
}
