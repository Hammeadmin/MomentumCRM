import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// User profile type matching your database
interface UserProfile {
  id: string;
  organisation_id: string;
  full_name: string;
  phone_number?: string | null;
  role: 'admin' | 'sales' | 'worker' | 'finance';
  is_active: boolean;
  email?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  base_hourly_rate?: number | null;
  base_monthly_salary?: number | null;
  commission_rate?: number | null;
  employment_type?: 'hourly' | 'monthly';
  has_commission?: boolean;
  personnummer?: string | null;
  bank_account_number?: string | null;
  cities?: string[] | null;
  created_at?: string;
}

interface Organisation {
  id: string;
  name: string;
  org_number?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  website?: string | null;
  logo_url?: string | null;
  bankgiro?: string | null;
  plusgiro?: string | null;
  f_skatt?: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  organisation: Organisation | null;
  organisationId: string | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch user profile and organisation from database
  const fetchUserProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          organisation:organisations(*)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        const { organisation: org, ...profile } = data;
        setUserProfile(profile as UserProfile);
        setOrganisation(org as Organisation);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Refresh profile function (can be called after profile updates)
  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Fetch profile if user exists
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Fetch or clear profile based on session
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setOrganisation(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    setUserProfile(null);
    setOrganisation(null);
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    userProfile,
    organisation,
    organisationId: userProfile?.organisation_id ?? null,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}