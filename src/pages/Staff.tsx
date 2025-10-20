import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, UserCog, Edit2, Trash2, X, Eye } from 'lucide-react';

interface StaffMember {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  hire_date: string | null;
  retirement_date: string | null;
  phone: string;
  email: string | null;
  category: string;
  position: string;
  contract_type: string;
  base_salary: number;
  status: string;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    matricule: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    hire_date: '',
    retirement_date: '',
    phone: '',
    email: '',
    category: '',
    position: '',
    contract_type: '',
    base_salary: '',
    status: 'active'
  });

  useEffect(() => {
    loadStaff();
  }, []);

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateExperience = (hireDate: string) => {
    if (!hireDate) return null;
    const today = new Date();
    const startDate = new Date(hireDate);

    if (startDate > today) return { value: 0, unit: 'mois' };

    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (today.getDate() < startDate.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }

    if (years < 1) {
      return { value: months, unit: 'mois' };
    }

    return { value: years, unit: 'ans' };
  };

  const calculateRetirementDate = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    const birthDate = new Date(dateOfBirth);
    const retirementDate = new Date(birthDate);
    retirementDate.setFullYear(birthDate.getFullYear() + 60);
    return retirementDate.toISOString().split('T')[0];
  };

  const loadStaff = async () => {
    const { data } = await supabase.from('staff').select('*').order('category');
    if (data) setStaff(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const staffData = {
      ...formData,
      date_of_birth: formData.date_of_birth || null,
      hire_date: formData.hire_date || null,
      retirement_date: formData.retirement_date || null,
      base_salary: formData.base_salary ? Number(formData.base_salary) : null,
      email: formData.email || null,
      phone: formData.phone || null,
      category: formData.category || null,
      position: formData.position || null,
      contract_type: formData.contract_type || null
    };

    if (editingStaff) {
      const { error } = await supabase
        .from('staff')
        .update(staffData)
        .eq('id', editingStaff.id);

      if (!error) {
        setShowForm(false);
        setEditingStaff(null);
        resetForm();
        loadStaff();
      }
    } else {
      const { error } = await supabase.from('staff').insert([staffData]);

      if (!error) {
        setShowForm(false);
        resetForm();
        loadStaff();
      }
    }
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      matricule: member.matricule,
      first_name: member.first_name,
      last_name: member.last_name,
      date_of_birth: member.date_of_birth || '',
      hire_date: member.hire_date || '',
      retirement_date: member.retirement_date || '',
      phone: member.phone || '',
      email: member.email || '',
      category: member.category || '',
      position: member.position || '',
      contract_type: member.contract_type || '',
      base_salary: member.base_salary ? member.base_salary.toString() : '',
      status: member.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce membre du personnel ?')) {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (!error) {
        loadStaff();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      matricule: '',
      first_name: '',
      last_name: '',
      date_of_birth: '',
      hire_date: '',
      retirement_date: '',
      phone: '',
      email: '',
      category: '',
      position: '',
      contract_type: '',
      base_salary: '',
      status: 'active'
    });
    setEditingStaff(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  const groupedStaff = staff.reduce((acc, member) => {
    const category = member.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(member);
    return acc;
  }, {} as Record<string, StaffMember[]>);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion du Personnel</h2>
          <p className="text-gray-600">Total: {staff.length} membres</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau Membre</span>
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <UserCog className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Aucun membre du personnel enregistré</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedStaff).map(([category, members]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom Complet</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salaire (Ar)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.matricule}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mr-3">
                              <UserCog className="w-5 h-5 text-pink-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.position}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.contract_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {member.base_salary.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setViewingStaff(member)}
                              className="text-green-600 hover:text-green-800"
                              title="Voir"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(member)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
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
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingStaff ? 'Modifier le Membre du Personnel' : 'Nouveau Membre du Personnel'}
              </h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Matricule *</label>
                  <input
                    type="text"
                    value={formData.matricule}
                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: STAFF001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="on_leave">En congé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: +261 34 00 000 00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: staff@ecole.mg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de Naissance</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                  {formData.date_of_birth && (
                    <p className="text-xs text-blue-600 mt-1">Âge actuel: {calculateAge(formData.date_of_birth)} ans</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date d'Entrée</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                  {formData.hire_date && calculateExperience(formData.hire_date) && (() => {
                    const exp = calculateExperience(formData.hire_date);
                    const label = exp?.unit === 'mois' ? 'Expérience en mois' : 'Années d\'expérience';
                    return (
                      <p className="text-xs text-emerald-600 mt-1 font-medium">
                        {label}: {exp?.value.toString().padStart(2, '0')} {exp?.unit}
                      </p>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Retraite Prévue (à 60 ans)</label>
                <input
                  type="date"
                  value={formData.retirement_date || (formData.date_of_birth ? calculateRetirementDate(formData.date_of_birth) : '')}
                  onChange={(e) => setFormData({ ...formData, retirement_date: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  placeholder="Calculé automatiquement à 60 ans"
                />
                {formData.date_of_birth && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    Retraite prévue à 60 ans: {calculateRetirementDate(formData.date_of_birth)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Administration">Administration</option>
                    <option value="Comptabilité">Comptabilité</option>
                    <option value="Accueil">Accueil</option>
                    <option value="Entretien">Entretien</option>
                    <option value="Sécurité">Sécurité</option>
                    <option value="Informatique">Informatique</option>
                    <option value="Bibliothèque">Bibliothèque</option>
                    <option value="Cantine">Cantine</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Poste</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: Secrétaire"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de contrat</label>
                  <select
                    value={formData.contract_type}
                    onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Stage">Stage</option>
                    <option value="Interim">Intérim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salaire de base (Ar)</label>
                  <input
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: 800000"
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
                  {editingStaff ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-semibold flex items-center">
                <Eye className="w-6 h-6 mr-2" />
                Détails du Personnel
              </h3>
              <button onClick={() => setViewingStaff(null)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4 pb-6 border-b">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCog className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{viewingStaff.first_name} {viewingStaff.last_name}</h4>
                  <p className="text-gray-600">{viewingStaff.position}</p>
                  <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${
                    viewingStaff.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingStaff.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900 text-lg border-b pb-2">Informations Générales</h5>

                  <div>
                    <label className="text-sm text-gray-500">Matricule</label>
                    <p className="text-gray-900 font-medium">{viewingStaff.matricule}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Catégorie</label>
                    <p className="text-gray-900 font-medium">{viewingStaff.category}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Téléphone</label>
                    <p className="text-gray-900 font-medium">{viewingStaff.phone}</p>
                  </div>

                  {viewingStaff.email && (
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="text-gray-900 font-medium break-all">{viewingStaff.email}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900 text-lg border-b pb-2">Informations Professionnelles</h5>

                  <div>
                    <label className="text-sm text-gray-500">Type de Contrat</label>
                    <p className="text-gray-900 font-medium">{viewingStaff.contract_type}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Salaire de Base</label>
                    <p className="text-gray-900 font-medium text-lg text-green-600">
                      {viewingStaff.base_salary.toLocaleString('fr-FR')} Ar
                    </p>
                  </div>

                  {viewingStaff.hire_date && (
                    <div>
                      <label className="text-sm text-gray-500">Date d'Entrée</label>
                      <p className="text-gray-900 font-medium">
                        {new Date(viewingStaff.hire_date).toLocaleDateString('fr-FR')}
                      </p>
                      {(() => {
                        const exp = calculateExperience(viewingStaff.hire_date);
                        if (exp) {
                          return (
                            <p className="text-sm text-emerald-600 font-medium mt-1">
                              {exp.unit === 'mois' ? 'Expérience: ' : 'Années d\'expérience: '}
                              {exp.value.toString().padStart(2, '0')} {exp.unit}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                {viewingStaff.date_of_birth && (
                  <div>
                    <label className="text-sm text-gray-500">Date de Naissance</label>
                    <p className="text-gray-900 font-medium">
                      {new Date(viewingStaff.date_of_birth).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">Âge: {calculateAge(viewingStaff.date_of_birth)} ans</p>
                  </div>
                )}

                {viewingStaff.retirement_date && (
                  <div>
                    <label className="text-sm text-gray-500">Retraite Prévue</label>
                    <p className="text-gray-900 font-medium">
                      {new Date(viewingStaff.retirement_date).toLocaleDateString('fr-FR')}
                    </p>
                    {(() => {
                      const today = new Date();
                      const retirement = new Date(viewingStaff.retirement_date);
                      const yearsUntil = retirement.getFullYear() - today.getFullYear();
                      if (yearsUntil > 0) {
                        return <p className="text-sm text-orange-600 mt-1">Dans {yearsUntil} ans</p>;
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => setViewingStaff(null)}
                  className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
