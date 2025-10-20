import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Calculator, DollarSign, Eye, Edit2, Trash2, Clock, CheckCircle, XCircle, AlertCircle, History, Calendar, TrendingDown } from 'lucide-react';

interface Employee {
  id: string;
  type: 'teacher' | 'staff';
  matricule: string;
  first_name: string;
  last_name: string;
  base_salary: number;
}

interface Advance {
  id: string;
  employee_id: string;
  employee_type: 'teacher' | 'staff';
  amount: number;
  request_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'repaid';
  approval_date: string | null;
  repayment_months: number;
  remaining_amount: number | null;
  employee_name?: string;
  employee_matricule?: string;
}

interface PaymentRecord {
  id: string;
  employee_id: string;
  employee_type: string;
  matricule: string;
  employee_name: string;
  gross_salary: number;
  irsa_amount: number;
  advance_deduction: number;
  net_salary: number;
  payment_date: string;
  payment_period: string;
  created_at: string;
}

interface IRSABracket {
  min: number;
  max: number | null;
  rate: number;
  baseAmount: number;
}

const irsaBrackets: IRSABracket[] = [
  { min: 0, max: 350000, rate: 0, baseAmount: 0 },
  { min: 350001, max: 400000, rate: 0.05, baseAmount: 0 },
  { min: 400001, max: 500000, rate: 0.10, baseAmount: 2500 },
  { min: 500001, max: 600000, rate: 0.15, baseAmount: 12500 },
  { min: 600001, max: null, rate: 0.20, baseAmount: 27500 }
];

const MINIMUM_IRSA = 3000;

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function calculateIRSA(grossSalary: number) {
  const ostie = grossSalary * 0.02;
  const cnaps = grossSalary * 0.01;
  const taxableIncome = grossSalary - ostie - cnaps;

  let totalIRSA = 0;
  const bracketDetails = [];

  for (const bracket of irsaBrackets) {
    if (taxableIncome <= bracket.min) break;

    let bracketAmount = 0;
    if (bracket.max === null) {
      const excess = taxableIncome - bracket.min;
      bracketAmount = bracket.baseAmount + (excess * bracket.rate);
      totalIRSA = bracketAmount;
      bracketDetails.push({ bracket: 5, amount: bracketAmount - bracket.baseAmount });
      break;
    } else if (taxableIncome > bracket.max) {
      const excess = bracket.max - bracket.min;
      bracketAmount = bracket.rate > 0 ? bracket.baseAmount + (excess * bracket.rate) : 0;
      if (bracketAmount > 0) {
        const index = irsaBrackets.indexOf(bracket) + 1;
        bracketDetails.push({ bracket: index, amount: bracketAmount - bracket.baseAmount });
      }
      totalIRSA = bracketAmount;
    } else {
      const excess = taxableIncome - bracket.min;
      bracketAmount = bracket.rate > 0 ? bracket.baseAmount + (excess * bracket.rate) : 0;
      if (bracketAmount > 0) {
        const index = irsaBrackets.indexOf(bracket) + 1;
        bracketDetails.push({ bracket: index, amount: bracketAmount - bracket.baseAmount });
      }
      totalIRSA = bracketAmount;
      break;
    }
  }

  totalIRSA = Math.max(totalIRSA, MINIMUM_IRSA);
  const netSalary = grossSalary - ostie - cnaps - totalIRSA;

  return {
    grossSalary,
    ostie,
    cnaps,
    taxableIncome,
    totalIRSA,
    netSalary,
    bracketDetails
  };
}

