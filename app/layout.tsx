import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "PulsePath — AI Healthcare Triage Assistant",
  description:
    "Conversational symptom triage with multi-agent clinical reasoning, hard-coded emergency guardrails, evidence-backed guidance, and provider handoff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <TopNav />
        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 md:px-6">{children}</main>
        <footer className="border-t border-hairline bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted md:px-6">
            PulsePath is a clinical decision-support tool and does not replace professional medical
            advice. In an emergency, call your local emergency number immediately.
          </div>
        </footer>
      </body>
    </html>
  );
}
