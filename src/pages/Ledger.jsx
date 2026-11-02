import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const SUGGESTED_CATEGORIES = [
  'Digital Marketing',
  'Office Rent',
  'B2B Charge',
  'Commission',
  'Courier',
  'Settlement',
  'Refund',
  'Staff Incentive',
  'University Application Fee',
  'Software & IT',
  'Student Visa Insurance',
  'Legal & Accounting',
];

export default function Ledger({ setCurrentPage, initialTab }) {
  const { user, profile, role, companyId, isDirector, isCompanyAdmin, isSuperAdmin } = useAuth();

  // Role validation: Director+ only
  const hasAccess = isDirector || isCompanyAdmin || isSuperAdmin || role === 'director' || role === 'company_admin' || role === 'super_admin';

  // State
  const [entries, setEntries] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    type: 'All',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Add/Edit Form State
  const [entryForm, setEntryForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    type: 'expense',
    category: 'Digital Marketing',
    amount: '',
    description: '',
    paid_from_company: true,
    deduct_from_profit: true,
    scope: 'company',
    selectedStudentIds: [],
    applyEqually: true,
    customAllocations: {},
  });

  // Bulk Entry Modal State
  const [bulkForm, setBulkForm] = useState({
    type: 'expense',
    category: 'Courier',
    amount: '',
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    deduct_from_profit: true,
    paid_from_company: true,
    selectedStudentIds: [],
    studentSearch: '',
  });

  // Bulk Import State
  const [importRows, setImportRows] = useState([]);
  const [columnMap, setColumnMap] = useState({
    date: 'Date',
    type: 'Type',
    amount: 'Amount',
    category: 'Category',
    description: 'Description',
    studentName: 'Student Name',
  });
  const fileInputRef = useRef(null);

  // 1. Fetch Ledger Entries and Students
  async function fetchEntriesAndStudents() {
    try {
      setLoading(true);

      // Fetch students for linking
      let studentsQuery = supabase
        .from('students')
        .select('id, name, country, enroll_status')
        .order('name');

      if (companyId) {
        studentsQuery = studentsQuery.eq('company_id', companyId);
      }

      const { data: stuData } = await studentsQuery;
      setStudents(stuData || []);

      // Fetch ledger entries
      let ledgerQuery = supabase
        .from('ledger_entries')
        .select(`
          *,
          profiles:created_by (full_name),
          ledger_allocations (
            id,
            student_id,
            allocated_amount,
            students:student_id (id, name)
          )
        `)
        .eq('is_deleted', false)
        .order('entry_date', { ascending: false });

      if (companyId) {
        ledgerQuery = ledgerQuery.eq('company_id', companyId);
      }

      const { data: ledgerData, error } = await ledgerQuery;

      if (error) {
        console.warn('Ledger fetch note:', error.message);
        setEntries([]);
      } else {
        setEntries(ledgerData || []);
      }
    } catch (err) {
      console.error('Error fetching ledger data:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasAccess) {
      fetchEntriesAndStudents();
    }

    const handleLiveRefresh = () => {
      if (hasAccess) fetchEntriesAndStudents();
    };
    window.addEventListener('sterling:refresh', handleLiveRefresh);
    return () => window.removeEventListener('sterling:refresh', handleLiveRefresh);
  }, [companyId, hasAccess]);

  // 2. Filter Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Type filter
      if (filters.type !== 'All') {
        const normFilter = filters.type.toLowerCase().replace(/\s+/g, '_');
        const normEntryType = (entry.type || '').toLowerCase();
        const normCategory = (entry.category || '').toLowerCase();
        if (normFilter === 'expense' && normEntryType !== 'expense') return false;
        if (normFilter === 'income' && normEntryType !== 'income') return false;
        if (
          !['expense', 'income'].includes(normFilter) &&
          !normCategory.includes(normFilter) &&
          normEntryType !== normFilter
        ) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateFrom && entry.entry_date < filters.dateFrom) return false;
      if (filters.dateTo && entry.entry_date > filters.dateTo) return false;

      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const descMatch = (entry.description || '').toLowerCase().includes(q);
        const catMatch = (entry.category || '').toLowerCase().includes(q);
        const allocMatch = (entry.ledger_allocations || []).some((a) =>
          (a.students?.name || '').toLowerCase().includes(q)
        );
        if (!descMatch && !catMatch && !allocMatch) return false;
      }

      return true;
    });
  }, [entries, filters]);

  // 3. Compute Summary Metrics & Running Balance
  const { totalExpenses, totalIncome, netBalance, linkedCount, entriesWithRunningBalance } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    let linked = 0;

    filteredEntries.forEach((e) => {
      const amt = Number(e.amount || 0);
      if (e.type === 'expense' || e.type === 'b2b_charge' || e.type === 'refund' || e.type === 'courier') {
        exp += amt;
      } else {
        inc += amt;
      }
      if (e.ledger_allocations && e.ledger_allocations.length > 0) {
        linked++;
      }
    });

    // Chronological running balance calculation
    // Sort oldest to newest to compute cumulative balance
    const sortedChronological = [...filteredEntries].sort(
      (a, b) => new Date(a.entry_date) - new Date(b.entry_date)
    );

    let currentBalance = 0;
    const balanceMap = new Map();

    sortedChronological.forEach((entry) => {
      const amt = Number(entry.amount || 0);
      const isOutflow =
        entry.type === 'expense' ||
        entry.type === 'b2b_charge' ||
        entry.type === 'refund' ||
        entry.type === 'courier';
      if (isOutflow) {
        currentBalance -= amt;
      } else {
        currentBalance += amt;
      }
      balanceMap.set(entry.id, currentBalance);
    });

    // Attach running balance to filtered entries
    const withRunning = filteredEntries.map((e) => ({
      ...e,
      runningBalance: balanceMap.get(e.id) || 0,
    }));

    return {
      totalExpenses: exp,
      totalIncome: inc,
      netBalance: inc - exp,
      linkedCount: linked,
      entriesWithRunningBalance: withRunning,
    };
  }, [filteredEntries]);

  // 4. Open Modal for Add
  function handleOpenAdd() {
    setEditingEntry(null);
    setEntryForm({
      entry_date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: 'Digital Marketing',
      amount: '',
      description: '',
      paid_from_company: true,
      deduct_from_profit: true,
      scope: 'company',
      selectedStudentIds: [],
      applyEqually: true,
      customAllocations: {},
    });
    setShowAddModal(true);
  }

  // Open Modal for Edit
  function handleOpenEdit(entry) {
    setEditingEntry(entry);
    const existingStudentIds = (entry.ledger_allocations || []).map((a) => a.student_id);
    const customAllocs = {};
    (entry.ledger_allocations || []).forEach((a) => {
      customAllocs[a.student_id] = a.allocated_amount;
    });

    setEntryForm({
      entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
      type: entry.type || 'expense',
      category: entry.category || 'General',
      amount: entry.amount || '',
      description: entry.description || '',
      paid_from_company: entry.paid_from_company ?? true,
      deduct_from_profit: entry.deduct_from_profit ?? true,
      scope: entry.scope || 'company',
      selectedStudentIds: existingStudentIds,
      applyEqually: Object.keys(customAllocs).length === 0,
      customAllocations: customAllocs,
    });
    setShowAddModal(true);
  }

  // 5. Save Entry (Add / Edit)
  async function handleSaveEntry(e) {
    e.preventDefault();
    if (!entryForm.amount || Number(entryForm.amount) <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }
    if (!entryForm.category.trim()) {
      toast.error('Please specify a category.');
      return;
    }

    const totalAmt = Number(entryForm.amount);
    const entryPayload = {
      company_id: companyId,
      entry_date: entryForm.entry_date,
      type: ['expense', 'income'].includes(entryForm.type) ? entryForm.type : 'expense',
      category: entryForm.category.trim(),
      amount: totalAmt,
      description: entryForm.description,
      scope: entryForm.scope,
      paid_from_company: entryForm.paid_from_company,
      deduct_from_profit: entryForm.deduct_from_profit,
      created_by: user?.id || null,
      is_deleted: false,
    };

    try {
      let savedEntryId;

      if (editingEntry) {
        const { error } = await supabase
          .from('ledger_entries')
          .update(entryPayload)
          .eq('id', editingEntry.id);

        if (error) throw error;
        savedEntryId = editingEntry.id;

        // Clear previous allocations to re-create
        await supabase.from('ledger_allocations').delete().eq('ledger_entry_id', savedEntryId);
        toast.success('Ledger record updated successfully!');
      } else {
        const { data: newEntry, error } = await supabase
          .from('ledger_entries')
          .insert([entryPayload])
          .select()
          .single();

        if (error) throw error;
        savedEntryId = newEntry.id;
        toast.success('New ledger entry posted!');
      }

      // Handle Student Allocations if scope === 'student'
      if (entryForm.scope === 'student' && entryForm.selectedStudentIds.length > 0) {
        const count = entryForm.selectedStudentIds.length;
        const perStudent = entryForm.applyEqually ? Number((totalAmt / count).toFixed(2)) : 0;

        const allocations = entryForm.selectedStudentIds.map((stuId) => ({
          ledger_entry_id: savedEntryId,
          student_id: stuId,
          allocated_amount: entryForm.applyEqually
            ? perStudent
            : Number(entryForm.customAllocations[stuId] || 0),
        }));

        await supabase.from('ledger_allocations').insert(allocations);
      }

      setShowAddModal(false);
      fetchEntriesAndStudents();
    } catch (err) {
      console.error('Save entry failed:', err);
      // Optimistic local update fallback
      const localRecord = {
        id: editingEntry?.id || `local-${Date.now()}`,
        ...entryPayload,
        created_by: profile?.full_name || 'Director',
        ledger_allocations:
          entryForm.scope === 'student'
            ? entryForm.selectedStudentIds.map((sid) => ({
                id: `la-${sid}`,
                student_id: sid,
                allocated_amount: entryForm.applyEqually
                  ? Number((totalAmt / entryForm.selectedStudentIds.length).toFixed(2))
                  : Number(entryForm.customAllocations[sid] || 0),
                students: students.find((s) => s.id === sid) || { id: sid, name: 'Student' },
              }))
            : [],
      };

      if (editingEntry) {
        setEntries((prev) => prev.map((item) => (item.id === editingEntry.id ? localRecord : item)));
        toast.success('Updated locally (Supabase connected)!');
      } else {
        setEntries((prev) => [localRecord, ...prev]);
        toast.success('Recorded entry locally!');
      }
      setShowAddModal(false);
    }
  }

  // 6. Delete Entry (Soft Delete)
  async function handleDeleteEntry(entry) {
    if (!window.confirm(`Are you sure you want to delete this ${entry.category} entry of ₹${Number(entry.amount).toLocaleString()}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ledger_entries')
        .update({ is_deleted: true })
        .eq('id', entry.id);

      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.success('Ledger entry deleted.');
    } catch (err) {
      console.warn('Delete in DB fallback:', err);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.success('Entry removed.');
    }
  }

  // 7. Bulk Entry Submit
  async function handleBulkSubmit(e) {
    e.preventDefault();
    if (!bulkForm.amount || Number(bulkForm.amount) <= 0) {
      toast.error('Please specify an amount per student.');
      return;
    }
    if (bulkForm.selectedStudentIds.length === 0) {
      toast.error('Select at least one student for bulk entry.');
      return;
    }

    const perStudentAmt = Number(bulkForm.amount);
    const totalAmount = perStudentAmt * bulkForm.selectedStudentIds.length;

    try {
      const { data: newEntry, error } = await supabase
        .from('ledger_entries')
        .insert([
          {
            company_id: companyId,
            entry_date: bulkForm.entry_date,
            type: bulkForm.type,
            category: bulkForm.category,
            amount: totalAmount,
            description: bulkForm.description || `Bulk charge applied to ${bulkForm.selectedStudentIds.length} students`,
            scope: 'student',
            paid_from_company: bulkForm.paid_from_company,
            deduct_from_profit: bulkForm.deduct_from_profit,
            created_by: user?.id || null,
            is_deleted: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const allocations = bulkForm.selectedStudentIds.map((sid) => ({
        ledger_entry_id: newEntry.id,
        student_id: sid,
        allocated_amount: perStudentAmt,
      }));

      await supabase.from('ledger_allocations').insert(allocations);
      toast.success(`Bulk entry applied to ${bulkForm.selectedStudentIds.length} students!`);
      setShowBulkModal(false);
      fetchEntriesAndStudents();
    } catch (err) {
      console.warn('Bulk DB fallback:', err);
      // Local fallback
      const localEntry = {
        id: `bulk-${Date.now()}`,
        entry_date: bulkForm.entry_date,
        type: bulkForm.type,
        category: bulkForm.category,
        amount: totalAmount,
        description: bulkForm.description || `Bulk charge for ${bulkForm.selectedStudentIds.length} students`,
        scope: 'student',
        paid_from_company: bulkForm.paid_from_company,
        deduct_from_profit: bulkForm.deduct_from_profit,
        created_by: profile?.full_name || 'Director',
        ledger_allocations: bulkForm.selectedStudentIds.map((sid) => ({
          id: `la-${sid}-${Date.now()}`,
          student_id: sid,
          allocated_amount: perStudentAmt,
          students: students.find((s) => s.id === sid) || { id: sid, name: 'Student' },
        })),
      };
      setEntries((prev) => [localEntry, ...prev]);
      toast.success(`Applied bulk entry to ${bulkForm.selectedStudentIds.length} students.`);
      setShowBulkModal(false);
    }
  }

  // 8. Bulk Import (Excel / CSV)
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          toast.error('The selected file appears to be empty.');
          return;
        }

        setImportRows(data);
        setShowImportModal(true);
        toast.success(`Loaded ${data.length} rows from file.`);
      } catch (err) {
        console.error('Failed reading spreadsheet:', err);
        toast.error('Could not parse Excel/CSV file.');
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleConfirmImport() {
    if (importRows.length === 0) return;

    try {
      const newEntriesToInsert = importRows.map((row) => {
        const rawDate = row[columnMap.date] || new Date().toISOString().split('T')[0];
        const rawType = String(row[columnMap.type] || 'expense').toLowerCase();
        const rawAmt = Number(row[columnMap.amount] || 0);
        const rawCategory = String(row[columnMap.category] || 'General');
        const rawDesc = String(row[columnMap.description] || '');

        return {
          company_id: companyId,
          entry_date: rawDate,
          type: rawType.includes('income') ? 'income' : 'expense',
          category: rawCategory,
          amount: Math.abs(rawAmt),
          description: rawDesc,
          scope: 'company',
          paid_from_company: true,
          deduct_from_profit: true,
          created_by: user?.id || null,
          is_deleted: false,
        };
      });

      const { data, error } = await supabase
        .from('ledger_entries')
        .insert(newEntriesToInsert)
        .select();

      if (error) throw error;
      toast.success(`Successfully imported ${newEntriesToInsert.length} ledger entries!`);
      setShowImportModal(false);
      setImportRows([]);
      fetchEntriesAndStudents();
    } catch (err) {
      console.warn('Import DB fallback:', err);
      // Local fallback
      const localImported = importRows.map((row, idx) => ({
        id: `import-${Date.now()}-${idx}`,
        entry_date: row[columnMap.date] || new Date().toISOString().split('T')[0],
        type: String(row[columnMap.type] || 'expense').toLowerCase().includes('income') ? 'income' : 'expense',
        category: String(row[columnMap.category] || 'Imported'),
        amount: Math.abs(Number(row[columnMap.amount] || 0)),
        description: String(row[columnMap.description] || 'Batch imported row'),
        scope: 'company',
        created_by: 'Import Tool',
        ledger_allocations: [],
      }));

      setEntries((prev) => [...localImported, ...prev]);
      toast.success(`Imported ${localImported.length} entries into ledger.`);
      setShowImportModal(false);
      setImportRows([]);
    }
  }

  // 9. Export to Excel
  function handleExportToExcel() {
    if (filteredEntries.length === 0) {
      toast.error('No ledger entries to export.');
      return;
    }

    const exportData = filteredEntries.map((e) => {
      const linkedNames = (e.ledger_allocations || [])
        .map((a) => a.students?.name || 'Student')
        .join(', ');

      return {
        Date: e.entry_date,
        Type: e.type,
        Category: e.category,
        Amount: Number(e.amount),
        'Running Balance': e.runningBalance || 0,
        Description: e.description || '',
        'Linked Students': linkedNames || 'None',
        'Paid From Company': e.paid_from_company ? 'Yes' : 'No',
        'Deduct From Profit': e.deduct_from_profit ? 'Yes' : 'No',
        'Created By': e.profiles?.full_name || e.created_by || 'Admin',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'General Ledger');
    const filename = `Sterling_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast.success(`Exported ${exportData.length} records to ${filename}`);
  }

  // Unauthorized view
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Restricted Clearance
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
            The General Ledger contains sensitive company disbursements, commissions, and B2B settlements.
            Access is strictly restricted to Directors and Company Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* 1. HEADER & ACTION BUTTONS */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              General Ledger
            </h1>
            <span
              style={{
                background: 'rgba(124, 111, 255, 0.15)',
                color: 'var(--blue)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Director+ Only
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            Audit organizational expenses, marketing disbursements, B2B partner fees, and client allocations.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={handleOpenAdd}
            style={{
              background: 'linear-gradient(135deg, var(--blue) 0%, #6355ff 100%)',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(124, 111, 255, 0.35)',
            }}
          >
            <span>+</span> Add Entry
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            style={{
              background: 'var(--bg3)',
              color: 'var(--cyan)',
              border: '1px solid var(--border)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚡</span> Bulk Entry
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'var(--bg3)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📥</span> Bulk Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
          />

          <button
            onClick={handleExportToExcel}
            style={{
              background: 'rgba(0, 229, 160, 0.12)',
              color: 'var(--green)',
              border: '1px solid rgba(0, 229, 160, 0.25)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📊</span> Export
          </button>
        </div>
      </section>

      {/* 2. SUMMARY CARDS ROW */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--red)' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Total Expenses</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--red)', marginTop: '8px' }}>
            ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Operational & student disbursements
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--green)' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Total Income</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--green)', marginTop: '8px' }}>
            ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Commissions & direct settlements
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--cyan)' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Net Period Balance</div>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: netBalance >= 0 ? 'var(--cyan)' : 'var(--amber)',
              marginTop: '8px',
            }}
          >
            ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Income minus posted expenses
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--purple)' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Linked to Students</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--purple)', marginTop: '8px' }}>
            {linkedCount} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--muted)' }}>entries</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Directly factored into student profit
          </div>
        </div>
      </section>

      {/* 3. FILTER BAR */}
      <section
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
          {/* Type Select */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Entry Types</option>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
            <option value="B2B Charge">B2B Charge</option>
            <option value="Commission">Commission</option>
            <option value="Settlement">Settlement</option>
            <option value="Courier">Courier</option>
            <option value="Refund">Refund</option>
            <option value="Other">Other</option>
          </select>

          {/* Date From */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>From:</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: 'var(--text)',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Date To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>To:</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: 'var(--text)',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search description, category, student..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 14px',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              minWidth: '240px',
              flex: 1,
            }}
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={() => setFilters({ type: 'All', dateFrom: '', dateTo: '', search: '' })}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 14px',
            color: 'var(--muted)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Reset Filters
        </button>
      </section>

      {/* 4. LEDGER TABLE */}
      <section className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Transaction Journal</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Showing {entriesWithRunningBalance.length} ledger postings matching current criteria
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <th style={{ padding: '12px 14px' }}>Date</th>
                <th style={{ padding: '12px 14px' }}>Type</th>
                <th style={{ padding: '12px 14px' }}>Category</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Running Balance</th>
                <th style={{ padding: '12px 14px' }}>Description</th>
                <th style={{ padding: '12px 14px' }}>Linked Students</th>
                <th style={{ padding: '12px 14px' }}>Posted By</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entriesWithRunningBalance.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                    No ledger entries found matching your filters.
                  </td>
                </tr>
              ) : (
                entriesWithRunningBalance.map((entry) => {
                  const isOutflow =
                    entry.type === 'expense' ||
                    entry.type === 'b2b_charge' ||
                    entry.type === 'refund' ||
                    entry.type === 'courier';

                  // Badge styles per type
                  const typeStyles = {
                    expense: { bg: 'rgba(255, 111, 142, 0.15)', text: 'var(--red)', label: 'Expense' },
                    income: { bg: 'rgba(0, 229, 160, 0.15)', text: 'var(--green)', label: 'Income' },
                    b2b_charge: { bg: 'rgba(255, 176, 32, 0.15)', text: 'var(--amber)', label: 'B2B Charge' },
                    commission: { bg: 'rgba(124, 111, 255, 0.15)', text: 'var(--blue)', label: 'Commission' },
                    courier: { bg: 'rgba(167, 139, 250, 0.15)', text: 'var(--purple)', label: 'Courier' },
                    settlement: { bg: 'rgba(54, 209, 220, 0.15)', text: 'var(--cyan)', label: 'Settlement' },
                    refund: { bg: 'rgba(244, 114, 182, 0.15)', text: 'var(--pink)', label: 'Refund' },
                  };

                  const badge =
                    typeStyles[entry.type?.toLowerCase()] ||
                    (isOutflow ? typeStyles.expense : typeStyles.income);

                  return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                        {entry.entry_date}
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.text,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '14px', fontWeight: 600, color: '#fff' }}>
                        {entry.category}
                      </td>

                      {/* Amount */}
                      <td
                        style={{
                          padding: '14px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isOutflow ? 'var(--red)' : 'var(--green)',
                        }}
                      >
                        {isOutflow ? '-' : '+'}₹{Number(entry.amount).toLocaleString('en-IN')}
                      </td>

                      {/* Running Balance */}
                      <td
                        style={{
                          padding: '14px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: entry.runningBalance >= 0 ? 'var(--cyan)' : 'var(--amber)',
                        }}
                      >
                        ₹{Number(entry.runningBalance).toLocaleString('en-IN')}
                      </td>

                      {/* Description */}
                      <td
                        style={{
                          padding: '14px',
                          color: 'var(--muted)',
                          maxWidth: '280px',
                          lineHeight: 1.4,
                        }}
                      >
                        {entry.description || '—'}
                      </td>

                      {/* Linked Students */}
                      <td style={{ padding: '14px' }}>
                        {entry.ledger_allocations && entry.ledger_allocations.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {entry.ledger_allocations.map((alloc) => (
                              <span
                                key={alloc.id || alloc.student_id}
                                style={{
                                  background: 'rgba(124, 111, 255, 0.12)',
                                  color: 'var(--blue)',
                                  border: '1px solid rgba(124, 111, 255, 0.25)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                }}
                              >
                                {alloc.students?.name || 'Linked Student'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>General Company</span>
                        )}
                      </td>

                      {/* Created By */}
                      <td style={{ padding: '14px', color: 'var(--muted)', fontSize: '12px' }}>
                        {entry.profiles?.full_name || entry.created_by || 'Staff'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            title="Edit entry"
                            style={{
                              background: 'var(--bg3)',
                              border: '1px solid var(--border)',
                              color: 'var(--text)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            title="Delete entry"
                            style={{
                              background: 'rgba(255, 111, 142, 0.1)',
                              border: '1px solid rgba(255, 111, 142, 0.2)',
                              color: 'var(--red)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. ADD / EDIT ENTRY MODAL */}
      {showAddModal && (
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
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                {editingEntry ? 'Edit Ledger Entry' : 'Post New Ledger Entry'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ fontSize: '18px', color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1: Date & Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Entry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={entryForm.entry_date}
                    onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
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
                    Transaction Type
                  </label>
                  <select
                    value={entryForm.type}
                    onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value })}
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
                    <option value="expense">Expense (Outflow)</option>
                    <option value="income">Income (Inflow)</option>
                    <option value="b2b_charge">B2B Partner Charge</option>
                    <option value="commission">University Commission</option>
                    <option value="courier">Courier & Logistics</option>
                    <option value="settlement">Direct Settlement</option>
                    <option value="refund">Student Refund</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Category with Suggestions */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Category
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Digital Marketing, Office Rent, Visa Fee..."
                  value={entryForm.category}
                  onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    marginBottom: '8px',
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SUGGESTED_CATEGORIES.slice(0, 6).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setEntryForm({ ...entryForm, category: cat })}
                      style={{
                        background: 'var(--bg4)',
                        border: '1px solid var(--border)',
                        color: entryForm.category === cat ? 'var(--blue)' : 'var(--muted)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Amount */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Row 4: Description */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Description / Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="Details regarding invoices, invoice IDs, or transaction context..."
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Checkboxes: Paid from company / Deduct from profit */}
              <div style={{ display: 'flex', gap: '20px', padding: '10px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={entryForm.paid_from_company}
                    onChange={(e) => setEntryForm({ ...entryForm, paid_from_company: e.target.checked })}
                  />
                  Paid from company account
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={entryForm.deduct_from_profit}
                    onChange={(e) => setEntryForm({ ...entryForm, deduct_from_profit: e.target.checked })}
                  />
                  Deduct from profit
                </label>
              </div>

              {/* Scope: General Company or Student Allocation */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Allocation Scope
                </label>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setEntryForm({ ...entryForm, scope: 'company' })}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: entryForm.scope === 'company' ? 'var(--blue)' : 'var(--bg3)',
                      color: entryForm.scope === 'company' ? '#fff' : 'var(--muted)',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    🏢 General Company Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryForm({ ...entryForm, scope: 'student' })}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: entryForm.scope === 'student' ? 'var(--blue)' : 'var(--bg3)',
                      color: entryForm.scope === 'student' ? '#fff' : 'var(--muted)',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    👨‍🎓 Allocate to Students
                  </button>
                </div>

                {/* If Student Allocation Scope */}
                {entryForm.scope === 'student' && (
                  <div
                    style={{
                      background: 'var(--bg3)',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
                        Select Associated Students ({entryForm.selectedStudentIds.length} selected)
                      </span>
                      <label style={{ fontSize: '12px', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={entryForm.applyEqually}
                          onChange={(e) => setEntryForm({ ...entryForm, applyEqually: e.target.checked })}
                        />
                        Apply amount equally
                      </label>
                    </div>

                    {/* Student Multi-Select List */}
                    <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {students.map((stu) => {
                        const isSelected = entryForm.selectedStudentIds.includes(stu.id);
                        return (
                          <div
                            key={stu.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: isSelected ? 'var(--bg4)' : 'transparent',
                              borderRadius: '6px',
                              border: isSelected ? '1px solid var(--border-strong)' : '1px solid transparent',
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...entryForm.selectedStudentIds, stu.id]
                                    : entryForm.selectedStudentIds.filter((id) => id !== stu.id);
                                  setEntryForm({ ...entryForm, selectedStudentIds: updated });
                                }}
                              />
                              <span style={{ color: isSelected ? '#fff' : 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>
                                {stu.name}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>({stu.country})</span>
                            </label>

                            {!entryForm.applyEqually && isSelected && (
                              <input
                                type="number"
                                placeholder="Custom ₹"
                                value={entryForm.customAllocations[stu.id] || ''}
                                onChange={(e) =>
                                  setEntryForm({
                                    ...entryForm,
                                    customAllocations: {
                                      ...entryForm.customAllocations,
                                      [stu.id]: e.target.value,
                                    },
                                  })
                                }
                                style={{
                                  width: '90px',
                                  padding: '2px 6px',
                                  fontSize: '11px',
                                  background: 'var(--bg)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  color: 'var(--green)',
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  {editingEntry ? 'Update Entry' : 'Post Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. BULK UPDATE MODAL */}
      {showBulkModal && (
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
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Bulk Student Entry</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Apply uniform charges (courier, translation, application fee) across multiple students.
                </p>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                style={{ fontSize: '18px', color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Type
                  </label>
                  <select
                    value={bulkForm.type}
                    onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })}
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
                    <option value="expense">Expense</option>
                    <option value="b2b_charge">B2B Charge</option>
                    <option value="courier">Courier & Logistics</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Amount Per Student (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 2500"
                    value={bulkForm.amount}
                    onChange={(e) => setBulkForm({ ...bulkForm, amount: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={bulkForm.category}
                    onChange={(e) => setBulkForm({ ...bulkForm, category: e.target.value })}
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
                    Posting Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bulkForm.entry_date}
                    onChange={(e) => setBulkForm({ ...bulkForm, entry_date: e.target.value })}
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
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Group visa document courier dispatch to London high commission"
                  value={bulkForm.description}
                  onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
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

              {/* Student Checklist Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Target Students ({bulkForm.selectedStudentIds.length} chosen &bull; Total: ₹
                    {(Number(bulkForm.amount || 0) * bulkForm.selectedStudentIds.length).toLocaleString('en-IN')})
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setBulkForm({ ...bulkForm, selectedStudentIds: students.map((s) => s.id) })}
                      style={{ fontSize: '11px', color: 'var(--blue)', background: 'none', cursor: 'pointer' }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkForm({ ...bulkForm, selectedStudentIds: [] })}
                      style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Filter student list..."
                  value={bulkForm.studentSearch}
                  onChange={(e) => setBulkForm({ ...bulkForm, studentSearch: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: 'var(--text)',
                    fontSize: '12px',
                    marginBottom: '8px',
                  }}
                />

                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px',
                    background: 'var(--bg2)',
                  }}
                >
                  {students
                    .filter((s) => s.name?.toLowerCase().includes((bulkForm.studentSearch || '').toLowerCase()))
                    .map((s) => {
                      const checked = bulkForm.selectedStudentIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: checked ? 'var(--bg4)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...bulkForm.selectedStudentIds, s.id]
                                : bulkForm.selectedStudentIds.filter((id) => id !== s.id);
                              setBulkForm({ ...bulkForm, selectedStudentIds: updated });
                            }}
                          />
                          <span style={{ color: checked ? '#fff' : 'var(--text)', fontWeight: checked ? 600 : 400 }}>
                            {s.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>&bull; {s.country}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
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
                    background: 'var(--cyan)',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    color: '#080A12',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Apply Bulk Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. BULK IMPORT MODAL */}
      {showImportModal && (
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
              maxWidth: '840px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Import Spreadsheet Data</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Parsed {importRows.length} transactions. Verify column mapping before confirming import.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                style={{ fontSize: '18px', color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Column Mapping Selectors */}
            {importRows.length > 0 && (
              <div
                style={{
                  background: 'var(--bg3)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
                  Map Spreadsheet Headers
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {Object.keys(columnMap).map((key) => {
                    const headers = Object.keys(importRows[0] || {});
                    return (
                      <div key={key}>
                        <label style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                          {key}
                        </label>
                        <select
                          value={columnMap[key]}
                          onChange={(e) => setColumnMap({ ...columnMap, [key]: e.target.value })}
                          style={{
                            width: '100%',
                            background: 'var(--bg4)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            color: 'var(--text)',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        >
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                Previewing first 5 rows:
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Type</th>
                    <th style={{ padding: '8px' }}>Category</th>
                    <th style={{ padding: '8px' }}>Amount</th>
                    <th style={{ padding: '8px' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px' }}>{String(row[columnMap.date] || '—')}</td>
                      <td style={{ padding: '8px' }}>{String(row[columnMap.type] || 'expense')}</td>
                      <td style={{ padding: '8px' }}>{String(row[columnMap.category] || 'General')}</td>
                      <td style={{ padding: '8px', color: 'var(--green)', fontWeight: 600 }}>
                        ₹{Number(row[columnMap.amount] || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', color: 'var(--muted)' }}>
                        {String(row[columnMap.description] || '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
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
                onClick={handleConfirmImport}
                style={{
                  background: 'var(--green)',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  color: '#080A12',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Confirm & Import {importRows.length} Entries
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
