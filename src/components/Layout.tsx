import { ReactNode, useState } from 'react';
import {
  GraduationCap,
  Users,
  BookOpen,
  School,
  DollarSign,
  UserCog,
  Calculator,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  TrendingUp,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['pdg', 'directrice', 'secretaire'] },
  { id: 'students', label: 'Élèves', icon: GraduationCap, roles: ['pdg', 'directrice', 'secretaire'] },
  { id: 'teachers', label: 'Enseignants', icon: Users, roles: ['pdg', 'directrice', 'secretaire'] },
  { id: 'classes', label: 'Classes', icon: School, roles: ['pdg', 'directrice', 'secretaire'] },
  { id: 'subjects', label: 'Matières', icon: BookOpen, roles: ['pdg', 'directrice', 'secretaire'] },
  { id: 'fees', label: 'Écolage', icon: DollarSign, roles: ['pdg', 'directrice', 'secretaire'] },
  { id: 'staff', label: 'Personnel', icon: UserCog, roles: ['pdg', 'directrice'] },
  { id: 'payroll', label: 'Paie & IRSA', icon: Calculator, roles: ['pdg', 'directrice'] },
  { id: 'cashflow', label: 'Trésorerie', icon: TrendingUp, roles: ['pdg', 'directrice'] },
  { id: 'users', label: 'Utilisateurs', icon: Shield, roles: ['pdg', 'directrice'] },
];

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { currentUser, isPDG, isDirectrice, isSecretaire } = usePermissions();

  const filteredMenuItems = menuItems.filter(item => {
    if (!currentUser) return false;
    return item.roles.includes(currentUser.role);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
        `}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 text-sm">SGS Madagascar</h1>
                  <p className="text-xs text-gray-500">2025-2026</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t">
              <div className="mb-3 px-4 py-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Connecté en tant que</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentUser?.full_name || user?.email}
                </p>
                {currentUser && (
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      isPDG ? 'bg-purple-100 text-purple-800' :
                      isDirectrice ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {isPDG ? '👑 PDG' : isDirectrice ? '🎯 Directrice' : '📝 Secrétaire'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b px-4 py-4 lg:px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 hidden lg:block">
                {filteredMenuItems.find(item => item.id === currentPage)?.label || 'Tableau de bord'}
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Année Scolaire 2025-2026
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
