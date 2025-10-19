/*
  # Système de Gestion Scolaire Intégré - Madagascar 2025-2026

  ## Vue d'ensemble
  Cette migration crée l'infrastructure complète pour une application de gestion scolaire
  avec 7 modules principaux interconnectés.

  ## Tables créées (dans l'ordre de dépendance)

  ### Module de base
    - `teachers` : Enseignants (créé en premier, pas de dépendances)
    - `classes` : Classes (dépend de teachers)
    - `students` : Élèves (dépend de classes)
    - `subjects` : Matières
    - `staff` : Personnel administratif et d'appui

  ### Module financier
    - `fee_structures` : Grilles tarifaires
    - `payments` : Paiements des écolages
    - `advances` : Avances sur salaire
    - `payroll` : Fiches de paie
    - `irsa_calculations` : Détails calculs IRSA

  ### Tables de liaison
    - `teacher_subjects`, `class_subjects`, `attendance`, `grades`, `leave_requests`

  ## Sécurité
    - RLS activé sur toutes les tables
    - Accès pour utilisateurs authentifiés

  ## Conformité
    - Législation fiscale Madagascar (IRSA 2025)
    - Devise : Ariary (Ar)
*/

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MODULE 2 : GESTION DES ENSEIGNANTS (pas de dépendances)
-- =============================================

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text CHECK (gender IN ('M', 'F')) NOT NULL,
  photo_url text,
  
  address text,
  phone text NOT NULL,
  email text UNIQUE,
  
  qualification text NOT NULL,
  specialization text[],
  employment_type text CHECK (employment_type IN ('titulaire', 'vacataire', 'contractuel')) DEFAULT 'titulaire',
  hire_date date DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('active', 'on_leave', 'inactive')) DEFAULT 'active',
  
  base_salary decimal(12,2) DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- MODULE 3 : GESTION DES CLASSES
-- =============================================

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  level text NOT NULL CHECK (level IN (
    'Maternelle', 'CP', 'CE', 'CM1', 'CM2',
    '6ème', '5ème', '4ème', '3ème',
    'Seconde', 'Première', 'Terminale'
  )),
  section text DEFAULT '',
  room_number text,
  capacity integer DEFAULT 30,
  current_enrollment integer DEFAULT 0,
  
  main_teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  
  academic_year text DEFAULT '2025-2026',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- MODULE 1 : GESTION DES ÉLÈVES
-- =============================================

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text CHECK (gender IN ('M', 'F')) NOT NULL,
  photo_url text,
  
  address text,
  phone text,
  email text,
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  parent_email text,
  
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  academic_year text DEFAULT '2025-2026',
  enrollment_date date DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('active', 'inactive', 'transferred', 'graduated')) DEFAULT 'active',
  
  previous_school text,
  medical_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- MODULE 4 : GESTION DES MATIÈRES
-- =============================================

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  
  subject_group text CHECK (subject_group IN (
    'Sciences', 'Lettres', 'Langues', 'Arts', 'Sport', 'Technique'
  )),
  coefficient decimal(3,1) DEFAULT 1.0,
  weekly_hours integer DEFAULT 2,
  
  applicable_levels text[] DEFAULT ARRAY['6ème', '5ème', '4ème', '3ème', 'Seconde', 'Première', 'Terminale'],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- MODULE 6 : GESTION DU PERSONNEL
-- =============================================

CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text CHECK (gender IN ('M', 'F')) NOT NULL,
  photo_url text,
  
  address text,
  phone text NOT NULL,
  email text,
  
  category text CHECK (category IN ('Direction', 'Enseignant', 'Administratif', 'Appui')) NOT NULL,
  position text NOT NULL,
  contract_type text CHECK (contract_type IN ('CDI', 'CDD', 'Stage')) DEFAULT 'CDI',
  hire_date date DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('active', 'on_leave', 'inactive')) DEFAULT 'active',
  
  base_salary decimal(12,2) DEFAULT 0,
  
  contract_url text,
  id_document_url text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- MODULE 5 : GESTION DE L'ÉCOLAGE
-- =============================================

CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  academic_year text DEFAULT '2025-2026',
  
  registration_fee decimal(12,2) DEFAULT 0,
  monthly_tuition decimal(12,2) DEFAULT 0,
  supplies_fee decimal(12,2) DEFAULT 0,
  insurance_fee decimal(12,2) DEFAULT 0,
  other_fees decimal(12,2) DEFAULT 0,
  
  payment_frequency text CHECK (payment_frequency IN ('monthly', 'quarterly', 'annual')) DEFAULT 'monthly',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(class_id, academic_year)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  payment_date date DEFAULT CURRENT_DATE,
  payment_type text CHECK (payment_type IN (
    'registration', 'tuition', 'supplies', 'insurance', 'other'
  )) NOT NULL,
  payment_method text CHECK (payment_method IN (
    'cash', 'bank_transfer', 'mobile_money', 'check'
  )) DEFAULT 'cash',
  
  academic_year text DEFAULT '2025-2026',
  period text,
  status text CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'completed',
  
  receipt_number text UNIQUE,
  notes text,
  
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- MODULE 7 : RH & PAIE
-- =============================================

