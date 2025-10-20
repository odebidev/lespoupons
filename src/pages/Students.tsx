import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2, User, Eye, FileText, DollarSign, Download, Calendar, MapPin, Mail, Phone } from 'lucide-react';

interface Student {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  class_id: string | null;
  enrollment_date: string;
  classes?: {
    name: string;
    level: string;
  };
}

interface Class {
  id: string;
  name: string;
}

interface PaymentSummary {
  total_paid: number;
  payment_count: number;
  last_payment_date: string | null;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    matricule: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'M' as 'M' | 'F',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    phone: '',
    email: '',
    class_id: '',
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [studentsRes, classesRes] = await Promise.all([
      supabase.from('students').select('*, classes(name, level)').order('created_at', { ascending: false }),
      supabase.from('classes').select('id, name')
    ]);

    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  };

  const loadPaymentSummary = async (studentId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('student_id', studentId)
      .eq('status', 'completed');

    if (data) {
      const total = data.reduce((sum, p) => sum + Number(p.amount), 0);
      const lastPayment = data.length > 0 ? data[data.length - 1].payment_date : null;
      setPaymentSummary({
        total_paid: total,
        payment_count: data.length,
        last_payment_date: lastPayment
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('students').insert([formData]);
    if (!error) {
      setShowForm(false);
      setFormData({
        matricule: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'M',
        parent_name: '',
        parent_phone: '',
        parent_email: '',
        address: '',
        phone: '',
        email: '',
        class_id: '',
        status: 'active'
      });
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
      await supabase.from('students').delete().eq('id', id);
      loadData();
    }
  };

  const handleViewDetail = async (student: Student) => {
    setSelectedStudent(student);
    await loadPaymentSummary(student.id);
    setShowDetail(true);
  };

  const generateCertificate = (student: Student) => {
    const certificateContent = `
      CERTIFICAT DE SCOLARITÉ
      Année Scolaire 2025-2026

      Je soussigné(e), Directeur/Directrice de l'établissement, certifie que :

      Nom et Prénom : ${student.first_name} ${student.last_name}
      Matricule : ${student.matricule}
      Date de naissance : ${new Date(student.date_of_birth).toLocaleDateString('fr-FR')}
      Classe : ${student.classes?.name || 'Non assigné'}

      est régulièrement inscrit(e) dans notre établissement pour l'année scolaire 2025-2026.

      Certificat délivré le ${new Date().toLocaleDateString('fr-FR')} pour servir et valoir ce que de droit.

      La Direction
    `;

    const blob = new Blob([certificateContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificat_Scolarite_${student.matricule}_${student.first_name}_${student.last_name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getPaymentStatus = (totalPaid: number) => {
    if (totalPaid === 0) {
      return { label: 'Impayé', color: 'bg-red-100 text-red-800' };
    } else if (totalPaid < 1000000) {
      return { label: 'Partiellement payé', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Payé', color: 'bg-green-100 text-green-800' };
    }
  };

  const filteredStudents = students.filter(s =>
    s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Élèves</h2>
          <p className="text-gray-600">Total: {students.length} élèves - Année Scolaire 2025-2026</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvel Élève</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold mb-4">Ajouter un élève</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Matricule *"
              value={formData.matricule}
              onChange={e => setFormData({...formData, matricule: e.target.value})}
              className="border rounded-lg px-4 py-2"
              required
            />
            <input
              type="text"
              placeholder="Prénom *"
              value={formData.first_name}
              onChange={e => setFormData({...formData, first_name: e.target.value})}
              className="border rounded-lg px-4 py-2"
              required
            />
            <input
              type="text"
              placeholder="Nom *"
              value={formData.last_name}
              onChange={e => setFormData({...formData, last_name: e.target.value})}
              className="border rounded-lg px-4 py-2"
              required
            />
            <input
              type="date"
              placeholder="Date de naissance *"
              value={formData.date_of_birth}
              onChange={e => setFormData({...formData, date_of_birth: e.target.value})}
              className="border rounded-lg px-4 py-2"
              required
            />
            <select
              value={formData.gender}
              onChange={e => setFormData({...formData, gender: e.target.value as 'M' | 'F'})}
              className="border rounded-lg px-4 py-2"
            >
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
            <select
              value={formData.class_id}
              onChange={e => setFormData({...formData, class_id: e.target.value})}
              className="border rounded-lg px-4 py-2"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="Téléphone élève"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="email"
              placeholder="Email élève"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="text"
              placeholder="Nom du parent/tuteur *"
              value={formData.parent_name}
              onChange={e => setFormData({...formData, parent_name: e.target.value})}
              className="border rounded-lg px-4 py-2"
              required
            />
            <input
              type="tel"
              placeholder="Téléphone parent *"
              value={formData.parent_phone}
              onChange={e => setFormData({...formData, parent_phone: e.target.value})}
              className="border rounded-lg px-4 py-2"
              required
            />
            <input
              type="email"
              placeholder="Email parent"
              value={formData.parent_email}
              onChange={e => setFormData({...formData, parent_email: e.target.value})}
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="text"
              placeholder="Adresse complète"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="border rounded-lg px-4 py-2 md:col-span-2"
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
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom Complet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Genre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.matricule}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.first_name} {student.last_name}</div>
                        <div className="text-xs text-gray-500">{calculateAge(student.date_of_birth)} ans</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.gender === 'M' ? 'M' : 'F'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.classes?.name || 'Non assigné'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.parent_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.parent_phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetail(student)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800" title="Modifier">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-800" title="Supprimer">
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

      {showDetail && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Fiche Élève Complète</h3>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start space-x-6">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900">{selectedStudent.first_name} {selectedStudent.last_name}</h4>
                  <p className="text-gray-600">Matricule: {selectedStudent.matricule}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      selectedStudent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedStudent.status}
                    </span>
                    <span className="text-sm text-gray-600">
                      {selectedStudent.classes?.name || 'Aucune classe assignée'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => generateCertificate(selectedStudent)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>Certificat</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Informations Personnelles
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de naissance</span>
                      <span className="font-medium">{new Date(selectedStudent.date_of_birth).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Âge</span>
                      <span className="font-medium">{calculateAge(selectedStudent.date_of_birth)} ans</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Genre</span>
                      <span className="font-medium">{selectedStudent.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date d'inscription</span>
                      <span className="font-medium">{new Date(selectedStudent.enrollment_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Coordonnées
                  </h5>
                  <div className="space-y-2 text-sm">
                    {selectedStudent.address && (
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                        <span className="text-gray-600">{selectedStudent.address}</span>
                      </div>
                    )}
                    {selectedStudent.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{selectedStudent.phone}</span>
                      </div>
                    )}
                    {selectedStudent.email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{selectedStudent.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Informations Parent/Tuteur
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nom complet</span>
                      <span className="font-medium">{selectedStudent.parent_name}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{selectedStudent.parent_phone}</span>
                    </div>
                    {selectedStudent.parent_email && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{selectedStudent.parent_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Suivi de l'Écolage
                  </h5>
                  {paymentSummary ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Montant total payé</span>
                        <span className="text-lg font-bold text-gray-900">
                          {paymentSummary.total_paid.toLocaleString('fr-FR')} Ar
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Nombre de paiements</span>
                        <span className="font-medium">{paymentSummary.payment_count}</span>
                      </div>
                      {paymentSummary.last_payment_date && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Dernier paiement</span>
                          <span className="font-medium">{new Date(paymentSummary.last_payment_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-blue-200">
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                          getPaymentStatus(paymentSummary.total_paid).color
                        }`}>
                          {getPaymentStatus(paymentSummary.total_paid).label}
                        </span>
                      </div>
                      <button className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                        Voir l'historique complet
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Chargement...</p>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Informations Académiques
                </h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Année scolaire</span>
                    <p className="font-medium text-gray-900">2025-2026</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Classe actuelle</span>
                    <p className="font-medium text-gray-900">{selectedStudent.classes?.name || 'Non assigné'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Niveau</span>
                    <p className="font-medium text-gray-900">{selectedStudent.classes?.level || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Statut de scolarisation</span>
                    <p className="font-medium text-green-700">Régulièrement inscrit</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
