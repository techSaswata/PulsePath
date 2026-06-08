/**
 * BUILD 9 — seed the similar-case vector store with labelled synthetic cases,
 * so "most similar previous cases" returns useful matches out of the box.
 *
 *   npm run rag:seed-cases
 */
import "./_env";
import { generatePatients } from "@/lib/simulation/patients";
import { indexCase } from "@/lib/rag/retrieve";
import { ensureCollection, collections } from "@/lib/rag/qdrant";
import { URGENCY_META } from "@/lib/types";

async function main() {
  const { cases } = collections();
  await ensureCollection(cases);

  const patients = generatePatients(40, 7);
  console.log(`Seeding ${patients.length} labelled cases into "${cases}"…`);
  let ok = 0;
  for (const p of patients) {
    try {
      await indexCase(
        `seed-${p.id}`,
        p.profile,
        p.expectedTier,
        `Triaged as ${URGENCY_META[p.expectedTier].short} (${p.archetype})`
      );
      ok++;
      process.stdout.write(`  ${ok}/${patients.length}\r`);
    } catch (err) {
      console.warn(`\n  skipped ${p.id}:`, err);
    }
  }
  console.log(`\n✅ Seeded ${ok} cases.`);
}

main().catch((err) => {
  console.error("❌ Case seeding failed:", err);
  process.exit(1);
});
