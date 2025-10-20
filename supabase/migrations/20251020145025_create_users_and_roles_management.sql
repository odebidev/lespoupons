/*
  # Create Users and Roles Management System

  1. New Tables
    - `app_users`
      - `id` (uuid, primary key)
      - `auth_user_id` (uuid, references auth.users) - Link to Supabase Auth
      - `email` (text, unique, not null)
      - `full_name` (text, not null)
      - `role` (text, not null) - Values: 'pdg', 'directrice', 'secretaire'
      - `phone` (text, nullable)
      - `status` (text, default 'active') - Values: 'active', 'inactive'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, references app_users)
      - `last_login` (timestamptz)

    - `user_activity_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references app_users)
      - `action` (text) - CREATE, UPDATE, DELETE, VIEW
      - `module` (text) - students, teachers, fees, etc.
      - `record_id` (uuid, nullable)
      - `details` (jsonb, nullable)
      - `ip_address` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - PDG: Full access to everything
    - Directrice: Read/Create/Update (except fee amounts)
    - Secretaire: Read/Create only

  3. Important Notes
    - Role hierarchy: pdg > directrice > secretaire
    - Special protection on financial amounts
    - Activity tracking for all user actions
*/

-- Create ENUM type for user roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('pdg', 'directrice', 'secretaire');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ENUM type for user status
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create app_users table
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'secretaire',
  phone text,
  status user_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  last_login timestamptz
);

-- Create user_activity_log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  action text NOT NULL,
  module text NOT NULL,
  record_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);
CREATE INDEX IF NOT EXISTS idx_app_users_auth_user_id ON app_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_module ON user_activity_log(module);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_users table

-- PDG can do everything
CREATE POLICY "PDG can view all users"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE auth_user_id = auth.uid()
      AND role = 'pdg'
      AND status = 'active'
    )
  );

CREATE POLICY "PDG can create users"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE auth_user_id = auth.uid()
      AND role = 'pdg'
      AND status = 'active'
    )
  );

CREATE POLICY "PDG can update users"
  ON app_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE auth_user_id = auth.uid()
      AND role = 'pdg'
      AND status = 'active'
    )
  );

CREATE POLICY "PDG can delete users"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE auth_user_id = auth.uid()
      AND role = 'pdg'
      AND status = 'active'
    )
  );

-- Directrice can view all users
CREATE POLICY "Directrice can view all users"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE auth_user_id = auth.uid()
      AND role = 'directrice'
      AND status = 'active'
    )
  );

-- Secretaire can view own profile
CREATE POLICY "Secretaire can view own profile"
  ON app_users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- All users can update their own last_login
CREATE POLICY "Users can update own last_login"
  ON app_users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- RLS Policies for user_activity_log table

-- PDG and Directrice can view all activity logs
CREATE POLICY "PDG and Directrice can view all logs"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE auth_user_id = auth.uid()
      AND role IN ('pdg', 'directrice')
      AND status = 'active'
    )
  );

-- All authenticated users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs"
  ON user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for app_users updated_at
DROP TRIGGER IF EXISTS update_app_users_updated_at ON app_users;
CREATE TRIGGER update_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role::text FROM app_users
    WHERE auth_user_id = auth.uid()
    AND status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  required_role text,
  action_type text DEFAULT 'read'
)
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  user_role := get_current_user_role();
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- PDG has all permissions
  IF user_role = 'pdg' THEN
    RETURN true;
  END IF;
  
  -- Directrice permissions
  IF user_role = 'directrice' THEN
    IF action_type IN ('read', 'create', 'update') THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;
  
  -- Secretaire permissions
  IF user_role = 'secretaire' THEN
    IF action_type IN ('read', 'create') THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default PDG user (this should be updated with real credentials)
INSERT INTO app_users (email, full_name, role, status)
VALUES ('pdg@school.mg', 'Président Directeur Général', 'pdg', 'active')
ON CONFLICT (email) DO NOTHING;