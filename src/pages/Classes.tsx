import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, School, Edit2, Trash2, X, Users } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  level: string;
  section: string;
  capacity: number;
  current_enrollment: number;
  room_number: string | null;
}

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    section: '',
    capacity: '',
    room_number: ''
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('level');
    if (data) setClasses(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const classData = {
      name: formData.name,
      level: formData.level,
      section: formData.section,
      capacity: Number(formData.capacity),
      room_number: formData.room_number || null
    };

    if (editingClass) {
      const { error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', editingClass.id);

      if (!error) {
        setShowForm(false);
        setEditingClass(null);
        resetForm();
        loadClasses();
      }
    } else {
      const { error } = await supabase.from('classes').insert([{
        ...classData,
        current_enrollment: 0
      }]);

      if (!error) {
        setShowForm(false);
        resetForm();
        loadClasses();
      }
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      level: cls.level,
      section: cls.section,
      capacity: cls.capacity.toString(),
      room_number: cls.room_number || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (!error) {
        loadClasses();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      level: '',
      section: '',
      capacity: '',
      room_number: ''
    });
    setEditingClass(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Classes</h2>
          <p className="text-gray-600">Total: {classes.length} classes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle Classe</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border p-12 text-center">
            <School className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Aucune classe enregistrée</p>
          </div>
        ) : (
          classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <School className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500">{cls.level} {cls.section}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Effectif</span>
                    <span className="font-medium">{cls.current_enrollment}/{cls.capacity}</span>
                  </div>
                  {cls.room_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Salle</span>
                      <span className="font-medium">{cls.room_number}</span>
                    </div>
                  )}
                  <div className="pt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full transition-all"
                        style={{ width: `${cls.capacity > 0 ? (cls.current_enrollment / cls.capacity) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t px-6 py-3 bg-gray-50 rounded-b-xl flex justify-end space-x-2">
                <button
                  onClick={() => handleEdit(cls)}
                  className="text-blue-600 hover:text-blue-800 p-2"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cls.id)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingClass ? 'Modifier la Classe' : 'Nouvelle Classe'}
              </h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la classe *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  placeholder="ex: Terminale D"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Niveau *</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">Sélectionner</option>
                    <option value="Maternelle">Maternelle</option>
                    <option value="CP">CP</option>
                    <option value="CE">CE</option>
                    <option value="CM1">CM1</option>
                    <option value="CM2">CM2</option>
                    <option value="6ème">6ème</option>
                    <option value="5ème">5ème</option>
                    <option value="4ème">4ème</option>
                    <option value="3ème">3ème</option>
                    <option value="Seconde">Seconde</option>
                    <option value="Première">Première</option>
                    <option value="Terminale">Terminale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: A, B, C, D"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capacité *</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: 40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de salle</label>
                  <input
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: Salle 101"
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
                  {editingClass ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
