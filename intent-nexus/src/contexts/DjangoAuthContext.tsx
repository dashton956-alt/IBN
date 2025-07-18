
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { djangoApiService } from '@/services/djangoApiService';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const DjangoAuthContext = createContext<AuthContextType | undefined>(undefined);

export const useDjangoAuth = () => {
  const context = useContext(DjangoAuthContext);
  if (!context) {
    throw new Error('useDjangoAuth must be used within a DjangoAuthProvider');
  }
  return context;
};

export const DjangoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Memoize the initialization function to prevent re-runs
  const initializeAuth = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (initializingRef.current) {
      console.log('Auth initialization already in progress, skipping...');
      return;
    }

    initializingRef.current = true;
    console.log('Starting auth initialization...');
    
    try {
      const token = djangoApiService.getToken();
      if (token) {
        console.log('Token found, fetching profile...');
        
        // Set a timeout to prevent hanging
        const profilePromise = djangoApiService.getProfile();
        const timeoutPromise = new Promise((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            reject(new Error('Profile fetch timeout'));
          }, 8000);
        });

        const profile = await Promise.race([profilePromise, timeoutPromise]);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        console.log('Profile fetched successfully:', profile);
        setUser(profile);
        setError(null);
      } else {
        console.log('No token found, user not authenticated');
        setUser(null);
        setError(null);
      }
    } catch (error: any) {
      console.error('Auth initialization error:', error);
      
      if (error.message.includes('Authentication required')) {
        console.log('Token invalid, clearing...');
        djangoApiService.clearToken();
        setUser(null);
        setError(null);
      } else if (error.message.includes('timeout') || error.message.includes('NetworkError')) {
        console.log('Network error during auth initialization');
        setError('Unable to connect to server. Please check your connection.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
      initializingRef.current = false;
      console.log('Auth initialization complete');
    }
  }, []);

  useEffect(() => {
    initializeAuth();
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [initializeAuth]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting sign in...');
      const response = await djangoApiService.login(email, password);
      console.log('Sign in successful:', response.user);
      setUser(response.user);
      toast({
        title: "Success",
        description: "Signed in successfully",
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      const errorMessage = error.message || "Invalid credentials";
      setError(errorMessage);
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting sign up...');
      const response = await djangoApiService.register(email, password, fullName);
      console.log('Sign up successful:', response.user);
      setUser(response.user);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      const errorMessage = error.message || "Failed to create account";
      setError(errorMessage);
      toast({
        title: "Sign Up Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('Signing out...');
      djangoApiService.clearToken();
      setUser(null);
      setError(null);
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (initializingRef.current) {
      console.log('Auth refresh skipped - initialization in progress');
      return;
    }
    
    try {
      console.log('Refreshing user...');
      const profile = await djangoApiService.getProfile();
      setUser(profile);
      setError(null);
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
      if (error.message.includes('Authentication required')) {
        djangoApiService.clearToken();
        setUser(null);
      }
      setError(error.message);
    }
  }, []);

  const contextValue = React.useMemo(() => ({
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshUser,
  }), [user, loading, error, signIn, signUp, signOut, refreshUser]);

  return (
    <DjangoAuthContext.Provider value={contextValue}>
      {children}
    </DjangoAuthContext.Provider>
  );
};
