import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, Role } from '../types';
import { isAllowedDomain } from '../config';
import { setAuthToken, usersApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (credential: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'library_auth_user';
const TOKEN_KEY = 'library_auth_token';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * JWTの有効期限をチェック
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp as number;
    // 有効期限の5分前に期限切れとみなす
    return Date.now() >= (exp * 1000) - 5 * 60 * 1000;
  } catch {
    return true;
  }
}

/**
 * APIからロールを取得し、失敗時は 'user' を返す
 */
async function fetchRole(): Promise<Role> {
  try {
    return await usersApi.getMyRole();
  } catch {
    return 'user';
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期化時にローカルストレージから復元
  useEffect(() => {
    (async () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY);
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedUser && storedToken) {
          if (isTokenExpired(storedToken)) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(TOKEN_KEY);
            setAuthToken(null);
          } else {
            setAuthToken(storedToken);
            const role = await fetchRole();
            const restored = { ...(JSON.parse(storedUser) as User), role };
            setUser(restored);
            setToken(storedToken);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
          }
        } else {
          setAuthToken(null);
        }
      } catch (e) {
        console.error('Failed to restore auth state:', e);
        setAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (credential: string) => {
    setError(null);
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]));

      const email = payload.email as string;
      const name = payload.name as string;
      const picture = payload.picture as string | undefined;

      if (!isAllowedDomain(email)) {
        setError('このドメインからのログインは許可されていません。');
        return;
      }

      setAuthToken(credential);
      const role = await fetchRole();
      const newUser: User = { email, name, picture, role };
      setUser(newUser);
      setToken(credential);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem(TOKEN_KEY, credential);
    } catch (e) {
      console.error('Login failed:', e);
      setError('ログインに失敗しました。');
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, error, login, logout }}>
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
