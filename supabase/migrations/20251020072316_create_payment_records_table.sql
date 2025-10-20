/*
  # Création de la table payment_records pour l'historique des paiements

  1. Nouvelle Table
    - `payment_records` : Enregistre tous les paiements effectués aux employés
      - `id` (uuid, primary key) : Identifiant unique du paiement
      - `employee_id` (uuid) : ID de l'employé
      - `employee_type` (text) : Type d'employé (teacher ou staff)
      - `matricule` (text) : Matricule de l'employé
      - `employee_name` (text) : Nom complet de l'employé
      - `gross_salary` (numeric) : Salaire brut
      - `irsa_amount` (numeric) : Montant IRSA
      - `net_salary` (numeric) : Salaire net
      - `payment_date` (timestamptz) : Date et heure du paiement
      - `created_at` (timestamptz) : Date de création de l'enregistrement

  2. Sécurité
    - Activer RLS sur la table `payment_records`
    - Ajouter une politique pour permettre aux utilisateurs authentifiés de lire tous les enregistrements
    - Ajouter une politique pour permettre aux utilisateurs authentifiés d'insérer des enregistrements

  3. Index
    - Index sur `employee_id` pour accélérer les recherches par employé
    - Index sur `payment_date` pour trier chronologiquement
*/

-- Créer la table payment_records
CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  employee_type text NOT NULL CHECK (employee_type IN ('teacher', 'staff')),
  matricule text NOT NULL,
  employee_name text NOT NULL,
  gross_salary numeric NOT NULL DEFAULT 0,
  irsa_amount numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  payment_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture
CREATE POLICY "Les utilisateurs authentifiés peuvent lire tous les paiements"
  ON payment_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique pour l'insertion
CREATE POLICY "Les utilisateurs authentifiés peuvent créer des paiements"
  ON payment_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_payment_records_employee 
  ON payment_records(employee_id, employee_type);

CREATE INDEX IF NOT EXISTS idx_payment_records_date 
  ON payment_records(payment_date DESC);
