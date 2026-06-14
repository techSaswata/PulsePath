import Link from "next/link";
import { Icons } from "@/components/landing/icons";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { URGENCY_META } from "@/lib/types";

export default function Landing() {
  return (
    <div className="space-y-24 pb-10">
      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorks />
      <TierGuide />
      <Accessibility />
      <FinalCta />
    </div>
  );
}

/* ------------------------------------------------------------------ Hero */
function Hero() {
  return (
    <section className="relative grid items-center gap-12 pt-6 lg:grid-cols-2 lg:pt-12">
      {/* Background glow blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-16 h-72 w-72 rounded-full bg-blue-100/30 blur-3xl" />

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
          </span>
          Multi-agent clinical reasoning · evidence-backed · safety-first
        </span>

        <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
          Reach the right care —{" "}
          <span className="relative">
            <span className="relative z-10 text-brand-600">before the waiting room.</span>
            <span className="absolute inset-x-0 bottom-1 z-0 h-3 -skew-x-2 bg-brand-100" />
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
          PulsePath is a conversational triage assistant. Describe your symptoms in plain language or
          by voice; it asks the right follow-up questions, weighs the evidence with a team of AI
          clinicians, applies hard emergency guardrails, and tells you exactly where to go — and why.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/triage" className="btn-primary gap-2 px-6 py-3 text-base shadow-sm">
            Start a triage <Icons.arrow className="h-4 w-4" />
          </Link>
          <Link href="/simulation" className="btn-ghost px-6 py-3 text-base">
            See the simulation
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          {["Free to try", "No sign-up required", "Works in your browser", "Not a substitute for professional care"].map((x) => (
            <span key={x} className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 5 5L20 7" />
              </svg>
              {x}
            </span>
          ))}
        </div>
      </div>

      <div className="relative lg:pl-6">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-50 to-blue-50 opacity-60" />
        <div className="relative">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Trust strip */
function TrustStrip() {
  const stats = [
    { v: "100%", l: "Emergency recall in the test set", color: "text-green-600" },
    { v: "5", l: "Specialist AI agents that debate", color: "text-brand-600" },
    { v: "7", l: "Hard guardrail conditions (AI-proof)", color: "text-red-600" },
    { v: "4", l: "Evidence sources (NHS · WHO · CDC · NICE)", color: "text-amber-600" },
  ];
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline shadow-card md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.l} className="flex flex-col items-center bg-white px-5 py-6 text-center">
          <p className={`text-2xl font-extrabold sm:text-3xl ${s.color}`}>{s.v}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.l}</p>
        </div>
      ))}
    </section>
  );
}

/* --------------------------------------------------------------- Features */
const FEATURE_GROUPS = [
  {
    group: "Clinical AI",
    color: "bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white",
    items: [
      { icon: Icons.chat, title: "Conversational intake", desc: "Describe symptoms naturally. Adaptive clarifying questions narrow to what matters — each with its clinical rationale shown.", tag: "Triage agent", href: "/triage" },
      { icon: Icons.agents, title: "Multi-agent reasoning", desc: "Symptom, Risk, Differential, Safety and Final-Decision agents debate before any conclusion — you see the full transcript.", tag: "5-agent debate", href: "/triage" },
      { icon: Icons.shield, title: "Emergency guardrails", desc: "Deterministic rules for stroke, heart attack, sepsis, meningitis and more. They can raise urgency but the AI can never talk them down.", tag: "Cannot be overridden", href: "/triage" },
      { icon: Icons.insight, title: "Confidence & explainability", desc: "Every result shows a calibrated confidence score and the ranked top-5 reasons — plus what could change the assessment.", tag: "Transparent", href: "/triage" },
    ],
  },
  {
    group: "Input & Accessibility",
    color: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
    items: [
      { icon: Icons.mic, title: "Voice doctor", desc: "Speak your symptoms and hear the guidance spoken back. Feels like talking to a real nurse.", tag: "Speech in & out", href: "/triage" },
      { icon: Icons.body, title: "Body diagram input", desc: "Tap head, chest, abdomen or limbs to mark where it hurts. Location becomes context for the reasoning.", tag: "Visual input", href: "/triage" },
      { icon: Icons.timeline, title: "Symptom timeline", desc: "'Started 3 days ago -> worsened yesterday -> fever today.' Progression is captured and visualised automatically.", tag: "Progression", href: "/triage" },
    ],
  },
  {
    group: "Evidence & Continuity",
    color: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    items: [
      { icon: Icons.book, title: "Evidence-backed (RAG)", desc: "Recommendations are grounded in NHS, WHO, CDC and NICE guidance retrieved from a clinical vector store — with citations.", tag: "Cited guidance", href: "/triage" },
      { icon: Icons.users, title: "Similar previous cases", desc: "Surfaces the most similar prior presentations and how they were triaged, to support the reasoning.", tag: "Case retrieval", href: "/triage" },
      { icon: Icons.dashboard, title: "Provider dashboard", desc: "Clinicians see the structured summary, symptoms, timeline, risk factors, urgency and red flags at a glance.", tag: "For providers", href: "/dashboard" },
      { icon: Icons.file, title: "PDF handoff report", desc: "One click generates a clean, structured handoff report for the receiving clinician.", tag: "Auto-generated", href: "/triage" },
      { icon: Icons.clock, title: "Continuous monitoring", desc: "Self-care cases get scheduled re-checks at 6h / 24h / 72h, and automatically escalate if symptoms worsen.", tag: "Follow-up", href: "/triage" },
      { icon: Icons.flask, title: "Simulation engine", desc: "Generate thousands of synthetic patients, run triage in batch, and inspect the confusion matrix and emergency recall.", tag: "Validation", href: "/simulation" },
    ],
  },
];

