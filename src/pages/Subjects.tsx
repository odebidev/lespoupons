import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, BookOpen } from 'lucide-react';

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

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('subject_group');
    if (data) setSubjects(data);
    setLoading(false);
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
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5" />
          <span>Nouvelle Matière</span>
        </button>
      </div>

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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