CREATE TABLE IF NOT EXISTS advances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  employee_type text CHECK (employee_type IN ('teacher', 'staff')) NOT NULL,
  
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  request_date date DEFAULT CURRENT_DATE,
  reason text,
  
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'repaid')) DEFAULT 'pending',
  approval_date date,
  
  repayment_months integer DEFAULT 1 CHECK (repayment_months BETWEEN 1 AND 3),
  remaining_amount decimal(12,2),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  employee_type text CHECK (employee_type IN ('teacher', 'staff')) NOT NULL,
  
  pay_period text NOT NULL,
  pay_date date DEFAULT CURRENT_DATE,
  
  gross_salary decimal(12,2) NOT NULL,
  
  ostie_amount decimal(12,2) DEFAULT 0,
  cnaps_amount decimal(12,2) DEFAULT 0,
  irsa_amount decimal(12,2) DEFAULT 0,
  
  advance_deduction decimal(12,2) DEFAULT 0,
  other_deductions decimal(12,2) DEFAULT 0,
  
  net_salary decimal(12,2) NOT NULL,
  
  status text CHECK (status IN ('draft', 'approved', 'paid')) DEFAULT 'draft',
  payment_method text CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money')) DEFAULT 'bank_transfer',
  
  notes text,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, employee_type, pay_period)
);

CREATE TABLE IF NOT EXISTS irsa_calculations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_id uuid REFERENCES payroll(id) ON DELETE CASCADE NOT NULL,
  
  gross_salary decimal(12,2) NOT NULL,
  ostie_amount decimal(12,2) NOT NULL,
  cnaps_amount decimal(12,2) NOT NULL,
  taxable_income decimal(12,2) NOT NULL,
  
  bracket_1_amount decimal(12,2) DEFAULT 0,
  bracket_2_amount decimal(12,2) DEFAULT 0,
  bracket_3_amount decimal(12,2) DEFAULT 0,
  bracket_4_amount decimal(12,2) DEFAULT 0,
  bracket_5_amount decimal(12,2) DEFAULT 0,
  
  total_irsa decimal(12,2) NOT NULL,
  
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- TABLES DE LIAISON
-- =============================================

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  academic_year text DEFAULT '2025-2026',
  
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, subject_id, academic_year)
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  
  weekly_hours integer DEFAULT 2,
  academic_year text DEFAULT '2025-2026',
  
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, subject_id, academic_year)
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  status text CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  notes text,
  
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  
  grade decimal(5,2) CHECK (grade >= 0 AND grade <= 20),
  grade_type text CHECK (grade_type IN ('devoir', 'examen', 'oral', 'pratique')) DEFAULT 'devoir',
  
  term text CHECK (term IN ('Trimestre 1', 'Trimestre 2', 'Trimestre 3')) NOT NULL,
  academic_year text DEFAULT '2025-2026',
  
  date date DEFAULT CURRENT_DATE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  notes text,
  
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  employee_type text CHECK (employee_type IN ('teacher', 'staff')) NOT NULL,
  
  leave_type text CHECK (leave_type IN ('congé', 'maladie', 'personnel', 'maternité')) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approval_date date,
  
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE irsa_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view students"
  ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert students"
  ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update students"
  ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete students"
  ON students FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view teachers"
  ON teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert teachers"
  ON teachers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update teachers"
  ON teachers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete teachers"
  ON teachers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view classes"
  ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert classes"
  ON classes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update classes"
  ON classes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete classes"
  ON classes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view subjects"
  ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert subjects"
  ON subjects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update subjects"
  ON subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete subjects"
  ON subjects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fee_structures"
  ON fee_structures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fee_structures"
  ON fee_structures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fee_structures"
  ON fee_structures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fee_structures"
  ON fee_structures FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payments"
  ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payments"
  ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete payments"
  ON payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view staff"
  ON staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert staff"
  ON staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update staff"
  ON staff FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete staff"
  ON staff FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view advances"
  ON advances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert advances"
  ON advances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update advances"
  ON advances FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete advances"
  ON advances FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view payroll"
  ON payroll FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payroll"
  ON payroll FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payroll"
  ON payroll FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete payroll"
  ON payroll FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view irsa_calculations"
  ON irsa_calculations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert irsa_calculations"
  ON irsa_calculations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update irsa_calculations"
  ON irsa_calculations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete irsa_calculations"
  ON irsa_calculations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view teacher_subjects"
  ON teacher_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert teacher_subjects"
  ON teacher_subjects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update teacher_subjects"
  ON teacher_subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete teacher_subjects"
  ON teacher_subjects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view class_subjects"
  ON class_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert class_subjects"
  ON class_subjects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update class_subjects"
  ON class_subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete class_subjects"
  ON class_subjects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view attendance"
  ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert attendance"
  ON attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update attendance"
  ON attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete attendance"
  ON attendance FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view grades"
  ON grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert grades"
  ON grades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update grades"
  ON grades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete grades"
  ON grades FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view leave_requests"
  ON leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leave_requests"
  ON leave_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leave_requests"
  ON leave_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete leave_requests"
  ON leave_requests FOR DELETE TO authenticated USING (true);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_matricule ON students(matricule);

CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);
CREATE INDEX IF NOT EXISTS idx_teachers_matricule ON teachers(matricule);

CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id, employee_type);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(pay_period);

CREATE INDEX IF NOT EXISTS idx_advances_employee ON advances(employee_id, employee_type);
CREATE INDEX IF NOT EXISTS idx_advances_status ON advances(status);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_grades_student_subject ON grades(student_id, subject_id);