import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, User, Edit2, Trash2, X, Eye } from 'lucide-react';

interface Teacher {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  hire_date: string | null;
  retirement_date: string | null;
  phone: string;
  email: string | null;
  qualification: string;
  employment_type: string;
  base_salary: number;
  status: string;
  main_subject_id: string | null;
}

interface Class {
  id: string;
  name: string;
  level: string;
  main_teacher_id: string | null;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  subject_group: string | null;
}

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    matricule: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    hire_date: '',
    retirement_date: '',
    phone: '',
    email: '',
    qualification: '',
    employment_type: 'full_time',
    base_salary: '',
    status: 'active',
    main_subject_id: ''
  });

  useEffect(() => {
    loadTeachers();
    loadClasses();
    loadSubjects();
  }, []);

  const loadTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select(`
        *,
        main_subject:subjects(id, code, name)
      `)
      .order('created_at', { ascending: false });
    if (data) setTeachers(data);
    setLoading(false);
  };

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('id, name, level, main_teacher_id').order('level', { ascending: true });
    if (data) setClasses(data);
  };

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, code, name, subject_group').order('name', { ascending: true });
    if (data) setSubjects(data);
  };

  const loadTeacherClasses = async (teacherId: string) => {
    const { data } = await supabase.from('classes').select('id').eq('main_teacher_id', teacherId);
    if (data) {
      setTeacherClasses(data.map(c => c.id));
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const teacherData = {
      ...formData,
      date_of_birth: formData.date_of_birth || null,
      hire_date: formData.hire_date || null,
      retirement_date: formData.retirement_date || null,
      base_salary: formData.base_salary ? Number(formData.base_salary) : null,
      email: formData.email || null,
      phone: formData.phone || null,
      qualification: formData.qualification || null,
      main_subject_id: formData.main_subject_id || null
    };

    if (editingTeacher) {
      const { error } = await supabase
        .from('teachers')
        .update(teacherData)
        .eq('id', editingTeacher.id);

      if (!error) {
        await supabase.from('classes').update({ main_teacher_id: null }).eq('main_teacher_id', editingTeacher.id);

        for (const classId of teacherClasses) {
          await supabase.from('classes').update({ main_teacher_id: editingTeacher.id }).eq('id', classId);
        }

        setShowForm(false);
        setEditingTeacher(null);
        resetForm();
        loadTeachers();
        loadClasses();
      }
    } else {
      const { data: newTeacher, error } = await supabase.from('teachers').insert([teacherData]).select().single();

      if (!error && newTeacher) {
        for (const classId of teacherClasses) {
          await supabase.from('classes').update({ main_teacher_id: newTeacher.id }).eq('id', classId);
        }

        setShowForm(false);
        resetForm();
        loadTeachers();
        loadClasses();
      }
    }
  };

  const handleEdit = async (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      matricule: teacher.matricule,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      date_of_birth: teacher.date_of_birth || '',
      hire_date: teacher.hire_date || '',
      retirement_date: teacher.retirement_date || '',
      phone: teacher.phone || '',
      email: teacher.email || '',
      qualification: teacher.qualification || '',
      employment_type: teacher.employment_type,
      base_salary: teacher.base_salary ? teacher.base_salary.toString() : '',
      status: teacher.status,
      main_subject_id: teacher.main_subject_id || ''
    });
    await loadTeacherClasses(teacher.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet enseignant ?')) {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (!error) {
        loadTeachers();
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
      qualification: '',
      employment_type: 'full_time',
      base_salary: '',
      status: 'active',
      main_subject_id: ''
    });
    setTeacherClasses([]);
    setEditingTeacher(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  const filteredTeachers = teachers.filter(t =>
    t.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Enseignants</h2>
          <p className="text-gray-600">Total: {teachers.length} enseignants</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvel Enseignant</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un enseignant..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matière Principale</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salaire (Ar)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Aucun enseignant trouvé</p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.matricule}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{teacher.first_name} {teacher.last_name}</div>
                          <div className="text-xs text-gray-500">{teacher.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {teacher.main_subject ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {teacher.main_subject.code} - {teacher.main_subject.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Non définie</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{teacher.employment_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {teacher.base_salary.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        teacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {teacher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewingTeacher(teacher)}
                          className="text-green-600 hover:text-green-800"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
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
              <h3 className="text-xl font-semibold text-gray-900">
                {editingTeacher ? 'Modifier l\'Enseignant' : 'Nouvel Enseignant'}
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
                    placeholder="ex: ENS001"
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
                    placeholder="ex: enseignant@ecole.mg"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: Licence en Mathématiques"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Matière principale</label>
                  <select
                    value={formData.main_subject_id}
                    onChange={(e) => setFormData({ ...formData, main_subject_id: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Aucune matière sélectionnée</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'emploi</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="full_time">Temps plein</option>
                    <option value="part_time">Temps partiel</option>
                    <option value="contract">Contractuel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salaire de base (Ar)</label>
                  <input
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="ex: 1500000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classes assignées</label>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-48 overflow-y-auto">
                  {classes.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucune classe disponible</p>
                  ) : (
                    <div className="space-y-2">
                      {classes.map(cls => (
                        <label key={cls.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={teacherClasses.includes(cls.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeacherClasses([...teacherClasses, cls.id]);
                              } else {
                                setTeacherClasses(teacherClasses.filter(id => id !== cls.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900">
                            {cls.level} {cls.name}
                            {cls.main_teacher_id && cls.main_teacher_id !== editingTeacher?.id && (
                              <span className="text-xs text-orange-600 ml-2">(Déjà assignée)</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {teacherClasses.length === 0
                    ? 'Aucune classe sélectionnée'
                    : `${teacherClasses.length} classe${teacherClasses.length > 1 ? 's' : ''} sélectionnée${teacherClasses.length > 1 ? 's' : ''}`
                  }
                </p>
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
                  {editingTeacher ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-xl font-semibold flex items-center">
                <Eye className="w-6 h-6 mr-2" />
                Détails de l'Enseignant
              </h3>
              <button onClick={() => setViewingTeacher(null)} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4 pb-6 border-b">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{viewingTeacher.first_name} {viewingTeacher.last_name}</h4>
                  <p className="text-gray-600">{viewingTeacher.qualification}</p>
                  <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${
                    viewingTeacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingTeacher.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900 text-lg border-b pb-2">Informations Générales</h5>

                  <div>
                    <label className="text-sm text-gray-500">Matricule</label>
                    <p className="text-gray-900 font-medium">{viewingTeacher.matricule}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Type d'Emploi</label>
                    <p className="text-gray-900 font-medium">{viewingTeacher.employment_type}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Téléphone</label>
                    <p className="text-gray-900 font-medium">{viewingTeacher.phone}</p>
                  </div>

                  {viewingTeacher.email && (
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="text-gray-900 font-medium break-all">{viewingTeacher.email}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900 text-lg border-b pb-2">Informations Professionnelles</h5>

                  <div>
                    <label className="text-sm text-gray-500">Qualification</label>
                    <p className="text-gray-900 font-medium">{viewingTeacher.qualification}</p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Matière Principale</label>
                    <p className="text-gray-900 font-medium">
                      {viewingTeacher.main_subject ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {viewingTeacher.main_subject.code} - {viewingTeacher.main_subject.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">Non définie</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Salaire de Base</label>
                    <p className="text-gray-900 font-medium text-lg text-blue-600">
                      {viewingTeacher.base_salary.toLocaleString('fr-FR')} Ar
                    </p>
                  </div>

                  {viewingTeacher.hire_date && (
                    <div>
                      <label className="text-sm text-gray-500">Date d'Entrée</label>
                      <p className="text-gray-900 font-medium">
                        {new Date(viewingTeacher.hire_date).toLocaleDateString('fr-FR')}
                      </p>
                      {(() => {
                        const exp = calculateExperience(viewingTeacher.hire_date);
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

                  {viewingTeacher.retirement_date && (
                    <div>
                      <label className="text-sm text-gray-500">Retraite Prévue (60 ans)</label>
                      <p className="text-gray-900 font-medium">
                        {new Date(viewingTeacher.retirement_date).toLocaleDateString('fr-FR')}
                      </p>
                      {(() => {
                        const today = new Date();
                        const retirement = new Date(viewingTeacher.retirement_date);
                        const yearsUntil = retirement.getFullYear() - today.getFullYear();
                        if (yearsUntil > 0) {
                          return <p className="text-sm text-orange-600 mt-1">Dans {yearsUntil} ans</p>;
                        } else if (yearsUntil === 0) {
                          return <p className="text-sm text-orange-600 mt-1">Cette année</p>;
                        } else {
                          return <p className="text-sm text-gray-600 mt-1">Retraité</p>;
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                {viewingTeacher.date_of_birth && (
                  <div>
                    <label className="text-sm text-gray-500">Date de Naissance</label>
                    <p className="text-gray-900 font-medium">
                      {new Date(viewingTeacher.date_of_birth).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">Âge: {calculateAge(viewingTeacher.date_of_birth)} ans</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => setViewingTeacher(null)}
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
