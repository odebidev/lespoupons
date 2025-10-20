import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2, User, Eye, FileText, DollarSign, Download, Calendar, MapPin, Mail, Phone, X, Clock } from 'lucide-react';

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

interface PaymentHistory {
  id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  period: string | null;
  payer_name: string | null;
  receipt_number: string | null;
  status: string;
  classes?: {
    name: string;
    level: string;
  };
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
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
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

  const loadPaymentHistory = async (studentId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('id, amount, payment_date, payment_type, payment_method, period, payer_name, receipt_number, status, classes(name, level)')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false });

    if (data) {
      setPaymentHistory(data as PaymentHistory[]);
      setShowPaymentHistory(true);
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificat de Scolarité - ${student.first_name} ${student.last_name}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Times New Roman', Times, serif;
            background: #f5f5f5;
            padding: 20mm;
            line-height: 1.8;
          }

          .certificate {
            background: white;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 30mm 25mm;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            position: relative;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 50px;
          }

          .logo-section {
            flex: 1;
          }

          .school-name {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            font-style: italic;
            margin-bottom: 5px;
          }

          .school-address {
            font-size: 12px;
            color: #666;
            line-height: 1.4;
          }

          .school-phone {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-top: 5px;
          }

          .certificate-title-box {
            border: 2px solid #333;
            padding: 10px 30px;
            text-align: center;
            margin-left: 20px;
          }

          .certificate-title {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
            color: #333;
          }

          .content {
            margin-top: 60px;
          }

          .intro-text {
            font-size: 16px;
            margin-bottom: 40px;
            color: #333;
          }

          .field-row {
            display: flex;
            margin-bottom: 25px;
            align-items: baseline;
          }

          .field-label {
            font-size: 16px;
            color: #333;
            min-width: 200px;
            flex-shrink: 0;
          }

          .field-value {
            flex: 1;
            border-bottom: 1px dotted #333;
            padding-bottom: 2px;
            font-size: 16px;
            color: #000;
            min-height: 24px;
          }

          .school-year {
            font-size: 16px;
            margin: 40px 0;
            color: #333;
          }

          .footer-text {
            font-size: 16px;
            text-align: center;
            margin: 50px 0 60px 0;
            color: #333;
          }

          .signature-section {
            text-align: right;
            margin-top: 60px;
          }

          .signature-location {
            font-size: 16px;
            color: #333;
            margin-bottom: 80px;
          }

          .signature-title {
            font-size: 16px;
            font-weight: normal;
            color: #333;
          }

          .dotted-line {
            border-bottom: 1px dotted #999;
            display: inline-block;
            min-width: 200px;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <div class="logo-section">
              <div class="school-name">Les Poutons</div>
              <div class="school-address">
                Tanambao Morafeno - Betela<br>
                TULEAR - 601 -
              </div>
              <div class="school-phone">+261 34 20 153 10</div>
            </div>
            <div class="certificate-title-box">
              <div class="certificate-title">CERTIFICAT DE SCOLARITÉ</div>
            </div>
          </div>

          <div class="content">
            <div class="intro-text">
              Je soussigné (e) Directrice de l'école certifie que
            </div>

            <div class="field-row">
              <div class="field-label">L'élève :</div>
              <div class="field-value">${student.first_name} ${student.last_name}</div>
            </div>

            <div class="field-row">
              <div class="field-label">Fils ou fille de :</div>
              <div class="field-value">${student.parent_name || ''}</div>
            </div>

            <div class="field-row">
              <div class="field-label">Et de :</div>
              <div class="field-value"></div>
            </div>

            <div class="field-row">
              <div class="field-label">Né (e) le :</div>
              <div class="field-value">${new Date(student.date_of_birth).toLocaleDateString('fr-FR')}</div>
            </div>

            <div class="field-row">
              <div class="field-label">Est inscrit (e) en classe de :</div>
              <div class="field-value">${student.classes?.level || ''} ${student.classes?.name || ''}</div>
            </div>

            <div class="school-year">
              Durant l'année Scolaire : 2025-2026
            </div>

            <div class="footer-text">
              En foi de quoi, le présent certificat est établi pour servir et valoir ce que de droit.
            </div>

            <div class="signature-section">
              <div class="signature-location">
                Fait à Tuléar, le <span class="dotted-line">${currentDate}</span>
              </div>
              <div class="signature-title">La Directrice</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(certificateHTML);
    printWindow.document.close();
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
                      <button
                        onClick={() => selectedStudent && loadPaymentHistory(selectedStudent.id)}
                        className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm flex items-center justify-center"
                      >
                        <Clock className="w-4 h-4 mr-2" />
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

      {showPaymentHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-semibold flex items-center">
                <Clock className="w-6 h-6 mr-2" />
                Historique Complet des Paiements
              </h3>
              <button onClick={() => setShowPaymentHistory(false)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {selectedStudent && (
                <div className="mb-6 pb-6 border-b">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{selectedStudent.first_name} {selectedStudent.last_name}</h4>
                      <p className="text-gray-600">Matricule: {selectedStudent.matricule}</p>
                      <p className="text-sm text-gray-500">Classe: {selectedStudent.classes?.level} {selectedStudent.classes?.name}</p>
                    </div>
                  </div>

                  {paymentSummary && (
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total payé</p>
                        <p className="text-2xl font-bold text-blue-600">{paymentSummary.total_paid.toLocaleString('fr-FR')} Ar</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Nombre de paiements</p>
                        <p className="text-2xl font-bold text-green-600">{paymentSummary.payment_count}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Dernier paiement</p>
                        <p className="text-lg font-bold text-orange-600">
                          {paymentSummary.last_payment_date ? new Date(paymentSummary.last_payment_date).toLocaleDateString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paymentHistory.length > 0 ? (
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900 text-lg mb-4">Liste des paiements ({paymentHistory.length})</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Reçu</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payeur</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paymentHistory.map((payment, index) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                              {payment.receipt_number || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                payment.payment_type === 'tuition' ? 'bg-blue-100 text-blue-800' :
                                payment.payment_type === 'registration' ? 'bg-green-100 text-green-800' :
                                payment.payment_type === 'supplies' ? 'bg-yellow-100 text-yellow-800' :
                                payment.payment_type === 'insurance' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {payment.payment_type === 'tuition' ? 'Écolage' :
                                 payment.payment_type === 'registration' ? 'Inscription' :
                                 payment.payment_type === 'supplies' ? 'Fournitures' :
                                 payment.payment_type === 'insurance' ? 'Assurance' :
                                 'Autre'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              {payment.period || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                              {payment.payment_method === 'cash' ? 'Espèces' :
                               payment.payment_method === 'bank_transfer' ? 'Virement' :
                               payment.payment_method === 'mobile_money' ? 'Mobile Money' :
                               payment.payment_method === 'check' ? 'Chèque' :
                               payment.payment_method}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              {payment.payer_name || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {Number(payment.amount).toLocaleString('fr-FR')} Ar
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {payment.status === 'completed' ? 'Validé' : payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colspan="6" className="px-4 py-3 text-right font-semibold text-gray-900">TOTAL:</td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">
                            {paymentHistory.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString('fr-FR')} Ar
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Aucun paiement enregistré</p>
                  <p className="text-gray-400 text-sm mt-2">L'historique des paiements apparaîtra ici</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t flex justify-end">
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition font-semibold"
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
