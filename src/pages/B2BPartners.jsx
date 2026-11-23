import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  getStudentAgentMeta,
  saveStudentAgentMeta,
  convertToINR,
  KNOWN_B2B_PARTNERS,
  SUPPORTED_CURRENCIES,
} from '../utils/studentAgentHelper';

function formatCompactINR(amount) {
  const val = Number(amount || 0);
  if (val === 0) return '₹0';
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function getInitials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'BP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function B2BPartners() {
  const { companyId } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Main table filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'settled'
  const [searchQuery, setSearchQuery] = useState('');

  // Partner drilldown modal
  const [selectedPartnerName, setSelectedPartnerName] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  // Single student B2B edit modal
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Bulk Update B2B Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set());
  const [bulkForm, setBulkForm] = useState({
    b2b_agent_name: '',
    b2b_category: 'B2B Partner Fee',
    b2b_currency: 'INR',
    b2b_committed: '',
    b2b_paid: '',
    b2b_has_gst: true,
  });
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const fetchStudents = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Failed to load students for B2B Partners:', err);
      toast.error('Could not load B2B Partner data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [companyId]);

  // Listen for updates from Billing & Payouts or Student modals
  useEffect(() => {
    const onRefresh = () => fetchStudents();
    window.addEventListener('sterling_b2b_payments_updated', onRefresh);
    return () => window.removeEventListener('sterling_b2b_payments_updated', onRefresh);
  }, [companyId]);

  // Build B2B Partner Portfolios from Students + Agent Meta
  const partnerPortfolios = useMemo(() => {
    const map = {};

    students.forEach((stu) => {
      const meta = getStudentAgentMeta(stu);
      const rawPartner = (meta.b2b_agent_name || '').trim();
      const curr = meta.b2b_currency || 'INR';

      const metaCommittedINR = meta.b2b_committed > 0 ? convertToINR(meta.b2b_committed, curr) : 0;
      const metaPaidINR = meta.b2b_paid > 0 ? convertToINR(meta.b2b_paid, curr) : 0;
      const dbCharge = Number(stu.b2b_charge || 0);

      const committedINR = metaCommittedINR > 0 ? metaCommittedINR : dbCharge;
      const paidINR = metaPaidINR;
      const remainingINR = Math.max(0, committedINR - paidINR);

      // Include student if they have a B2B partner assigned OR a B2B charge > 0
      if (!rawPartner && committedINR <= 0 && paidINR <= 0) return;

      const displayPartner = rawPartner || 'Direct / Unassigned B2B';
      const key = displayPartner.toLowerCase();

      if (!map[key]) {
        map[key] = {
          key,
          partnerName: displayPartner,
          students: [],
          totalCommitted: 0,
          totalPaid: 0,
          remainingBalance: 0,
        };
      }

      map[key].students.push({
        student: stu,
        meta,
        committedINR,
        paidINR,
        remainingINR,
        rawCurrency: curr,
        rawCommitted: meta.b2b_committed || dbCharge,
        rawPaid: meta.b2b_paid || 0,
      });

      map[key].totalCommitted += committedINR;
      map[key].totalPaid += paidINR;
      map[key].remainingBalance += remainingINR;
    });

    const list = Object.values(map).map((p) => {
      const pct =
        p.totalCommitted > 0
          ? Math.min(100, Math.round((p.totalPaid / p.totalCommitted) * 100))
          : 100;
      return {
        ...p,
        studentCount: p.students.length,
        disbursementPct: pct,
        isSettled: p.remainingBalance <= 0,
      };
    });

    // Sort: Pending liability highest first, then by committed amount descending
    list.sort((a, b) => {
      if (a.remainingBalance > 0 && b.remainingBalance === 0) return -1;
      if (a.remainingBalance === 0 && b.remainingBalance > 0) return 1;
      if (b.remainingBalance !== a.remainingBalance) return b.remainingBalance - a.remainingBalance;
      return b.totalCommitted - a.totalCommitted;
    });

    return list;
  }, [students]);

  // Global KPI Metrics
  const kpis = useMemo(() => {
    let totalCommitted = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let linkedApps = 0;
    let pendingCount = 0;
    let settledCount = 0;

    partnerPortfolios.forEach((p) => {
      totalCommitted += p.totalCommitted;
      totalPaid += p.totalPaid;
      totalRemaining += p.remainingBalance;
      linkedApps += p.studentCount;
      if (p.remainingBalance > 0) pendingCount++;
      else settledCount++;
    });

    return {
      activePartners: partnerPortfolios.length,
      linkedApps,
      totalCommitted,
      totalPaid,
      totalRemaining,
      pendingCount,
      settledCount,
    };
  }, [partnerPortfolios]);

  // Filtered list for Main Table
  const filteredPortfolios = useMemo(() => {
    return partnerPortfolios.filter((p) => {
      if (statusFilter === 'pending' && p.remainingBalance <= 0) return false;
      if (statusFilter === 'settled' && p.remainingBalance > 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchPartner = p.partnerName.toLowerCase().includes(q);
        const matchStu = p.students.some((s) => s.student.name?.toLowerCase().includes(q));
        if (!matchPartner && !matchStu) return false;
      }
      return true;
    });
  }, [partnerPortfolios, statusFilter, searchQuery]);

  // Currently opened partner in drilldown modal
  const selectedPartner = useMemo(() => {
    if (!selectedPartnerName) return null;
    return partnerPortfolios.find((p) => p.partnerName === selectedPartnerName) || null;
  }, [partnerPortfolios, selectedPartnerName]);

  const filteredModalStudents = useMemo(() => {
    if (!selectedPartner) return [];
    const q = modalSearch.trim().toLowerCase();
    if (!q) return selectedPartner.students;
    return selectedPartner.students.filter((item) => {
      const s = item.student;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q) ||
        s.counselor_name?.toLowerCase().includes(q) ||
        s.intake?.toLowerCase().includes(q)
      );
    });
  }, [selectedPartner, modalSearch]);

  // Export Main B2B Partner Portfolios to Excel
  const handleDownloadPortfolioExcel = () => {
    const rows = filteredPortfolios.map((p, idx) => ({
      '#': idx + 1,
      'Partner Name': p.partnerName,
      'Linked Students': p.studentCount,
      'Committed (₹)': p.totalCommitted,
      'Paid Amount (₹)': p.totalPaid,
      'Remaining Balance (₹)': p.remainingBalance,
      'Disbursement (%)': `${p.disbursementPct}%`,
      'Status': p.remainingBalance > 0 ? `Pending ₹${p.remainingBalance.toLocaleString('en-IN')}` : 'Settled',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'B2B Partner Report');
    const stamp = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
    XLSX.writeFile(wb, `Sterling_B2B_Partners_Report_${stamp}_${timeStr}.xlsx`);
    toast.success(`Downloaded ${rows.length} partner(s) report`);
  };

  // Export Inner Partner Students to Excel
  const handleDownloadPartnerStudentsExcel = () => {
    if (!selectedPartner) return;
    const rows = filteredModalStudents.map((item, idx) => ({
      '#': idx + 1,
      'Partner Name': selectedPartner.partnerName,
      'Student Name': item.student.name,
      'Country': item.student.country || '',
      'Counselor': item.student.counselor_name || '',
      'Intake': item.student.intake || '',
      'B2B Committed (₹)': item.committedINR,
      'B2B Paid (₹)': item.paidINR,
      'Remaining Balance (₹)': item.remainingINR,
      'Status': item.remainingINR > 0 ? `Pending ₹${item.remainingINR.toLocaleString('en-IN')}` : 'Settled',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 22 },
      { wch: 26 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Partner Students');
    const safeName = selectedPartner.partnerName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `B2B_${safeName}_Students_${stamp}.xlsx`);
    toast.success(`Downloaded ${selectedPartner.partnerName} report`);
  };

  // Open Single Student B2B Edit Modal
  const handleOpenEditStudentB2B = (item) => {
    setEditingRow(item);
    setEditForm({
      b2b_agent_name: item.meta.b2b_agent_name || selectedPartner?.partnerName || '',
      b2b_category: item.meta.b2b_category || 'B2B Partner Fee',
      b2b_currency: item.meta.b2b_currency || 'INR',
      b2b_committed: item.meta.b2b_committed || item.committedINR || 0,
      b2b_paid: item.meta.b2b_paid || 0,
      b2b_has_gst: item.meta.b2b_has_gst !== undefined ? item.meta.b2b_has_gst : true,
    });
  };

  // Save Single Student B2B Edit -> Supabase + Billing & Payouts Sync
  const handleSaveStudentB2B = async (e) => {
    e.preventDefault();
    if (!editingRow?.student?.id) return;
    setIsSavingEdit(true);
    try {
      const stu = editingRow.student;
      const oldMeta = editingRow.meta;
      const curr = editForm.b2b_currency || 'INR';
      const committedRaw = Number(editForm.b2b_committed || 0);
      const paidRaw = Number(editForm.b2b_paid || 0);

      const nextMeta = {
        ...oldMeta,
        b2b_agent_name: editForm.b2b_agent_name.trim(),
        b2b_category: editForm.b2b_category || 'B2B Partner Fee',
        b2b_currency: curr,
        b2b_committed: committedRaw,
        b2b_paid: paidRaw,
        b2b_has_gst: curr === 'INR' ? Boolean(editForm.b2b_has_gst) : false,
      };

      const finalNotes = saveStudentAgentMeta(stu.id, stu.name, nextMeta, stu.notes || '');
      const b2bChargeINR = convertToINR(Math.max(committedRaw, paidRaw), curr);

      const { error } = await supabase
        .from('students')
        .update({
          b2b_charge: b2bChargeINR,
          notes: finalNotes,
        })
        .eq('id', stu.id);

      if (error) throw error;

      toast.success(`Updated B2B details for ${stu.name}`);
      setEditingRow(null);
      await fetchStudents();
    } catch (err) {
      console.error('Failed to save B2B edit:', err);
      toast.error('Could not save B2B changes');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Bulk Update Modal (optionally pre-filtered to selectedPartner)
  const handleOpenBulkModal = (preselectPartnerStudents = false) => {
    if (preselectPartnerStudents && selectedPartner) {
      setBulkSelectedIds(new Set(selectedPartner.students.map((i) => i.student.id)));
      setBulkForm({
        b2b_agent_name: selectedPartner.partnerName,
        b2b_category: 'B2B Partner Fee',
        b2b_currency: 'INR',
        b2b_committed: '',
        b2b_paid: '',
        b2b_has_gst: true,
      });
    } else {
      setBulkSelectedIds(new Set());
      setBulkForm({
        b2b_agent_name: '',
        b2b_category: 'B2B Partner Fee',
        b2b_currency: 'INR',
        b2b_committed: '',
        b2b_paid: '',
        b2b_has_gst: true,
      });
    }
    setBulkSearch('');
    setShowBulkModal(true);
  };

  // Execute Bulk B2B Update
  const handleExecuteBulkUpdate = async (e) => {
    e.preventDefault();
    if (bulkSelectedIds.size === 0) {
      toast.error('Select at least one student');
      return;
    }
    setIsSavingBulk(true);
    try {
      const targets = students.filter((s) => bulkSelectedIds.has(s.id));
      for (const stu of targets) {
        const oldMeta = getStudentAgentMeta(stu);
        const curr = bulkForm.b2b_currency || oldMeta.b2b_currency || 'INR';
        const committedRaw =
          bulkForm.b2b_committed !== '' ? Number(bulkForm.b2b_committed) : Number(oldMeta.b2b_committed || stu.b2b_charge || 0);
        const paidRaw =
          bulkForm.b2b_paid !== '' ? Number(bulkForm.b2b_paid) : Number(oldMeta.b2b_paid || 0);

        const nextMeta = {
          ...oldMeta,
          b2b_agent_name: bulkForm.b2b_agent_name.trim() || oldMeta.b2b_agent_name,
          b2b_category: bulkForm.b2b_category || oldMeta.b2b_category || 'B2B Partner Fee',
          b2b_currency: curr,
          b2b_committed: committedRaw,
          b2b_paid: paidRaw,
          b2b_has_gst: curr === 'INR' ? Boolean(bulkForm.b2b_has_gst) : false,
        };

        const finalNotes = saveStudentAgentMeta(stu.id, stu.name, nextMeta, stu.notes || '');
        const b2bChargeINR = convertToINR(Math.max(committedRaw, paidRaw), curr);

        await supabase
          .from('students')
          .update({ b2b_charge: b2bChargeINR, notes: finalNotes })
          .eq('id', stu.id);
      }

      toast.success(`Updated B2B records for ${targets.length} student(s)`);
      setShowBulkModal(false);
      await fetchStudents();
    } catch (err) {
      console.error('Bulk B2B update error:', err);
      toast.error('Bulk update failed');
    } finally {
      setIsSavingBulk(false);
    }
  };

  const bulkFilteredStudents = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    if (!q) return students.slice(0, 60);
    return students
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.country?.toLowerCase().includes(q) ||
          s.counselor_name?.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [students, bulkSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 1. TOP 4 KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div
          style={{
            background: 'var(--bg2solid, #11162a)',
            border: '1px solid var(--border, rgba(148,163,225,0.14))',
            borderTop: '2.5px solid #3B82F6',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted, #A8B2C7)', fontWeight: 600 }}>Active B2B Partners</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#60A5FA', margin: '6px 0 4px' }}>
            {kpis.activePartners}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted, #A8B2C7)' }}>
            {kpis.linkedApps} linked applications
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg2solid, #11162a)',
            border: '1px solid var(--border, rgba(148,163,225,0.14))',
            borderTop: '2.5px solid #F59E0B',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted, #A8B2C7)', fontWeight: 600 }}>Total B2B Committed</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#FBBF24', margin: '6px 0 4px' }}>
            {formatCompactINR(kpis.totalCommitted)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted, #A8B2C7)' }}>contracted partner fees</div>
        </div>

        <div
          style={{
            background: 'var(--bg2solid, #11162a)',
            border: '1px solid var(--border, rgba(148,163,225,0.14))',
            borderTop: '2.5px solid #F43F5E',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted, #A8B2C7)', fontWeight: 600 }}>Total B2B Paid</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#FB7185', margin: '6px 0 4px' }}>
            {formatCompactINR(kpis.totalPaid)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted, #A8B2C7)' }}>disbursed / deducted from profit</div>
        </div>

        <div
          style={{
            background: 'var(--bg2solid, #11162a)',
            border: '1px solid var(--border, rgba(148,163,225,0.14))',
            borderTop: '2.5px solid #06B6D4',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted, #A8B2C7)', fontWeight: 600 }}>Outstanding Liability</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#22D3EE', margin: '6px 0 4px' }}>
            {formatCompactINR(kpis.totalRemaining)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted, #A8B2C7)' }}>remaining balance to disburse</div>
        </div>
      </div>

      {/* 2. PARTNER PORTFOLIOS TABLE CARD */}
      <div
        style={{
          background: 'var(--bg2solid, #11162a)',
          border: '1px solid var(--border, rgba(148,163,225,0.14))',
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Table Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text, #EDEFFA)', textTransform: 'uppercase' }}>
              🏢 B2B Partner Portfolios &amp; Disbursement
            </span>
            <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: statusFilter === 'all' ? '1px solid #7C6FFF' : '1px solid var(--border-strong)',
                  background: statusFilter === 'all' ? 'rgba(124,111,255,0.22)' : 'transparent',
                  color: statusFilter === 'all' ? '#EDEFFA' : 'var(--muted)',
                }}
              >
                All ({kpis.activePartners})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: statusFilter === 'pending' ? '1px solid #F59E0B' : '1px solid var(--border-strong)',
                  background: statusFilter === 'pending' ? 'rgba(245,158,11,0.18)' : 'transparent',
                  color: statusFilter === 'pending' ? '#FBBF24' : 'var(--muted)',
                }}
              >
                ⏳ Pending Liability ({kpis.pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('settled')}
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: statusFilter === 'settled' ? '1px solid #10B981' : '1px solid var(--border-strong)',
                  background: statusFilter === 'settled' ? 'rgba(16,185,129,0.18)' : 'transparent',
                  color: statusFilter === 'settled' ? '#34D399' : 'var(--muted)',
                }}
              >
                ✅ Fully Settled ({kpis.settledCount})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search partner or student..."
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg3, #161b2e)',
                  color: 'var(--text, #EDEFFA)',
                  fontSize: '12px',
                  minWidth: '210px',
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleOpenBulkModal(false)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              ⚡ Bulk Update B2B
            </button>
            <button
              type="button"
              onClick={handleDownloadPortfolioExcel}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              ⬇ Download Excel
            </button>
          </div>
        </div>

        {/* Portfolio Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 12px' }}>Partner Name</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Students</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Committed</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Paid Amount</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Remaining Balance</th>
                <th style={{ padding: '10px 12px', minWidth: '150px' }}>Disbursement</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                    Loading B2B Partner portfolios...
                  </td>
                </tr>
              ) : filteredPortfolios.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                    No B2B Partner records match your filter. Assign a B2B partner on a student or click <strong>⚡ Bulk Update B2B</strong>.
                  </td>
                </tr>
              ) : (
                filteredPortfolios.map((p) => (
                  <tr
                    key={p.key}
                    style={{ borderBottom: '1px solid var(--border, rgba(148,163,225,0.08))' }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(124, 111, 255, 0.16)',
                            border: '1px solid rgba(124, 111, 255, 0.3)',
                            color: '#A78BFA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(p.partnerName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text, #EDEFFA)' }}>{p.partnerName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted, #A8B2C7)' }}>
                            {p.studentCount} student{p.studentCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>
                      {p.studentCount}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {formatCompactINR(p.totalCommitted)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#FB7185' }}>
                      {formatCompactINR(p.totalPaid)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: p.remainingBalance > 0 ? '#FBBF24' : '#34D399' }}>
                      {formatCompactINR(p.remainingBalance)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'rgba(148,163,225,0.15)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${p.disbursementPct}%`,
                              height: '100%',
                              borderRadius: '999px',
                              background: p.disbursementPct >= 100 ? '#10B981' : '#F59E0B',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, minWidth: '34px' }}>
                          {p.disbursementPct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {p.remainingBalance > 0 ? (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: 'rgba(245, 158, 11, 0.14)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: '#FBBF24',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Pending {formatCompactINR(p.remainingBalance)}
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.14)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#34D399',
                          }}
                        >
                          Settled
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPartnerName(p.partnerName);
                          setModalSearch('');
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                          color: '#fff',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View Students ↗
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. INNER PARTNER DRILLDOWN POPUP MODAL (MATCHES SCREENSHOT 2) */}
      {selectedPartner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 8, 16, 0.78)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedPartnerName(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              maxHeight: '88vh',
              background: 'var(--bg2solid, #11162a)',
              border: '1px solid var(--border-strong, rgba(148,163,225,0.28))',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.18)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  🏢
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                    {selectedPartner.partnerName}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {selectedPartner.studentCount} linked student{selectedPartner.studentCount > 1 ? 's' : ''} &bull; Committed: {formatCompactINR(selectedPartner.totalCommitted)} &bull; Paid: {formatCompactINR(selectedPartner.totalPaid)} &bull; Remaining: {formatCompactINR(selectedPartner.remainingBalance)} ({selectedPartner.disbursementPct}% settled)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartnerName(null)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 4 Mini Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Students</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginTop: '3px' }}>{selectedPartner.studentCount}</div>
                </div>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Committed</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#FBBF24', marginTop: '3px' }}>{formatCompactINR(selectedPartner.totalCommitted)}</div>
                </div>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Paid Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#FB7185', marginTop: '3px' }}>{formatCompactINR(selectedPartner.totalPaid)}</div>
                </div>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Remaining Liability</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: selectedPartner.remainingBalance > 0 ? '#FBBF24' : '#34D399', marginTop: '3px' }}>
                    {formatCompactINR(selectedPartner.remainingBalance)}
                  </div>
                </div>
              </div>

              {/* Search + Download Excel + Bulk Manager */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="🔍 Search student name, country, intake..."
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg3)',
                    color: 'var(--text)',
                    fontSize: '12px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadPartnerStudentsExcel}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    ⬇ Download Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenBulkModal(true)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Bulk Manager
                  </button>
                </div>
              </div>

              {/* Students Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '10.5px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Student Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Country &bull; Counselor</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Intake</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>B2B Committed</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>B2B Paid</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Remaining Balance</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalStudents.map((item) => (
                      <tr key={item.student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text)' }}>
                          {item.student.name}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                          {item.student.country || 'N/A'} &bull; {item.student.counselor_name || 'N/A'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                          {item.student.intake || 'N/A'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                          {formatCompactINR(item.committedINR)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#FB7185' }}>
                          {formatCompactINR(item.paidINR)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: item.remainingINR > 0 ? '#FBBF24' : '#34D399' }}>
                          {formatCompactINR(item.remainingINR)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {item.remainingINR > 0 ? (
                            <span style={{ padding: '3px 9px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 700, background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.35)', color: '#FBBF24' }}>
                              Pending {formatCompactINR(item.remainingINR)}
                            </span>
                          ) : (
                            <span style={{ padding: '3px 9px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 700, background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', color: '#34D399' }}>
                              Settled
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudentB2B(item)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'var(--bg3)',
                              border: '1px solid var(--border-strong)',
                              color: 'var(--text)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SINGLE STUDENT B2B EDIT MODAL */}
      {editingRow && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 8, 16, 0.82)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setEditingRow(null)}
        >
          <form
            onSubmit={handleSaveStudentB2B}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              background: 'var(--bg2solid)',
              border: '1px solid var(--border-strong)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                Edit B2B Details — {editingRow.student.name}
              </h4>
              <button type="button" onClick={() => setEditingRow(null)} style={{ color: 'var(--muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>B2B Partner Name</label>
              <input
                type="text"
                list="b2b-partners-datalist"
                value={editForm.b2b_agent_name}
                onChange={(e) => setEditForm({ ...editForm, b2b_agent_name: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)' }}
              />
              <datalist id="b2b-partners-datalist">
                {KNOWN_B2B_PARTNERS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                <select
                  value={editForm.b2b_category}
                  onChange={(e) => setEditForm({ ...editForm, b2b_category: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)' }}
                >
                  <option value="B2B Partner Fee">B2B Partner Fee</option>
                  <option value="Sub-Agent Commission">Sub-Agent Commission</option>
                  <option value="University Processing Fee">University Processing Fee</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Currency</label>
                <select
                  value={editForm.b2b_currency}
                  onChange={(e) => setEditForm({ ...editForm, b2b_currency: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)' }}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Committed ({editForm.b2b_currency})</label>
                <input
                  type="number"
                  value={editForm.b2b_committed}
                  onChange={(e) => setEditForm({ ...editForm, b2b_committed: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Paid ({editForm.b2b_currency})</label>
                <input
                  type="number"
                  value={editForm.b2b_paid}
                  onChange={(e) => setEditForm({ ...editForm, b2b_paid: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)' }}
                />
              </div>
            </div>

            {editForm.b2b_currency === 'INR' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editForm.b2b_has_gst)}
                  onChange={(e) => setEditForm({ ...editForm, b2b_has_gst: e.target.checked })}
                />
                <span>18% GST Applicable</span>
              </label>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button type="button" onClick={() => setEditingRow(null)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', color: 'var(--muted)' }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                style={{ padding: '7px 16px', borderRadius: '8px', background: '#6366F1', color: '#fff', fontWeight: 700 }}
              >
                {isSavingEdit ? 'Saving...' : 'Save & Sync'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. BULK UPDATE B2B MODAL */}
      {showBulkModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 8, 16, 0.82)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowBulkModal(false)}
        >
          <form
            onSubmit={handleExecuteBulkUpdate}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '88vh',
              background: 'var(--bg2solid)',
              border: '1px solid var(--border-strong)',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                ⚡ Bulk Update B2B Partner Details ({bulkSelectedIds.size} selected)
              </h4>
              <button type="button" onClick={() => setShowBulkModal(false)} style={{ color: 'var(--muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Partner Name (Leave blank to keep existing)</label>
                  <input
                    type="text"
                    list="b2b-partners-datalist"
                    value={bulkForm.b2b_agent_name}
                    onChange={(e) => setBulkForm({ ...bulkForm, b2b_agent_name: e.target.value })}
                    placeholder="e.g. Medwizard, Bayroot..."
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select
                    value={bulkForm.b2b_category}
                    onChange={(e) => setBulkForm({ ...bulkForm, b2b_category: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '12px' }}
                  >
                    <option value="B2B Partner Fee">B2B Partner Fee</option>
                    <option value="Sub-Agent Commission">Sub-Agent Commission</option>
                    <option value="University Processing Fee">University Processing Fee</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Currency</label>
                  <select
                    value={bulkForm.b2b_currency}
                    onChange={(e) => setBulkForm({ ...bulkForm, b2b_currency: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '12px' }}
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Set Committed (Optional)</label>
                  <input
                    type="number"
                    value={bulkForm.b2b_committed}
                    onChange={(e) => setBulkForm({ ...bulkForm, b2b_committed: e.target.value })}
                    placeholder="Leave blank to keep existing"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Set Paid (Optional)</label>
                  <input
                    type="number"
                    value={bulkForm.b2b_paid}
                    onChange={(e) => setBulkForm({ ...bulkForm, b2b_paid: e.target.value })}
                    placeholder="Leave blank to keep existing"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <input
                type="text"
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                placeholder="🔍 Filter students to select..."
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '12px' }}
              />

              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                {bulkFilteredStudents.map((s) => {
                  const checked = bulkSelectedIds.has(s.id);
                  return (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        background: checked ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(bulkSelectedIds);
                            if (checked) next.delete(s.id);
                            else next.add(s.id);
                            setBulkSelectedIds(next);
                          }}
                        />
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{s.name}</span>
                        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>({s.country || 'N/A'})</span>
                      </div>
                      <span style={{ color: 'var(--muted)', fontSize: '11px' }}>B2B: ₹{Number(s.b2b_charge || 0).toLocaleString('en-IN')}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button type="button" onClick={() => setShowBulkModal(false)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', color: 'var(--muted)' }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingBulk}
                style={{ padding: '7px 16px', borderRadius: '8px', background: '#6366F1', color: '#fff', fontWeight: 700 }}
              >
                {isSavingBulk ? 'Updating...' : `Update ${bulkSelectedIds.size} Student(s)`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
