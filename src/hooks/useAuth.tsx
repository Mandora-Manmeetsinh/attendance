import { createContext, useContext, useEffect, useState } from 'react';
import * as React from 'react';
import client from '@/api/client';
import { toast } from 'sonner';

interface Profile {
  _id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  shift_start?: string;
  shift_end?: string;
  current_streak?: number;
  best_streak?: number;
  total_attendance?: number;
  notification_preferences?: any;
}

interface AuthContextType {
  user: Profile | null; // In MERN, user and profile are often the same object
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signIn: async () => { },
  signOut: () => { },
  signUp: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await client.get('/auth/profile');
      setUser(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('token'); // Invalid token
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await client.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setUser(data);
      toast.success('Logged in successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data } = await client.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      localStorage.setItem('token', data.token);
      setUser(data);
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Signed out successfully');
  };

  const value = {
    user,
    profile: user, // Alias for compatibility
    loading,
    isAdmin: user?.role === 'admin',
    signIn,
    signOut,
    signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
