/**
 * Zod schemas for each agent's structured output (Build 2).
 * Used with `llm.withStructuredOutput(...)` so every agent returns validated JSON.
 */
import { z } from "zod";

export const TIER = z.enum(["EMERGENCY", "AANDE", "GP_URGENT", "GP_ROUTINE", "SELF_CARE"]);

export const SymptomAgentOut = z.object({
  refinedComplaint: z.string().describe("One-line restatement of the primary complaint"),
  keyFeatures: z.array(z.string()).describe("Salient clinical features extracted, e.g. 'pleuritic', 'exertional'"),
  pertinentNegatives: z.array(z.string()).describe("Important symptoms the patient denies or that are absent"),
  missingCriticalInfo: z.array(z.string()).describe("Clinically important details still unknown"),
  reasoning: z.string().describe("Brief reasoning, 2-3 sentences"),
});

export const RiskAgentOut = z.object({
  proposedTier: TIER.describe("This agent's independent urgency vote"),
  riskFactors: z.array(z.string()).describe("Patient/situational factors raising risk (age, pregnancy, comorbidity)"),
  redFlags: z.array(z.string()).describe("Concerning features that warrant escalation"),
  reasoning: z.string(),
});

export const DifferentialAgentOut = z.object({
  differentials: z
    .array(
      z.object({
        condition: z.string(),
        likelihood: z.enum(["low", "moderate", "high"]),
        supportingFeatures: z.array(z.string()),
        worstCaseTier: TIER.describe("Urgency if this diagnosis were true"),
      })
    )
    .describe("Ranked differential diagnosis list, most likely first"),
  reasoning: z.string(),
});

export const SafetyAgentOut = z.object({
  agreesWithRisk: z.boolean().describe("Whether the safety agent agrees with the risk agent's tier"),
  proposedTier: TIER.describe("Safety agent's tier — must never be LESS urgent than warranted"),
  challenges: z.array(z.string()).describe("Specific challenges/objections to the other agents' reasoning"),
  cannotMissDiagnoses: z.array(z.string()).describe("Dangerous diagnoses that must not be missed even if unlikely"),
  reasoning: z.string(),
});

export const FinalDecisionOut = z.object({
  tier: TIER.describe("Final urgency tier reconciling all agents (before hard guardrails)"),
  confidence: z.number().min(0).max(100).describe("Confidence 0-100 in the tier"),
  topReasons: z.array(z.string()).min(1).max(5).describe("Ranked top reasons for the decision (max 5)"),
  uncertaintyDrivers: z.array(z.string()).describe("What would most change the assessment if known"),
  carePathway: z.object({
    whatToDo: z.array(z.string()).describe("Specific actions for the patient"),
    whatToTellProvider: z.array(z.string()).describe("Key things to tell the GP/clinician"),
    redFlags: z.array(z.string()).describe("Symptoms that should trigger urgent escalation"),
  }),
  patientMessage: z.string().describe("A calm, plain-language summary for the patient (3-5 sentences)"),
});

export type TSymptomAgentOut = z.infer<typeof SymptomAgentOut>;
export type TRiskAgentOut = z.infer<typeof RiskAgentOut>;
export type TDifferentialAgentOut = z.infer<typeof DifferentialAgentOut>;
export type TSafetyAgentOut = z.infer<typeof SafetyAgentOut>;
export type TFinalDecisionOut = z.infer<typeof FinalDecisionOut>;
