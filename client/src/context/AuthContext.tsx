import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/domain';
import { api, setAccessToken } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  loginSuccess: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function normalizeMediaUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const forwardSlashed = raw.replace(/\\/g, '/').trim();
  if (!forwardSlashed) return null;

  if (/^https?:\/\/localhost:\d+\//i.test(forwardSlashed)) {
    return forwardSlashed.replace(/^https?:\/\/localhost:\d+/i, window.location.origin);
  }
  if (/^https?:\/\//i.test(forwardSlashed)) {
    return forwardSlashed;
  }

  const cleaned = forwardSlashed.replace(/^\/+/, '');
  return `${window.location.origin}/${cleaned}`;
}

function normalizeUser(rawUser: any): User | null {
  if (!rawUser) return null;
  const rawAvatar = rawUser.avatarUrl ?? rawUser.avatar_url ?? null;
  return {
    ...rawUser,
    avatarUrl: normalizeMediaUrl(rawAvatar),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      setAccessToken(data.accessToken);
      setUser(normalizeUser(data.user));
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const loginSuccess = (accessToken: string, nextUser: User) => {
    setAccessToken(accessToken);
    setUser(normalizeUser(nextUser));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(normalizeUser(data.user));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginSuccess, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}