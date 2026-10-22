import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: number;
  email: string;
  full_name?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>({
    id: 1,
    email: 'demo@autopilot.ai',
    full_name: 'Paper Trader (Default Demo)',
    is_active: true,
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('autopilot_token'));
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Auto-login to demo account on initial load if no token exists
  useEffect(() => {
    const ensureToken = async () => {
      const existingToken = localStorage.getItem('autopilot_token');
      if (!existingToken) {
        try {
          const data = await api.login('demo@autopilot.ai', 'demo1234');
          localStorage.setItem('autopilot_token', data.access_token);
          setToken(data.access_token);
          setUser(data.user);
        } catch {
          // If backend is still booting, fallback gracefully
        }
      }
    };
    ensureToken();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(email, pass);
      localStorage.setItem('autopilot_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string, name?: string) => {
    setIsLoading(true);
    try {
      const data = await api.register(email, pass, name);
      localStorage.setItem('autopilot_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('autopilot_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
