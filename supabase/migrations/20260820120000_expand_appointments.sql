-- Expand appointments table with full calendar fields (PH-02)
-- Idempotent: safe to run multiple times

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS dentist_id uuid,
  ADD COLUMN IF NOT EXISTS chair_id uuid,
  ADD COLUMN IF NOT EXISTS start_time timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'treatment',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

-- Check constraints for enum values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_type_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_type_check
        CHECK (type IN ('consultation', 'treatment', 'followup', 'emergency', 'hygiene'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_status_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_status_check
        CHECK (status IN ('scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'no_show', 'cancelled'));
  END IF;
END $$;

-- Indexes for calendar queries
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments (start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
-- idx_appointments_profile_id already exists from initial schema
