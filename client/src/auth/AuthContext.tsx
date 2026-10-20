import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    role: 'TENANT_ADMIN' | 'TEAM_MEMBER';
  };
  workspace: {
    id: string;
    name: string;
    status: string;
    plan: string;
    trialEndsAt: string | null;
  };
}

interface AuthContextValue {
  user: AuthSession | null;
  loading: boolean;
  error: string | null;
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await apiClient.get<{ data: AuthSession }>('/auth/me');
        setUser(response.data.data);
      } catch (requestError) {
        if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
          setUser(null);
        } else {
          setError('We could not check your session.');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadSession();
  }, []);

  const setSession = useCallback((session: AuthSession) => {
    setUser(session);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    await apiClient.post('/auth/logout');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, setSession, logout }),
    [user, loading, error, setSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
};
