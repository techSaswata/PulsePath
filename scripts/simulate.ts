/**
 * BONUS — headless simulation runner with a printed confusion matrix and the
 * headline EMERGENCY RECALL metric.
 *
 *   npm run simulate                       # 100 patients, guardrails-only (instant)
 *   npm run simulate -- --n 200 --mode full   # full LLM pipeline
 *   npm run simulate -- --n 1000           # bonus: 1000 synthetic patients
 */
import "./_env";
import { runFullSimulation, runGuardrailSimulation } from "@/lib/simulation/runner";
import { URGENCY_META, URGENCY_ORDER, UrgencyTier } from "@/lib/types";

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main() {
  const n = Number(arg("n", "100"));
  const mode = arg("mode", "guardrails") as "full" | "guardrails";
  const seed = Number(arg("seed", "42"));

  console.log(`\n🧪 Simulating ${n} synthetic patients (mode: ${mode})…\n`);
  const run =
    mode === "full"
      ? await runFullSimulation(n, seed, 4, (done, total) => {
          if (done % 10 === 0 || done === total) process.stdout.write(`  ${done}/${total}\r`);
        })
      : runGuardrailSimulation(n, seed);
  if (mode === "full") console.log("");

  const m = run.metrics;
  if (mode === "guardrails") {
    console.log("  ℹ guardrails-only mode classifies emergencies deterministically;");
    console.log("    non-emergency tiers default to SELF_CARE (use --mode full for AI tiering).\n");
  }
  console.log("─".repeat(48));
  console.log(`  Patients:               ${m.n}`);
  console.log(`  Overall accuracy:       ${(m.accuracy * 100).toFixed(1)}%`);
  console.log(`  EMERGENCY recall:       ${(m.emergencyRecall * 100).toFixed(1)}%  (${m.emergencyCount} emergencies)`);
  console.log(`  Emergency undertriage:  ${run.results.filter((r) => r.expectedTier === "EMERGENCY" && r.undertriage).length}  (must be 0)`);
  console.log("─".repeat(48));

  // Confusion matrix
  console.log("\n  Confusion matrix (rows=true, cols=pred):\n");
  const short = (t: UrgencyTier) => URGENCY_META[t].short.padStart(10);
  console.log("            " + URGENCY_ORDER.map((t) => URGENCY_META[t].short.slice(0, 6).padStart(8)).join(""));
  for (const rowT of URGENCY_ORDER) {
    const row = URGENCY_ORDER.map((colT) => String(m.confusion[rowT][colT]).padStart(8)).join("");
    console.log(short(rowT) + "  " + row);
  }

  console.log("\n  Per-tier recall:");
  for (const t of URGENCY_ORDER) {
    console.log(`   ${URGENCY_META[t].short.padEnd(12)} recall=${(m.perTier[t].recall * 100).toFixed(0)}%  support=${m.perTier[t].support}`);
  }

  const pass = m.emergencyRecall >= 1;
  console.log(`\n${pass ? "✅ PASS" : "❌ FAIL"} — emergency recall ${pass ? "is" : "is NOT"} 100%.\n`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ Simulation failed:", err);
  process.exit(1);
});
