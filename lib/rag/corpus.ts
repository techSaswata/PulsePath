/**
 * BUILD 8 — Seed clinical-guideline corpus.
 *
 * Curated excerpts distilled from publicly available NHS / WHO / CDC / NICE
 * guidance on triage red flags and care-level decisions. These are paraphrased
 * summaries for retrieval-augmentation, NOT verbatim copyrighted text, and each
 * carries a source + URL so recommendations are evidence-backed and auditable.
 *
 * `scripts/ingest.ts` embeds these into Qdrant. The same script can also ingest
 * full guideline documents you point it at later (see scripts/ingest.ts).
 */

import { GuidelineCitation } from "@/lib/types";

export interface GuidelineDoc {
  id: string; // stable id (also the Qdrant point id seed)
  source: GuidelineCitation["source"];
  title: string;
  url: string;
  topic: string; // coarse topic for filtering
  text: string; // the chunk to embed
}

export const GUIDELINE_CORPUS: GuidelineDoc[] = [
  // --- Chest pain / cardiac ------------------------------------------------
  {
    id: "nhs-chest-pain",
    source: "NHS",
    title: "Chest pain — when to call 999",
    url: "https://www.nhs.uk/conditions/chest-pain/",
    topic: "cardiac",
    text: "Call 999 for sudden chest pain that spreads to the arms, back, neck or jaw; feels heavy, tight or like pressure; lasts more than 15 minutes; or comes with sweating, shortness of breath, nausea or feeling sick. These may be signs of a heart attack and need an emergency ambulance. While waiting, sit down, stay calm, and chew one adult aspirin (300mg) if not allergic.",
  },
  {
    id: "nice-acs-assessment",
    source: "NICE",
    title: "Acute coronary syndromes — initial assessment (NICE NG185)",
    url: "https://www.nice.org.uk/guidance/ng185",
    topic: "cardiac",
    text: "Suspect acute coronary syndrome in people with chest pain that may be cardiac, including pain in the chest, arms, jaw, neck, back or epigastrium, often with sweating, breathlessness, nausea or vomiting. Refer immediately to emergency services. Do not exclude ACS on the basis of a normal resting ECG alone in the emergency setting.",
  },
  // --- Stroke --------------------------------------------------------------
  {
    id: "nhs-stroke-fast",
    source: "NHS",
    title: "Stroke symptoms — act FAST",
    url: "https://www.nhs.uk/conditions/stroke/symptoms/",
    topic: "neuro",
    text: "Use the FAST test to spot a stroke. Face: has their face fallen on one side, can they smile? Arms: can they raise both arms and keep them there? Speech: is their speech slurred? Time: it is time to call 999 if you see any single one of these signs. Other signs include sudden numbness or weakness on one side, sudden vision loss, sudden confusion or trouble understanding, and sudden severe dizziness or loss of balance. Stroke is a medical emergency where every minute counts.",
  },
  {
    id: "cdc-stroke-signs",
    source: "CDC",
    title: "Stroke signs and symptoms",
    url: "https://www.cdc.gov/stroke/signs-symptoms/",
    topic: "neuro",
    text: "Sudden stroke warning signs include numbness or weakness in the face, arm, or leg, especially on one side of the body; sudden confusion, trouble speaking, or difficulty understanding speech; sudden trouble seeing; sudden trouble walking, dizziness, loss of balance or coordination; and sudden severe headache with no known cause. Call emergency services immediately and note the time symptoms first appeared.",
  },
  // --- Meningitis / headache ----------------------------------------------
  {
    id: "nhs-meningitis",
    source: "NHS",
    title: "Meningitis — symptoms and the glass test",
    url: "https://www.nhs.uk/conditions/meningitis/",
    topic: "neuro",
    text: "Meningitis can be life-threatening. Symptoms include a high temperature, a severe headache, a stiff neck, dislike of bright lights (photophobia), being very sleepy or difficult to wake, confusion, and a blotchy rash that does not fade when a glass is rolled over it (the glass test). A non-blanching rash is a medical emergency. Do not wait for a rash to appear. Call 999 or go to A&E immediately if meningitis is suspected, especially in babies, children and young adults.",
  },
  {
    id: "nice-headache-redflags",
    source: "NICE",
    title: "Headache red flags (NICE CKS)",
    url: "https://cks.nice.org.uk/topics/headache-assessment/",
    topic: "neuro",
    text: "Refer urgently or emergently for headache with any of: thunderclap (sudden, severe, maximal within minutes) onset; new neurological deficit; reduced consciousness; fever with neck stiffness or photophobia; headache worsened by posture, coughing or straining; new headache in a patient over 50; or headache with a history of cancer or immunosuppression. A thunderclap headache requires immediate assessment to exclude subarachnoid haemorrhage.",
  },
  // --- Sepsis --------------------------------------------------------------
  {
    id: "nhs-sepsis",
    source: "NHS",
    title: "Sepsis — when to get emergency help",
    url: "https://www.nhs.uk/conditions/sepsis/",
    topic: "infection",
    text: "Call 999 or go to A&E if an adult or older child has any of: acting confused, slurred speech or not making sense; blue, grey, pale or blotchy skin, lips or tongue; a rash that does not fade when you roll a glass over it; difficulty breathing, breathlessness or breathing very fast. In babies and young children also look for: not feeding, repeated vomiting, no wet nappy for 12 hours. Sepsis can be life-threatening and gets worse quickly.",
  },
  {
    id: "who-sepsis",
    source: "WHO",
    title: "Sepsis recognition (WHO)",
    url: "https://www.who.int/news-room/fact-sheets/detail/sepsis",
    topic: "infection",
    text: "Sepsis is life-threatening organ dysfunction caused by a dysregulated host response to infection. Warning signs include fever or low body temperature and shivering, fast heart rate, fast breathing, confusion or disorientation, extreme pain or discomfort, and clammy or sweaty skin. Early recognition and treatment within the first hours improves outcomes. Suspected sepsis is a medical emergency.",
  },
  // --- Anaphylaxis ---------------------------------------------------------
  {
    id: "nhs-anaphylaxis",
    source: "NHS",
    title: "Anaphylaxis — emergency action",
    url: "https://www.nhs.uk/conditions/anaphylaxis/",
    topic: "allergy",
    text: "Anaphylaxis is a severe and life-threatening allergic reaction. Signs include swelling of the throat and tongue, difficulty breathing or breathing fast, wheezing, feeling faint or dizzy, a fast heartbeat, and clammy skin, often with a widespread rash. Use an adrenaline auto-injector immediately if available, then call 999. Lie the person flat and raise their legs. Anaphylaxis can develop within minutes of exposure to a trigger such as food, insect stings or medication.",
  },
  // --- Abdominal pain ------------------------------------------------------
  {
    id: "nhs-abdominal-pain",
    source: "NHS",
    title: "Stomach ache and abdominal pain",
    url: "https://www.nhs.uk/conditions/stomach-ache/",
    topic: "abdominal",
    text: "Go to A&E or call 999 for sudden, severe abdominal pain; pain when you touch your stomach; vomiting blood or blood in your stool; being unable to pass stool or wind; or pain with a high fever. See a GP urgently for severe pain that is getting worse. Many cases of mild, short-lived tummy ache (trapped wind, indigestion, constipation) can be managed at home with self-care and monitoring.",
  },
  {
    id: "nice-appendicitis",
    source: "NICE",
    title: "Suspected appendicitis (NICE CKS)",
    url: "https://cks.nice.org.uk/topics/appendicitis/",
    topic: "abdominal",
    text: "Suspect appendicitis with central abdominal pain that moves to the lower right (McBurney's point) over hours, worse on movement, with anorexia, nausea and low-grade fever. Arrange emergency admission for assessment. Signs of peritonitis (rigid abdomen, guarding, rebound tenderness) or possible perforation require immediate emergency referral.",
  },
  // --- Breathing -----------------------------------------------------------
  {
    id: "nhs-breathing-difficulty",
    source: "NHS",
    title: "Shortness of breath — when it is serious",
    url: "https://www.nhs.uk/conditions/shortness-of-breath/",
    topic: "respiratory",
    text: "Call 999 if breathlessness comes on suddenly and is severe, if the chest feels tight or there is chest pain, if the lips or face turn blue, or if the person is struggling to breathe or speak. Sudden severe breathlessness can indicate a serious problem such as a pulmonary embolism, severe asthma attack, or heart problem and needs emergency care.",
  },
  // --- Fever in children ---------------------------------------------------
  {
    id: "nice-feverish-child",
    source: "NICE",
    title: "Feverish illness in under-5s — traffic light (NICE NG143)",
    url: "https://www.nice.org.uk/guidance/ng143",
    topic: "paediatric",
    text: "Use the traffic-light system for feverish children under 5. Red (high risk): pale/mottled/blue skin, no response to social cues, appears ill to a professional, does not wake or stay awake, weak or continuous cry, grunting, fast breathing, reduced skin turgor, non-blanching rash, bulging fontanelle, neck stiffness, or status epilepticus — refer urgently for emergency care. Amber features warrant same-day assessment. Green features can often be managed with self-care and safety-netting advice.",
  },
  // --- Self-care baseline --------------------------------------------------
  {
    id: "nhs-self-care-cold",
    source: "NHS",
    title: "Common cold — self-care",
    url: "https://www.nhs.uk/conditions/common-cold/",
    topic: "self-care",
    text: "A common cold (runny or blocked nose, sneezing, sore throat, mild cough, mild fever) usually clears up on its own within 1 to 2 weeks. Self-care: rest, drink plenty of fluids, and take paracetamol or ibuprofen for aches and fever. See a GP if symptoms last more than 3 weeks, get suddenly worse, you have a very high temperature or feel hot and shivery, or you are concerned about a baby or a person with a long-term condition.",
  },
  {
    id: "cdc-when-er-vs-urgent",
    source: "CDC",
    title: "Choosing emergency, urgent or routine care",
    url: "https://www.cdc.gov/",
    topic: "triage",
    text: "Emergency departments are for life- or limb-threatening problems: chest pain, severe difficulty breathing, signs of stroke, severe bleeding, severe allergic reactions, or loss of consciousness. Urgent care or same-day primary care suits problems that are not life-threatening but need prompt attention, such as minor injuries, infections, or moderate pain. Routine primary care handles non-urgent ongoing concerns. Self-care with monitoring is appropriate for mild, self-limiting symptoms.",
  },
];

/** Build the GuidelineCitation projection used in API responses. */
export function toCitation(doc: GuidelineDoc, score: number): GuidelineCitation {
  return {
    source: doc.source,
    title: doc.title,
    snippet: doc.text.length > 320 ? doc.text.slice(0, 317) + "…" : doc.text,
    url: doc.url,
    score,
  };
}
