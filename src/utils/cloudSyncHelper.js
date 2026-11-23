import { supabase } from '../supabase';

/**
 * Hydrate localStorage caches from Supabase company.settings
 * so every laptop, browser, and director/user sees the exact same live data.
 */
export function hydrateLocalFromCompanySettings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  let updated = false;

  try {
    if (Array.isArray(settings.b2b_payments)) {
      localStorage.setItem('sterling_b2b_payments', JSON.stringify(settings.b2b_payments));
      updated = true;
    }
    if (settings.b2b_partner_accounts && typeof settings.b2b_partner_accounts === 'object') {
      localStorage.setItem('sterling_b2b_partner_accounts', JSON.stringify(settings.b2b_partner_accounts));
      updated = true;
    }
    if (Array.isArray(settings.company_banks) && settings.company_banks.length > 0) {
      localStorage.setItem('sterling_company_banks', JSON.stringify(settings.company_banks));
      updated = true;
    }
    if (Array.isArray(settings.b2b_deleted_keys)) {
      localStorage.setItem('sterling_b2b_deleted_keys', JSON.stringify(settings.b2b_deleted_keys));
      updated = true;
    }
    if (updated) {
      window.dispatchEvent(new CustomEvent('sterling_b2b_payments_updated'));
    }
  } catch (e) {
    console.warn('Error hydrating localStorage from company settings:', e);
  }
  return updated;
}

/**
 * Fetch latest company.settings from Supabase
 */
export async function fetchCompanySettingsFromCloud(companyId) {
  if (!companyId) return null;
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, settings')
      .eq('id', companyId)
      .single();
    if (error) {
      console.warn('Cloud settings fetch error:', error.message);
      return null;
    }
    return data?.settings || {};
  } catch (e) {
    console.warn('Cloud settings fetch exception:', e);
    return null;
  }
}

/**
 * Merge and save B2B payments, partner accounts, company banks, and deleted keys
 * into Supabase companies.settings so every device/director stays in sync.
 */
export async function saveB2BCloudState(companyId, partialState) {
  if (!companyId) return { ok: false, error: 'Missing companyId' };
  try {
    const { data: existingRow, error: fetchErr } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (fetchErr) {
      return { ok: false, error: fetchErr.message };
    }

    const prevSettings = (existingRow && existingRow.settings && typeof existingRow.settings === 'object')
      ? existingRow.settings
      : {};

    const nextSettings = {
      ...prevSettings,
      ...partialState,
      b2b_synced_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('companies')
      .update({ settings: nextSettings })
      .eq('id', companyId);

    if (updateErr) {
      console.warn('Cloud settings update failed:', updateErr.message);
      return { ok: false, error: updateErr.message };
    }
    return { ok: true, syncedAt: nextSettings.b2b_synced_at };
  } catch (e) {
    console.warn('Cloud settings update exception:', e);
    return { ok: false, error: e.message };
  }
}

/**
 * Resolve active companyId from Supabase user membership if not passed directly
 */
export async function resolveActiveCompanyId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (member?.company_id) return member.company_id;
    const { data: firstCo } = await supabase
      .from('companies')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    return firstCo?.id || null;
  } catch (e) {
    return null;
  }
}
