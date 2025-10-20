import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, DollarSign } from 'lucide-react';

interface Payment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  status: string;
  students: {
    first_name: string;
    last_name: string;
    matricule: string;
  };
}

export default function Fees() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_type: 'tuition' as 'registration' | 'tuition' | 'supplies' | 'insurance' | 'other',
    payment_method: 'cash' as 'cash' | 'bank_transfer' | 'mobile_money' | 'check',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [paymentsRes, studentsRes] = await Promise.all([
      supabase.from('payments').select('*, students(first_name, last_name, matricule)').order('payment_date', { ascending: false }),
      supabase.from('students').select('id, first_name, last_name, matricule').eq('status', 'active')
    ]);

    if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
    if (studentsRes.data) setStudents(studentsRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentData = {
      ...formData,
      amount: Number(formData.amount),
      receipt_number: `REC-${Date.now()}`,
      status: 'completed'
    };

    const { data: paymentResult, error: paymentError } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (!paymentError && paymentResult) {
      const student = students.find(s => s.id === formData.student_id);
      const paymentTypeLabels = {
        registration: 'Inscription',
        tuition: 'Écolage',
        supplies: 'Fournitures',
        insurance: 'Assurance',
        other: 'Autres frais'
      };

      const paymentMethodLabels = {
        cash: 'Espèces',
        bank_transfer: 'Virement bancaire',
        mobile_money: 'Mobile Money',
        check: 'Chèque'
      };

      await supabase.from('transactions').insert([{
        transaction_type: 'encaissement',
        category: paymentTypeLabels[formData.payment_type],
        description: `Paiement ${paymentTypeLabels[formData.payment_type]} - ${student?.first_name} ${student?.last_name} (${student?.matricule})`,
        amount: Number(formData.amount),
        transaction_date: formData.payment_date,
        payment_method: paymentMethodLabels[formData.payment_method],
        status: 'validee',
        reference: paymentData.receipt_number,
        notes: formData.notes || null,
        linked_type: 'fee_payment',
        linked_id: paymentResult.id
      }]);

      setShowForm(false);
      setFormData({
        student_id: '',
        amount: '',
        payment_type: 'tuition',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadData();
    }
  };

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion de l'Écolage</h2>
          <p className="text-gray-600">Revenus totaux: {totalRevenue.toLocaleString('fr-FR')} Ar</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau Paiement</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold mb-4">Enregistrer un paiement</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={formData.student_id}
              onChange={e => setFormData({...formData, student_id: e.target.value})}
              className="border rounded-lg px-4 py-2"
              required
            >
              <option value="">Sélectionner un élève *</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.matricule} - {s.first_name} {s.last_name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Montant (Ar) *"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              className="border rounded-lg px-4 py-2"
              required
            />
            <select
              value={formData.payment_type}
              onChange={e => setFormData({...formData, payment_type: e.target.value as any})}
              className="border rounded-lg px-4 py-2"
            >
              <option value="registration">Inscription</option>
              <option value="tuition">Écolage</option>
              <option value="supplies">Fournitures</option>
              <option value="insurance">Assurance</option>
              <option value="other">Autre</option>
            </select>
            <select
              value={formData.payment_method}
              onChange={e => setFormData({...formData, payment_method: e.target.value as any})}
              className="border rounded-lg px-4 py-2"
            >
              <option value="cash">Espèces</option>
              <option value="bank_transfer">Virement bancaire</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="check">Chèque</option>
            </select>
            <input
              type="date"
              value={formData.payment_date}
              onChange={e => setFormData({...formData, payment_date: e.target.value})}
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="text"
              placeholder="Notes"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="border rounded-lg px-4 py-2"
            />
            <div className="md:col-span-2 flex space-x-3">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                Enregistrer
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Élève</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant (Ar)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.students.first_name} {payment.students.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{payment.students.matricule}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{payment.payment_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{payment.payment_method}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {Number(payment.amount).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
