import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import type { Role, User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span
          style={{
            width: 28,
            height: 28,
            border: '3px solid var(--border)',
            borderTopColor: '#4f46e5',
            borderRadius: 99,
            animation: 'af-spin .7s linear infinite',
          }}
        />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (user && !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

/** Role capability helpers mirroring the backend role matrix. */
export function useCan() {
  const { user } = useAuth();
  const role = user?.role ?? 'EMPLOYEE';
  return {
    role,
    isAdmin: role === 'ADMIN',
    manageAssets: role === 'ADMIN' || role === 'ASSET_MANAGER',
    approve: role === 'ADMIN' || role === 'ASSET_MANAGER',
    approveDept: role === 'ADMIN' || role === 'ASSET_MANAGER' || role === 'DEPT_HEAD',
    viewReports: role !== 'EMPLOYEE',
  };
}
