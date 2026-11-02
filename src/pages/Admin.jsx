import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const CURRENCIES = ['INR', 'EUR', 'GBP', 'USD'];
const EMPTY_COMPANY = { name: '', logo_url: '', currency: 'INR' };
const EMPTY_ADMIN = { email: '', full_name: '', role: 'company_admin' };

const inputStyle = {
  width: '100%',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '10px 12px',
  color: 'var(--text)',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
};

export default function Admin({ setCurrentPage, defaultTab = 'companies' }) {
  const auth = useAuth();
  const { isSuperAdmin, company: activeCompany } = auth;
  const switchCompany = auth.switchCompany;

  const [companies, setCompanies] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const [companyModal, setCompanyModal] = useState(null); // null | 'create' | company object
  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY);
  const [saving, setSaving] = useState(false);

  const [adminTarget, setAdminTarget] = useState(null);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [inviteText, setInviteText] = useState('');

  async function fetchCompanies() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const list = data || [];
      setCompanies(list);

      const entries = await Promise.all(
        list.map(async (c) => {
          const [stu, mem] = await Promise.all([
            supabase.from('students').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
            supabase.from('company_members').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
          ]);
          return [c.id, { students: stu.count || 0, members: mem.count || 0 }];
        })
      );
      setCounts(Object.fromEntries(entries));
    } catch (err) {
      toast.error('Failed to load companies: ' + err.message);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies();
    else setLoading(false);
  }, [isSuperAdmin]);

  function openCreate() {
    setCompanyForm(EMPTY_COMPANY);
    setCompanyModal('create');
  }

  function openEdit(c) {
    setCompanyForm({ name: c.name || '', logo_url: c.logo_url || '', currency: c.settings?.currency || 'INR' });
    setCompanyModal(c);
  }

  async function handleSaveCompany(e) {
    e.preventDefault();
    if (!companyForm.name.trim()) {
      toast.error('Company name is required.');
      return;
    }
    setSaving(true);
    try {
      if (companyModal === 'create') {
        const { error } = await supabase.from('companies').insert({
          name: companyForm.name.trim(),
          logo_url: companyForm.logo_url.trim() || null,
          settings: { currency: companyForm.currency },
        });
        if (error) throw error;
        toast.success('Company created.');
      } else {
        const { error } = await supabase
          .from('companies')
          .update({
            name: companyForm.name.trim(),
            logo_url: companyForm.logo_url.trim() || null,
            settings: { ...(companyModal.settings || {}), currency: companyForm.currency },
          })
          .eq('id', companyModal.id);
        if (error) throw error;
        toast.success('Company updated.');
      }
      setCompanyModal(null);
      fetchCompanies();
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete "${c.name}"? This permanently removes the company and may delete its data.`)) return;
    const { error } = await supabase.from('companies').delete().eq('id', c.id);
    if (error) {
      toast.error('Delete failed: ' + error.message);
      return;
    }
    toast.success('Company deleted.');
    fetchCompanies();
  }

  function openAssign(c) {
    setAdminTarget(c);
    setAdminForm(EMPTY_ADMIN);
    setInviteText('');
  }

  async function handleAssign(e) {
    e.preventDefault();
    const email = adminForm.email.trim().toLowerCase();
    if (!email || !adminForm.full_name.trim()) {
      toast.error('Email and full name are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('company_members').insert({
        company_id: adminTarget.id,
        email,
        full_name: adminForm.full_name.trim(),
        role: adminForm.role,
        is_pending: true,
        is_active: true,
      });
      if (error) throw error;
      const roleLabel = adminForm.role === 'company_admin' ? 'Company Admin' : 'Director';
      setInviteText(
        `Hello ${adminForm.full_name.trim()},\n\nYou have been added as ${roleLabel} of "${adminTarget.name}" on Sterling ERP.\n\n1. Open: ${window.location.origin}\n2. Click "Invited by your company? Create account"\n3. Sign up using this email: ${email}\n\nYour access will be linked automatically.`
      );
      toast.success('Admin assigned.');
      fetchCompanies();
    } catch (err) {
      toast.error('Assign failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteText).then(
      () => toast.success('Invite message copied.'),
      () => toast.error('Copy failed — select and copy manually.')
    );
  }

  function handleSwitch(c) {
    if (typeof switchCompany === 'function') {
      switchCompany(c);
      toast.success(`Switched to ${c.name}`);
      if (setCurrentPage) setCurrentPage('overview');
    } else {
      toast.error('Company switching is not available.');
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Access Restricted</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Only Super Admins can manage companies.</p>
      </div>
    );
  }

  const totalStudents = Object.values(counts).reduce((s, c) => s + c.students, 0);
  const totalMembers = Object.values(counts).reduce((s, c) => s + c.members, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} data-tab={defaultTab}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Companies</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Manage all tenant companies and their administrators.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Company</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-card-blue">
          <div className="kpi-label">Companies</div>
          <div className="kpi-value">{companies.length}</div>
        </div>
        <div className="kpi-card kpi-card-green">
          <div className="kpi-label">Total Students</div>
          <div className="kpi-value">{totalStudents}</div>
        </div>
        <div className="kpi-card kpi-card-purple">
          <div className="kpi-label">Total Members</div>
          <div className="kpi-value">{totalMembers}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : companies.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🏢</div>
          <div className="empty-title">No companies yet</div>
          <div className="empty-desc">Create your first company to get started.</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>+ Create Company</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {companies.map((c) => {
            const cnt = counts[c.id] || { students: 0, members: 0 };
            const isActive = activeCompany?.id === c.id;
            return (
              <div key={c.id} className="card" style={{ padding: 20, border: isActive ? '1px solid var(--blue)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff', background: 'linear-gradient(135deg, var(--blue), var(--pink))' }}>
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                      Created {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'} · {c.settings?.currency || 'INR'}
                    </div>
                  </div>
                  {isActive && <span className="pill pill-blue">Active</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{cnt.students}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Students</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--purple)' }}>{cnt.members}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Members</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleSwitch(c)} disabled={isActive}>
                    {isActive ? 'Current' : 'Switch to this company'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openAssign(c)}>Assign Admin</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {companyModal && (
        <div className="modal-bg" onClick={() => setCompanyModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{companyModal === 'create' ? 'Create Company' : 'Edit Company'}</div>
              <button className="modal-close" onClick={() => setCompanyModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveCompany}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-field">
                  <label className="form-label">Company Name *</label>
                  <input className="form-input" style={inputStyle} value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="e.g. Europe Sterling" autoFocus />
                </div>
                <div className="form-field">
                  <label className="form-label">Logo URL (optional)</label>
                  <input className="form-input" style={inputStyle} value={companyForm.logo_url} onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="form-field">
                  <label className="form-label">Currency</label>
                  <select className="form-select" style={inputStyle} value={companyForm.currency} onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}>
                    {CURRENCIES.map((cur) => <option key={cur} value={cur}>{cur}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setCompanyModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adminTarget && (
        <div className="modal-bg" onClick={() => setAdminTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Assign Admin · {adminTarget.name}</div>
              <button className="modal-close" onClick={() => setAdminTarget(null)}>✕</button>
            </div>
            {!inviteText ? (
              <form onSubmit={handleAssign}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-field">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" style={inputStyle} value={adminForm.full_name} onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })} autoFocus />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-input" style={inputStyle} value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Role</label>
                    <select className="form-select" style={inputStyle} value={adminForm.role} onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}>
                      <option value="company_admin">Company Admin</option>
                      <option value="director">Director</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setAdminTarget(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Assigning...' : 'Assign'}</button>
                </div>
              </form>
            ) : (
              <>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.25)', borderRadius: 10, padding: 12, color: 'var(--green)', fontWeight: 700, fontSize: 13 }}>
                    ✓ Admin assigned. Send them this message:
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, fontSize: 12, color: 'var(--text)', fontFamily: 'inherit' }}>{inviteText}</pre>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setAdminTarget(null)}>Close</button>
                  <button className="btn btn-primary" onClick={copyInvite}>Copy Message</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
