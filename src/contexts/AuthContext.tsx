import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile, isSupabaseConfigured } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configError: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: string, organisationId: string | null) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  const fetchProfile = async (userId: string) => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    if (!data) {
      console.warn('No profile found for user:', userId);
      return null;
    }

    console.log('Profile data loaded:', {
      email: data?.email,
      role: data?.role,
      is_active: data?.is_active,
      super_admin: data?.super_admin
    });

    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    console.log('🚀 Initializing auth context...');

    if (!supabase || !isSupabaseConfigured()) {
      console.error('❌ Supabase not configured');
      setConfigError(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        console.log('🔍 Checking initial session:', session?.user?.email || 'no session');
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);

          if (!profileData) {
            console.error('❌ No profile found on init, signing out');
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
          } else if (!profileData.is_active) {
            console.error('❌ Account deactivated on init, signing out');
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
          } else {
            console.log('✅ Initial session valid, setting user and profile');
            setUser(session.user);
            setProfile(profileData);
          }
        } else {
          console.log('ℹ️ No initial session found');
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN') {
          return;
        }

        try {
          setLoading(true);

          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);

            if (!profileData) {
              console.error('❌ No profile found in state change, signing out');
              await supabase.auth.signOut();
              setUser(null);
              setProfile(null);
            } else if (!profileData.is_active) {
              console.error('❌ Account deactivated in state change, signing out');
              await supabase.auth.signOut();
              setUser(null);
              setProfile(null);
            } else {
              console.log('✅ Setting user and profile in context');
              setUser(session.user);
              setProfile(profileData);
            }
          } else {
            console.log('❌ No session, clearing user and profile');
            setUser(null);
            setProfile(null);
          }
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      console.log('🔐 Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Auth sign in error:', error);
        throw error;
      }

      console.log('✅ Auth successful, fetching profile...');

      if (data.user) {
        const profileData = await fetchProfile(data.user.id);

        if (!profileData) {
          console.error('❌ No profile found for user:', data.user.id);
          await supabase.auth.signOut();
          throw new Error('Profile not found. Please contact your administrator.');
        }

        if (!profileData.is_active) {
          console.error('❌ Account is deactivated:', data.user.email);
          await supabase.auth.signOut();
          throw new Error('Your account has been deactivated. Please contact your administrator.');
        }

        console.log('✅ Sign in successful, profile loaded');
        setUser(data.user);
        setProfile(profileData);
      }

      return { error: null };
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      return { error: error as Error };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      const appUrl = import.meta.env.VITE_PUBLIC_APP_URL || 'https://capturepro.work';

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: string,
    organisationId: string | null
  ) => {
    try {
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signup');

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        organisation_id: organisationId,
      });

      if (profileError) throw profileError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      const appUrl = import.meta.env.VITE_PUBLIC_APP_URL || 'https://capturepro.work';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/callback?type=recovery`,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    configError,
    signIn,
    signInWithMagicLink,
    signUp,
    signOut,
    refreshProfile,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
