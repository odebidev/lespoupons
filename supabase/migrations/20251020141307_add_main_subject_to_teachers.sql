/*
  # Add Main Subject to Teachers

  1. Changes
    - Add `main_subject_id` column to `teachers` table
      - This is a foreign key referencing the `subjects` table
      - Allows teachers to have a primary subject of expertise
      - This is optional and nullable (teachers may not have a main subject assigned yet)
  
  2. Security
    - No changes to RLS policies (existing policies still apply)
*/

-- Add main_subject_id column to teachers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'main_subject_id'
  ) THEN
    ALTER TABLE teachers ADD COLUMN main_subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_teachers_main_subject_id ON teachers(main_subject_id);