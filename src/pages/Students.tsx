import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit2, Trash2, User } from 'lucide-react';

interface Student {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  status: string;
  class_id: string | null;
}

interface Class {
  id: string;
  name: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
    class_id: '',
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [studentsRes, classesRes] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('classes').select('id, name')
    ]);

    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
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
          <p className="text-gray-600">Total: {students.length} élèves</p>
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
              type="text"
              placeholder="Nom du parent *"
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
              placeholder="Adresse"
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
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.gender === 'M' ? 'M' : 'F'}</td>
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
                      <button className="text-blue-600 hover:text-blue-800">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-800">
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
