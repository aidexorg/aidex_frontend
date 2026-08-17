/*
# AIDEX Core Schema — single-tenant, no auth

1. New Tables
- `profiles`: patient records (name, birth year, phone, address, clinical notes, file number, national id, file description)
- `periods`: treatment courses linked to a profile; stores teeth[] and areas[] arrays
- `sessions`: treatment sessions within a period (session number + date)
- `parts`: parts within a session (part number, treatment order, tooth, area)
- `actions`: treatment actions within a part (title, price, discount, description, status, incomplete reason, follow-up flag)
- `payments`: payments linked to a period (date, tracking code, amount, description)
- `appointments`: stub table (notes only — entity definition pending per BR-APT-02)

2. Relationships
- profiles 1→n periods
- periods 1→n sessions
- sessions 1→n parts
- parts 1→n actions
- periods 1→n payments
- profiles 1→n appointments (stub)

3. Security
- RLS enabled on every table.
- Single-tenant app (no sign-in) → all policies use `TO anon, authenticated` with `USING (true)` because the data is intentionally shared.

4. Notes
- Teeth stored as text[] validated against regex ^(UR|UL|LR|LL)[1-8]$ via app layer.
- Areas stored as text[] validated against {LJ, UJ, Full Mouth} via app layer.
- Action status: 'complete' | 'incomplete'. incomplete_reason nullable.
- Cascade deletes follow ownership chain.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_year text,
  phone text,
  address text,
  clinical_notes text,
  file_number text UNIQUE,
  national_id text,
  file_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teeth text[] DEFAULT '{}',
  areas text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  session_number int NOT NULL,
  session_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  part_number int NOT NULL,
  treatment_order int NOT NULL DEFAULT 1,
  tooth text,
  area text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  title text NOT NULL,
  price numeric(12,0) NOT NULL DEFAULT 0,
  discount numeric(12,0) NOT NULL DEFAULT 0,
  description text,
  status text NOT NULL DEFAULT 'incomplete',
  incomplete_reason text,
  needs_followup boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  tracking_code text,
  amount numeric(12,0) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_periods_profile_id ON periods(profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_period_id ON sessions(period_id);
CREATE INDEX IF NOT EXISTS idx_parts_session_id ON parts(session_id);
CREATE INDEX IF NOT EXISTS idx_actions_part_id ON actions(part_id);
CREATE INDEX IF NOT EXISTS idx_payments_period_id ON payments(period_id);
CREATE INDEX IF NOT EXISTS idx_appointments_profile_id ON appointments(profile_id);

-- RLS: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- RLS: periods
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_periods" ON periods;
CREATE POLICY "anon_select_periods" ON periods FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_periods" ON periods;
CREATE POLICY "anon_insert_periods" ON periods FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_periods" ON periods;
CREATE POLICY "anon_update_periods" ON periods FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_periods" ON periods;
CREATE POLICY "anon_delete_periods" ON periods FOR DELETE TO anon, authenticated USING (true);

-- RLS: sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE TO anon, authenticated USING (true);

-- RLS: parts
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_parts" ON parts;
CREATE POLICY "anon_select_parts" ON parts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_parts" ON parts;
CREATE POLICY "anon_insert_parts" ON parts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_parts" ON parts;
CREATE POLICY "anon_update_parts" ON parts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_parts" ON parts;
CREATE POLICY "anon_delete_parts" ON parts FOR DELETE TO anon, authenticated USING (true);

-- RLS: actions
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_actions" ON actions;
CREATE POLICY "anon_select_actions" ON actions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_actions" ON actions;
CREATE POLICY "anon_insert_actions" ON actions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_actions" ON actions;
CREATE POLICY "anon_update_actions" ON actions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_actions" ON actions;
CREATE POLICY "anon_delete_actions" ON actions FOR DELETE TO anon, authenticated USING (true);

-- RLS: payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE TO anon, authenticated USING (true);

-- RLS: appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE TO anon, authenticated USING (true);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_periods_updated ON periods;
CREATE TRIGGER trg_periods_updated BEFORE UPDATE ON periods FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_sessions_updated ON sessions;
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_parts_updated ON parts;
CREATE TRIGGER trg_parts_updated BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_actions_updated ON actions;
CREATE TRIGGER trg_actions_updated BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated ON payments;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated ON appointments;
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
