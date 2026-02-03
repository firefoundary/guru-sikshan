import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Teacher {
  id: string;
  name: string;
  email: string;
  cluster: string;
  employeeId: string;
}

interface AuthContextType {
  teacher: Teacher | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('teacher_session');
    const onboarding = localStorage.getItem('onboarding_complete');
    
    if (stored) {
      try {
        setTeacher(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing stored session:', e);
        localStorage.removeItem('teacher_session');
      }
    }
    
    if (onboarding === 'true') {
      setHasCompletedOnboarding(true);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/teacher/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setIsLoading(false);
        return false;
      }

      if (data.success && data.teacher) {
        setTeacher(data.teacher);
        localStorage.setItem('teacher_session', JSON.stringify(data.teacher));
        setIsLoading(false);
        return true;
      }

      setError('Invalid response from server');
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setTeacher(null);
    localStorage.removeItem('teacher_session');
    setError(null);
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('onboarding_complete', 'true');
  };

  return (
    <AuthContext.Provider value={{
      teacher,
      isAuthenticated: !!teacher,
      isLoading,
      login,
      logout,
      hasCompletedOnboarding,
      completeOnboarding,
      error,
    }}>
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
