import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Calculator, DollarSign } from 'lucide-react';

interface Employee {
  id: string;
  type: 'teacher' | 'staff';
  matricule: string;
  first_name: string;
  last_name: string;
  base_salary: number;
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
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [calculation, setCalculation] = useState<any>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

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
    setLoading(false);
  };

  const handleCalculate = (employee: Employee) => {
    setSelectedEmployee(employee);
    const calc = calculateIRSA(employee.base_salary);
    setCalculation(calc);
    setShowCalculator(true);
  };

  const handleSavePayroll = async () => {
    if (!selectedEmployee || !calculation) return;

    const payrollData = {
      employee_id: selectedEmployee.id,
      employee_type: selectedEmployee.type,
      pay_period: new Date().toISOString().substring(0, 7),
      gross_salary: calculation.grossSalary,
      ostie_amount: calculation.ostie,
      cnaps_amount: calculation.cnaps,
      irsa_amount: calculation.totalIRSA,
      advance_deduction: 0,
      other_deductions: 0,
      net_salary: calculation.netSalary,
      status: 'approved'
    };

    const { error } = await supabase.from('payroll').insert([payrollData]);
    if (!error) {
      alert('Fiche de paie enregistrée avec succès!');
      setShowCalculator(false);
      setSelectedEmployee(null);
      setCalculation(null);
    }
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

      {showCalculator && calculation && selectedEmployee && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Fiche de Paie</h3>
              <p className="text-gray-600">{selectedEmployee.first_name} {selectedEmployee.last_name} - {selectedEmployee.matricule}</p>
            </div>
            <button onClick={() => setShowCalculator(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Étape 1 : Salaire Brut</h4>
              <div className="flex justify-between text-lg">
                <span>Salaire brut mensuel</span>
                <span className="font-bold">{calculation.grossSalary.toLocaleString('fr-FR')} Ar</span>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-3">Étape 2 : Déductions Obligatoires</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>OSTIE (2%)</span>
                  <span className="font-medium text-red-600">- {calculation.ostie.toLocaleString('fr-FR')} Ar</span>
                </div>
                <div className="flex justify-between">
                  <span>CNaPS (1%)</span>
                  <span className="font-medium text-red-600">- {calculation.cnaps.toLocaleString('fr-FR')} Ar</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Revenu Imposable</span>
                  <span>{calculation.taxableIncome.toLocaleString('fr-FR')} Ar</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3">Étape 3 : Calcul IRSA par Tranches</h4>
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
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-red-600">
                  <span>IRSA Total</span>
                  <span>- {calculation.totalIRSA.toLocaleString('fr-FR')} Ar</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Minimum de perception légal: 3 000 Ar</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 text-white">
              <h4 className="font-semibold mb-3 text-lg">Salaire Net à Payer</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm opacity-90">
                  <span>Salaire brut</span>
                  <span>{calculation.grossSalary.toLocaleString('fr-FR')} Ar</span>
                </div>
                <div className="flex justify-between text-sm opacity-90">
                  <span>Total déductions</span>
                  <span>- {(calculation.ostie + calculation.cnaps + calculation.totalIRSA).toLocaleString('fr-FR')} Ar</span>
                </div>
                <div className="border-t border-white/30 pt-3 mt-3 flex justify-between text-2xl font-bold">
                  <span>NET À PAYER</span>
                  <span>{calculation.netSalary.toLocaleString('fr-FR')} Ar</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSavePayroll}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Enregistrer la Fiche de Paie
              </button>
              <button
                onClick={() => window.print()}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Imprimer
              </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
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
                    <button
                      onClick={() => handleCalculate(employee)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      <Calculator className="w-4 h-4" />
                      <span>Calculer Paie</span>
                    </button>
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
    </div>
  );
}
