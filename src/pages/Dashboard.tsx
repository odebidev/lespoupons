import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GraduationCap, Users, School, DollarSign, TrendingUp } from 'lucide-react';

interface Stats {
  students: number;
  teachers: number;
  classes: number;
  revenue: number;
  activeStaff: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    students: 0,
    teachers: 0,
    classes: 0,
    revenue: 0,
    activeStaff: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, paymentsRes, staffRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('amount'),
        supabase.from('staff').select('id', { count: 'exact', head: true })
      ]);

      const totalRevenue = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
        classes: classesRes.count || 0,
        revenue: totalRevenue,
        activeStaff: staffRes.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Élèves Inscrits',
      value: stats.students,
      icon: GraduationCap,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Enseignants',
      value: stats.teachers,
      icon: Users,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      label: 'Classes',
      value: stats.classes,
      icon: School,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    {
      label: 'Revenus (Ar)',
      value: stats.revenue.toLocaleString('fr-FR'),
      icon: DollarSign,
      color: 'cyan',
      bgColor: 'bg-cyan-50',
      iconColor: 'text-cyan-600'
    },
    {
      label: 'Personnel Actif',
      value: stats.activeStaff,
      icon: TrendingUp,
      color: 'pink',
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
        <p className="text-gray-600">Vue d'ensemble du système de gestion scolaire</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Informations Système</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Année scolaire</span>
              <span className="font-medium">2025-2026</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Trimestre actuel</span>
              <span className="font-medium">Trimestre 1</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Statut système</span>
              <span className="text-green-600 font-medium">Opérationnel</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Actions Rapides</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition">
              Enregistrer un nouveau paiement
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition">
              Ajouter un élève
            </button>
            <button className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition">
              Générer une fiche de paie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
