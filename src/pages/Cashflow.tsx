import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, TrendingUp, TrendingDown, DollarSign, Filter, Calendar, Eye, Edit2, Trash2, Download, X } from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: 'encaissement' | 'decaissement';
  category: string;
  description: string;
  amount: number;
  transaction_date: string;
  payment_method: string;
  status: 'validee' | 'en_attente' | 'annulee';
  reference: string | null;
  notes: string | null;
  linked_type: string | null;
  linked_id: string | null;
  created_at: string;
}

const CATEGORIES_ENCAISSEMENT = [
  'Écolage',
  'Inscription',
  'Frais de scolarité',
  'Activités parascolaires',
  'Cantine',
  'Transport',
  'Fournitures',
  'Donation',
  'Subvention',
  'Autres revenus'
];

const CATEGORIES_DECAISSEMENT = [
  'Salaires enseignants',
  'Salaires personnel',
  'Avance sur salaire',
  'Fournitures scolaires',
  'Équipements',
  'Loyer',
  'Électricité',
  'Eau',
  'Internet',
  'Entretien',
  'Transport',
  'Assurances',
  'Taxes',
  'Autres dépenses'
];

const PAYMENT_METHODS = [
  'Espèces',
  'Chèque',
  'Virement bancaire',
  'Mobile Money',
  'Carte bancaire',
  'Autre'
];

export default function Cashflow() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'encaissement' | 'decaissement'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'validee' | 'en_attente' | 'annulee'>('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const [formData, setFormData] = useState({
    transaction_type: 'encaissement' as 'encaissement' | 'decaissement',
    category: '',
    description: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'Espèces',
    status: 'validee' as 'validee' | 'en_attente' | 'annulee',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadTransactions();

    const channel = supabase
      .channel('transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransactions(prev => [payload.new as Transaction, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransactions(prev =>
              prev.map(t => t.id === (payload.new as Transaction).id ? payload.new as Transaction : t)
            );
          } else if (payload.eventType === 'DELETE') {
            setTransactions(prev => prev.filter(t => t.id !== (payload.old as Transaction).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const generateReference = () => {
      const type = formData.transaction_type === 'encaissement' ? 'ENC' : 'DEC';
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${type}-${date}-${random}`;
    };

    const transactionData = {
      transaction_type: formData.transaction_type,
      category: formData.category,
      description: formData.description,
      amount: Number(formData.amount),
      transaction_date: formData.transaction_date,
      payment_method: formData.payment_method,
      status: formData.status,
      reference: formData.reference || generateReference(),
      notes: formData.notes || null,
      linked_type: 'manual',
      linked_id: null
    };

    const { error } = await supabase.from('transactions').insert([transactionData]);

    if (!error) {
      setShowForm(false);
      setFormData({
        transaction_type: 'encaissement',
        category: '',
        description: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'Espèces',
        status: 'validee',
        reference: '',
        notes: ''
      });
      loadTransactions();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) {
        loadTransactions();
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.transaction_type !== filterType) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (dateFilter.start && t.transaction_date < dateFilter.start) return false;
    if (dateFilter.end && t.transaction_date > dateFilter.end) return false;
    return true;
  });

  const totals = filteredTransactions.reduce(
    (acc, t) => {
      if (t.status === 'validee') {
        if (t.transaction_type === 'encaissement') {
          acc.encaissements += Number(t.amount);
        } else {
          acc.decaissements += Number(t.amount);
        }
      }
      return acc;
    },
    { encaissements: 0, decaissements: 0 }
  );

  const solde = totals.encaissements - totals.decaissements;

  const getStatusBadge = (status: string) => {
    const badges = {
      validee: { text: 'Validée', color: 'bg-green-100 text-green-800' },
      en_attente: { text: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      annulee: { text: 'Annulée', color: 'bg-red-100 text-red-800' }
    };
    const badge = badges[status as keyof typeof badges];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Encaissement / Décaissement</h2>
          <p className="text-gray-600">Gestion complète de la trésorerie</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle Transaction</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8" />
            <span className="text-sm opacity-90">Total</span>
          </div>
          <p className="text-3xl font-bold mb-1">{totals.encaissements.toLocaleString('fr-FR')} Ar</p>
          <p className="text-sm opacity-90">Encaissements</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-8 h-8" />
            <span className="text-sm opacity-90">Total</span>
          </div>
          <p className="text-3xl font-bold mb-1">{totals.decaissements.toLocaleString('fr-FR')} Ar</p>
          <p className="text-sm opacity-90">Décaissements</p>
        </div>

        <div className={`bg-gradient-to-br ${solde >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-xl shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8" />
            <span className="text-sm opacity-90">Solde</span>
          </div>
          <p className="text-3xl font-bold mb-1">{solde.toLocaleString('fr-FR')} Ar</p>
          <p className="text-sm opacity-90">{solde >= 0 ? 'Positif' : 'Négatif'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border rounded-lg px-3 py-1 text-sm"
          >
            <option value="all">Tous les types</option>
            <option value="encaissement">Encaissements</option>
            <option value="decaissement">Décaissements</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="border rounded-lg px-3 py-1 text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="validee">Validée</option>
            <option value="en_attente">En attente</option>
            <option value="annulee">Annulée</option>
          </select>

          <input
            type="date"
            value={dateFilter.start}
            onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
            className="border rounded-lg px-3 py-1 text-sm"
            placeholder="Date début"
          />

          <input
            type="date"
            value={dateFilter.end}
            onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
            className="border rounded-lg px-3 py-1 text-sm"
            placeholder="Date fin"
          />

          {(filterType !== 'all' || filterStatus !== 'all' || dateFilter.start || dateFilter.end) && (
            <button
              onClick={() => {
                setFilterType('all');
                setFilterStatus('all');
                setDateFilter({ start: '', end: '' });
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Aucune transaction enregistrée</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.transaction_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.transaction_type === 'encaissement' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <TrendingUp className="w-3 h-3" />
                          <span>Encaissement</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <TrendingDown className="w-3 h-3" />
                          <span>Décaissement</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{transaction.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{transaction.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span className={transaction.transaction_type === 'encaissement' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.transaction_type === 'encaissement' ? '+' : '-'} {Number(transaction.amount).toLocaleString('fr-FR')} Ar
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{transaction.payment_method}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(transaction.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDelete(transaction.id)}
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Nouvelle Transaction</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de transaction *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transaction_type: 'encaissement', category: '' })}
                    className={`p-4 rounded-lg border-2 transition ${
                      formData.transaction_type === 'encaissement'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${formData.transaction_type === 'encaissement' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="font-medium">Encaissement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transaction_type: 'decaissement', category: '' })}
                    className={`p-4 rounded-lg border-2 transition ${
                      formData.transaction_type === 'decaissement'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <TrendingDown className={`w-6 h-6 mx-auto mb-2 ${formData.transaction_type === 'decaissement' ? 'text-red-600' : 'text-gray-400'}`} />
                    <span className="font-medium">Décaissement</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  {(formData.transaction_type === 'encaissement' ? CATEGORIES_ENCAISSEMENT : CATEGORIES_DECAISSEMENT).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  rows={3}
                  placeholder="Description détaillée de la transaction"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant (Ariary) *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: 120000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode de paiement
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="validee">Validée</option>
                    <option value="en_attente">En attente</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Référence
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  placeholder="ex: TXN-2025-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  rows={2}
                  placeholder="Notes additionnelles..."
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
