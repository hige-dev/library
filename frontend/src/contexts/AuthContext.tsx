import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { isAllowedDomain } from '../config';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credential: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'library_auth_user';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期化時にローカルストレージから復元
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedUser = JSON.parse(stored) as User;
        setUser(parsedUser);
      }
    } catch (e) {
      console.error('Failed to restore auth state:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((credential: string) => {
    setError(null);
    try {
      // JWTをデコード（base64）
      const payload = JSON.parse(atob(credential.split('.')[1]));

      const email = payload.email as string;
      const name = payload.name as string;
      const picture = payload.picture as string | undefined;

      // ドメインチェック
      if (!isAllowedDomain(email)) {
        setError('このドメインからのログインは許可されていません。');
        return;
      }

      const newUser: User = { email, name, picture };
      setUser(newUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.error('Login failed:', e);
      setError('ログインに失敗しました。');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
