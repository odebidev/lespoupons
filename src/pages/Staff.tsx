import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, UserCog } from 'lucide-react';

interface StaffMember {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  phone: string;
  category: string;
  position: string;
  contract_type: string;
  base_salary: number;
  status: string;
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    const { data } = await supabase.from('staff').select('*').order('category');
    if (data) setStaff(data);
    setLoading(false);
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
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-5 h-5" />
          <span>Nouveau Membre</span>
        </button>
      </div>

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
