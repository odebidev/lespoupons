import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, School } from 'lucide-react';

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

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('level');
    if (data) setClasses(data);
    setLoading(false);
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
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5" />
          <span>Nouvelle Classe</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition">
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

            <div className="space-y-2">
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
                    style={{ width: `${(cls.current_enrollment / cls.capacity) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
