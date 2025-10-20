/*
  # Création du module Encaissement / Décaissement

  1. Nouvelle Table
    - `transactions` : Enregistre toutes les opérations financières
      - `id` (uuid, primary key) : Identifiant unique
      - `transaction_type` (text) : Type de transaction (encaissement ou décaissement)
      - `category` (text) : Catégorie de la transaction
      - `description` (text) : Description détaillée
      - `amount` (numeric) : Montant en Ariary
      - `transaction_date` (date) : Date de la transaction
      - `payment_method` (text) : Mode de paiement (espèces, chèque, virement, etc.)
      - `status` (text) : Statut (validée, en attente, annulée)
      - `reference` (text) : Référence unique de la transaction
      - `notes` (text) : Notes additionnelles
      - `linked_type` (text) : Type de liaison (fee_payment, salary_payment, advance_payment, manual)
      - `linked_id` (uuid) : ID de l'enregistrement lié
      - `created_at` (timestamptz) : Date de création
      - `created_by` (uuid) : Utilisateur créateur

  2. Sécurité
    - Activer RLS sur la table `transactions`
    - Politique pour lecture par utilisateurs authentifiés
    - Politique pour insertion par utilisateurs authentifiés
    - Politique pour modification par utilisateurs authentifiés

  3. Index
    - Index sur `transaction_date` pour filtrage par date
    - Index sur `transaction_type` pour filtrage par type
    - Index sur `category` pour filtrage par catégorie
    - Index sur `linked_type` et `linked_id` pour les liaisons
*/

-- Créer la table transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('encaissement', 'decaissement')),
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'especes',
  status text NOT NULL DEFAULT 'validee' CHECK (status IN ('validee', 'en_attente', 'annulee')),
  reference text,
  notes text,
  linked_type text CHECK (linked_type IN ('fee_payment', 'salary_payment', 'advance_payment', 'advance_disbursement', 'manual')),
  linked_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Activer RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture
CREATE POLICY "Les utilisateurs authentifiés peuvent lire toutes les transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique pour l'insertion
CREATE POLICY "Les utilisateurs authentifiés peuvent créer des transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique pour la modification
CREATE POLICY "Les utilisateurs authentifiés peuvent modifier des transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique pour la suppression
CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer des transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (true);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type
  ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON transactions(category);

CREATE INDEX IF NOT EXISTS idx_transactions_linked
  ON transactions(linked_type, linked_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions(status);

-- Commentaires pour documentation
COMMENT ON TABLE transactions IS 'Table principale pour la gestion des encaissements et décaissements';
COMMENT ON COLUMN transactions.transaction_type IS 'Type: encaissement (entrée) ou décaissement (sortie)';
COMMENT ON COLUMN transactions.linked_type IS 'Type de liaison automatique: fee_payment, salary_payment, advance_payment, advance_disbursement, manual';
COMMENT ON COLUMN transactions.linked_id IS 'ID de l''enregistrement source lié (payment_records, advances, fee_payments)';
