/*
  # Ajout du champ retraite prévue et rendre les champs facultatifs

  1. Modifications Tables teachers et staff
    - Ajout de `retirement_date` (date, nullable) : Date de retraite prévue
    - Rendre tous les champs facultatifs sauf id, matricule, first_name, last_name
    
  2. Champs calculés automatiquement (côté frontend)
    - Âge actuel : Calculé depuis date_of_birth
    - Années d'expérience : Calculé depuis hire_date (Date actuelle - Date d'entrée)
    - Retraite prévue : Date saisie manuellement ou calculée (date_of_birth + 60 ans)

  3. Notes importantes
    - date_of_birth : Déjà existant, rendu nullable
    - hire_date : Déjà existant, rendu nullable
    - Les calculs d'âge et d'expérience se font automatiquement dans l'interface
*/

-- Ajouter le champ retirement_date à la table teachers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'retirement_date'
  ) THEN
    ALTER TABLE teachers ADD COLUMN retirement_date date;
  END IF;
END $$;

-- Ajouter le champ retirement_date à la table staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'retirement_date'
  ) THEN
    ALTER TABLE staff ADD COLUMN retirement_date date;
  END IF;
END $$;

-- Rendre les champs facultatifs pour teachers
ALTER TABLE teachers 
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN gender DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN qualification DROP NOT NULL,
  ALTER COLUMN employment_type DROP NOT NULL,
  ALTER COLUMN hire_date DROP NOT NULL,
  ALTER COLUMN base_salary DROP NOT NULL;

-- Rendre les champs facultatifs pour staff
ALTER TABLE staff 
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN gender DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN position DROP NOT NULL,
  ALTER COLUMN contract_type DROP NOT NULL,
  ALTER COLUMN hire_date DROP NOT NULL,
  ALTER COLUMN base_salary DROP NOT NULL;

-- Commentaires
COMMENT ON COLUMN teachers.retirement_date IS 'Date de retraite prévue (calculée ou saisie manuellement)';
COMMENT ON COLUMN staff.retirement_date IS 'Date de retraite prévue (calculée ou saisie manuellement)';
COMMENT ON COLUMN teachers.date_of_birth IS 'Date de naissance (utilisée pour calculer l''âge actuel)';
COMMENT ON COLUMN staff.date_of_birth IS 'Date de naissance (utilisée pour calculer l''âge actuel)';
COMMENT ON COLUMN teachers.hire_date IS 'Date d''entrée/embauche (utilisée pour calculer les années d''expérience)';
COMMENT ON COLUMN staff.hire_date IS 'Date d''entrée/embauche (utilisée pour calculer les années d''expérience)';