function Features() {
  return (
    <section>
      <SectionHead
        eyebrow="Everything in one assistant"
        title="A complete triage product, not a chatbot"
        sub="Thirteen capabilities working together — from the first symptom to the clinician handoff and beyond."
      />
      <div className="mt-10 space-y-10">
        {FEATURE_GROUPS.map((g) => (
          <div key={g.group}>
            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
              <span className="h-px flex-1 bg-hairline" />
              {g.group}
              <span className="h-px flex-1 bg-hairline" />
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((f) => (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${g.color}`}>
                      <f.icon />
                    </span>
                    <span className="chip !border-slate-200 !bg-slate-50 !text-slate-600">{f.tag}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{f.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">
                    Try it <Icons.arrow className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ How it works */
function HowItWorks() {
  const steps = [
    {
      n: 1,
      t: "Tell us what's wrong",
      d: "Type or speak your symptoms. Mark pain on the body diagram. PulsePath builds a structured profile as you talk.",
      color: "bg-brand-600",
    },
    {
      n: 2,
      t: "Answer a few smart questions",
      d: "It asks only the most useful follow-ups — each with the reason it's asking — to narrow the urgency.",
      color: "bg-purple-600",
    },
    {
      n: 3,
      t: "The AI care team reasons",
      d: "Five specialist agents debate, cross-checked by hard safety guardrails and grounded in clinical guidelines.",
      color: "bg-emerald-600",
    },
    {
      n: 4,
      t: "Get a clear next step",
      d: "A care level, confidence, the top reasons, what to do, red flags to watch — and a report for your provider.",
      color: "bg-amber-500",
    },
  ];
  return (
    <section>
      <SectionHead eyebrow="How it works" title="From symptom to safe next step in minutes" />
      <div className="relative mt-10">
        {/* Connector line (desktop only) */}
        <div className="absolute left-0 right-0 top-5 hidden h-0.5 bg-hairline md:block" />
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="relative card p-5">
              <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${s.color} text-sm font-bold text-white shadow-sm`}>
                {s.n}
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- Tier guide */
function TierGuide() {
  const tiers = (Object.entries(URGENCY_META) as [keyof typeof URGENCY_META, typeof URGENCY_META[keyof typeof URGENCY_META]][]);
  const bgMap: Record<string, string> = {
    EMERGENCY: "border-red-200 bg-red-50",
    AANDE: "border-orange-200 bg-orange-50",
    GP_URGENT: "border-amber-200 bg-amber-50",
    GP_ROUTINE: "border-cyan-200 bg-cyan-50",
    SELF_CARE: "border-green-200 bg-green-50",
  };
  const textMap: Record<string, string> = {
    EMERGENCY: "text-red-700",
    AANDE: "text-orange-700",
    GP_URGENT: "text-amber-700",
    GP_ROUTINE: "text-cyan-700",
    SELF_CARE: "text-green-700",
  };
  return (
    <section>
      <SectionHead
        eyebrow="The five care levels"
        title="What each triage result means"
        sub="PulsePath always explains which level of care it recommends and exactly what to do next."
      />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiers.map(([key, meta]) => (
          <div key={key} className={`rounded-2xl border p-4 ${bgMap[key]}`}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
              <span className={`text-sm font-bold ${textMap[key]}`}>{meta.short}</span>
            </div>
            <p className={`mt-2 text-xs leading-relaxed ${textMap[key]} opacity-80`}>{meta.action}</p>
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
    <section className="overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-brand-50 via-white to-blue-50 p-6 shadow-card sm:p-10">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionHead
            eyebrow="Designed for everyone"
            title="Accessible by default"
            sub="Triage only helps if everyone can use it. PulsePath is built for clarity and reach."
            left
          />
        </div>
        <ul className="grid gap-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 rounded-xl bg-white/80 p-3 text-sm text-ink shadow-sm">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5L20 7" />
                </svg>
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
    <section className="relative overflow-hidden rounded-2xl bg-brand-600 px-6 py-14 text-center shadow-float sm:px-10">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-brand-400/30 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">Not sure how urgent it is?</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Let PulsePath help you decide.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-brand-100">
          Calmly, clearly, and safely — with the evidence to back it up and hard guardrails to keep you safe.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/triage"
            className="btn bg-white px-7 py-3 text-base font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
          >
            Start your triage <Icons.arrow className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="btn border border-white/30 px-7 py-3 text-base font-semibold text-white hover:bg-white/10"
          >
            Provider view
          </Link>
        </div>
        <p className="mt-8 text-xs text-brand-200">
          In a life-threatening emergency, call your local emergency number immediately.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ shared */
function SectionHead({
  eyebrow,
  title,
  sub,
  left,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  left?: boolean;
}) {
  return (
    <div className={left ? "" : "mx-auto max-w-2xl text-center"}>
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-base leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}
