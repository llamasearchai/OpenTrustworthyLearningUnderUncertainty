/**
 * Authentication Context
 *
 * Provides authentication state and actions throughout the application.
 *
 * @module contexts/AuthContext
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

export type AuthContextValue = AuthState & AuthActions;

// ============================================================================
// Constants
// ============================================================================

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const AUTH_REMEMBER_KEY = 'auth_remember';

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Optional hook that doesn't throw (for conditional usage)
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

// ============================================================================
// Storage Helpers
// ============================================================================

function getStoredToken(): string | null {
  const remember = localStorage.getItem(AUTH_REMEMBER_KEY) === 'true';
  const storage = remember ? localStorage : sessionStorage;
  return storage.getItem(AUTH_TOKEN_KEY);
}

function getStoredUser(): User | null {
  const remember = localStorage.getItem(AUTH_REMEMBER_KEY) === 'true';
  const storage = remember ? localStorage : sessionStorage;
  const userJson = storage.getItem(AUTH_USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

function setStoredAuth(token: string, user: User, remember: boolean): void {
  const storage = remember ? localStorage : sessionStorage;
  localStorage.setItem(AUTH_REMEMBER_KEY, String(remember));
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_REMEMBER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Dev mode bypass: auto-authenticate synchronously for debugging
  // Use lazy initializer for useState to ensure it only runs once and checks dev mode correctly
  const [user, setUser] = useState<User | null>(() => {
    const isDevModeCheck = typeof window !== 'undefined' && (
      import.meta.env.DEV || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.search.includes('dev-bypass=true') ||
      localStorage.getItem('dev-bypass') === 'true'
    );
    
    if (isDevModeCheck) {
      const mockUser: User = {
        id: 'dev-user-123',
        email: 'dev@opentlu.local',
        name: 'Dev User',
        role: 'admin',
      };
      const mockToken = 'dev-token-bypass';
      // Set in storage immediately
      setStoredAuth(mockToken, mockUser, true);
      return mockUser;
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Loading is false if we have a user (dev bypass), true otherwise
    const isDevModeCheck = typeof window !== 'undefined' && (
      import.meta.env.DEV || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.search.includes('dev-bypass=true') ||
      localStorage.getItem('dev-bypass') === 'true'
    );
    return !isDevModeCheck; // false if dev mode (user already set), true otherwise
  });
  
  const [error, setError] = useState<string | null>(null);

  // Ensure dev bypass user is always set (in case of remounts or state resets)
  useEffect(() => {
    const isDevMode = typeof window !== 'undefined' && (
      import.meta.env.DEV || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.search.includes('dev-bypass=true') ||
      localStorage.getItem('dev-bypass') === 'true'
    );
    
    if (isDevMode && !user) {
      const mockUser: User = {
        id: 'dev-user-123',
        email: 'dev@opentlu.local',
        name: 'Dev User',
        role: 'admin',
      };
      const mockToken = 'dev-token-bypass';
      setStoredAuth(mockToken, mockUser, true);
      setUser(mockUser);
      setIsLoading(false);
    }
  }, [user]);

  // Initialize auth state from storage (only if not already set by dev bypass)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // If dev bypass already set initial user via synchronous initialization, skip storage check
        const isDevMode = typeof window !== 'undefined' && (
          import.meta.env.DEV || 
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' ||
          window.location.search.includes('dev-bypass=true') ||
          localStorage.getItem('dev-bypass') === 'true'
        );
        if (isDevMode) {
          // Dev bypass was already applied synchronously, just ensure loading is false and user is set
          if (!user) {
            const mockUser: User = {
              id: 'dev-user-123',
              email: 'dev@opentlu.local',
              name: 'Dev User',
              role: 'admin',
            };
            const mockToken = 'dev-token-bypass';
            setStoredAuth(mockToken, mockUser, true);
            setUser(mockUser);
          }
          setIsLoading(false);
          return;
        }

        const storedToken = getStoredToken();
        const storedUser = getStoredUser();

        if (storedToken && storedUser) {
          // Validate token with backend (in production)
          // For now, just use stored user
          setUser(storedUser);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        clearStoredAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API call - replace with real authentication
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Validate credentials (demo: accept any valid email format)
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        if (!email.includes('@')) {
          throw new Error('Invalid email format');
        }

        if (password.length < 4) {
          throw new Error('Password must be at least 4 characters');
        }

        // Generate mock user and token
        const mockUser: User = {
          id: `user-${Date.now()}`,
          email,
          name: email.split('@')[0],
          role: email.includes('admin') ? 'admin' : 'user',
        };

        const mockToken = `token-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Store auth data
        setStoredAuth(mockToken, mockUser, rememberMe);
        setUser(mockUser);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Call logout API if needed
      await new Promise((resolve) => setTimeout(resolve, 200));
      clearStoredAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<void> => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      throw new Error('No token to refresh');
    }

    try {
      // Call refresh API - for demo, just extend the session
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Token refresh would happen here
    } catch (err) {
      clearStoredAuth();
      setUser(null);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      logout,
      refreshToken,
      clearError,
    };
  }, [user, isLoading, error, login, logout, refreshToken, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Export
// ============================================================================

export { AuthContext };
