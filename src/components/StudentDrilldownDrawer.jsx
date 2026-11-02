import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

const COUNTRY_FLAGS = {
  'Germany': '🇩🇪',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'France': '🇫🇷',
  'Georgia': '🇬🇪',
  'Malta': '🇲🇹',
  'Albania': '🇦🇱',
  'Poland': '🇵🇱',
  'Canada': '🇨🇦',
  'Ireland': '🇮🇪',
  'Italy': '🇮🇹',
  'United States': '🇺🇸',
  'Australia': '🇦🇺',
  'New Zealand': '🇳🇿',
  'Latvia': '🇱🇻',
  'Cyprus': '🇨🇾',
  'Spain': '🇪🇸',
  'Netherlands': '🇳🇱',
};

function formatINR(amount) {
  const val = Number(amount || 0);
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function StudentDrilldownDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeText,
  badgeColor = '#7C6FFF',
  students = [],
  setCurrentPage,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  if (!isOpen) return null;

  // Filter students by local search & status
  const displayedStudents = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter !== 'All' && s.enroll_status !== statusFilter) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const name = (s.name || '').toLowerCase();
      const mobile = (s.mobile || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const country = (s.country || '').toLowerCase();
      const university = (s.university || '').toLowerCase();
      const counselor = (s.counselor_name || '').toLowerCase();
      const intake = (s.intake || '').toLowerCase();

      return (
        name.includes(q) ||
        mobile.includes(q) ||
        email.includes(q) ||
        country.includes(q) ||
        university.includes(q) ||
        counselor.includes(q) ||
        intake.includes(q)
      );
    });
  }, [students, search, statusFilter]);

  // Aggregate stats for the current drawer view
  const drawerStats = useMemo(() => {
    let totalCollected = 0;
    let totalCommitted = 0;
    let totalRemaining = 0;

    displayedStudents.forEach((s) => {
      totalCollected += Number(s.collected || 0);
      totalCommitted += Number(s.committed || 0);
      totalRemaining += Number(s.remaining || 0);
    });

    const efficiency = totalCommitted > 0 ? ((totalCollected / totalCommitted) * 100).toFixed(1) : '0.0';

    return { totalCollected, totalCommitted, totalRemaining, efficiency };
  }, [displayedStudents]);

  // Export current drilldown list to Excel
  const handleExportExcel = () => {
    if (displayedStudents.length === 0) return;

    const exportRows = displayedStudents.map((s, idx) => ({
      '#': idx + 1,
      'Student Name': s.name,
      'Mobile': s.mobile || '',
      'Email': s.email || '',
      'Destination Country': s.country || '',
      'University': s.university || '',
      'Course': s.course || '',
      'Intake': s.intake || '',
      'Counselor': s.counselor_name || '',
      'Enroll Status': s.enroll_status || 'Active',
      'Payment Stage': s.pay_stage || s.payment_stage || 'Pending',
      'Committed Fee (₹)': s.committed || 0,
      'Collected Fee (₹)': s.collected || 0,
      'Remaining Balance (₹)': s.remaining || 0,
      'Collection %': s.committed > 0 ? `${Math.round((s.collected / s.committed) * 100)}%` : '0%',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Drilldown Data');
    XLSX.writeFile(wb, `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(4, 6, 14, 0.72)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Slide-Over Drawer Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '640px',
          maxWidth: '96vw',
          height: '100vh',
          background: 'linear-gradient(180deg, #0F1528 0%, #0A0D1A 100%)',
          borderLeft: '1px solid rgba(148, 163, 225, 0.2)',
          boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(124, 111, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Gradient Accent Line */}
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${badgeColor}, #00E5A0, #36D1DC)` }} />

        {/* Drawer Header */}
        <div
          style={{
            padding: '24px 28px 18px',
            borderBottom: '1px solid rgba(148, 163, 225, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    background: `${badgeColor}22`,
                    color: badgeColor,
                    border: `1px solid ${badgeColor}44`,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {badgeText || 'Drilldown'}
                </span>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>
                  {displayedStudents.length} of {students.length} students
                </span>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: '13px', color: '#8E9BB5', margin: '4px 0 0' }}>
                  {subtitle}
                </p>
              )}
            </div>

            {/* Actions: Export & Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleExportExcel}
                title="Export this list to Excel (.xlsx)"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(148, 163, 225, 0.2)',
                  color: '#EDEFFA',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📥</span>
                <span>Export</span>
              </button>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(148, 163, 225, 0.2)',
                  color: '#8E9BB5',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Stats Ribbon */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(148, 163, 225, 0.08)',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: '#8E9BB5', textTransform: 'uppercase' }}>Collected</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#00E5A0', marginTop: '2px' }}>
                {formatINR(drawerStats.totalCollected)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#8E9BB5', textTransform: 'uppercase' }}>Committed</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#7C6FFF', marginTop: '2px' }}>
                {formatINR(drawerStats.totalCommitted)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#8E9BB5', textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: drawerStats.totalRemaining > 0 ? '#FF6F8E' : '#8E9BB5', marginTop: '2px' }}>
                {formatINR(drawerStats.totalRemaining)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#8E9BB5', textTransform: 'uppercase' }}>Efficiency</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#36D1DC', marginTop: '2px' }}>
                {drawerStats.efficiency}%
              </div>
            </div>
          </div>

          {/* Search Input & Status Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, phone, university, counselor..."
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(148, 163, 225, 0.18)',
                borderRadius: '8px',
                padding: '9px 14px',
                color: '#fff',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />

            {/* Quick Status Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['All', 'Active', 'Enrolled', 'Dropped', 'Refund'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    background: statusFilter === st ? '#7C6FFF' : 'rgba(255, 255, 255, 0.04)',
                    color: statusFilter === st ? '#fff' : '#8E9BB5',
                    border: '1px solid rgba(148, 163, 225, 0.12)',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Student Cards List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 28px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {displayedStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8E9BB5' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>No students match your query</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Try clearing the search or status filter</div>
            </div>
          ) : (
            displayedStudents.map((s, idx) => {
              const initials = (s.name || 'S')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const flag = COUNTRY_FLAGS[s.country] || '🌍';
              const pct = s.committed > 0 ? Math.min(100, Math.round((s.collected / s.committed) * 100)) : 0;

              const statusColors = {
                Active: { bg: 'rgba(0, 229, 160, 0.15)', text: '#00E5A0', dot: '#00E5A0' },
                Enrolled: { bg: 'rgba(54, 209, 220, 0.15)', text: '#36D1DC', dot: '#36D1DC' },
                Dropped: { bg: 'rgba(255, 111, 142, 0.15)', text: '#FF6F8E', dot: '#FF6F8E' },
                Refund: { bg: 'rgba(255, 176, 32, 0.15)', text: '#FFB020', dot: '#FFB020' },
              };
              const stStyle = statusColors[s.enroll_status] || statusColors.Active;

              return (
                <div
                  key={s.id || idx}
                  style={{
                    background: 'rgba(20, 25, 45, 0.65)',
                    border: '1px solid rgba(148, 163, 225, 0.14)',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(124, 111, 255, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.14)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top: Student Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #7C6FFF 0%, #36D1DC 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 800,
                          flexShrink: 0,
                          boxShadow: '0 4px 12px rgba(124, 111, 255, 0.3)',
                        }}
                      >
                        {initials}
                      </div>

                      <div>
                        <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#fff' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8E9BB5', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{flag}</span>
                          <span>{s.country || 'Global'}</span>
                          <span>&bull;</span>
                          <span>{s.mobile || s.email || 'No contact'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      style={{
                        background: stStyle.bg,
                        color: stStyle.text,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stStyle.dot }} />
                      {s.enroll_status || 'Active'}
                    </span>
                  </div>

                  {/* Middle: University, Course, Counselor */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      fontSize: '12px',
                      color: '#CBD5E1',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <span style={{ color: '#8E9BB5' }}>University: </span>
                      <strong style={{ color: '#fff' }}>{s.university || 'Pending'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#8E9BB5' }}>Course: </span>
                      <span>{s.course || 'Undergraduate'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#8E9BB5' }}>Counselor: </span>
                      <span style={{ color: '#36D1DC' }}>{s.counselor_name || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#8E9BB5' }}>Intake: </span>
                      <span>{s.intake || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Financial Bar: Collected vs Committed vs Remaining */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#8E9BB5' }}>Collected: </span>
                        <strong style={{ color: '#00E5A0' }}>₹{Number(s.collected || 0).toLocaleString('en-IN')}</strong>
                        <span style={{ color: '#8E9BB5' }}> of ₹{Number(s.committed || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span style={{ color: '#8E9BB5' }}>Remaining: </span>
                        <strong style={{ color: Number(s.remaining || 0) > 0 ? '#FF6F8E' : '#00E5A0' }}>
                          ₹{Number(s.remaining || 0).toLocaleString('en-IN')}
                        </strong>
                        <span style={{ color: '#7C6FFF', marginLeft: '6px', fontWeight: 700 }}>({pct}%)</span>
                      </div>
                    </div>

                    <div
                      style={{
                        height: '5px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #7C6FFF, #00E5A0)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer Action */}
                  {setCurrentPage && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                      <button
                        onClick={() => {
                          onClose();
                          setCurrentPage('students');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#7C6FFF',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>Open in Student Directory</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
