/*
  # Mise à jour de payment_records pour ajouter période et déduction avance

  1. Modifications
    - Ajouter colonne `payment_period` (text) : Période de paiement (ex: "Janvier 2025")
    - Ajouter colonne `advance_deduction` (numeric) : Montant de la déduction d'avance

  2. Index
    - Ajouter index sur `payment_period` pour filtrage par période
*/

-- Ajouter les nouvelles colonnes si elles n'existent pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_records' AND column_name = 'payment_period'
  ) THEN
    ALTER TABLE payment_records ADD COLUMN payment_period text NOT NULL DEFAULT 'Non spécifiée';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_records' AND column_name = 'advance_deduction'
  ) THEN
    ALTER TABLE payment_records ADD COLUMN advance_deduction numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Créer l'index sur payment_period si il n'existe pas
CREATE INDEX IF NOT EXISTS idx_payment_records_period 
  ON payment_records(payment_period);

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN payment_records.payment_period IS 'Période de paiement (format: "Mois Année")';
COMMENT ON COLUMN payment_records.advance_deduction IS 'Montant total déduit pour les avances sur salaire';
