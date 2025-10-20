import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, DollarSign, Eye, Edit2, Trash2, X, Printer } from 'lucide-react';

interface Payment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  status: string;
  period: string | null;
  payer_name: string | null;
  class_id: string | null;
  receipt_number: string | null;
  notes: string | null;
  students: {
    first_name: string;
    last_name: string;
    matricule: string;
  };
  classes?: {
    name: string;
    level: string;
  };
}

export default function Fees() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_type: 'tuition' as 'registration' | 'tuition' | 'supplies' | 'insurance' | 'other',
    payment_method: 'cash' as 'cash' | 'bank_transfer' | 'mobile_money' | 'check',
    payment_date: new Date().toISOString().split('T')[0],
    period: '',
    payer_name: '',
    class_id: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [paymentsRes, studentsRes, classesRes] = await Promise.all([
      supabase.from('payments').select('*, students(first_name, last_name, matricule), classes(name, level)').order('payment_date', { ascending: false }),
      supabase.from('students').select('id, first_name, last_name, matricule, class_id').eq('status', 'active'),
      supabase.from('classes').select('id, name, level')
    ]);

    if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      student_id: payment.student_id,
      amount: payment.amount.toString(),
      payment_type: payment.payment_type as any,
      payment_method: payment.payment_method as any,
      payment_date: payment.payment_date,
      period: payment.period || '',
      payer_name: payment.payer_name || '',
      class_id: payment.class_id || '',
      notes: payment.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce paiement?')) {
      await supabase.from('payments').delete().eq('id', id);
      loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentData = {
      ...formData,
      amount: Number(formData.amount),
      period: formData.period || null,
      payer_name: formData.payer_name || null,
      class_id: formData.class_id || null,
      receipt_number: editingPayment ? editingPayment.receipt_number : `REC-${Date.now()}`,
      status: 'completed'
    };

    if (editingPayment) {
      await supabase.from('payments').update(paymentData).eq('id', editingPayment.id);
    } else {
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
      }
    }

    setShowForm(false);
    setEditingPayment(null);
    setFormData({
      student_id: '',
      amount: '',
      payment_type: 'tuition',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      period: '',
      payer_name: '',
      class_id: '',
      notes: ''
    });
    loadData();
  };

  const handlePrintReceipt = (payment: Payment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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

    const className = payment.classes ? `${payment.classes.level} ${payment.classes.name}` : 'Non spécifiée';

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu de Paiement - ${payment.receipt_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', sans-serif;
            padding: 40px;
            background: white;
            color: #333;
          }
          .receipt {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #2563eb;
            padding: 30px;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2563eb;
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .receipt-number {
            background: #eff6ff;
            padding: 10px 20px;
            border-radius: 8px;
            display: inline-block;
            margin: 20px 0;
            font-weight: bold;
            color: #2563eb;
          }
          .info-section {
            margin: 25px 0;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
          }
          .info-section h3 {
            color: #2563eb;
            margin-bottom: 15px;
            font-size: 16px;
            border-bottom: 2px solid #dbeafe;
            padding-bottom: 8px;
          }
          .info-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label {
            font-weight: 600;
            width: 180px;
            color: #4b5563;
          }
          .info-value {
            flex: 1;
            color: #111827;
          }
          .amount-box {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 25px;
            text-align: center;
            border-radius: 12px;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
          }
          .amount-box .label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 8px;
          }
          .amount-box .amount {
            font-size: 36px;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
          }
          .footer p {
            color: #6b7280;
            font-size: 12px;
            margin: 5px 0;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
          }
          .signature-box {
            text-align: center;
            width: 45%;
          }
          .signature-line {
            border-top: 2px solid #333;
            margin-top: 50px;
            padding-top: 10px;
            font-weight: 600;
          }
          @media print {
            body { padding: 0; }
            .receipt { border: none; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>REÇU DE PAIEMENT</h1>
            <p>École de Gestion</p>
          </div>

          <div class="receipt-number">
            N° ${payment.receipt_number}
          </div>

          <div class="info-section">
            <h3>Informations de l'Élève</h3>
            <div class="info-row">
              <div class="info-label">Nom complet:</div>
              <div class="info-value">${payment.students.first_name} ${payment.students.last_name}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Matricule:</div>
              <div class="info-value">${payment.students.matricule}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Classe:</div>
              <div class="info-value">${className}</div>
            </div>
          </div>

          <div class="info-section">
            <h3>Détails du Paiement</h3>
            <div class="info-row">
              <div class="info-label">Date de paiement:</div>
              <div class="info-value">${new Date(payment.payment_date).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Type de paiement:</div>
              <div class="info-value">${paymentTypeLabels[payment.payment_type]}</div>
            </div>
            ${payment.period ? `
            <div class="info-row">
              <div class="info-label">Période:</div>
              <div class="info-value">${payment.period}</div>
            </div>
            ` : ''}
            <div class="info-row">
              <div class="info-label">Méthode de paiement:</div>
              <div class="info-value">${paymentMethodLabels[payment.payment_method]}</div>
            </div>
            ${payment.payer_name ? `
            <div class="info-row">
              <div class="info-label">Nom du payeur:</div>
              <div class="info-value">${payment.payer_name}</div>
            </div>
            ` : ''}
          </div>

          <div class="amount-box">
            <div class="label">MONTANT PAYÉ</div>
            <div class="amount">${Number(payment.amount).toLocaleString('fr-FR')} Ar</div>
          </div>

          ${payment.notes ? `
          <div class="info-section">
            <h3>Notes</h3>
            <div style="padding: 10px 0;">${payment.notes}</div>
          </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Signature du payeur</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Cachet de l'école</div>
            </div>
          </div>

          <div class="footer">
            <p>Merci pour votre paiement</p>
            <p>Document émis le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; padding: 20px;">
          <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">
            Imprimer
          </button>
          <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; margin-left: 10px;">
            Fermer
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPayment(null);
    setFormData({
      student_id: '',
      amount: '',
      payment_type: 'tuition',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      period: '',
      payer_name: '',
      class_id: '',
      notes: ''
    });
  };

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingPayment ? 'Modifier le Paiement' : 'Enregistrer un paiement'}
              </h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Élève *</label>
                  <select
                    value={formData.student_id}
                    onChange={e => {
                      const studentId = e.target.value;
                      const student = students.find(s => s.id === studentId);
                      setFormData({
                        ...formData,
                        student_id: studentId,
                        class_id: student?.class_id || ''
                      });
                    }}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">Sélectionner un élève</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.matricule} - {s.first_name} {s.last_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de Paiement *</label>
                  <select
                    value={formData.payment_type}
                    onChange={e => setFormData({...formData, payment_type: e.target.value as any})}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="registration">Inscription</option>
                    <option value="tuition">Écolage</option>
                    <option value="supplies">Fournitures</option>
                    <option value="insurance">Assurance</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                  <select
                    value={formData.period}
                    onChange={e => setFormData({...formData, period: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Sélectionner une période</option>
                    <option value="Octobre 2025">Octobre 2025</option>
                    <option value="Novembre 2025">Novembre 2025</option>
                    <option value="Décembre 2025">Décembre 2025</option>
                    <option value="Janvier 2026">Janvier 2026</option>
                    <option value="Février 2026">Février 2026</option>
                    <option value="Mars 2026">Mars 2026</option>
                    <option value="Avril 2026">Avril 2026</option>
                    <option value="Mai 2026">Mai 2026</option>
                    <option value="Juin 2026">Juin 2026</option>
                    <option value="Trimestre 1">Trimestre 1</option>
                    <option value="Trimestre 2">Trimestre 2</option>
                    <option value="Trimestre 3">Trimestre 3</option>
                    <option value="Année complète">Année complète</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant (Ar) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: 250000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du Payeur</label>
                  <input
                    type="text"
                    value={formData.payer_name}
                    onChange={e => setFormData({...formData, payer_name: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: Jean Dupont"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Classe Concernée</label>
                  <select
                    value={formData.class_id}
                    onChange={e => setFormData({...formData, class_id: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.level} {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Méthode de Paiement *</label>
                  <select
                    value={formData.payment_method}
                    onChange={e => setFormData({...formData, payment_method: e.target.value as any})}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="cash">Espèces</option>
                    <option value="bank_transfer">Virement bancaire</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="check">Chèque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de Paiement *</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={e => setFormData({...formData, payment_date: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                    rows={3}
                    placeholder="Notes additionnelles..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  {editingPayment ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-semibold flex items-center">
                <Eye className="w-6 h-6 mr-2" />
                Détails du Paiement
              </h3>
              <button onClick={() => setViewingPayment(null)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4 pb-6 border-b">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{viewingPayment.students.first_name} {viewingPayment.students.last_name}</h4>
                  <p className="text-gray-600">{viewingPayment.students.matricule}</p>
                  <span className="inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {viewingPayment.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900 text-lg border-b pb-2">Informations du Paiement</h5>

                  <div>
                    <label className="text-sm text-gray-500">N° de Reçu</label>
                    <p className="text-gray-900 font-medium">{viewingPayment.receipt_number}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Type</label>
                    <p className="text-gray-900 font-medium capitalize">{viewingPayment.payment_type}</p>
                  </div>

                  {viewingPayment.period && (
                    <div>
                      <label className="text-sm text-gray-500">Période d'Écolage</label>
                      <p className="text-gray-900 font-medium">{viewingPayment.period}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-500">Date de Paiement</label>
                    <p className="text-gray-900 font-medium">
                      {new Date(viewingPayment.payment_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900 text-lg border-b pb-2">Détails Additionnels</h5>

                  <div>
                    <label className="text-sm text-gray-500">Méthode de Paiement</label>
                    <p className="text-gray-900 font-medium capitalize">{viewingPayment.payment_method}</p>
                  </div>

                  {viewingPayment.payer_name && (
                    <div>
                      <label className="text-sm text-gray-500">Nom du Payeur</label>
                      <p className="text-gray-900 font-medium">{viewingPayment.payer_name}</p>
                    </div>
                  )}

                  {viewingPayment.classes && (
                    <div>
                      <label className="text-sm text-gray-500">Classe Concernée</label>
                      <p className="text-gray-900 font-medium">{viewingPayment.classes.level} {viewingPayment.classes.name}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-500">Montant Payé</label>
                    <p className="text-gray-900 font-medium text-2xl text-blue-600">
                      {Number(viewingPayment.amount).toLocaleString('fr-FR')} Ar
                    </p>
                  </div>
                </div>
              </div>

              {viewingPayment.notes && (
                <div className="pt-4 border-t">
                  <label className="text-sm text-gray-500">Notes</label>
                  <p className="text-gray-900 mt-2">{viewingPayment.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t flex space-x-3">
                <button
                  onClick={() => handlePrintReceipt(viewingPayment)}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  Imprimer le Reçu
                </button>
                <button
                  onClick={() => setViewingPayment(null)}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant (Ar)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.period || '-'}</td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewingPayment(payment)}
                        className="text-green-600 hover:text-green-800"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(payment)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintReceipt(payment)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Imprimer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
