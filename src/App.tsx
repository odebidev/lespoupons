import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Subjects from './pages/Subjects';
import Fees from './pages/Fees';
import Staff from './pages/Staff';
import Payroll from './pages/Payroll';
import Cashflow from './pages/Cashflow';
import Users from './pages/Users';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'students':
        return <Students />;
      case 'teachers':
        return <Teachers />;
      case 'classes':
        return <Classes />;
      case 'subjects':
        return <Subjects />;
      case 'fees':
        return <Fees />;
      case 'staff':
        return <Staff />;
      case 'payroll':
        return <Payroll />;
      case 'cashflow':
        return <Cashflow />;
      case 'users':
        return <Users />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <AppContent />
      </PermissionsProvider>
    </AuthProvider>
  );
}
