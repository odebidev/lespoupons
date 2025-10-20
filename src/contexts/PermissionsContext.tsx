import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: 'pdg' | 'directrice' | 'secretaire';
  status: 'active' | 'inactive';
}

interface PermissionsContextType {
  currentUser: AppUser | null;
  loading: boolean;
  canCreate: (module?: string) => boolean;
  canUpdate: (module?: string, field?: string) => boolean;
  canDelete: (module?: string) => boolean;
  canView: (module?: string) => boolean;
  isPDG: boolean;
  isDirectrice: boolean;
  isSecretaire: boolean;
  logActivity: (action: string, module: string, recordId?: string | null, details?: any) => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        loadCurrentUser();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { data: appUser } = await supabase
          .from('app_users')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .eq('status', 'active')
          .single();

        if (appUser) {
          setCurrentUser(appUser);

          await supabase
            .from('app_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', appUser.id);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (
    action: string,
    module: string,
    recordId: string | null = null,
    details: any = null
  ) => {
    if (!currentUser) return;

    try {
      await supabase.from('user_activity_log').insert([{
        user_id: currentUser.id,
        action,
        module,
        record_id: recordId,
        details
      }]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const canCreate = (module?: string): boolean => {
    if (!currentUser || currentUser.status !== 'active') return false;

    return true;
  };

  const canUpdate = (module?: string, field?: string): boolean => {
    if (!currentUser || currentUser.status !== 'active') return false;

    if (currentUser.role === 'pdg') return true;

    if (currentUser.role === 'directrice') {
      if (module === 'fees' && field === 'amount') {
        return false;
      }
      return true;
    }

    return false;
  };

  const canDelete = (module?: string): boolean => {
    if (!currentUser || currentUser.status !== 'active') return false;

    if (currentUser.role === 'pdg') return true;

    if (currentUser.role === 'directrice' && module === 'fees') {
      return false;
    }

    return false;
  };

  const canView = (module?: string): boolean => {
    if (!currentUser || currentUser.status !== 'active') return false;
    return true;
  };

  const value: PermissionsContextType = {
    currentUser,
    loading,
    canCreate,
    canUpdate,
    canDelete,
    canView,
    isPDG: currentUser?.role === 'pdg',
    isDirectrice: currentUser?.role === 'directrice',
    isSecretaire: currentUser?.role === 'secretaire',
    logActivity
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
