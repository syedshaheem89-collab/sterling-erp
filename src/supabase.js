import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jicpdjxoxbdfvfgyyoxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3BkanhveGJkZnZmZ3l5b3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1OTk2MTUsImV4cCI6MjEwOTE3NTYxNX0.ockaQVqMhK1C6_kM1x3tz23AI9Ubo9rv529hX2JnSOc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export async function getMyProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) {
      return {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Sterling User',
        system_role: 'user',
      };
    }
    return data;
  } catch (e) {
    return null;
  }
}

export async function getMyRole() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('company_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) return null;
    return data.role;
  } catch (e) {
    return null;
  }
}

export async function getMyCompany() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('company_members')
      .select('company_id, companies(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) return null;
    return data.companies || { id: data.company_id, name: 'Europe Sterling' };
  } catch (e) {
    return null;
  }
}

export default supabase;
