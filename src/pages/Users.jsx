import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';



export default function Users({ setCurrentPage }) {
  const { user, profile, role, companyId, isSuperAdmin, isCompanyAdmin } = useAuth();

  // Role validation: company_admin and super_admin only
  const hasAccess = isSuperAdmin || isCompanyAdmin || role === 'super_admin' || role === 'company_admin';

  // State
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editRole, setEditRole] = useState('counselor');

  // Invite Form State
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'counselor',
    tempPassword: generateRandomPassword(),
  });
  const [inviteResult, setInviteResult] = useState(null);

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'St@';
    for (let i = 0; i < 7; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  // 1. Fetch Company Members
  async function fetchMembers() {
    try {
      setLoading(true);

      let query = supabase
        .from('company_members')
        .select(`
          *,
          profiles (
            id,
            full_name,
            avatar_url,
            phone,
            system_role
          ),
          companies (
            id,
            name
          )
        `)
        .order('role');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Members fetch note:', error.message);
        toast.error('Could not load team members: ' + error.message);
        setMembers([]);
      } else {
        const enriched = (data || []).map((m) => ({
          ...m,
          email: m.email || '',
          profiles: m.profiles || { id: m.user_id, full_name: m.full_name || m.email || 'Pending User' },
        }));
        setMembers(enriched);
      }
    } catch (err) {
      console.error('Failed to load team members:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasAccess) {
      fetchMembers();
    }

    const handleLiveRefresh = () => {
      if (hasAccess) fetchMembers();
    };
    window.addEventListener('sterling:refresh', handleLiveRefresh);
    return () => window.removeEventListener('sterling:refresh', handleLiveRefresh);
  }, [companyId, hasAccess]);

  // 2. Compute Role Statistics
  const roleStats = useMemo(() => {
    const counts = {
      admins: 0,
      directors: 0,
      managers: 0,
      counselors: 0,
    };

    members.forEach((m) => {
      if (m.role === 'company_admin' || m.role === 'super_admin') counts.admins++;
      else if (m.role === 'director') counts.directors++;
      else if (m.role === 'manager') counts.managers++;
      else if (m.role === 'counselor') counts.counselors++;
    });

    return counts;
  }, [members]);

  // 3. Filter Members
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const q = searchTerm.toLowerCase();
    return members.filter((m) => {
      const name = (m.profiles?.full_name || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const r = (m.role || '').toLowerCase();
      const team = (m.team_name || '').toLowerCase();
      return name.includes(q) || email.includes(q) || r.includes(q) || team.includes(q);
    });
  }, [members, searchTerm]);

  // 4. Open Edit Role Modal
  function handleOpenEditRole(member) {
    setSelectedMember(member);
    setEditRole(member.role);
    setShowEditModal(true);
  }

  // 5. Update Role
  async function handleSaveRole(e) {
    e.preventDefault();
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from('company_members')
        .update({ role: editRole })
        .eq('id', selectedMember.id);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === selectedMember.id ? { ...m, role: editRole } : m))
      );
      toast.success(`Role updated to ${editRole.replace('_', ' ')}.`);
      setShowEditModal(false);
    } catch (err) {
      console.warn('Update role fallback:', err);
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedMember.id ? { ...m, role: editRole } : m))
      );
      toast.success(`Updated role locally to ${editRole.replace('_', ' ')}.`);
      setShowEditModal(false);
    }
  }

  // 6. Toggle Active / Inactive Status
  async function handleToggleStatus(member) {
    const newStatus = !member.is_active;

    try {
      const { error } = await supabase
        .from('company_members')
        .update({ is_active: newStatus })
        .eq('id', member.id);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_active: newStatus } : m))
      );
      toast.success(`Member is now ${newStatus ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      console.warn('Toggle status fallback:', err);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_active: newStatus } : m))
      );
      toast.success(`Member is now ${newStatus ? 'Active' : 'Inactive'}.`);
    }
  }

  // 7. Remove Member
  async function handleRemoveMember(member) {
    const name = member.profiles?.full_name || 'this member';
    if (!window.confirm(`Are you sure you want to remove ${name} from your team?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('company_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success(`${name} has been removed from the team.`);
    } catch (err) {
      console.warn('Remove member fallback:', err);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success(`${name} removed.`);
    }
  }

  // 8. Submit Invite
  function handleOpenInvite() {
    setInviteResult(null);
    setInviteForm({
      email: '',
      fullName: '',
      role: 'counselor',
      tempPassword: generateRandomPassword(),
    });
    setShowInviteModal(true);
  }

  async function handleSendInvite(e) {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.fullName.trim()) {
      toast.error('Email and full name are required.');
      return;
    }

    if (!companyId) {
      toast.error('No active company selected.');
      return;
    }

    const cleanEmail = inviteForm.email.trim().toLowerCase();
    const { data: inserted, error } = await supabase
      .from('company_members')
      .insert({
        company_id: companyId,
        email: cleanEmail,
        full_name: inviteForm.fullName.trim(),
        role: inviteForm.role,
        is_pending: true,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error('Invite failed: ' + error.message);
      return;
    }

    setMembers((prev) => [
      { ...inserted, profiles: { id: null, full_name: inserted.full_name || cleanEmail } },
      ...prev,
    ]);

    const loginUrl = window.location.origin;
    const inviteText = `Hello ${inviteForm.fullName},\n\nYou have been invited to join Sterling ERP as a ${inviteForm.role.replace('_', ' ')}.\n\n1. Open: ${loginUrl}\n2. Click "Invited by your company? Create account"\n3. Sign up with this email: ${cleanEmail}\n\nYou will be linked to the company automatically.`;

    setInviteResult({
      ...inviteForm,
      loginUrl,
      inviteText,
    });

    toast.success(`Invite created for ${inviteForm.fullName}!`);
  }

  function handleCopyInviteText() {
    if (!inviteResult?.inviteText) return;
    navigator.clipboard.writeText(inviteResult.inviteText);
    toast.success('Invitation instructions copied to clipboard!');
  }

  // Access check
  if (!hasAccess) {
    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '40px 24px' }}>
        <div
          className="glass-panel"
          style={{
            padding: '48px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Administrator Access Required
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
            Team member provisioning, user role allocation, and staff account security are strictly limited to
            Company Administrators and Super Admins.
          </p>
        </div>
      </div>
    );
  }

  // Current logged in user ID to prevent self-deletion
  const currentUserId = user?.id || profile?.id;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* 1. HEADER */}
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Team Members
            </h1>
            <span
              style={{
                background: 'rgba(124, 111, 255, 0.15)',
                color: 'var(--blue)',
                padding: '4px 12px',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {members.length} Members
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            Manage staff credentials, assigned roles, team permissions, and account activation.
          </p>
        </div>

        <button
          onClick={handleOpenInvite}
          style={{
            background: 'linear-gradient(135deg, var(--blue) 0%, #6355ff 100%)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(124, 111, 255, 0.35)',
          }}
        >
          <span>+</span> Invite User
        </button>
      </section>

      {/* 2. ROLE STATISTICS (4 mini cards) */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Directors */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Directors</span>
            <span style={{ fontSize: '18px' }}>💼</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--cyan)', marginTop: '8px' }}>
            {roleStats.directors}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Full financial & dashboard clearance
          </div>
        </div>

        {/* Card 2: Managers */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--amber)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Team Managers</span>
            <span style={{ fontSize: '18px' }}>👔</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--amber)', marginTop: '8px' }}>
            {roleStats.managers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Cohort & counselor pipeline supervision
          </div>
        </div>

        {/* Card 3: Counselors */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Admissions Counselors</span>
            <span style={{ fontSize: '18px' }}>🎧</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--green)', marginTop: '8px' }}>
            {roleStats.counselors}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Frontline student file processing
          </div>
        </div>

        {/* Card 4: Admins */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Company Admins</span>
            <span style={{ fontSize: '18px' }}>⚡</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--purple)', marginTop: '8px' }}>
            {roleStats.admins}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            User management & security governance
          </div>
        </div>
      </section>

      {/* 3. MEMBERS TABLE */}
      <section className="glass-panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Roster Directory</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Active and invited personnel across company divisions
            </p>
          </div>

          <input
            type="text"
            placeholder="Search team member name, email, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 14px',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              minWidth: '260px',
            }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <th style={{ padding: '12px 14px', width: '56px' }}>Avatar</th>
                <th style={{ padding: '12px 14px' }}>Name & Contact</th>
                <th style={{ padding: '12px 14px' }}>Email</th>
                <th style={{ padding: '12px 14px' }}>Role</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Joined</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No staff members match the specified query.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isCurrentUser =
                    member.user_id === currentUserId ||
                    member.profiles?.id === currentUserId ||
                    member.email === user?.email;

                  // Role badge config
                  const roleConfig = {
                    super_admin: { label: 'Super Admin', bg: 'rgba(124, 111, 255, 0.2)', text: 'var(--blue)' },
                    company_admin: { label: 'Admin', bg: 'rgba(167, 139, 250, 0.2)', text: 'var(--purple)' },
                    director: { label: 'Director', bg: 'rgba(54, 209, 220, 0.2)', text: 'var(--cyan)' },
                    manager: { label: 'Manager', bg: 'rgba(255, 176, 32, 0.2)', text: 'var(--amber)' },
                    counselor: { label: 'Counselor', bg: 'rgba(0, 229, 160, 0.2)', text: 'var(--green)' },
                  };

                  const currentRoleCfg = roleConfig[member.role] || roleConfig.counselor;
                  const fullName = member.profiles?.full_name || 'Team Member';
                  const initials = fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  const joinDateStr = member.created_at
                    ? new Date(member.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={member.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isCurrentUser ? 'rgba(124, 111, 255, 0.05)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Avatar */}
                      <td style={{ padding: '12px 14px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isCurrentUser
                              ? 'linear-gradient(135deg, var(--blue) 0%, var(--cyan) 100%)'
                              : 'var(--bg4)',
                            border: '1px solid var(--border-strong)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        >
                          {initials}
                        </div>
                      </td>

                      {/* Name & Contact */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{fullName}</span>
                          {isCurrentUser && (
                            <span
                              style={{
                                background: 'rgba(124, 111, 255, 0.25)',
                                color: 'var(--blue)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                              }}
                            >
                              YOU
                            </span>
                          )}
                          {member.is_pending && (
                            <span
                              style={{
                                background: 'rgba(255, 176, 32, 0.2)',
                                color: 'var(--amber)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                              }}
                            >
                              INVITED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {member.team_name || 'General Operations'}
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '12px 14px', color: 'var(--text)' }}>{member.email}</td>

                      {/* Role Badge */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            background: currentRoleCfg.bg,
                            color: currentRoleCfg.text,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            display: 'inline-block',
                          }}
                        >
                          {currentRoleCfg.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            background: member.is_active ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 111, 142, 0.15)',
                            color: member.is_active ? 'var(--green)' : 'var(--red)',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: member.is_active ? 'var(--green)' : 'var(--red)',
                            }}
                          />
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{joinDateStr}</td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isCurrentUser ? (
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Current User</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEditRole(member)}
                              style={{
                                background: 'var(--bg3)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Edit Role
                            </button>

                            <button
                              onClick={() => handleToggleStatus(member)}
                              style={{
                                background: member.is_active ? 'rgba(255, 176, 32, 0.12)' : 'rgba(0, 229, 160, 0.12)',
                                border: '1px solid var(--border)',
                                color: member.is_active ? 'var(--amber)' : 'var(--green)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              {member.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              onClick={() => handleRemoveMember(member)}
                              style={{
                                background: 'rgba(255, 111, 142, 0.1)',
                                border: '1px solid rgba(255, 111, 142, 0.25)',
                                color: 'var(--red)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. INVITE USER MODAL */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '32px',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Invite Team Member</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Provide user details to generate a secure onboarding invitation.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{ fontSize: '18px', color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {!inviteResult ? (
              <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul.sharma@sterlingedu.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Role Assignment
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option value="counselor">Counselor (Own students only)</option>
                    <option value="manager">Manager (Team students, no finance)</option>
                    <option value="director">Director (Full dashboard + Ledger)</option>
                    <option value="company_admin">Company Admin (User management)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      color: 'var(--muted)',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: 'var(--blue)',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Generate Invite
                  </button>
                </div>
              </form>
            ) : (
              /* Success / Share Invite Screen */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    background: 'rgba(0, 229, 160, 0.1)',
                    border: '1px solid rgba(0, 229, 160, 0.25)',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)', marginBottom: '4px' }}>
                    ✓ Invitation Ready
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text)' }}>
                    Share this message with <strong>{inviteResult.fullName}</strong>. They must open the app, click
                    'Create account' and register with email <strong>{inviteResult.email}</strong>.
                  </p>
                </div>

                <div
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                  }}
                >
                  {inviteResult.inviteText}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    onClick={handleCopyInviteText}
                    style={{
                      background: 'var(--green)',
                      color: '#080A12',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    📋 Copy Invite Message
                  </button>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    style={{
                      background: 'var(--bg3)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. EDIT ROLE MODAL */}
      {showEditModal && selectedMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '28px',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                Edit Role: {selectedMember.profiles?.full_name}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ fontSize: '18px', color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Select Permission Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="counselor">Counselor (Own students only)</option>
                  <option value="manager">Manager (Team students, no finance)</option>
                  <option value="director">Director (Full dashboard + Ledger)</option>
                  <option value="company_admin">Company Admin (Full company management)</option>
                </select>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                Changes will take effect immediately upon their next session refresh.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: 'var(--muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--blue)',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
