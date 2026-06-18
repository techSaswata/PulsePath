# 🏥 PulsePath — AI-Powered Healthcare Triage Assistant

> Help patients reach the right care — before they reach the waiting room.

A **production** conversational triage product: collects symptoms by text or voice, asks adaptive
clarifying questions, runs a **multi-agent clinical debate**, enforces **hard-coded emergency
guardrails the AI cannot override**, grounds advice in **clinical guidelines (RAG)**, and outputs a
transparent urgency decision + clinician handoff report.

| | |
|---|---|
| **Stack** | Next.js (App Router) · TypeScript · LangGraph.js · Supabase · Qdrant · Sarvam AI |
| **LLM** | Any OpenAI-compatible provider (default: OpenRouter `qwen/qwen3.6-35b-a3b`) |
| **Embeddings** | Free HuggingFace `BAAI/bge-base-en-v1.5` (768-dim) via OpenAI-compatible adapter |
| **Config** | 100% env-driven — no hard-coded keys |
| **Status** | Builds clean · typecheck clean · emergency recall = 100% |

---

## ✨ Features — all 12 builds + the bonus

| # | Build | What it does | Source |
|---|-------|--------------|--------|
| 1 | **Clinical Triage Agent** | Conversational intake, adaptive follow-ups, urgency classification, structured patient summary | [intake.ts](lib/triage/intake.ts) · [assess.ts](lib/triage/assess.ts) · [TriageChat.tsx](components/TriageChat.tsx) |
| 2 | **Multi-Agent Reasoning** | Symptom · Risk · Differential · Safety · Final-Decision agents *debate* (Risk↔Safety loop) before output | [reasoningGraph.ts](lib/graph/reasoningGraph.ts) |
| 3 | **Emergency Guardrail Engine** | Deterministic Stroke / Heart-attack / Sepsis / Meningitis (+ anaphylaxis, bleeding, suicide) rules — **AI cannot override** | [engine.ts](lib/guardrails/engine.ts) |
| 4 | **Voice Doctor** | Speak symptoms (Sarvam STT) and hear responses (Sarvam TTS) | [sarvam.ts](lib/voice/sarvam.ts) · [VoiceRecorder.tsx](components/VoiceRecorder.tsx) · [SpeakButton.tsx](components/SpeakButton.tsx) |
| 5 | **Body Diagram Input** | Click head/chest/abdomen/limbs to mark pain; fed to the AI as context | [BodyDiagram.tsx](components/BodyDiagram.tsx) |
| 6 | **Medical Timeline** | Visual symptom progression | [Timeline.tsx](components/Timeline.tsx) |
| 7 | **Confidence + Explainability** | Tier + calibrated confidence + ranked top-5 reasons + uncertainty drivers | [schemas.ts](lib/graph/schemas.ts) · [AssessmentView.tsx](components/AssessmentView.tsx) |
| 8 | **RAG on Clinical Guidelines** | NHS / WHO / CDC / NICE corpus in Qdrant; evidence-backed citations | [lib/rag/](lib/rag/) · [ingest.ts](scripts/ingest.ts) |
| 9 | **Similar Patient Retrieval** | "Most similar previous cases" from a case vector store | [retrieve.ts](lib/rag/retrieve.ts) · [seed-cases.ts](scripts/seed-cases.ts) |
| 10 | **Provider Dashboard** | Summary, symptoms, timeline, risk factors, urgency, red flags | [app/dashboard/](app/dashboard/) |
| 11 | **Medical Report PDF** | Auto-generated handoff report | [pdf.ts](lib/report/pdf.ts) · [report/route.ts](app/api/report/route.ts) |
| 12 | **Continuous Monitoring** | Self-care re-checks (6h / 24h / 72h) with escalation if symptoms worsen | [followups.ts](lib/monitoring/followups.ts) · [monitor/route.ts](app/api/monitor/route.ts) |
| ⭐ | **Bonus — Simulation Engine** | Generate N synthetic patients, batch-triage, confusion matrix, **emergency recall = 100%** | [lib/simulation/](lib/simulation/) · [app/simulation/](app/simulation/) · [simulate.ts](scripts/simulate.ts) |

---

## 🚀 Quick start

| Step | Command | Notes |
|------|---------|-------|
| 1. Install | `npm install` | Node 20+ |
| 2. Configure | `cp .env.example .env.local` | Fill keys (table below). Runs in **degraded mode** with no keys. |
| 3. Run | `npm run dev` | → http://localhost:3000 |
| 4. Verify metric | `npm run simulate` | Guardrails-only: emergency recall = 100% |

### Routes

| Path | Page |
|------|------|
| `/` | Landing — all features |
| `/triage` | Patient triage (chat + voice + body diagram + timeline) |
| `/dashboard` | Provider dashboard (list + case detail) |
| `/simulation` | Simulation engine + confusion matrix |

### Optional — set up the databases

| Service | Command | Purpose |
|---------|---------|---------|
| Supabase | Run `sql/0001_init.sql`, then `sql/0002_rls.sql` in the SQL editor | Sessions, assessments, follow-ups |
| Qdrant | `docker run -p 6333:6333 qdrant/qdrant` | Vector DB |
| Qdrant ingest | `npm run rag:ingest` | Embed NHS/WHO/CDC/NICE corpus |
| Qdrant cases | `npm run rag:seed-cases` | Seed similar-case store |

### npm scripts

