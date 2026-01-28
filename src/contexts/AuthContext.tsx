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
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; needsEmailVerification?: boolean }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  isNewOAuthUser: boolean;
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
  const [isNewOAuthUser, setIsNewOAuthUser] = useState(false);

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

  // Handle auth state changes asynchronously (non-blocking)
  const handleAuthChange = async (authUser: User) => {
    console.log('[AuthContext] handleAuthChange for user:', authUser.id);

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('[AuthContext] Profile check error:', profileError.message);
    }

    if (!profile) {
      // No profile exists - check if there's pending signup data
      const metadata = authUser.user_metadata;

      if (metadata?.pending_org_name && metadata?.pending_full_name) {
        console.log('[AuthContext] Found pending signup data, completing registration...');

        try {
          const { error: rpcError } = await supabase.rpc('complete_organization_signup', {
            org_name: metadata.pending_org_name,
            org_number: metadata.pending_org_number || null,
            user_full_name: metadata.pending_full_name,
            user_phone_number: metadata.pending_phone_number || null,
          });

          if (rpcError) {
            console.error('[AuthContext] Failed to complete pending signup:', rpcError);
          } else {
            console.log('[AuthContext] Pending signup completed successfully!');
            await supabase.auth.refreshSession();
            await fetchUserProfile(authUser.id);
            setIsNewOAuthUser(false);
            return;
          }
        } catch (err) {
          console.error('[AuthContext] Error completing pending signup:', err);
        }
      }

      // Either no pending data or RPC failed - treat as new OAuth user
      setIsNewOAuthUser(true);
    } else {
      // Profile exists - fetch the full profile data
      setIsNewOAuthUser(false);
      await fetchUserProfile(authUser.id);
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
      // Update state immediately (synchronous)
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle profile fetch in a non-blocking way
      if (session?.user) {
        // Run async operations without awaiting in the callback
        handleAuthChange(session.user).catch(err => {
          console.error('[AuthContext] Error in handleAuthChange:', err);
        });
      } else {
        setUserProfile(null);
        setOrganisation(null);
        setIsNewOAuthUser(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] signIn called with:', email);
    try {
      // Add timeout to detect hanging Supabase connection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Login request timed out. Please check your internet connection.')), 15000);
      });

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { error } = await Promise.race([signInPromise, timeoutPromise]);
      console.log('[AuthContext] signIn result:', error ? 'error' : 'success', error?.message);
      return { error };
    } catch (err) {
      console.error('[AuthContext] signIn exception:', err);
      // Return as AuthError format
      return { error: { message: err instanceof Error ? err.message : 'Unknown error' } as any };
    }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // Check if email confirmation is required
    // When email confirmation is enabled, user will have identities but session may be null
    const needsEmailVerification = !error && !!data.user && !data.session;

    return { error, needsEmailVerification };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    // Ensure redirectTo is always an absolute URL
    const baseUrl = window.location.origin;
    let fullRedirectUrl = `${baseUrl}/complete-signup`; // Default

    if (redirectTo) {
      // If it's already absolute, use it; otherwise prepend origin
      fullRedirectUrl = redirectTo.startsWith('http')
        ? redirectTo
        : `${baseUrl}${redirectTo.startsWith('/') ? '' : '/'}${redirectTo}`;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: fullRedirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    setUserProfile(null);
    setOrganisation(null);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (err) {
      console.error('[AuthContext] resetPassword exception:', err);
      return { error: { message: err instanceof Error ? err.message : 'Unknown error' } as any };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err) {
      console.error('[AuthContext] updatePassword exception:', err);
      return { error: { message: err instanceof Error ? err.message : 'Unknown error' } as any };
    }
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
    signInWithGoogle,
    signOut,
    refreshProfile,
    resetPassword,
    updatePassword,
    isNewOAuthUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}