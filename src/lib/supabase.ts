import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          matricule: string;
          first_name: string;
          last_name: string;
          date_of_birth: string;
          gender: 'M' | 'F';
          photo_url: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          parent_name: string;
          parent_phone: string;
          parent_email: string | null;
          class_id: string | null;
          academic_year: string;
          enrollment_date: string;
          status: 'active' | 'inactive' | 'transferred' | 'graduated';
          previous_school: string | null;
          medical_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['students']['Insert']>;
      };
      teachers: {
        Row: {
          id: string;
          matricule: string;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          gender: 'M' | 'F';
          photo_url: string | null;
          address: string | null;
          phone: string;
          email: string | null;
          qualification: string;
          specialization: string[] | null;
          employment_type: 'titulaire' | 'vacataire' | 'contractuel';
          hire_date: string;
          status: 'active' | 'on_leave' | 'inactive';
          base_salary: number;
          created_at: string;
          updated_at: string;
        };
      };
      classes: {
        Row: {
          id: string;
          name: string;
          level: string;
          section: string;
          room_number: string | null;
          capacity: number;
          current_enrollment: number;
          main_teacher_id: string | null;
          academic_year: string;
          created_at: string;
          updated_at: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          subject_group: string;
          coefficient: number;
          weekly_hours: number;
          applicable_levels: string[];
          created_at: string;
          updated_at: string;
        };
      };
      staff: {
        Row: {
          id: string;
          matricule: string;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          gender: 'M' | 'F';
          photo_url: string | null;
          address: string | null;
          phone: string;
          email: string | null;
          category: 'Direction' | 'Enseignant' | 'Administratif' | 'Appui';
          position: string;
          contract_type: 'CDI' | 'CDD' | 'Stage';
          hire_date: string;
          status: 'active' | 'on_leave' | 'inactive';
          base_salary: number;
          contract_url: string | null;
          id_document_url: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          payment_date: string;
          payment_type: 'registration' | 'tuition' | 'supplies' | 'insurance' | 'other';
          payment_method: 'cash' | 'bank_transfer' | 'mobile_money' | 'check';
          academic_year: string;
          period: string | null;
          status: 'pending' | 'completed' | 'cancelled';
          receipt_number: string | null;
          notes: string | null;
          created_at: string;
        };
      };
      payroll: {
        Row: {
          id: string;
          employee_id: string;
          employee_type: 'teacher' | 'staff';
          pay_period: string;
          pay_date: string;
          gross_salary: number;
          ostie_amount: number;
          cnaps_amount: number;
          irsa_amount: number;
          advance_deduction: number;
          other_deductions: number;
          net_salary: number;
          status: 'draft' | 'approved' | 'paid';
          payment_method: 'cash' | 'bank_transfer' | 'mobile_money';
          notes: string | null;
          created_at: string;
        };
      };
    };
  };
};
