import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, BookOpen, Edit2, Trash2, X } from 'lucide-react';

interface Subject {
  id: string;
  code: string;
  name: string;
  subject_group: string;
  coefficient: number;
  weekly_hours: number;
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    subject_group: '',
    coefficient: '',
    weekly_hours: ''
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('subject_group');
    if (data) setSubjects(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const subjectData = {
      code: formData.code,
      name: formData.name,
      subject_group: formData.subject_group,
      coefficient: Number(formData.coefficient),
      weekly_hours: Number(formData.weekly_hours)
    };

    if (editingSubject) {
      const { error } = await supabase
        .from('subjects')
        .update(subjectData)
        .eq('id', editingSubject.id);

      if (!error) {
        setShowForm(false);
        setEditingSubject(null);
        resetForm();
        loadSubjects();
      }
    } else {
      const { error } = await supabase.from('subjects').insert([subjectData]);

      if (!error) {
        setShowForm(false);
        resetForm();
        loadSubjects();
      }
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      subject_group: subject.subject_group,
      coefficient: subject.coefficient.toString(),
      weekly_hours: subject.weekly_hours.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette matière ?')) {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (!error) {
        loadSubjects();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      subject_group: '',
      coefficient: '',
      weekly_hours: ''
    });
    setEditingSubject(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  const groupedSubjects = subjects.reduce((acc, subject) => {
    const group = subject.subject_group || 'Autre';
    if (!acc[group]) acc[group] = [];
    acc[group].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Matières</h2>
          <p className="text-gray-600">Total: {subjects.length} matières</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle Matière</span>
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Aucune matière enregistrée</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSubjects).map(([group, groupSubjects]) => (
            <div key={group} className="bg-white rounded-xl shadow-sm border">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">{group}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matière</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coefficient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures/Semaine</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groupSubjects.map(subject => (
                      <tr key={subject.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center mr-3">
                              <BookOpen className="w-5 h-5 text-cyan-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{subject.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{subject.coefficient}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subject.weekly_hours}h</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(subject)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(subject.id)}
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingSubject ? 'Modifier la Matière' : 'Nouvelle Matière'}
              </h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: MATH01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Groupe *</label>
                  <select
                    value={formData.subject_group}
                    onChange={(e) => setFormData({ ...formData, subject_group: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">Sélectionner</option>
                    <option value="Sciences">Sciences</option>
                    <option value="Lettres">Lettres</option>
                    <option value="Langues">Langues</option>
                    <option value="Arts">Arts</option>
                    <option value="Sport">Sport</option>
                    <option value="Technique">Technique</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la matière *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  placeholder="ex: Mathématiques"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coefficient *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.coefficient}
                    onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: 3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heures/Semaine *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.weekly_hours}
                    onChange={(e) => setFormData({ ...formData, weekly_hours: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: 4"
                    required
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
                  {editingSubject ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
