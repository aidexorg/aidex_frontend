-- INC-01: ◆ direct-to-dentist flag for income report (text.txt §1_1)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS direct_to_dentist boolean NOT NULL DEFAULT false;