| Script | Action |
|--------|--------|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run rag:ingest` | Embed guideline corpus into Qdrant |
| `npm run rag:seed-cases` | Seed similar-case vector store |
| `npm run simulate` | Headless simulation (`-- --n 1000`, `-- --mode full`) |

---

## ⚙️ Environment variables

| Variable(s) | Purpose | Default |
|-------------|---------|---------|
| `LLM_BASE_URL` · `LLM_API_KEY` · `LLM_MODEL` | LLM via **OpenAI-compatible** format | OpenRouter + Qwen3.6 |
| `LLM_MAX_TOKENS` | Output cap — keep high so reasoning output isn't truncated | `16384` |
| `EMBED_PROVIDER` · `EMBED_BASE_URL` · `EMBED_MODEL` · `EMBED_DIMS` · `HF_TOKEN` | **Free HuggingFace** embeddings (OpenAI-compatible semantics) | `bge-base-en-v1.5` / 768 |
| `SARVAM_API_KEY` · `SARVAM_*` | Sarvam AI voice (STT `saarika`, TTS `bulbul`) | — |
| `QDRANT_URL` · `QDRANT_API_KEY` · `QDRANT_*_COLLECTION` | Qdrant vector DB | localhost:6333 |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | Supabase Postgres | — |
| `CRON_SECRET` | Authorizes the monitoring cron endpoint | — |

> **Embeddings note:** the free HF serverless router exposes OpenAI-compatible `/v1` for *chat only*,
> not embeddings — so [embeddings.ts](lib/rag/embeddings.ts) calls HF's `feature-extraction` route and
> wraps it into the OpenAI `{data:[{embedding}]}` shape. Set `EMBED_PROVIDER=openai` to point
> `EMBED_BASE_URL` at a self-hosted TEI `/v1` server instead. Change the model → update `EMBED_DIMS`
> and re-create the Qdrant collection.

---

## 🏗️ Architecture

```
            Patient (text / voice / body-diagram)
                          │
              ┌───────────▼────────────┐
              │  /api/triage            │  intake → adaptive Q → assess
              └───────────┬────────────┘
        ┌─────────────────┼──────────────────────────┐
        ▼                 ▼                           ▼
  Guardrail Engine   RAG retrieval            Multi-agent LangGraph
  (deterministic)    (Qdrant: guidelines      Symptom→Risk→Differential
        │             + similar cases)          →Safety⇄(debate)→Final
        │                 │                           │
        └────── mostUrgent(AI tier, guardrail tier) ──┘   ← AI can only be RAISED
                          │
                 TriageAssessment  →  Supabase (sessions/assessments/follow-ups)
                          │                    │
              AssessmentView (UI)        Provider dashboard + PDF handoff
```

> **Safety invariant:** the AI's tier is reconciled via `mostUrgent(...)` — a guardrail can only ever
> **raise** urgency, never be talked down. Enforced in [assess.ts](lib/triage/assess.ts), proven by the
> simulation (emergency recall = 100%).

### Urgency tiers

| Tier | Meaning |
|------|---------|
| `EMERGENCY` | Call emergency services now |
| `AANDE` | Go to A&E / ER today |
| `GP_URGENT` | Urgent GP appointment (same-day) |
| `GP_ROUTINE` | Routine GP appointment (within a week) |
| `SELF_CARE` | Self-care with monitoring |

---

## ⏰ Continuous monitoring (Build 12)

Non-emergency cases get follow-ups scheduled in Supabase. A **GitHub Actions** workflow
([.github/workflows/monitor.yml](.github/workflows/monitor.yml)) pings `/api/monitor` hourly to
advance them (Vercel's Hobby plan only allows daily crons, so we use Actions instead — free + hourly).

Set two **repo** secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `MONITOR_URL` | `https://<your-app>.vercel.app/api/monitor` |
| `CRON_SECRET` | same value as the `CRON_SECRET` env var in Vercel |

| Call | Auth | Use |
|------|------|-----|
| `GET /api/monitor` | `Authorization: Bearer $CRON_SECRET` | GitHub Action — advances due follow-ups |
| `GET /api/monitor?secret=$CRON_SECRET` | query param | Manual / local |
| `POST /api/monitor` | — | Patient follow-up reply → re-assess → **escalate** if more urgent |

---

## ✅ Success metrics — how they're met

| Metric | How | Evidence |
|--------|-----|----------|
| All emergencies classified emergency | Deterministic guardrails + safety-agent floor | `npm run simulate` → recall 100%, 0 emergency undertriage |
| Questions narrow to most relevant | Every question carries `rationale` + `targetsTier` | [intake.ts](lib/triage/intake.ts) |
| Guardrails override the AI | `mostUrgent(ai, guardrail)`; override flagged in UI | [assess.ts](lib/triage/assess.ts) |
| Patient summary has all fields | `PatientSummary` type | [types.ts](lib/types.ts) |
| Similar complaints, different urgency | "worst headache + stiff neck" → EMERGENCY vs "mild headache" → SELF_CARE | [patients.ts](lib/simulation/patients.ts) |

---

## 🔒 Tech notes & security

| Topic | Detail |
|-------|--------|
| Provider-agnostic | LLM + embeddings both use the OpenAI request/response format |
| Secret isolation | `SUPABASE_SERVICE_ROLE_KEY`, `SARVAM_API_KEY`, `LLM_API_KEY` are server-only (Node runtime); never reach the browser |
| RLS | Anon client default-denied ([sql/0002_rls.sql](sql/0002_rls.sql)) |
| Next.js | Pinned to **14.2.35** (latest patched 14.x). Remaining audit advisories target `next/image` remote patterns, RSC deserialization, rewrites — none used here |

---

## ⚠️ Disclaimer

PulsePath is clinical **decision support**, not a medical device or a substitute for professional
judgement. **In an emergency, call your local emergency number.**
