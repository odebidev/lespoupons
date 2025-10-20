import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, User, Edit2, Trash2, X, Shield, Clock, Activity } from 'lucide-react';

interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: 'pdg' | 'directrice' | 'secretaire';
  phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  last_login: string | null;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  module: string;
  record_id: string | null;
  details: any;
  created_at: string;
  user?: AppUser;
}

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'secretaire' as 'pdg' | 'directrice' | 'secretaire',
    phone: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    loadUsers();
    loadCurrentUserRole();
  }, []);

  const loadCurrentUserRole = async () => {
    const { data } = await supabase.rpc('get_current_user_role');
    setCurrentUserRole(data);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setUsers(data);
    setLoading(false);
  };

  const loadActivityLogs = async () => {
    const { data } = await supabase
      .from('user_activity_log')
      .select(`
        *,
        user:app_users(full_name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) setActivityLogs(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      const { error } = await supabase
        .from('app_users')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone || null,
          status: formData.status
        })
        .eq('id', editingUser.id);

      if (!error) {
        await logActivity('UPDATE', 'users', editingUser.id, {
          updated_fields: formData
        });

        setShowForm(false);
        setEditingUser(null);
        resetForm();
        loadUsers();
      }
    } else {
      const { data: newUser, error } = await supabase
        .from('app_users')
        .insert([{
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone || null,
          status: formData.status
        }])
        .select()
        .single();

      if (!error && newUser) {
        await logActivity('CREATE', 'users', newUser.id, {
          new_user: formData
        });

        setShowForm(false);
        resetForm();
        loadUsers();
      }
    }
  };

  const handleEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      status: user.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', id);

      if (!error) {
        await logActivity('DELETE', 'users', id);
        loadUsers();
      }
    }
  };

  const logActivity = async (
    action: string,
    module: string,
    recordId: string | null = null,
    details: any = null
  ) => {
    const { data: currentUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (currentUser) {
      await supabase
        .from('user_activity_log')
        .insert([{
          user_id: currentUser.id,
          action,
          module,
          record_id: recordId,
          details
        }]);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: 'secretaire',
      phone: '',
      status: 'active'
    });
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      pdg: { color: 'bg-purple-100 text-purple-800', label: 'PDG', icon: '👑' },
      directrice: { color: 'bg-blue-100 text-blue-800', label: 'Directrice', icon: '🎯' },
      secretaire: { color: 'bg-green-100 text-green-800', label: 'Secrétaire', icon: '📝' }
    };
    const badge = badges[role as keyof typeof badges];
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        <span>{badge.icon}</span>
        <span>{badge.label}</span>
      </span>
    );
  };

  const getRolePermissions = (role: string) => {
    const permissions = {
      pdg: {
        title: 'Accès Complet',
        description: 'Toutes les permissions sur tous les modules',
        permissions: ['Créer', 'Modifier', 'Supprimer', 'Consulter']
      },
      directrice: {
        title: 'Accès Étendu',
        description: 'Créer et modifier (sauf montants écolage)',
        permissions: ['Créer', 'Modifier*', 'Consulter']
      },
      secretaire: {
        title: 'Accès Limité',
        description: 'Enregistrement et consultation uniquement',
        permissions: ['Créer', 'Consulter']
      }
    };
    return permissions[role as keyof typeof permissions];
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
          <p className="text-gray-600">Gérer les accès et permissions du système</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              loadActivityLogs();
              setShowActivityLog(true);
            }}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            <Activity className="w-5 h-5" />
            <span>Journal d'Activité</span>
          </button>
          {currentUserRole === 'pdg' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Nouvel Utilisateur</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">PDG</p>
              <p className="text-3xl font-bold text-purple-900">
                {users.filter(u => u.role === 'pdg' && u.status === 'active').length}
              </p>
            </div>
            <div className="text-4xl">👑</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Directrices</p>
              <p className="text-3xl font-bold text-blue-900">
                {users.filter(u => u.role === 'directrice' && u.status === 'active').length}
              </p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Secrétaires</p>
              <p className="text-3xl font-bold text-green-900">
                {users.filter(u => u.role === 'secretaire' && u.status === 'active').length}
              </p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Liste des Utilisateurs</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernière Connexion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                {currentUserRole === 'pdg' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const rolePerms = getRolePermissions(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <Shield className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600">
                          <div className="font-medium text-gray-900">{rolePerms.title}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rolePerms.permissions.map(perm => (
                              <span key={perm} className="bg-gray-100 px-2 py-0.5 rounded">
                                {perm}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login ? (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(user.last_login).toLocaleDateString('fr-FR')}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Jamais connecté</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      {currentUserRole === 'pdg' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user.role !== 'pdg' && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-amber-600" />
          Hiérarchie des Rôles et Permissions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['pdg', 'directrice', 'secretaire'].map(role => {
            const rolePerms = getRolePermissions(role);
            return (
              <div key={role} className="bg-white rounded-lg p-4 border">
                <div className="mb-3">{getRoleBadge(role)}</div>
                <h4 className="font-semibold text-gray-900 mb-1">{rolePerms.title}</h4>
                <p className="text-xs text-gray-600 mb-3">{rolePerms.description}</p>
                <div className="space-y-1">
                  {rolePerms.permissions.map(perm => (
                    <div key={perm} className="flex items-center text-xs text-gray-700">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {perm}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ⚠️ Règles importantes :
          </p>
          <ul className="mt-2 space-y-1 text-xs text-red-700">
            <li>• PDG : Accès complet sans restriction</li>
            <li>• Directrice : Ne peut pas modifier/supprimer les montants d'écolage existants</li>
            <li>• Secrétaire : Ne peut pas modifier ni supprimer de données</li>
            <li>• Toutes les actions sont tracées dans le journal d'activité</li>
          </ul>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingUser ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    disabled={!!editingUser}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôle *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  >
                    <option value="secretaire">Secrétaire</option>
                    <option value="directrice">Directrice</option>
                    <option value="pdg">PDG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="+261 XX XX XXX XX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {editingUser ? 'Mettre à jour' : 'Créer Utilisateur'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showActivityLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Activity className="w-6 h-6 mr-2 text-blue-600" />
                Journal d'Activité
              </h3>
              <button
                onClick={() => setShowActivityLog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {activityLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Aucune activité enregistrée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map(log => (
                    <div key={log.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                              log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.action}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{log.module}</span>
                          </div>
                          {log.user && (
                            <p className="text-sm text-gray-600">
                              Par {log.user.full_name} ({getRoleBadge(log.user.role)})
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
