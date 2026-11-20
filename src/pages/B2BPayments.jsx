import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

/**
 * INITIAL_B2B_PAYMENTS
 * Pre-populated with the user's 9 live entries from Microsoft To-Do,
 * now enhanced with:
 * - Specific "Which Account to Transfer" beneficiary details for Accounts team
 * - 18% GST calculation (Base Amount, 18% GST Amount, Total With GST)
 * - Foreign payments explicitly exempt from GST (0% GST)
 */
const INITIAL_B2B_PAYMENTS = [
  {
    id: 'b2b-001',
    partner_name: 'Consult Fox',
    transfer_account: 'HDFC Bank A/C: 50200038291048 | IFSC: HDFC0000240 | Beneficiary: Consult Fox Edutech Pvt Ltd',
    student_names: 'Thejus & Nivil',
    amount: 180000,
    currency: 'INR',
    has_gst: true, // 18% GST applies
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0], // Tomorrow
    priority: true,
    status: 'pending',
    notes: 'Sub-agent commission for Thejus & Nivil enrollment',
    created_at: '2026-11-15T10:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-002',
    partner_name: 'VFS & Insurance',
    transfer_account: 'VFS Global Services / ICICI Portal Virtual A/C: VFS9948201',
    student_names: 'Abhijith Bulgaria (Agiya & Lekshmipriya)',
    amount: 20780,
    currency: 'INR',
    has_gst: false,
    category: 'VFS & Insurance',
    due_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], // Overdue by 1 day
    priority: false,
    status: 'pending',
    notes: 'Visa appointment & travel insurance fees',
    created_at: '2026-11-14T11:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-003',
    partner_name: 'Rashin Team',
    transfer_account: 'UPI ID: rashin.team@okaxis | Canara Bank A/C: 0849101004928',
    student_names: 'Liza',
    amount: 20000,
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Counselor commission to Rashin team for student Liza',
    created_at: '2026-11-16T09:15:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-004',
    partner_name: 'Future Factory',
    transfer_account: 'Wire / Swift: US58CITI10009284102 | Future Factory LLC, Delaware, USA',
    student_names: 'Vivek & Hanock',
    amount: 500,
    currency: 'USD',
    has_gst: false, // Foreign payment: No GST
    category: 'B2B Sub-Agent',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    priority: true,
    status: 'pending',
    notes: 'Overseas partner commission for Vivek & Hanock',
    created_at: '2026-11-16T14:20:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-005',
    partner_name: 'Future Factory',
    transfer_account: 'Wire / Swift: US58CITI10009284102 | Future Factory LLC, Delaware, USA',
    student_names: 'Annalise & Megha',
    amount: 500,
    currency: 'USD',
    has_gst: false, // Foreign payment: No GST
    category: 'B2B Sub-Agent',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Overseas partner commission for Annalise & Megha',
    created_at: '2026-11-17T11:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-006',
    partner_name: 'Empire - Lithuania',
    transfer_account: 'IBAN: LT427044060001829482 | Swedbank Vilnius | Empire Int. Edu',
    student_names: 'Annlin v Jose',
    amount: 1000,
    currency: 'EUR',
    has_gst: false, // Foreign payment: No GST
    category: 'Partner University / B2B',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Partner registration fee for Lithuania admission',
    created_at: '2026-11-17T15:45:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-007',
    partner_name: 'Abroad Angel Poland',
    transfer_account: 'SBI Current A/C: 38291049281 | IFSC: SBIN0004829 | Kochi Branch',
    student_names: 'Gayathri, Achsah, Anna Biju',
    amount: 70800,
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    priority: true,
    status: 'pending',
    notes: 'Poland batch partner commission for 3 students',
    created_at: '2026-11-18T10:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-008',
    partner_name: 'Comfort Travel',
    transfer_account: 'Federal Bank A/C: 14200200039281 | IFSC: FDRL0001420 | Ernakulam',
    student_names: 'Apostille Batch',
    amount: 59550,
    currency: 'INR',
    has_gst: false,
    category: 'Apostille Charges',
    due_date: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'MEA document apostille and legal verification batch',
    created_at: '2026-11-18T12:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-009',
    partner_name: 'Medwizard',
    transfer_account: 'Axis Bank A/C: 921020048291028 | IFSC: UTIB0000829 | Beneficiary: Medwizard Overseas',
    student_names: 'Esabella',
    amount: 24000,
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Medical admission referral commission',
    created_at: '2026-11-19T08:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-010',
    partner_name: 'EduGlobal Services',
    transfer_account: 'ICICI Bank A/C: 002905001829 | IFSC: ICIC0000029',
    student_names: 'Kiran Mathew',
    amount: 15000,
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: '2026-11-10',
    priority: false,
    status: 'completed',
    notes: 'Kiran Mathew intake commission settled',
    created_at: '2026-11-05T10:00:00.000Z',
    settled_at: '2026-11-10T16:20:00.000Z',
    payment_mode: 'UPI / GPay',
    utr_number: 'UPI/638291048291',
  },
];

