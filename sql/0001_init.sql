-- ============================================================================
-- PulsePath — initial schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Stores triage sessions, the conversational transcript, the structured profile,
-- final assessments, continuous-monitoring follow-ups, and simulation runs.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Patients (optional / lightweight; a session can be anonymous).
-- ---------------------------------------------------------------------------
create table if not exists patients (
  id            uuid primary key default gen_random_uuid(),
  external_ref  text,                       -- your own patient id, if any
  display_name  text,
  date_of_birth date,
  sex           text check (sex in ('male','female','other','unknown')),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triage sessions — one conversational triage encounter.
-- ---------------------------------------------------------------------------
create table if not exists triage_sessions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid references patients(id) on delete set null,
  status          text not null default 'in_progress'
                    check (status in ('in_progress','assessed','closed')),
  -- The full structured SymptomProfile (lib/types.ts) as JSON.
  profile         jsonb not null default '{}'::jsonb,
  -- Final urgency tier once assessed.
  final_tier      text check (final_tier in
                    ('EMERGENCY','AANDE','GP_URGENT','GP_ROUTINE','SELF_CARE')),
  ai_proposed_tier text,
  guardrail_override boolean default false,
  confidence      int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_sessions_status on triage_sessions(status);
create index if not exists idx_sessions_tier   on triage_sessions(final_tier);
create index if not exists idx_sessions_created on triage_sessions(created_at desc);

-- ---------------------------------------------------------------------------
-- Messages — the conversational transcript per session.
-- ---------------------------------------------------------------------------
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references triage_sessions(id) on delete cascade,
  role        text not null check (role in ('patient','assistant','system')),
  content     text not null,
  -- Optional voice metadata (Build 4).
  via_voice   boolean default false,
  audio_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_messages_session on messages(session_id, created_at);

-- ---------------------------------------------------------------------------
-- Assessments — the complete TriageAssessment payload, versioned per session.
-- A session may be re-assessed during continuous monitoring (Build 12).
-- ---------------------------------------------------------------------------
create table if not exists assessments (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references triage_sessions(id) on delete cascade,
  tier        text not null,
  ai_proposed_tier text,
  guardrail_override boolean default false,
  confidence  int,
  -- Full TriageAssessment (debate, differentials, citations, summary, ...).
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_assessments_session on assessments(session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Follow-ups — continuous monitoring schedule (Build 12).
-- Self-care / routine cases get scheduled re-checks; escalation if worse.
-- ---------------------------------------------------------------------------
create table if not exists follow_ups (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references triage_sessions(id) on delete cascade,
  due_at        timestamptz not null,
  -- e.g. 'Re-check in 6h', 'Re-check in 24h'.
  label         text not null,
  status        text not null default 'pending'
                  check (status in ('pending','sent','completed','escalated','cancelled')),
  -- Patient's response captured at follow-up time (free text), if any.
  response      text,
  -- New tier if the follow-up triggered a re-assessment.
  outcome_tier  text,
  escalated     boolean default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_followups_due on follow_ups(status, due_at);
create index if not exists idx_followups_session on follow_ups(session_id);

-- ---------------------------------------------------------------------------
-- Simulations — bonus: synthetic-patient simulation runs + metrics.
-- ---------------------------------------------------------------------------
create table if not exists simulation_runs (
  id            uuid primary key default gen_random_uuid(),
  label         text,
  n_patients    int not null,
  -- Aggregate metrics: confusion matrix, per-tier precision/recall,
  -- emergency recall, accuracy.
  metrics       jsonb not null,
  -- Per-patient rows: { expectedTier, predictedTier, guardrailOverride, ... }.
  results       jsonb not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_sim_created on simulation_runs(created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sessions_updated on triage_sessions;
create trigger trg_sessions_updated before update on triage_sessions
  for each row execute function set_updated_at();

drop trigger if exists trg_followups_updated on follow_ups;
create trigger trg_followups_updated before update on follow_ups
  for each row execute function set_updated_at();
