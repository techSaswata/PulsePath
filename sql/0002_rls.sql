-- ============================================================================
-- PulsePath — Row Level Security
-- The app's API routes use the SERVICE ROLE key (server-side) which bypasses
-- RLS. These policies lock the tables down for the anon/public client so the
-- browser cannot read other patients' data directly. Tighten further once you
-- add Supabase Auth and per-user ownership columns.
-- ============================================================================

alter table patients         enable row level security;
alter table triage_sessions  enable row level security;
alter table messages         enable row level security;
alter table assessments      enable row level security;
alter table follow_ups       enable row level security;
alter table simulation_runs  enable row level security;

-- Default-deny for the anon role. The server (service role) is unaffected by RLS.
-- (No permissive policies are created for anon, so anon reads/writes are denied.)

-- If you later add Supabase Auth, replace the above with owner-scoped policies, e.g.:
--   create policy "owner can read own sessions" on triage_sessions
--     for select using (auth.uid() = owner_id);
