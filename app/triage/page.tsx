import { TriageChat } from "@/components/TriageChat";
import { SetupBanner } from "@/components/SetupBanner";

export default function TriagePage() {
  return (
    <div>
      <SetupBanner />
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Healthcare Triage Assistant</h1>
        <p className="mt-1 text-sm text-muted">
          Describe your symptoms in your own words or by voice. PulsePath asks adaptive clarifying
          questions, runs a multi-agent clinical review with hard emergency guardrails, and points you
          to the right level of care — with transparent reasoning and evidence.
        </p>
      </div>
      <TriageChat />
    </div>
  );
}
