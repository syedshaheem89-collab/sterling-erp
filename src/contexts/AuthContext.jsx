import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import supabase from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [companyMember, setCompanyMember] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile, company membership, and company details
  const fetchUserData = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      setCompanyMember(null);
      setCompany(null);
      setLoading(false);
      return;
    }

    try {
      setUser(sessionUser);

      // 1. Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      let activeProfile = profileData;

      if (!activeProfile && !profileError) {
        // Fallback default profile if not yet created in table
        activeProfile = {
          id: sessionUser.id,
          full_name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
          system_role: 'counselor',
        };
      }
      setProfile(activeProfile);

      // 2. Fetch company membership with joined company record
      const { data: memberData, error: memberError } = await supabase
        .from('company_members')
        .select('*, company:companies(*)')
        .eq('user_id', sessionUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberData) {
        setCompanyMember(memberData);
        setCompany(memberData.company || null);
      } else {
        // Auto-heal: If user has no company membership yet, assign to Europe Sterling as company_admin / director
        const { data: firstCompany } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstCompany) {
          setCompany(firstCompany);
          const fallbackMember = {
            company_id: firstCompany.id,
            user_id: sessionUser.id,
            email: sessionUser.email,
            full_name: activeProfile?.full_name || sessionUser.email?.split('@')[0] || 'Sterling User',
            role: 'company_admin',
            is_active: true,
          };
          setCompanyMember(fallbackMember);

          // Attempt upsert in background
          supabase
            .from('company_members')
            .upsert(fallbackMember, { onConflict: 'company_id,user_id' })
            .then(() => {});
        } else {
          setCompany({ id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'Europe Sterling' });
          setCompanyMember({ role: 'company_admin' });
        }
      }
    } catch (err) {
      console.error('Error fetching auth user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize and restore auth session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting auth session:', error);
        }
        if (isMounted) {
          if (session?.user) {
            await fetchUserData(session.user);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfile(null);
        setCompanyMember(null);
        setCompany(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await fetchUserData(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserData]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setCompanyMember(null);
      setCompany(null);
      setLoading(false);
    }
  }, []);

  // Refresh current user and permissions
  const refreshAuth = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserData(session.user);
    } else {
      setUser(null);
      setProfile(null);
      setCompanyMember(null);
      setCompany(null);
      setLoading(false);
    }
  }, [fetchUserData]);

  // Switch active company (useful for super_admin or multi-company profiles)
  const switchCompany = useCallback((newCompany) => {
    if (newCompany) {
      setCompany(newCompany);
    }
  }, []);

  // Computed role & permissions
  const role = useMemo(() => {
    if (profile?.system_role === 'super_admin') return 'super_admin';
    return companyMember?.role || profile?.system_role || 'counselor';
  }, [profile, companyMember]);

  const isSuperAdmin = useMemo(() => {
    return role === 'super_admin' || profile?.system_role === 'super_admin';
  }, [role, profile]);

  const isAdmin = useMemo(() => {
    return isSuperAdmin || role === 'company_admin' || role === 'admin';
  }, [isSuperAdmin, role]);

  const isDirector = useMemo(() => {
    return isAdmin || role === 'director';
  }, [isAdmin, role]);

  const isManager = useMemo(() => {
    return isDirector || role === 'manager';
  }, [isDirector, role]);

  const isCounselor = useMemo(() => {
    return role === 'counselor';
  }, [role]);

  const companyId = useMemo(() => {
    return company?.id || companyMember?.company_id || null;
  }, [company, companyMember]);

  const value = useMemo(() => ({
    user,
    profile,
    companyMember,
    company,
    loading,
    role,
    isSuperAdmin,
    isAdmin,
    isDirector,
    isManager,
    isCounselor,
    companyId,
    signOut,
    refreshAuth,
    switchCompany,
  }), [
    user,
    profile,
    companyMember,
    company,
    loading,
    role,
    isSuperAdmin,
    isAdmin,
    isDirector,
    isManager,
    isCounselor,
    companyId,
    signOut,
    refreshAuth,
    switchCompany,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