const CATEGORIES = [
  'Sub-Agent Commission',
  'B2B Sub-Agent',
  'VFS & Insurance',
  'Apostille Charges',
  'Partner University / B2B',
  'University Fee',
  'Courier / Dispatch',
  'Other',
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export const EXPORT_COLUMNS_DEF = [
  { id: 'sl_no', label: 'Sl No', key: 'Sl No', default: true, wch: 6 },
  { id: 'partner_name', label: 'Partner / Beneficiary Name', key: 'Partner / Beneficiary', default: true, wch: 24 },
  { id: 'transfer_account', label: 'Transfer To (Account Details)', key: 'Transfer To (Account Details)', default: true, wch: 38 },
  { id: 'student_names', label: 'Linked Student(s)', key: 'Linked Student(s)', default: true, wch: 25 },
  { id: 'total_amount', label: 'Total Amount (With GST)', key: 'Total Amount With GST', default: true, wch: 20 },
  { id: 'base_amount', label: 'Base Amount (Without GST)', key: 'Amount Without GST', default: true, wch: 20 },
  { id: 'gst_amount', label: 'GST (18%) Amount', key: 'GST 18% Amount', default: true, wch: 16 },
  { id: 'gst_rate', label: 'GST Rate (%)', key: 'GST Rate (%)', default: false, wch: 12 },
  { id: 'currency', label: 'Currency', key: 'Currency', default: true, wch: 10 },
  { id: 'due_date', label: 'Due Date', key: 'Due Date', default: true, wch: 14 },
  { id: 'status', label: 'Payment Status', key: 'Status', default: true, wch: 16 },
  { id: 'category', label: 'Category', key: 'Category', default: false, wch: 20 },
  { id: 'settled_at', label: 'Settled Date', key: 'Settled Date', default: false, wch: 14 },
  { id: 'payment_mode', label: 'Payment Mode', key: 'Payment Mode', default: false, wch: 20 },
  { id: 'utr_number', label: 'Bank UTR / Ref #', key: 'Bank UTR / Reference', default: false, wch: 22 },
  { id: 'notes', label: 'Remarks / Notes', key: 'Remarks / Notes', default: false, wch: 30 },
];

export default function B2BPayments({ setCurrentPage }) {
  const { user } = useAuth();

  // Primary State
  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem('sterling_b2b_payments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved b2b payments', e);
    }
    return INITIAL_B2B_PAYMENTS;
  });

  // ERP Students list for autocomplete
  const [erpStudents, setErpStudents] = useState([]);

  // Selection state for downloading selected items
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'urgent', 'completed', 'all'
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);

  // Quick Inline Input (Microsoft To-Do style)
  const [quickInput, setQuickInput] = useState('');

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    partner_name: '',
    transfer_account: '',
    student_names: '',
    amount: '',
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: '',
    priority: false,
    notes: '',
  });

  // Settlement Modal State
  const [settlingPayment, setSettlingPayment] = useState(null);
  const [settlementData, setSettlementData] = useState({
    settled_at: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer (IMPS / NEFT)',
    utr_number: '',
    notes: '',
  });

  // Student suggestions dropdown
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

  // Download / Export Customization Modal State (User selectable fields & scope)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState('all'); // 'selected' | 'filtered' | 'all'
  const [exportColIds, setExportColIds] = useState(() =>
    new Set(EXPORT_COLUMNS_DEF.filter((c) => c.default).map((c) => c.id))
  );
  const [includeBottomTotal, setIncludeBottomTotal] = useState(true);
  const [exportFormat, setExportFormat] = useState('xlsx'); // 'xlsx' | 'csv'

  // Persist payments to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sterling_b2b_payments', JSON.stringify(payments));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [payments]);

  // Fetch ERP students on mount for autocomplete
  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, name, country, intake')
          .order('name');
        if (!error && data) {
          setErpStudents(data);
        }
      } catch (err) {
        console.warn('Student lookup not available:', err);
      }
    }
    fetchStudents();
  }, []);

  // Helper: Calculate GST (18%) and Totals
  const calculateFinancials = (payment) => {
    const base = Number(payment.amount) || 0;
    const isForeign = payment.currency !== 'INR';
    // Rule: Foreign payment NO GST (0%)
    if (isForeign || !payment.has_gst) {
      return {
        baseAmount: base,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: base,
      };
    }
    // 18% GST on INR
    const gstAmount = Math.round(base * 0.18);
    const totalAmount = base + gstAmount;
    return {
      baseAmount: base,
      gstRate: 18,
      gstAmount: gstAmount,
      totalAmount: totalAmount,
    };
  };

  // Helper: Format Money
  const formatMoney = (amount, currency = 'INR') => {
    const num = Number(amount) || 0;
    if (currency === 'INR') return '₹' + num.toLocaleString('en-IN');
    if (currency === 'USD') return '$' + num.toLocaleString('en-US');
    if (currency === 'EUR') return '€' + num.toLocaleString('en-DE');
    if (currency === 'GBP') return '£' + num.toLocaleString('en-GB');
    return `${currency} ${num.toLocaleString()}`;
  };

  // Helper: Due Date Status
  const getDueStatus = (dueDateStr) => {
    if (!dueDateStr) return { text: 'No due date', urgent: false, color: 'var(--muted, #8B949E)' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dueDateStr.split('-').map(Number);
    const dueDate = new Date(y, m - 1, d);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `Overdue (${Math.abs(diffDays)}d)`, urgent: true, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.14)' };
    }
    if (diffDays === 0) {
      return { text: 'Due Today', urgent: true, color: '#F97316', bg: 'rgba(249, 115, 22, 0.16)' };
    }
    if (diffDays === 1) {
      return { text: 'Due Tomorrow', urgent: true, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.16)' };
    }
    if (diffDays <= 3) {
      return { text: `Due in ${diffDays}d`, urgent: true, color: '#EAB308', bg: 'rgba(234, 179, 8, 0.14)' };
    }
    const formatted = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { text: formatted, urgent: false, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
  };

  // Top Metric Cards Calculation
  const metrics = useMemo(() => {
    let pendingWithoutGstINR = 0;
    let pendingGstAmountINR = 0;
    let pendingWithGstINR = 0;

    let pendingUSD = 0;
    let pendingEUR = 0;
    let overdueCount = 0;
    let pendingCount = 0;

    payments.forEach((p) => {
      if (p.status !== 'completed') {
        pendingCount++;
        const fin = calculateFinancials(p);
        if (p.currency === 'INR') {
          pendingWithoutGstINR += fin.baseAmount;
          pendingGstAmountINR += fin.gstAmount;
          pendingWithGstINR += fin.totalAmount;
        } else if (p.currency === 'USD') {
          pendingUSD += fin.baseAmount;
        } else if (p.currency === 'EUR') {
          pendingEUR += fin.baseAmount;
        }

        const due = getDueStatus(p.due_date);
        if (due.urgent) overdueCount++;
      }
    });

    return {
      pendingWithoutGstINR,
      pendingGstAmountINR,
      pendingWithGstINR,
      pendingUSD,
      pendingEUR,
      overdueCount,
      pendingCount,
    };
  }, [payments]);

  // Selection Checkbox Logic
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (listToSelect) => {
    if (selectedIds.size === listToSelect.length && listToSelect.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(listToSelect.map((p) => p.id)));
    }
  };

  // Quick Add Parser (Microsoft To-Do style)
  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const raw = quickInput.trim();
    let detectedCurrency = 'INR';
    let detectedAmount = 0;
    let detectedPartner = '';
    let detectedStudent = '';
    let hasGst = false;

    if (/\$|usd/i.test(raw)) detectedCurrency = 'USD';
    else if (/€|eur/i.test(raw)) detectedCurrency = 'EUR';
    else if (/£|gbp/i.test(raw)) detectedCurrency = 'GBP';

    if (detectedCurrency === 'INR' && /gst/i.test(raw)) {
      hasGst = true; // 18% GST
    }

    const numMatch = raw.match(/(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+)/);
    if (numMatch) {
      detectedAmount = parseFloat(numMatch[1].replace(/,/g, ''));
    }

    const parts = raw.split(/[-–—:]+/).map((s) => s.trim());
    if (parts.length >= 2) {
      detectedPartner = parts[0];
      detectedStudent = parts.slice(1).join(' - ');
    } else {
      detectedPartner = raw;
    }

    detectedPartner = detectedPartner.replace(/\b(\d+[\d,.]*|\$|€|£|inr|usd|eur|gbp)\b/gi, '').trim();
    if (!detectedPartner) detectedPartner = 'Partner Payable';

    const defaultDue = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const newPayment = {
      id: 'b2b-' + Date.now(),
      partner_name: detectedPartner,
      transfer_account: '', // user can add later or in edit
      student_names: detectedStudent || 'Linked Student',
      amount: detectedAmount || 10000,
      currency: detectedCurrency,
      has_gst: hasGst,
      category: 'Sub-Agent Commission',
      due_date: defaultDue,
      priority: false,
      status: 'pending',
      notes: raw,
      created_at: new Date().toISOString(),
      settled_at: null,
      payment_mode: null,
      utr_number: null,
    };

    setPayments((prev) => [newPayment, ...prev]);
    setQuickInput('');
    toast.success(`Added payment reminder for ${detectedPartner}!`);
  };

  // Open Settlement Modal
  const handleOpenSettle = (payment) => {
    if (payment.status === 'completed') {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: 'pending', settled_at: null, payment_mode: null, utr_number: null }
            : p
        )
      );
      toast.success(`Restored ${payment.partner_name} back to pending.`);
      return;
    }

    setSettlingPayment(payment);
    setSettlementData({
      settled_at: new Date().toISOString().split('T')[0],
      payment_mode: 'Bank Transfer (IMPS / NEFT)',
      utr_number: '',
      notes: payment.notes || '',
    });
  };

  // Confirm Settlement
  const handleConfirmSettlement = (e) => {
    e.preventDefault();
    if (!settlingPayment) return;

    setPayments((prev) =>
      prev.map((p) =>
        p.id === settlingPayment.id
          ? {
              ...p,
              status: 'completed',
              settled_at: settlementData.settled_at,
              payment_mode: settlementData.payment_mode,
              utr_number: settlementData.utr_number.trim(),
              notes: settlementData.notes,
            }
          : p
      )
    );

    const fin = calculateFinancials(settlingPayment);
    toast.success(`Settled ${formatMoney(fin.totalAmount, settlingPayment.currency)} to ${settlingPayment.partner_name}!`);
    setSettlingPayment(null);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingPayment(null);
    setFormData({
      partner_name: '',
      transfer_account: '',
      student_names: '',
      amount: '',
      currency: 'INR',
      has_gst: false,
      category: 'Sub-Agent Commission',
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      priority: false,
      notes: '',
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (payment) => {
    setEditingPayment(payment);
    setFormData({
      partner_name: payment.partner_name || '',
      transfer_account: payment.transfer_account || '',
      student_names: payment.student_names || '',
      amount: payment.amount || '',
      currency: payment.currency || 'INR',
      has_gst: payment.has_gst || false,
      category: payment.category || 'Sub-Agent Commission',
      due_date: payment.due_date || '',
      priority: payment.priority || false,
      notes: payment.notes || '',
    });
    setShowModal(true);
  };

  // Save Add/Edit Modal
  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formData.partner_name.trim()) {
      toast.error('Partner name is required');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Force foreign payment to no GST
    const isForeign = formData.currency !== 'INR';
    const finalHasGst = isForeign ? false : formData.has_gst;

    if (editingPayment) {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === editingPayment.id
            ? {
                ...p,
                partner_name: formData.partner_name.trim(),
                transfer_account: formData.transfer_account.trim(),
                student_names: formData.student_names.trim(),
                amount: amt,
                currency: formData.currency,
                has_gst: finalHasGst,
                category: formData.category,
                due_date: formData.due_date,
                priority: formData.priority,
                notes: formData.notes.trim(),
              }
            : p
        )
      );
      toast.success('Payment updated');
    } else {
      const newRecord = {
        id: 'b2b-' + Date.now(),
        partner_name: formData.partner_name.trim(),
        transfer_account: formData.transfer_account.trim(),
        student_names: formData.student_names.trim(),
        amount: amt,
        currency: formData.currency,
        has_gst: finalHasGst,
        category: formData.category,
        due_date: formData.due_date,
        priority: formData.priority,
        status: 'pending',
        notes: formData.notes.trim(),
        created_at: new Date().toISOString(),
        settled_at: null,
        payment_mode: null,
        utr_number: null,
      };
      setPayments((prev) => [newRecord, ...prev]);
      toast.success('Payment added');
    }
    setShowModal(false);
  };

  // Delete Payment
  const handleDelete = (id, partner) => {
    if (window.confirm(`Delete payment reminder for "${partner}"?`)) {
      setPayments((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Removed');
    }
  };

  // Open Export Customization Modal
  const openExportModal = (scope = 'all') => {
    if (scope === 'selected' && selectedIds.size === 0) {
      toast.error('Please select at least one payment row first');
      return;
    }
    setExportScope(scope);
    setShowExportModal(true);
  };

  // Toggle single column selection
  const handleToggleExportCol = (id) => {
    setExportColIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Apply Quick Column Presets
  const handleApplyExportPreset = (preset) => {
    if (preset === 'accounts_quick') {
      // Cleanest transfer list for Accounts to make payouts
      setExportColIds(new Set(['sl_no', 'partner_name', 'transfer_account', 'student_names', 'total_amount', 'currency']));
      toast.success('Applied "Accounts Quick Transfer" columns preset');
    } else if (preset === 'accounts_gst') {
      // Full accounts breakdown with Base + 18% GST + Total
      setExportColIds(new Set(['sl_no', 'partner_name', 'transfer_account', 'student_names', 'base_amount', 'gst_amount', 'total_amount', 'currency', 'due_date']));
      toast.success('Applied "Accounts with 18% GST" columns preset');
    } else if (preset === 'all') {
      setExportColIds(new Set(EXPORT_COLUMNS_DEF.map((c) => c.id)));
      toast.success('Selected all columns');
    } else if (preset === 'none') {
      setExportColIds(new Set());
    }
  };

  // Execute Excel / CSV Download with Chosen Columns & Scope
  const handleExecuteExport = () => {
    let dataset = payments;
    if (exportScope === 'selected') {
      if (selectedIds.size === 0) {
        toast.error('Please select at least one payment from the table');
        return;
      }
      dataset = payments.filter((p) => selectedIds.has(p.id));
    } else if (exportScope === 'filtered') {
      dataset = filteredList;
    }

    if (dataset.length === 0) {
      toast.error('No payments to export');
      return;
    }

    if (exportColIds.size === 0) {
      toast.error('Please select at least one column to include in the Excel file');
      return;
    }

    // Active chosen columns in defined order
    const activeCols = EXPORT_COLUMNS_DEF.filter((c) => exportColIds.has(c.id));

    // Map rows based ONLY on selected columns
    const rows = dataset.map((p, idx) => {
      const fin = calculateFinancials(p);
      const row = {};

      activeCols.forEach((col) => {
        switch (col.id) {
          case 'sl_no':
            row[col.key] = idx + 1;
            break;
          case 'partner_name':
            row[col.key] = p.partner_name || '';
            break;
          case 'transfer_account':
            row[col.key] = p.transfer_account || 'Not Specified';
            break;
          case 'student_names':
            row[col.key] = p.student_names || '';
            break;
          case 'total_amount':
            row[col.key] = fin.totalAmount;
            break;
          case 'base_amount':
            row[col.key] = fin.baseAmount;
            break;
          case 'gst_amount':
            row[col.key] = fin.gstAmount;
            break;
          case 'gst_rate':
            row[col.key] = fin.gstRate > 0 ? `${fin.gstRate}%` : '0% (Exempt)';
            break;
          case 'currency':
            row[col.key] = p.currency || 'INR';
            break;
          case 'due_date':
            row[col.key] = p.due_date || 'No Date';
            break;
          case 'status':
            row[col.key] = p.status === 'completed' ? 'PAID / SETTLED' : 'PENDING PAYMENT';
            break;
          case 'category':
            row[col.key] = p.category || '';
            break;
          case 'settled_at':
            row[col.key] = p.settled_at || '';
            break;
          case 'payment_mode':
            row[col.key] = p.payment_mode || '';
            break;
          case 'utr_number':
            row[col.key] = p.utr_number || '';
            break;
          case 'notes':
            row[col.key] = p.notes || '';
            break;
          default:
            break;
        }
      });

      return row;
    });

    // Add Bottom Summary Row if requested
    if (includeBottomTotal) {
      let totalWithoutGstINR = 0;
      let totalGstINR = 0;
      let totalWithGstINR = 0;
      dataset.forEach((p) => {
        if (p.currency === 'INR') {
          const fin = calculateFinancials(p);
          totalWithoutGstINR += fin.baseAmount;
          totalGstINR += fin.gstAmount;
          totalWithGstINR += fin.totalAmount;
        }
      });

      const totalRow = {};
      activeCols.forEach((col) => {
        if (col.id === 'sl_no') totalRow[col.key] = '';
        else if (col.id === 'partner_name') totalRow[col.key] = 'TOTAL (INR Domestic)';
        else if (col.id === 'base_amount') totalRow[col.key] = totalWithoutGstINR;
        else if (col.id === 'gst_amount') totalRow[col.key] = totalGstINR;
        else if (col.id === 'total_amount') totalRow[col.key] = totalWithGstINR;
        else if (col.id === 'gst_rate') totalRow[col.key] = '18%';
        else if (col.id === 'currency') totalRow[col.key] = 'INR';
        else if (col.id === 'status') totalRow[col.key] = 'Calculated for Accounts';
        else totalRow[col.key] = '';
      });

      rows.push(totalRow);
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = activeCols.map((c) => ({ wch: c.wch }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'B2B Payables');

    const dateStr = new Date().toISOString().split('T')[0];
    const fileBase = `Sterling_B2B_Payables_${exportScope}_${dateStr}`;

    if (exportFormat === 'csv') {
      XLSX.writeFile(workbook, `${fileBase}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, `${fileBase}.xlsx`);
    }

    setShowExportModal(false);
    toast.success(`Exported ${dataset.length} payment(s) with ${activeCols.length} chosen columns!`);
  };

  // Filtered Payments List
  const filteredList = useMemo(() => {
    let list = [...payments];

    // Status filter
    if (statusFilter === 'pending') {
      list = list.filter((p) => p.status === 'pending');
    } else if (statusFilter === 'urgent') {
      list = list.filter((p) => {
        if (p.status !== 'pending') return false;
        return getDueStatus(p.due_date).urgent;
      });
    } else if (statusFilter === 'completed') {
      list = list.filter((p) => p.status === 'completed');
    }

    // Currency filter
    if (currencyFilter !== 'All') {
      list = list.filter((p) => p.currency === currencyFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.partner_name?.toLowerCase().includes(q) ||
          p.transfer_account?.toLowerCase().includes(q) ||
          p.student_names?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q) ||
          p.utr_number?.toLowerCase().includes(q)
      );
    }

    // Sort: Starred first, then earliest due date
    list.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

    return list;
  }, [payments, statusFilter, currencyFilter, searchQuery]);

  const pendingItems = filteredList.filter((p) => p.status === 'pending');
  const completedItems = filteredList.filter((p) => p.status === 'completed');

  const allVisibleSelected =
    filteredList.length > 0 && filteredList.every((p) => selectedIds.has(p.id));

  return (
    <div className="b2b-simple-container">
      <style>{`
        .b2b-simple-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: var(--text, #0E1326);
          font-family: inherit;
        }

        /* Top Simple Clean Header */
        .b2b-top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-title-box h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: var(--text, #EDEFFA);
          letter-spacing: -0.01em;
        }

        .header-title-box p {
          font-size: 13px;
          color: var(--muted, #8B949E);
          margin: 3px 0 0;
        }

        .header-action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-simple-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #4F46E5;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-simple-primary:hover {
          background: #4338CA;
        }

        .btn-simple-download {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg2, #ffffff);
          color: var(--text, #0E1326);
          border: 1px solid var(--border-strong, rgba(148, 163, 225, 0.3));
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-simple-download:hover {
          background: var(--bg3, #F4F6FC);
          border-color: #4F46E5;
        }

        .btn-simple-download.selected-active {
          background: #10B981;
          color: #ffffff;
          border-color: #10B981;
        }

        /* 4 Clean Minimal KPI Metric Cards */
        .simple-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 12px;
        }

        .simple-kpi-card {
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .simple-kpi-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--muted, #8B949E);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .simple-kpi-val {
          font-size: 20px;
          font-weight: 800;
          color: var(--text, #EDEFFA);
        }

        .simple-kpi-val.highlight {
          color: #10B981;
        }

        .simple-kpi-val.tax {
          color: #F59E0B;
        }

        .simple-kpi-sub {
          font-size: 11.5px;
          color: var(--muted, #8B949E);
        }

        /* Microsoft To-Do Minimal Input */
        .simple-quick-add {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.25));
          border-radius: 10px;
          padding: 8px 14px;
        }

        .simple-quick-add input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text, #EDEFFA);
          font-size: 13.5px;
          outline: none;
        }

        .simple-quick-add input::placeholder {
          color: var(--muted, #8B949E);
        }

        /* Simple Controls & Filters Row */
        .simple-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .simple-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .simple-tab-btn {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          background: var(--bg2, #ffffff);
          color: var(--muted, #8B949E);
          cursor: pointer;
          transition: all 0.15s;
        }

        .simple-tab-btn.active {
          background: #4F46E5;
          color: #ffffff;
          border-color: #4F46E5;
        }

        .simple-search-box {
          position: relative;
        }

        .simple-search-box input {
          padding: 6px 12px 6px 28px;
          border-radius: 6px;
          border: 1px solid var(--border, rgba(148, 163, 225, 0.25));
          background: var(--bg2, #ffffff);
          color: var(--text, #EDEFFA);
          font-size: 12.5px;
          outline: none;
        }

        .simple-search-box .icon {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: var(--muted, #8B949E);
        }

        /* Selection Floating / Action Bar */
        .selection-action-bar {
          background: rgba(79, 70, 229, 0.12);
          border: 1px solid rgba(79, 70, 229, 0.35);
          border-radius: 8px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        /* Clean Modern Financial Table */
        .simple-table-wrapper {
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .simple-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }

        .simple-table th {
          background: var(--bg3, #F4F6FC);
          padding: 10px 14px;
          font-weight: 700;
          font-size: 11.5px;
          color: var(--muted, #8B949E);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          white-space: nowrap;
        }

        .simple-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.12));
          vertical-align: middle;
          color: var(--text, #EDEFFA);
        }

        .simple-table tr:last-child td {
          border-bottom: none;
        }

        .simple-table tr:hover {
          background: var(--bg3, rgba(148, 163, 225, 0.06));
        }

        .simple-table tr.selected-row {
          background: rgba(79, 70, 229, 0.06);
        }

        .account-transfer-pill {
          display: block;
          font-size: 11.5px;
          color: var(--muted, #8B949E);
          margin-top: 3px;
          max-width: 380px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .badge-due {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .badge-tax-tag {
          font-size: 10.5px;
          font-weight: 700;
          color: #F59E0B;
        }

        .btn-table-action {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--muted, #8B949E);
          padding: 4px;
          font-size: 13px;
          border-radius: 4px;
        }

        .btn-table-action:hover {
          color: #4F46E5;
          background: rgba(79, 70, 229, 0.1);
        }

        .btn-settle-inline {
          padding: 4px 10px;
          background: #10B981;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-settle-inline:hover {
          background: #059669;
        }

        /* Modal Styles */
        .b2b-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .b2b-modal-card {
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border-strong, rgba(148, 163, 225, 0.3));
          border-radius: 14px;
          width: 100%;
          max-width: 540px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }

        .b2b-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .b2b-modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--text, #EDEFFA);
        }

        .b2b-modal-body {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-row {
          display: flex;
          gap: 12px;
        }

        .form-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
          position: relative;
        }

        .form-field label {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted, #8B949E);
        }

        .form-field input, .form-field select, .form-field textarea {
          padding: 8px 12px;
          background: var(--bg3, #F4F6FC);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.25));
          border-radius: 6px;
          font-size: 13px;
          color: var(--text, #EDEFFA);
          outline: none;
          font-family: inherit;
        }

        .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
          border-color: #4F46E5;
        }

        .b2b-modal-footer {
          padding: 14px 20px;
          border-top: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--border, rgba(148, 163, 225, 0.25));
          color: var(--text, #EDEFFA);
          padding: 7px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .student-autocomplete-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border-strong, rgba(148, 163, 225, 0.3));
          border-radius: 6px;
          margin-top: 4px;
          max-height: 160px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
        }

        .student-autocomplete-row {
          padding: 6px 12px;
          font-size: 12.5px;
          cursor: pointer;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.1));
        }

        .student-autocomplete-row:hover {
          background: #4F46E5;
          color: #ffffff;
        }

        @media (max-width: 900px) {
          .simple-table {
            display: block;
            overflow-x: auto;
          }
        }
      `}</style>

      {/* 1. CLEAN TOP HEADER */}
      <div className="b2b-top-header">
        <div className="header-title-box">
          <h1>B2B Partner Payments & Accounts Reminders</h1>
          <p>
            Track transfers owed to B2B sub-agents & university partners with 18% GST and beneficiary account details.
          </p>
        </div>

        <div className="header-action-buttons">
          {/* Download Selected for Accounts Team */}
          {selectedIds.size > 0 && (
            <button
              className="btn-simple-download selected-active"
              onClick={() => openExportModal('selected')}
              title="Download selected payments with custom fields"
            >
              <span>📥 Download Selected ({selectedIds.size})...</span>
            </button>
          )}

          {/* Download All / Custom Excel */}
          <button
            className="btn-simple-download"
            onClick={() => openExportModal(selectedIds.size > 0 ? 'selected' : 'all')}
            title="Choose columns and download custom Excel file"
          >
            <span>📥 Download Excel / Choose Fields...</span>
          </button>

          {/* Add Payment Button */}
          <button className="btn-simple-primary" onClick={handleOpenAddModal}>
            <span>+</span>
            <span>Add Payment</span>
          </button>
        </div>
      </div>

      {/* 2. 4 SIMPLE, INFORMATIVE KPI CARDS */}
      <div className="simple-kpi-grid">
        {/* Without GST Net Total */}
        <div className="simple-kpi-card">
          <div className="simple-kpi-label">Base Amount (Without GST)</div>
          <div className="simple-kpi-val">{formatMoney(metrics.pendingWithoutGstINR, 'INR')}</div>
          <div className="simple-kpi-sub">Net payables before taxes (INR)</div>
        </div>

        {/* 18% GST Total */}
        <div className="simple-kpi-card">
          <div className="simple-kpi-label">GST 18% Total</div>
          <div className="simple-kpi-val tax">{formatMoney(metrics.pendingGstAmountINR, 'INR')}</div>
          <div className="simple-kpi-sub">18% tax on applicable Indian B2B payables</div>
        </div>

        {/* Total With GST (Final Amount to Pay) */}
        <div className="simple-kpi-card" style={{ borderLeft: '3px solid #10B981' }}>
          <div className="simple-kpi-label">Total Payable (With GST)</div>
          <div className="simple-kpi-val highlight">{formatMoney(metrics.pendingWithGstINR, 'INR')}</div>
          <div className="simple-kpi-sub">Final total payout for accounts transfer</div>
        </div>

        {/* Foreign Currencies (No GST) */}
        <div className="simple-kpi-card" style={{ borderLeft: '3px solid #3B82F6' }}>
          <div className="simple-kpi-label">Foreign Transfers (No GST)</div>
          <div className="simple-kpi-val" style={{ fontSize: '18px' }}>
            {metrics.pendingUSD > 0 && `$${metrics.pendingUSD.toLocaleString()} USD`}
            {metrics.pendingUSD > 0 && metrics.pendingEUR > 0 && ' + '}
            {metrics.pendingEUR > 0 && `€${metrics.pendingEUR.toLocaleString()} EUR`}
            {metrics.pendingUSD === 0 && metrics.pendingEUR === 0 && '$0'}
          </div>
          <div className="simple-kpi-sub">0% GST (Foreign export exempt)</div>
        </div>
      </div>

      {/* 3. MICROSOFT TO-DO CLEAN QUICK ADD BAR */}
      <form className="simple-quick-add" onSubmit={handleQuickAddSubmit}>
        <span style={{ color: '#4F46E5', fontSize: '16px' }}>➕</span>
        <input
          type="text"
          placeholder='Quick Add: "Consult Fox - 1,80,000 - Thejus & Nivil + GST" or "Future Factory 500 usd"'
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
        />
        {quickInput.trim() && (
          <button type="submit" className="btn-simple-primary" style={{ padding: '5px 12px' }}>
            Add
          </button>
        )}
      </form>

      {/* 4. CONTROLS & FILTER ROW */}
      <div className="simple-controls-bar">
        {/* Status Tabs */}
        <div className="simple-tabs">
          <button
            className={`simple-tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({metrics.pendingCount})
          </button>
          <button
            className={`simple-tab-btn ${statusFilter === 'urgent' ? 'active' : ''}`}
            onClick={() => setStatusFilter('urgent')}
          >
            ⚠️ Due Soon / Overdue ({metrics.overdueCount})
          </button>
          <button
            className={`simple-tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            ✓ Settled ({payments.filter((p) => p.status === 'completed').length})
          </button>
          <button
            className={`simple-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Records ({payments.length})
          </button>
        </div>

        {/* Currency & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border, rgba(148, 163, 225, 0.25))',
              background: 'var(--bg2, #ffffff)',
              color: 'var(--text, #EDEFFA)',
              fontSize: '12.5px',
            }}
          >
            <option value="All">All Currencies</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>

          <div className="simple-search-box">
            <span className="icon">🔍</span>
            <input
              type="text"
              placeholder="Search partner, account, student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 5. SELECTION BAR (When rows are checked) */}
      {selectedIds.size > 0 && (
        <div className="selection-action-bar">
          <div>
            <strong>{selectedIds.size}</strong> payment{selectedIds.size > 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-simple-primary"
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => openExportModal('selected')}
            >
              📥 Download Selected ({selectedIds.size}) for Accounts...
            </button>
            <button
              className="btn-cancel"
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 6. CLEAN, UNCLUTTERED FINANCIAL TABLE */}
      <div className="simple-table-wrapper">
        <table className="simple-table">
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => handleSelectAll(filteredList)}
                  title="Select All Visible"
                />
              </th>
              <th>Partner / Beneficiary & Transfer Account</th>
              <th>Student(s)</th>
              <th>Due Date</th>
              <th style={{ textAlign: 'right' }}>Without GST</th>
              <th style={{ textAlign: 'right' }}>GST (18%)</th>
              <th style={{ textAlign: 'right' }}>Total to Pay</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center', width: '70px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted, #8B949E)' }}>
                  No payments found matching your filter.
                </td>
              </tr>
            ) : (
              filteredList.map((payment) => {
                const fin = calculateFinancials(payment);
                const due = getDueStatus(payment.due_date);
                const isSelected = selectedIds.has(payment.id);
                const isCompleted = payment.status === 'completed';

                return (
                  <tr key={payment.id} className={isSelected ? 'selected-row' : ''}>
                    {/* Checkbox for Select / Download */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(payment.id)}
                      />
                    </td>

                    {/* Partner & Which Account to Transfer */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                          {payment.partner_name}
                        </span>
                        {payment.priority && <span title="High Priority" style={{ color: '#F59E0B' }}>★</span>}
                      </div>
                      <span className="account-transfer-pill" title={payment.transfer_account || 'No account added'}>
                        🏦 <strong>Transfer to:</strong> {payment.transfer_account || 'Click edit to add account details'}
                      </span>
                    </td>

                    {/* Linked Student(s) */}
                    <td>
                      <span style={{ fontWeight: 500 }}>{payment.student_names || 'General'}</span>
                      {payment.category && (
                        <div style={{ fontSize: '11px', color: 'var(--muted, #8B949E)' }}>
                          {payment.category}
                        </div>
                      )}
                    </td>

                    {/* Due Date */}
                    <td>
                      {isCompleted ? (
                        <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
                          ✓ Paid {payment.settled_at}
                        </span>
                      ) : (
                        <span
                          className="badge-due"
                          style={{
                            color: due.color,
                            backgroundColor: due.bg || 'transparent',
                          }}
                        >
                          {due.text}
                        </span>
                      )}
                    </td>

                    {/* Amount Without GST */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(fin.baseAmount, payment.currency)}
                    </td>

                    {/* GST (18%) */}
                    <td style={{ textAlign: 'right' }}>
                      {payment.currency !== 'INR' ? (
                        <span style={{ fontSize: '11px', color: 'var(--muted, #8B949E)' }}>0% (Foreign)</span>
                      ) : fin.gstAmount > 0 ? (
                        <span className="badge-tax-tag">
                          +{formatMoney(fin.gstAmount, 'INR')} <span style={{ opacity: 0.8 }}>(18%)</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--muted, #8B949E)' }}>0%</span>
                      )}
                    </td>

                    {/* Total Amount With GST */}
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '14px' }}>
                      <span style={{ color: isCompleted ? 'var(--muted, #8B949E)' : 'var(--text, #EDEFFA)' }}>
                        {formatMoney(fin.totalAmount, payment.currency)}
                      </span>
                    </td>

                    {/* Status & Settle button */}
                    <td style={{ textAlign: 'center' }}>
                      {isCompleted ? (
                        <button
                          className="btn-table-action"
                          title="Click to restore to pending"
                          onClick={() => handleOpenSettle(payment)}
                          style={{ color: '#10B981', fontWeight: 600, fontSize: '12px' }}
                        >
                          ✓ Settled
                        </button>
                      ) : (
                        <button
                          className="btn-settle-inline"
                          onClick={() => handleOpenSettle(payment)}
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-table-action"
                        title="Edit Details & Account"
                        onClick={() => handleOpenEditModal(payment)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-table-action"
                        title="Delete"
                        onClick={() => handleDelete(payment.id, payment.partner_name)}
                        style={{ color: '#EF4444' }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 7. SETTLEMENT MODAL */}
      {settlingPayment && (
        <div className="b2b-modal-overlay" onClick={() => setSettlingPayment(null)}>
          <div className="b2b-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <h3>Confirm Payment to {settlingPayment.partner_name}</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--muted, #8B949E)' }}
                onClick={() => setSettlingPayment(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement}>
              <div className="b2b-modal-body">
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>Total Amount to Transfer</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
                      {formatMoney(calculateFinancials(settlingPayment).totalAmount, settlingPayment.currency)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', textAlign: 'right', color: 'var(--text, #EDEFFA)' }}>
                    <div>🎓 {settlingPayment.student_names}</div>
                  </div>
                </div>

                <div className="form-field">
                  <label>Transfer Account (Where money was sent)</label>
                  <input
                    type="text"
                    readOnly
                    value={settlingPayment.transfer_account || 'Not provided'}
                    style={{ background: 'var(--bg, #F4F6FC)', opacity: 0.9 }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      required
                      value={settlementData.settled_at}
                      onChange={(e) => setSettlementData({ ...settlementData, settled_at: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Payment Mode</label>
                    <select
                      value={settlementData.payment_mode}
                      onChange={(e) => setSettlementData({ ...settlementData, payment_mode: e.target.value })}
                    >
                      <option value="Bank Transfer (IMPS / NEFT)">Bank Transfer (IMPS / NEFT)</option>
                      <option value="UPI / GPay">UPI / GPay</option>
                      <option value="Forex Wire / Wise">Forex Wire / Wise</option>
                      <option value="Direct Transfer">Direct Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Bank UTR / Transaction Reference # (for Accounts)</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR59201948201 or IMPS Ref"
                    value={settlementData.utr_number}
                    onChange={(e) => setSettlementData({ ...settlementData, utr_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="b2b-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setSettlingPayment(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-simple-primary" style={{ background: '#10B981' }}>
                  ✓ Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. ADD / EDIT MODAL */}
      {showModal && (
        <div className="b2b-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="b2b-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <h3>{editingPayment ? 'Edit B2B Payment' : 'Add New B2B Payment'}</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--muted, #8B949E)' }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="b2b-modal-body">
                {/* Partner Name */}
                <div className="form-field">
                  <label>Partner / Agency / Beneficiary Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Consult Fox, Future Factory, Medwizard..."
                    value={formData.partner_name}
                    onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                  />
                </div>

                {/* WHICH ACCOUNT TO TRANSFER (Accounts Team requirement) */}
                <div className="form-field">
                  <label>Which Account to Transfer (Bank A/c, IFSC, Branch, UPI or Wire) *</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank A/C: 502000... | IFSC: HDFC0000240 | UPI: id@okaxis"
                    value={formData.transfer_account}
                    onChange={(e) => setFormData({ ...formData, transfer_account: e.target.value })}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--muted, #8B949E)' }}>
                    This appears in the Accounts spreadsheet for the finance team to disburse directly.
                  </span>
                </div>

                {/* Linked Student */}
                <div className="form-field">
                  <label>Linked Student(s) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Type student name(s) (e.g. Thejus & Nivil)"
                    value={formData.student_names}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, student_names: val });
                      if (val.trim().length >= 2 && erpStudents.length > 0) {
                        const matches = erpStudents.filter((s) =>
                          s.name?.toLowerCase().includes(val.toLowerCase())
                        ).slice(0, 4);
                        setStudentSuggestions(matches);
                        setShowStudentSuggestions(matches.length > 0);
                      } else {
                        setShowStudentSuggestions(false);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 200)}
                  />

                  {showStudentSuggestions && (
                    <div className="student-autocomplete-menu">
                      {studentSuggestions.map((stu) => (
                        <div
                          key={stu.id}
                          className="student-autocomplete-row"
                          onMouseDown={() => {
                            setFormData({
                              ...formData,
                              student_names: formData.student_names
                                ? `${formData.student_names}, ${stu.name}`
                                : stu.name,
                            });
                            setShowStudentSuggestions(false);
                          }}
                        >
                          <strong>{stu.name}</strong> ({stu.country || 'Global'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount & Currency */}
                <div className="form-row">
                  <div className="form-field">
                    <label>Base Amount (Without GST) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="e.g. 180000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 18% GST Toggle (Disabled for Foreign Payments) */}
                <div style={{ padding: '8px 12px', background: 'var(--bg3, #F4F6FC)', borderRadius: '8px' }}>
                  {formData.currency !== 'INR' ? (
                    <div style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>
                      🌐 <strong>Foreign Transfer ({formData.currency}):</strong> No GST applicable (0% Tax Exempt).
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={formData.has_gst}
                          onChange={(e) => setFormData({ ...formData, has_gst: e.target.checked })}
                        />
                        <span>Apply 18% GST (+18%)</span>
                      </label>
                      {formData.has_gst && formData.amount > 0 && (
                        <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '4px' }}>
                          Base: ₹{Number(formData.amount).toLocaleString('en-IN')} &bull; GST (18%): +₹{Math.round(formData.amount * 0.18).toLocaleString('en-IN')} &bull; <strong>Total with GST: ₹{(Number(formData.amount) + Math.round(formData.amount * 0.18)).toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Due Date & Category */}
                <div className="form-row">
                  <div className="form-field">
                    <label>Due Date (When to Pay)</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* High Priority Star */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.checked })}
                  />
                  <span>⭐ Mark High Priority (Float to top)</span>
                </label>

                {/* Notes */}
                <div className="form-field">
                  <label>Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Pay after student visa stamped or invoice reference"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="b2b-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-simple-primary">
                  {editingPayment ? 'Save Changes' : '+ Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. DOWNLOAD EXCEL CUSTOMIZATION MODAL (Select what to include in Excel) */}
      {showExportModal && (
        <div className="b2b-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="b2b-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📥</span>
                  <span>Select What to Include in Excel</span>
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>
                  Choose which payments and columns to export for the accounts team.
                </span>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--muted, #8B949E)' }}
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="b2b-modal-body" style={{ gap: '16px' }}>
              {/* Step 1: Which Rows */}
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text, #EDEFFA)', marginBottom: '8px' }}>
                  1. Which Payments to Export?
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="selected"
                      checked={exportScope === 'selected'}
                      disabled={selectedIds.size === 0}
                      onChange={(e) => setExportScope(e.target.value)}
                    />
                    <span style={{ opacity: selectedIds.size === 0 ? 0.45 : 1 }}>
                      <strong>Selected Payments</strong> ({selectedIds.size} checked)
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="filtered"
                      checked={exportScope === 'filtered'}
                      onChange={(e) => setExportScope(e.target.value)}
                    />
                    <span>
                      <strong>Filtered / Current View</strong> ({filteredList.length} items)
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="all"
                      checked={exportScope === 'all'}
                      onChange={(e) => setExportScope(e.target.value)}
                    />
                    <span>
                      <strong>All Payments</strong> ({payments.length} items)
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 2: Which Columns */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text, #EDEFFA)' }}>
                    2. Select Columns for Excel ({exportColIds.size} selected)
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', borderColor: '#4F46E5' }}
                      onClick={() => handleApplyExportPreset('accounts_quick')}
                      title="Only Partner, Transfer Account, Student, Total to Pay"
                    >
                      🏦 Accounts Transfer
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', borderColor: '#F59E0B' }}
                      onClick={() => handleApplyExportPreset('accounts_gst')}
                      title="Includes Base + 18% GST + Total with GST"
                    >
                      🧾 With 18% GST
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => handleApplyExportPreset('all')}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => handleApplyExportPreset('none')}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '8px 12px',
                    padding: '12px 14px',
                    background: 'var(--bg3, #F4F6FC)',
                    borderRadius: '8px',
                    border: '1px solid var(--border, rgba(148, 163, 225, 0.2))',
                    maxHeight: '210px',
                    overflowY: 'auto',
                  }}
                >
                  {EXPORT_COLUMNS_DEF.map((col) => {
                    const isChecked = exportColIds.has(col.id);
                    return (
                      <label
                        key={col.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          color: isChecked ? 'var(--text, #EDEFFA)' : 'var(--muted, #8B949E)',
                          fontWeight: isChecked ? 600 : 400,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleExportCol(col.id)}
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Total Row & Format */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
                  <input
                    type="checkbox"
                    checked={includeBottomTotal}
                    onChange={(e) => setIncludeBottomTotal(e.target.checked)}
                  />
                  <span>
                    <strong>Include Summary Total Row</strong> (Calculates Base + GST + Total)
                  </span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted, #8B949E)' }}>Format:</span>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg2, #ffffff)',
                      border: '1px solid var(--border, rgba(148, 163, 225, 0.3))',
                      color: 'var(--text, #EDEFFA)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                    <option value="csv">Comma-Separated (.csv)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="b2b-modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-simple-primary"
                style={{ background: '#10B981', padding: '8px 18px' }}
                onClick={handleExecuteExport}
              >
                📥 Download Excel ({exportColIds.size} Columns)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