export default function Payroll() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showAdvanceDetail, setShowAdvanceDetail] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);
  const [calculation, setCalculation] = useState<any>(null);
  const [advanceDeduction, setAdvanceDeduction] = useState<number>(0);
  const [approvedAdvances, setApprovedAdvances] = useState<Advance[]>([]);
  const [activeTab, setActiveTab] = useState<'advances' | 'payroll'>('payroll');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedPeriod, setSelectedPeriod] = useState(`${MONTHS[currentMonth]} ${currentYear}`);

  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    employee_type: 'teacher' as 'teacher' | 'staff',
    amount: '',
    reason: '',
    repayment_months: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadEmployees(), loadAdvances()]);
    setLoading(false);
  };

  const loadEmployees = async () => {
    const [teachersRes, staffRes] = await Promise.all([
      supabase.from('teachers').select('id, matricule, first_name, last_name, base_salary').eq('status', 'active'),
      supabase.from('staff').select('id, matricule, first_name, last_name, base_salary').eq('status', 'active')
    ]);

    const allEmployees: Employee[] = [
      ...(teachersRes.data?.map(t => ({ ...t, type: 'teacher' as const })) || []),
      ...(staffRes.data?.map(s => ({ ...s, type: 'staff' as const })) || [])
    ];

    setEmployees(allEmployees);
  };

  const loadAdvances = async () => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .order('request_date', { ascending: false });

    if (data && !error) {
      const advancesWithNames = await Promise.all(
        data.map(async (advance) => {
          let employeeName = '';
          let employeeMatricule = '';

          if (advance.employee_type === 'teacher') {
            const { data: teacher } = await supabase
              .from('teachers')
              .select('first_name, last_name, matricule')
              .eq('id', advance.employee_id)
              .maybeSingle();
            if (teacher) {
              employeeName = `${teacher.first_name} ${teacher.last_name}`;
              employeeMatricule = teacher.matricule;
            }
          } else {
            const { data: staff } = await supabase
              .from('staff')
              .select('first_name, last_name, matricule')
              .eq('id', advance.employee_id)
              .maybeSingle();
            if (staff) {
              employeeName = `${staff.first_name} ${staff.last_name}`;
              employeeMatricule = staff.matricule;
            }
          }

          return {
            ...advance,
            employee_name: employeeName,
            employee_matricule: employeeMatricule
          };
        })
      );
      setAdvances(advancesWithNames);
    }
  };

  const loadPaymentHistory = async (employeeId: string, employeeType: string) => {
    const { data } = await supabase
      .from('payment_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('employee_type', employeeType)
      .order('created_at', { ascending: false });

    if (data) {
      setPaymentHistory(data);
    }
  };

  const loadApprovedAdvances = async (employeeId: string, employeeType: string) => {
    const { data } = await supabase
      .from('advances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('employee_type', employeeType)
      .eq('status', 'approved')
      .gt('remaining_amount', 0);

    if (data && data.length > 0) {
      const totalDeduction = data.reduce((sum, advance) => {
        const monthlyDeduction = Number(advance.amount) / advance.repayment_months;
        return sum + monthlyDeduction;
      }, 0);

      setApprovedAdvances(data);
      setAdvanceDeduction(totalDeduction);
      return totalDeduction;
    }

    setApprovedAdvances([]);
    setAdvanceDeduction(0);
    return 0;
  };

  const handleCalculate = async (employee: Employee) => {
    setSelectedEmployee(employee);
    const calc = calculateIRSA(employee.base_salary);
    setCalculation(calc);

    await loadApprovedAdvances(employee.id, employee.type);

    setShowCalculator(true);
  };

  const handleNewPayment = async () => {
    if (!selectedEmployee || !calculation) return;

    const finalNetSalary = calculation.netSalary - advanceDeduction;

    const paymentData = {
      employee_id: selectedEmployee.id,
      employee_type: selectedEmployee.type,
      matricule: selectedEmployee.matricule,
      employee_name: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
      gross_salary: calculation.grossSalary,
      irsa_amount: calculation.totalIRSA,
      advance_deduction: advanceDeduction,
      net_salary: finalNetSalary,
      payment_date: new Date().toISOString(),
      payment_period: selectedPeriod
    };

    const { error } = await supabase.from('payment_records').insert([paymentData]);

    if (!error) {
      if (approvedAdvances.length > 0) {
        for (const advance of approvedAdvances) {
          const monthlyDeduction = Number(advance.amount) / advance.repayment_months;
          const newRemaining = Number(advance.remaining_amount) - monthlyDeduction;

          if (newRemaining <= 0) {
            await supabase
              .from('advances')
              .update({
                remaining_amount: 0,
                status: 'repaid'
              })
              .eq('id', advance.id);
          } else {
            await supabase
              .from('advances')
              .update({ remaining_amount: newRemaining })
              .eq('id', advance.id);
          }
        }
      }

      alert('✅ Paiement enregistré avec succès!\n\n' +
            `Période: ${selectedPeriod}\n` +
            `Employé: ${paymentData.employee_name}\n` +
            `Matricule: ${paymentData.matricule}\n` +
            `Salaire Brut: ${paymentData.gross_salary.toLocaleString('fr-FR')} Ar\n` +
            `IRSA: ${paymentData.irsa_amount.toLocaleString('fr-FR')} Ar\n` +
            (advanceDeduction > 0 ? `Déduction Avance: ${advanceDeduction.toLocaleString('fr-FR')} Ar\n` : '') +
            `Salaire Net: ${paymentData.net_salary.toLocaleString('fr-FR')} Ar\n` +
            `Date/Heure: ${new Date().toLocaleString('fr-FR')}`
      );

      setShowCalculator(false);
      setSelectedEmployee(null);
      setCalculation(null);
      setAdvanceDeduction(0);
      setApprovedAdvances([]);
      loadAdvances();
    } else {
      alert('❌ Erreur lors de l\'enregistrement du paiement');
    }
  };

  const handleViewHistory = async (employee: Employee) => {
    setSelectedEmployee(employee);
    await loadPaymentHistory(employee.id, employee.type);
    setShowPaymentHistory(true);
  };

  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();

    const employee = employees.find(emp => emp.id === advanceForm.employee_id);
    if (!employee) return;

    const maxAdvance = employee.base_salary * 0.5;
    const requestedAmount = Number(advanceForm.amount);

    if (requestedAmount > maxAdvance) {
      alert(`Le montant demandé dépasse 50% du salaire brut (${maxAdvance.toLocaleString('fr-FR')} Ar)`);
      return;
    }

    const { error } = await supabase.from('advances').insert([{
      employee_id: advanceForm.employee_id,
      employee_type: advanceForm.employee_type,
      amount: requestedAmount,
      reason: advanceForm.reason || null,
      repayment_months: advanceForm.repayment_months,
      remaining_amount: requestedAmount,
      status: 'pending'
    }]);

    if (!error) {
      setShowAdvanceForm(false);
      setAdvanceForm({
        employee_id: '',
        employee_type: 'teacher',
        amount: '',
        reason: '',
        repayment_months: 1
      });
      loadAdvances();
    }
  };

  const handleApproveAdvance = async (advanceId: string) => {
    const { error } = await supabase
      .from('advances')
      .update({ status: 'approved', approval_date: new Date().toISOString() })
      .eq('id', advanceId);

    if (!error) {
      loadAdvances();
    }
  };

  const handleRejectAdvance = async (advanceId: string) => {
    const { error } = await supabase
      .from('advances')
      .update({ status: 'rejected', approval_date: new Date().toISOString() })
      .eq('id', advanceId);

    if (!error) {
      loadAdvances();
    }
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette demande d\'avance ?')) {
      const { error } = await supabase
        .from('advances')
        .delete()
        .eq('id', advanceId);

      if (!error) {
        loadAdvances();
      }
    }
  };

  const handleViewAdvance = (advance: Advance) => {
    setSelectedAdvance(advance);
    setShowAdvanceDetail(true);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { icon: Clock, text: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      approved: { icon: CheckCircle, text: 'Approuvée', color: 'bg-blue-100 text-blue-800' },
      rejected: { icon: XCircle, text: 'Refusée', color: 'bg-red-100 text-red-800' },
      repaid: { icon: CheckCircle, text: 'Remboursée', color: 'bg-green-100 text-green-800' }
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        <Icon className="w-3 h-3" />
        <span>{badge.text}</span>
      </span>
    );
  };

  const advanceStats = {
    pending: advances.filter(a => a.status === 'pending').length,
    approved: advances.filter(a => a.status === 'approved').length,
    repaid: advances.filter(a => a.status === 'repaid').length,
    rejected: advances.filter(a => a.status === 'rejected').length
  };

  const generatePeriodOptions = () => {
    const options = [];
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let month = 0; month < 12; month++) {
        options.push(`${MONTHS[month]} ${year}`);
      }
    }
    return options;
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paie & Calcul IRSA</h2>
          <p className="text-gray-600">Système de paie conforme à la législation malgache 2025</p>
        </div>
      </div>

      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'payroll'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Calcul de Paie
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`px-6 py-3 font-medium transition ${
            activeTab === 'advances'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Avances sur Salaire
        </button>
      </div>

      {activeTab === 'payroll' && (
        <>
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Période de Paiement</h3>
                  <p className="text-sm text-gray-600">Sélectionnez le mois pour lequel vous effectuez les paiements</p>
                </div>
              </div>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-blue-300 rounded-lg px-6 py-3 font-semibold text-blue-900 bg-white focus:ring-2 focus:ring-blue-500"
              >
                {generatePeriodOptions().map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>
          </div>

          {showCalculator && calculation && selectedEmployee && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">Calcul de Paie - {selectedPeriod}</h3>
                    <p className="text-sm text-gray-300">
                      {selectedEmployee.first_name} {selectedEmployee.last_name} - {selectedEmployee.matricule} - {selectedEmployee.type === 'teacher' ? 'Enseignant' : 'Personnel'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCalculator(false)}
                    className="text-white hover:text-gray-300 transition text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3">Salaire Brut</h4>
                    <div className="flex justify-between text-lg">
                      <span>Salaire brut mensuel</span>
                      <span className="font-bold text-2xl text-blue-900">{calculation.grossSalary.toLocaleString('fr-FR')} Ar</span>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">Détail du Calcul IRSA par Tranches</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Tranche 1 (0 - 350 000) à 0%</span>
                        <span>0 Ar</span>
                      </div>
                      {calculation.bracketDetails.map((detail: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>Tranche {detail.bracket}</span>
                          <span className="font-medium">{detail.amount.toLocaleString('fr-FR')} Ar</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-300">
                    <h4 className="font-semibold text-orange-900 mb-3">IRSA Total</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avec application du minimum de 3 000 Ar</span>
                      <span className="text-2xl font-bold text-red-600">
                        {calculation.totalIRSA.toLocaleString('fr-FR')} Ar
                      </span>
                    </div>
                  </div>

                  {advanceDeduction > 0 && (
                    <div className="bg-red-50 rounded-lg p-4 border-2 border-red-300">
                      <h4 className="font-semibold text-red-900 mb-3 flex items-center">
                        <TrendingDown className="w-5 h-5 mr-2" />
                        Déduction Avance sur Salaire
                      </h4>
                      <div className="space-y-3">
                        {approvedAdvances.map(advance => {
                          const monthlyDeduction = Number(advance.amount) / advance.repayment_months;
                          return (
                            <div key={advance.id} className="flex justify-between items-center bg-white p-3 rounded border border-red-200">
                              <div className="text-sm">
                                <p className="font-medium text-gray-900">Avance du {new Date(advance.request_date).toLocaleDateString('fr-FR')}</p>
                                <p className="text-xs text-gray-600">
                                  Montant total: {Number(advance.amount).toLocaleString('fr-FR')} Ar -
                                  Reste: {Number(advance.remaining_amount).toLocaleString('fr-FR')} Ar
                                </p>
                              </div>
                              <span className="font-bold text-red-600">- {monthlyDeduction.toLocaleString('fr-FR')} Ar</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between items-center pt-3 border-t border-red-300">
                          <span className="font-semibold text-red-900">Total Déduction Avances</span>
                          <span className="text-2xl font-bold text-red-600">- {advanceDeduction.toLocaleString('fr-FR')} Ar</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 text-white border-2 border-blue-400">
                    <h4 className="font-semibold mb-3 text-lg">Salaire Net à Payer</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm opacity-90">
                        <span>Salaire brut</span>
                        <span>{calculation.grossSalary.toLocaleString('fr-FR')} Ar</span>
                      </div>
                      <div className="flex justify-between text-sm opacity-90">
                        <span>IRSA</span>
                        <span>- {calculation.totalIRSA.toLocaleString('fr-FR')} Ar</span>
                      </div>
                      {advanceDeduction > 0 && (
                        <div className="flex justify-between text-sm opacity-90">
                          <span>Déduction Avances</span>
                          <span>- {advanceDeduction.toLocaleString('fr-FR')} Ar</span>
                        </div>
                      )}
                      <div className="border-t border-white/30 pt-3 mt-3 flex justify-between text-2xl font-bold">
                        <span>SALAIRE NET</span>
                        <span>{(calculation.netSalary - advanceDeduction).toLocaleString('fr-FR')} Ar</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 sticky bottom-0 bg-white pt-4 pb-2">
                    <button
                      onClick={handleNewPayment}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center space-x-2 shadow-lg"
                    >
                      <DollarSign className="w-5 h-5" />
                      <span>Enregistrer Paiement - {selectedPeriod}</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition shadow-lg"
                    >
                      Imprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-900">Employés Actifs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom Complet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salaire Brut (Ar)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map(employee => (
                    <tr key={`${employee.type}-${employee.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.matricule}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <DollarSign className="w-5 h-5 text-green-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{employee.first_name} {employee.last_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{employee.type === 'teacher' ? 'Enseignant' : 'Personnel'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {employee.base_salary.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleCalculate(employee)}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                            title="Calculer Paie"
                          >
                            <Calculator className="w-4 h-4" />
                            <span>Calculer Paie</span>
                          </button>
                          <button
                            onClick={() => handleViewHistory(employee)}
                            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                            title="Historique de Paiement"
                          >
                            <History className="w-4 h-4" />
                            <span>Historique</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl shadow-sm border border-orange-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-orange-600" />
              Barème IRSA Madagascar 2025
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tranche</th>
                    <th className="text-left py-2">Revenu Imposable (Ar)</th>
                    <th className="text-left py-2">Taux</th>
                    <th className="text-left py-2">Montant de base</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="py-2">1</td><td>0 - 350 000</td><td className="font-semibold text-green-600">0%</td><td>Exonéré</td></tr>
                  <tr><td className="py-2">2</td><td>350 001 - 400 000</td><td className="font-semibold">5%</td><td>0</td></tr>
                  <tr><td className="py-2">3</td><td>400 001 - 500 000</td><td className="font-semibold">10%</td><td>2 500</td></tr>
                  <tr><td className="py-2">4</td><td>500 001 - 600 000</td><td className="font-semibold">15%</td><td>12 500</td></tr>
                  <tr><td className="py-2">5</td><td>&gt; 600 000</td><td className="font-semibold text-red-600">20%</td><td>27 500</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-4">Minimum de perception légal : 3 000 Ar</p>
          </div>
        </>
      )}

      {activeTab === 'advances' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Demandes d'Avance sur Salaire</h3>
              <p className="text-sm text-gray-600">{advances.length} demande(s) enregistrée(s)</p>
            </div>
            <button
              onClick={() => setShowAdvanceForm(true)}
              className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Nouvelle Demande</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">En attente</p>
                  <p className="text-2xl font-bold">{advanceStats.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approuvée</p>
                  <p className="text-2xl font-bold">{advanceStats.approved}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remboursée</p>
                  <p className="text-2xl font-bold">{advanceStats.repaid}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Refusée</p>
                  <p className="text-2xl font-bold">{advanceStats.rejected}</p>
                </div>
              </div>
            </div>
          </div>

          {showAdvanceForm && (
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <h3 className="text-lg font-semibold mb-4">Nouvelle Demande d'Avance</h3>
              <form onSubmit={handleSubmitAdvance} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={advanceForm.employee_id}
                    onChange={e => {
                      const empId = e.target.value;
                      const emp = employees.find(e => e.id === empId);
                      setAdvanceForm({
                        ...advanceForm,
                        employee_id: empId,
                        employee_type: emp?.type || 'teacher'
                      });
                    }}
                    className="border rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">Sélectionner un employé *</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.matricule} - {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Montant demandé (Ar) *"
                    value={advanceForm.amount}
                    onChange={e => setAdvanceForm({...advanceForm, amount: e.target.value})}
                    className="border rounded-lg px-4 py-2"
                    required
                  />

                  <select
                    value={advanceForm.repayment_months}
                    onChange={e => setAdvanceForm({...advanceForm, repayment_months: Number(e.target.value)})}
                    className="border rounded-lg px-4 py-2"
                  >
                    <option value={1}>Remboursement sur 1 mois</option>
                    <option value={2}>Remboursement sur 2 mois</option>
                    <option value={3}>Remboursement sur 3 mois</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Raison (optionnel)"
                    value={advanceForm.reason}
                    onChange={e => setAdvanceForm({...advanceForm, reason: e.target.value})}
                    className="border rounded-lg px-4 py-2"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
                  >
                    Soumettre la Demande
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdvanceForm(false)}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant Demandé</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reste à Payer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remboursement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {advances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>Aucune demande d'avance enregistrée</p>
                      </td>
                    </tr>
                  ) : (
                    advances.map(advance => (
                      <tr key={advance.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{advance.employee_name}</div>
                            <div className="text-xs text-gray-500">{advance.employee_matricule}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {Number(advance.amount).toLocaleString('fr-FR')} Ar
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                          {advance.remaining_amount ? Number(advance.remaining_amount).toLocaleString('fr-FR') : 0} Ar
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {advance.repayment_months} mois
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(advance.request_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(advance.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewAdvance(advance)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Voir"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {advance.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveAdvance(advance.id)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Approuver"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectAdvance(advance.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Refuser"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteAdvance(advance.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
              Règles des Avances sur Salaire
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>Montant maximum:</strong> 50% du salaire brut</li>
              <li>• <strong>Remboursement:</strong> 1 à 3 mois maximum</li>
              <li>• <strong>Taux d'intérêt:</strong> 0% par défaut (configurable)</li>
              <li>• <strong>Validation requise:</strong> N+1 puis Direction</li>
              <li>• <strong>Déduction automatique:</strong> Calculée et appliquée lors du paiement mensuel</li>
              <li>• <strong>Statut automatique:</strong> Passage à "Remboursée" quand le solde atteint 0</li>
            </ul>
          </div>
        </>
      )}

      {showAdvanceDetail && selectedAdvance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Détails de la Demande</h3>
              <button
                onClick={() => setShowAdvanceDetail(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Employé</p>
                  <p className="font-medium">{selectedAdvance.employee_name}</p>
                  <p className="text-xs text-gray-500">{selectedAdvance.employee_matricule}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Statut</p>
                  {getStatusBadge(selectedAdvance.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Montant demandé</p>
                  <p className="text-lg font-bold text-gray-900">
                    {Number(selectedAdvance.amount).toLocaleString('fr-FR')} Ar
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reste à payer</p>
                  <p className="text-lg font-bold text-orange-600">
                    {selectedAdvance.remaining_amount ? Number(selectedAdvance.remaining_amount).toLocaleString('fr-FR') : 0} Ar
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Remboursement</p>
                  <p className="font-medium">{selectedAdvance.repayment_months} mois</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Déduction mensuelle</p>
                  <p className="font-medium text-red-600">
                    {(Number(selectedAdvance.amount) / selectedAdvance.repayment_months).toLocaleString('fr-FR')} Ar/mois
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date de demande</p>
                  <p className="font-medium">
                    {new Date(selectedAdvance.request_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {selectedAdvance.approval_date && (
                  <div>
                    <p className="text-sm text-gray-600">Date d'approbation</p>
                    <p className="font-medium">
                      {new Date(selectedAdvance.approval_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>

              {selectedAdvance.reason && (
                <div>
                  <p className="text-sm text-gray-600">Raison</p>
                  <p className="font-medium">{selectedAdvance.reason}</p>
                </div>
              )}

              {selectedAdvance.status === 'pending' && (
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleApproveAdvance(selectedAdvance.id);
                      setShowAdvanceDetail(false);
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => {
                      handleRejectAdvance(selectedAdvance.id);
                      setShowAdvanceDetail(false);
                    }}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    Refuser
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPaymentHistory && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Historique de Paiement</h3>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.first_name} {selectedEmployee.last_name} - {selectedEmployee.matricule}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {paymentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">Aucun paiement enregistré</p>
                  <p className="text-gray-400 text-sm mt-2">Les paiements apparaîtront ici une fois effectués</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salaire Brut</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IRSA</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Déduction Avance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salaire Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paymentHistory.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                            {payment.payment_period}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{new Date(payment.payment_date).toLocaleDateString('fr-FR')}</div>
                              <div className="text-xs text-gray-500">{new Date(payment.payment_date).toLocaleTimeString('fr-FR')}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {Number(payment.gross_salary).toLocaleString('fr-FR')} Ar
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                            {Number(payment.irsa_amount).toLocaleString('fr-FR')} Ar
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                            {payment.advance_deduction ? Number(payment.advance_deduction).toLocaleString('fr-FR') : 0} Ar
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            {Number(payment.net_salary).toLocaleString('fr-FR')} Ar
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
