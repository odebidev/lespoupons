/*
  # Ajouter les champs Nom du payeur et Classe aux paiements

  ## Modifications
  1. Ajout de la colonne `payer_name` (nom du payeur)
     - Type: text
     - Nullable: true (optionnel)
     - Description: Nom de la personne qui effectue le paiement
  
  2. Ajout de la colonne `class_id` (classe concernée)
     - Type: uuid
     - Nullable: true (optionnel)
     - Clé étrangère vers la table classes
     - Description: Classe de l'élève au moment du paiement

  ## Sécurité
  - Pas de modification des politiques RLS existantes
*/

-- Ajouter la colonne payer_name si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payer_name'
  ) THEN
    ALTER TABLE payments ADD COLUMN payer_name text;
  END IF;
END $$;

-- Ajouter la colonne class_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN class_id uuid REFERENCES classes(id);
  END IF;
END $$;

-- Ajouter un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_payments_class_id ON payments(class_id);