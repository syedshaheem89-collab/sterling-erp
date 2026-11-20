import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

/**
 * INITIAL_B2B_PAYMENTS
 * Pre-populated with the exact 9 live entries from the user's Microsoft To-Do list:
 * - Consult Fox (Thejus & Nivil) - 1,80,000 INR + GST
 * - VFS & Insurance (Abhijith Bulgaria) - 20,780 INR
 * - Rashin Team (Liza) - 20,000 INR
 * - Future Factory (Vivek & Hanock) - 500 USD
 * - Future Factory (Annalise & Megha) - 500 USD
 * - Empire - Lithuania (Annlin v Jose) - 1,000 EUR
 * - Abroad Angel Poland (Gayathri, Achsah, Anna Biju) - 70,800 INR
 * - Comfort Travel (Apostille Charges) - 59,550 INR
 * - Medwizard (Esabella) - 24,000 INR
 * Plus 1 completed record for Microsoft To-Do collapsible demonstration.
 */
const INITIAL_B2B_PAYMENTS = [
  {
    id: 'b2b-001',
    partner_name: 'Consult Fox',
    student_names: 'Thejus & Nivil',
    amount: 180000,
    currency: 'INR',
    has_gst: true,
    gst_note: '+ GST',
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0], // Tomorrow
    priority: true,
    status: 'pending',
    notes: 'Consult fox - 1,80,000 - ( Thejus & Nivil ) + Gst -',
    created_at: '2026-11-15T10:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-002',
    partner_name: 'VFS & Insurance',
    student_names: 'Abhijith Bulgaria (Agiya & Lekshmipriya)',
    amount: 20780,
    currency: 'INR',
    has_gst: false,
    gst_note: '',
    category: 'VFS & Insurance',
    due_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], // Overdue by 1 day
    priority: false,
    status: 'pending',
    notes: 'VFS & Insurance - 20780 inr - abhijith Bulgaria ( agiya & lekshmipriya)',
    created_at: '2026-11-14T11:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-003',
    partner_name: 'Rashin Team',
    student_names: 'Liza',
    amount: 20000,
    currency: 'INR',
    has_gst: false,
    gst_note: '',
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // In 3 days
    priority: false,
    status: 'pending',
    notes: 'Liza - 20000 inr to Rashin team',
    created_at: '2026-11-16T09:15:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-004',
    partner_name: 'Future Factory',
    student_names: 'Vivek & Hanock',
    amount: 500,
    currency: 'USD',
    has_gst: false,
    gst_note: '',
    category: 'B2B Sub-Agent',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    priority: true,
    status: 'pending',
    notes: 'Vivek & Hanock b2b payment - 500 usd to Future Factory',
    created_at: '2026-11-16T14:20:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-005',
    partner_name: 'Future Factory',
    student_names: 'Annalise & Megha',
    amount: 500,
    currency: 'USD',
    has_gst: false,
    gst_note: '',
    category: 'B2B Sub-Agent',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Annalise - Megha - 500 usd to Future Factory',
    created_at: '2026-11-17T11:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-006',
    partner_name: 'Empire - Lithuania',
    student_names: 'Annlin v Jose',
    amount: 1000,
    currency: 'EUR',
    has_gst: false,
    gst_note: '',
    category: 'Partner University / B2B',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Annlin v Jose - 1000 to Empire - Lithuania',
    created_at: '2026-11-17T15:45:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-007',
    partner_name: 'Abroad Angel Poland',
    student_names: 'Gayathri, Achsah, Anna Biju',
    amount: 70800,
    currency: 'INR',
    has_gst: false,
    gst_note: '',
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    priority: true,
    status: 'pending',
    notes: 'Abroad Anglel Poland : Gayathri , achsah , anna biju - 70,800 inr',
    created_at: '2026-11-18T10:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-008',
    partner_name: 'Comfort Travel',
    student_names: 'Apostille Batch',
    amount: 59550,
    currency: 'INR',
    has_gst: false,
    gst_note: '',
    category: 'Apostille Charges',
    due_date: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Comfort travel - 59,550 - Appostile Charges',
    created_at: '2026-11-18T12:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-009',
    partner_name: 'Medwizard',
    student_names: 'Esabella',
    amount: 24000,
    currency: 'INR',
    has_gst: false,
    gst_note: '',
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Medwizard - 24000 inr - Esabella',
    created_at: '2026-11-19T08:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
  },
  {
    id: 'b2b-010',
    partner_name: 'EduGlobal Services',
    student_names: 'Kiran Mathew',
    amount: 15000,
    currency: 'INR',
    has_gst: false,
    gst_note: '',
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
  'Consultancy & Processing',
  'Other',
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export default function B2BPayments({ setCurrentPage }) {
  const { user, profile } = useAuth();

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

  // Students list from ERP for autocomplete
  const [erpStudents, setErpStudents] = useState([]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'urgent', 'starred', 'completed', 'all'
  const [partnerFilter, setPartnerFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('due_date_asc'); // 'due_date_asc', 'amount_desc', 'priority', 'newest'
  const [completedOpen, setCompletedOpen] = useState(true);

  // Quick Inline Input State (Microsoft To-Do style)
  const [quickInput, setQuickInput] = useState('');

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    partner_name: '',
    student_names: '',
    amount: '',
    currency: 'INR',
    has_gst: false,
    gst_note: '',
    category: 'Sub-Agent Commission',
    due_date: '',
    priority: false,
    notes: '',
  });

  // Settlement / Mark as Paid Modal State
  const [settlingPayment, setSettlingPayment] = useState(null);
  const [settlementData, setSettlementData] = useState({
    settled_at: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer (IMPS / NEFT)',
    utr_number: '',
    notes: '',
  });

  // Student suggestions dropdown in modal
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

  // Persist payments to localStorage on state change
  useEffect(() => {
    try {
      localStorage.setItem('sterling_b2b_payments', JSON.stringify(payments));
    } catch (e) {
      console.error('Failed to save b2b payments to localStorage:', e);
    }
  }, [payments]);

  // Fetch ERP students on mount for autocomplete
  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, name, country, university, intake')
          .order('name');
        if (!error && data) {
          setErpStudents(data);
        }
      } catch (err) {
        console.warn('ERP student lookup unavailable:', err);
      }
    }
    fetchStudents();
  }, []);

  // Calculate Due Date Status & Urgency
  const getDueStatus = (dueDateStr) => {
    if (!dueDateStr) {
      return {
        text: 'No Due Date',
        type: 'none',
        color: 'var(--muted, #8B949E)',
        bg: 'rgba(148, 163, 184, 0.12)',
        urgent: false,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dueDateStr.split('-').map(Number);
    const dueDate = new Date(y, m - 1, d);
    dueDate.setHours(0, 0, 0, 0);

    const diffMs = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      return {
        text: `Overdue by ${daysAgo}d`,
        type: 'overdue',
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.16)',
        border: 'rgba(239, 68, 68, 0.35)',
        urgent: true,
      };
    } else if (diffDays === 0) {
      return {
        text: 'Due Today',
        type: 'today',
        color: '#F97316',
        bg: 'rgba(249, 115, 22, 0.18)',
        border: 'rgba(249, 115, 22, 0.4)',
        urgent: true,
      };
    } else if (diffDays === 1) {
      return {
        text: 'Due Tomorrow',
        type: 'tomorrow',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.18)',
        border: 'rgba(245, 158, 11, 0.35)',
        urgent: true,
      };
    } else if (diffDays <= 3) {
      return {
        text: `Due in ${diffDays} days`,
        type: 'soon',
        color: '#EAB308',
        bg: 'rgba(234, 179, 8, 0.16)',
        border: 'rgba(234, 179, 8, 0.35)',
        urgent: true,
      };
    } else {
      // Format: DD MMM
      const options = { month: 'short', day: 'numeric' };
      const formatted = dueDate.toLocaleDateString('en-US', options);
      return {
        text: `Due ${formatted}`,
        type: 'upcoming',
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.25)',
        urgent: false,
      };
    }
  };

  // Format currency helpers
  const formatMoney = (amount, currency = 'INR') => {
    const num = Number(amount) || 0;
    if (currency === 'INR') {
      return '₹' + num.toLocaleString('en-IN');
    } else if (currency === 'USD') {
      return '$' + num.toLocaleString('en-US');
    } else if (currency === 'EUR') {
      return '€' + num.toLocaleString('en-DE');
    } else if (currency === 'GBP') {
      return '£' + num.toLocaleString('en-GB');
    }
    return `${currency} ${num.toLocaleString()}`;
  };

  // Get distinct partners for dropdown
  const uniquePartners = useMemo(() => {
    const set = new Set();
    payments.forEach((p) => {
      if (p.partner_name?.trim()) set.add(p.partner_name.trim());
    });
    return Array.from(set).sort();
  }, [payments]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let pendingINR = 0;
    let pendingUSD = 0;
    let pendingEUR = 0;
    let pendingGBP = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;
    let starredCount = 0;
    let completedCount = 0;
    let totalPendingCount = 0;

    payments.forEach((p) => {
      if (p.status === 'completed') {
        completedCount++;
      } else {
        totalPendingCount++;
        const amt = Number(p.amount) || 0;
        if (p.currency === 'INR') pendingINR += amt;
        else if (p.currency === 'USD') pendingUSD += amt;
        else if (p.currency === 'EUR') pendingEUR += amt;
        else if (p.currency === 'GBP') pendingGBP += amt;

        if (p.priority) starredCount++;

        const due = getDueStatus(p.due_date);
        if (due.type === 'overdue') overdueCount++;
        if (due.type === 'today' || due.type === 'tomorrow' || due.type === 'soon') dueSoonCount++;
      }
    });

    return {
      pendingINR,
      pendingUSD,
      pendingEUR,
      pendingGBP,
      overdueCount,
      dueSoonCount,
      urgentTotal: overdueCount + dueSoonCount,
      starredCount,
      completedCount,
      totalPendingCount,
      totalPartners: uniquePartners.length,
    };
  }, [payments, uniquePartners]);

  // Smart Parser for Quick Add (Microsoft To-Do style)
  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const raw = quickInput.trim();
    let detectedCurrency = 'INR';
    let detectedAmount = 0;
    let detectedPartner = '';
    let detectedStudent = '';
    let hasGst = false;

    // Detect currency
    if (/\$|usd/i.test(raw)) detectedCurrency = 'USD';
    else if (/€|eur/i.test(raw)) detectedCurrency = 'EUR';
    else if (/£|gbp/i.test(raw)) detectedCurrency = 'GBP';

    // Detect GST
    if (/gst/i.test(raw)) hasGst = true;

    // Detect numbers (including comma separated like 1,80,000 or 20780 or 500)
    const numMatch = raw.match(/(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+)/);
    if (numMatch) {
      detectedAmount = parseFloat(numMatch[1].replace(/,/g, ''));
    }

    // Split on dashes, colons, or "to" / "for"
    const parts = raw.split(/[-–—:]+/).map((s) => s.trim());
    if (parts.length >= 2) {
      detectedPartner = parts[0];
      detectedStudent = parts.slice(1).join(' - ');
    } else {
      detectedPartner = raw;
    }

    // Clean partner from trailing amount strings
    detectedPartner = detectedPartner.replace(/\b(\d+[\d,.]*|\$|€|£|inr|usd|eur|gbp)\b/gi, '').trim();
    if (!detectedPartner) detectedPartner = 'Partner Payable';

    // Default due date: in 3 days
    const defaultDue = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const newPayment = {
      id: 'b2b-' + Date.now(),
      partner_name: detectedPartner,
      student_names: detectedStudent || 'Linked Student',
      amount: detectedAmount || 10000,
      currency: detectedCurrency,
      has_gst: hasGst,
      gst_note: hasGst ? '+ GST' : '',
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
    toast.success(`Added payable reminder for ${detectedPartner}!`);
  };

  // Toggle Priority / Star
  const handleToggleStar = (id) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, priority: !p.priority } : p))
    );
  };

  // Open Settlement Modal (Clicking checkmark circle)
  const handleOpenSettle = (payment) => {
    if (payment.status === 'completed') {
      // Restore to pending immediately
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: 'pending', settled_at: null, payment_mode: null, utr_number: null }
            : p
        )
      );
      toast.success(`Restored payment for ${payment.partner_name} back to pending.`);
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

    toast.success(`Marked ${formatMoney(settlingPayment.amount, settlingPayment.currency)} to ${settlingPayment.partner_name} as Paid!`);
    setSettlingPayment(null);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingPayment(null);
    setFormData({
      partner_name: '',
      student_names: '',
      amount: '',
      currency: 'INR',
      has_gst: false,
      gst_note: '',
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
      student_names: payment.student_names || '',
      amount: payment.amount || '',
      currency: payment.currency || 'INR',
      has_gst: payment.has_gst || false,
      gst_note: payment.gst_note || '',
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
      toast.error('Partner / Agency name is required');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (editingPayment) {
      // Edit existing
      setPayments((prev) =>
        prev.map((p) =>
          p.id === editingPayment.id
            ? {
                ...p,
                partner_name: formData.partner_name.trim(),
                student_names: formData.student_names.trim(),
                amount: amt,
                currency: formData.currency,
                has_gst: formData.has_gst,
                gst_note: formData.has_gst ? (formData.gst_note || '+ GST') : '',
                category: formData.category,
                due_date: formData.due_date,
                priority: formData.priority,
                notes: formData.notes.trim(),
              }
            : p
        )
      );
      toast.success('B2B payment updated');
    } else {
      // Create new
      const newRecord = {
        id: 'b2b-' + Date.now(),
        partner_name: formData.partner_name.trim(),
        student_names: formData.student_names.trim(),
        amount: amt,
        currency: formData.currency,
        has_gst: formData.has_gst,
        gst_note: formData.has_gst ? (formData.gst_note || '+ GST') : '',
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
      toast.success('New B2B payable reminder added');
    }

    setShowModal(false);
  };

  // Delete Payment
  const handleDelete = (id, partner) => {
    if (window.confirm(`Are you sure you want to delete payment reminder for "${partner}"?`)) {
      setPayments((prev) => prev.filter((p) => p.id !== id));
      toast.success('Payment reminder removed');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Partner Name',
      'Student Name(s)',
      'Category',
      'Amount',
      'Currency',
      'GST',
      'Status',
      'Due Date',
      'Priority',
      'Settled Date',
      'Payment Mode',
      'UTR Number',
      'Notes',
    ];

    const rows = payments.map((p) => [
      `"${(p.partner_name || '').replace(/"/g, '""')}"`,
      `"${(p.student_names || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      p.amount || 0,
      p.currency || 'INR',
      p.has_gst ? 'Yes' : 'No',
      p.status,
      p.due_date || '',
      p.priority ? 'Yes' : 'No',
      p.settled_at || '',
      `"${(p.payment_mode || '').replace(/"/g, '""')}"`,
      `"${(p.utr_number || '').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sterling_b2b_payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('B2B payments exported to CSV');
  };

  // Filtered & Sorted Payments
  const { pendingList, completedList } = useMemo(() => {
    let list = [...payments];

    // Status Filter
    if (statusFilter === 'pending') {
      list = list.filter((p) => p.status === 'pending');
    } else if (statusFilter === 'urgent') {
      list = list.filter((p) => {
        if (p.status !== 'pending') return false;
        const due = getDueStatus(p.due_date);
        return due.urgent;
      });
    } else if (statusFilter === 'starred') {
      list = list.filter((p) => p.status === 'pending' && p.priority);
    } else if (statusFilter === 'completed') {
      list = list.filter((p) => p.status === 'completed');
    }

    // Partner Filter
    if (partnerFilter !== 'All') {
      list = list.filter((p) => p.partner_name === partnerFilter);
    }

    // Currency Filter
    if (currencyFilter !== 'All') {
      list = list.filter((p) => p.currency === currencyFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.partner_name?.toLowerCase().includes(q) ||
          p.student_names?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q) ||
          p.utr_number?.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'priority') {
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
      }
      if (sortBy === 'due_date_asc') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      if (sortBy === 'amount_desc') {
        return (b.amount || 0) - (a.amount || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return 0;
    });

    const pending = list.filter((p) => p.status === 'pending');
    const completed = list.filter((p) => p.status === 'completed');

    return { pendingList: pending, completedList: completed };
  }, [payments, statusFilter, partnerFilter, currencyFilter, searchQuery, sortBy]);

  return (
    <div className="b2b-payments-page">
      <style>{`
        .b2b-payments-page {
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Urgent Alert Banner */
        .urgent-alert-banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(249, 115, 22, 0.14) 100%);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 14px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .alert-banner-text {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text, #EDEFFA);
        }

        .alert-bell-pulse {
          font-size: 20px;
          animation: bellWiggle 1.5s infinite ease-in-out;
        }

        @keyframes bellWiggle {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-14deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-8deg); }
          75% { transform: rotate(0); }
        }

        .alert-action-btn {
          padding: 6px 14px;
          background: #EF4444;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .alert-action-btn:hover {
          background: #DC2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        /* Top KPI Metric Cards Grid */
        .b2b-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 14px;
        }

        .b2b-kpi-card {
          background: var(--bg2, rgba(20, 25, 45, 0.7));
          border: 1px solid var(--border, rgba(148, 163, 225, 0.14));
          border-radius: 14px;
          padding: 18px 20px;
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-glass, 0 4px 20px rgba(0, 0, 0, 0.06));
        }

        .b2b-kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--blue, #7C6FFF);
          border-radius: 4px 0 0 4px;
        }

        .b2b-kpi-card.urgent::before {
          background: #EF4444;
        }

        .b2b-kpi-card.foreign::before {
          background: #36D1DC;
        }

        .b2b-kpi-card.settled::before {
          background: #10B981;
        }

        .kpi-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted, #8B949E);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kpi-val {
          font-size: 24px;
          font-weight: 700;
          color: var(--text, #EDEFFA);
          line-height: 1.1;
        }

        .kpi-sub {
          font-size: 12px;
          color: var(--muted, #8B949E);
        }

        /* Microsoft To-Do Style Quick Input Bar */
        .todo-quick-add-box {
          background: var(--bg2, rgba(20, 25, 45, 0.7));
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          border-radius: 14px;
          padding: 10px 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .todo-quick-add-box:focus-within {
          border-color: var(--blue, #7C6FFF);
          box-shadow: 0 0 0 3px rgba(124, 111, 255, 0.2);
        }

        .todo-add-icon {
          font-size: 20px;
          color: var(--blue, #7C6FFF);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .todo-input-field {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text, #EDEFFA);
          font-size: 14.5px;
          font-family: inherit;
          outline: none;
        }

        .todo-input-field::placeholder {
          color: var(--muted, #6B7280);
        }

        .todo-quick-add-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-quick-add-submit {
          padding: 7px 16px;
          background: var(--blue, #7C6FFF);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .btn-quick-add-submit:hover {
          opacity: 0.9;
        }

        .btn-detailed-modal {
          padding: 7px 14px;
          background: var(--bg3, rgba(148, 163, 225, 0.12));
          color: var(--text, #EDEFFA);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-detailed-modal:hover {
          background: var(--bg4, rgba(148, 163, 225, 0.2));
        }

        /* Filter Controls Bar */
        .b2b-filter-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .filter-status-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .status-pill {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12.5px;
          font-weight: 600;
          border: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          background: var(--bg2, rgba(20, 25, 45, 0.5));
          color: var(--muted, #8B949E);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-pill:hover {
          color: var(--text, #EDEFFA);
          border-color: var(--border-strong, rgba(148, 163, 225, 0.35));
        }

        .status-pill.active {
          background: var(--blue, #7C6FFF);
          color: #ffffff;
          border-color: var(--blue, #7C6FFF);
          box-shadow: 0 2px 10px rgba(124, 111, 255, 0.3);
        }

        .status-pill.urgent.active {
          background: #EF4444;
          border-color: #EF4444;
          box-shadow: 0 2px 10px rgba(239, 68, 68, 0.35);
        }

        .status-pill.starred.active {
          background: #F59E0B;
          border-color: #F59E0B;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.35);
        }

        .status-pill.completed.active {
          background: #10B981;
          border-color: #10B981;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.35);
        }

        .filter-right-tools {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 6px 12px;
          border-radius: 8px;
          background: var(--bg2, rgba(20, 25, 45, 0.7));
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          color: var(--text, #EDEFFA);
          font-size: 12.5px;
          outline: none;
          cursor: pointer;
        }

        .search-input-box {
          position: relative;
          min-width: 190px;
        }

        .search-input-box input {
          width: 100%;
          padding: 6px 12px 6px 30px;
          border-radius: 8px;
          background: var(--bg2, rgba(20, 25, 45, 0.7));
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          color: var(--text, #EDEFFA);
          font-size: 12.5px;
          outline: none;
        }

        .search-input-box .search-icon {
          position: absolute;
          left: 9px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted, #8B949E);
          font-size: 13px;
        }

        .btn-export-csv {
          padding: 6px 14px;
          border-radius: 8px;
          background: var(--bg2, rgba(20, 25, 45, 0.7));
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          color: var(--text, #EDEFFA);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-export-csv:hover {
          background: var(--bg3, rgba(148, 163, 225, 0.15));
        }

        /* Payment Items List */
        .payments-list-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .payment-card-row {
          background: var(--bg2, rgba(20, 25, 45, 0.65));
          border: 1px solid var(--border, rgba(148, 163, 225, 0.14));
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          transition: transform 0.15s, border-color 0.15s, background-color 0.15s;
          position: relative;
        }

        .payment-card-row:hover {
          background: var(--bg2solid, rgba(25, 32, 58, 0.85));
          border-color: var(--border-strong, rgba(148, 163, 225, 0.3));
          transform: translateY(-1px);
        }

        .payment-card-row.is-urgent {
          border-left: 4px solid #EF4444;
        }

        .payment-card-row.is-completed {
          opacity: 0.68;
          background: var(--bg2, rgba(15, 20, 36, 0.45));
        }

        .payment-left-group {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 0;
        }

        /* Checkbox circle like Microsoft To-Do */
        .todo-check-circle {
          width: 22px;
          height: 22px;
          min-width: 22px;
          border-radius: 50%;
          border: 2px solid var(--muted, #8B949E);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: transparent;
          font-size: 13px;
          padding: 0;
        }

        .todo-check-circle:hover {
          border-color: #10B981;
          color: #10B981;
          transform: scale(1.08);
        }

        .todo-check-circle.completed {
          background: #10B981;
          border-color: #10B981;
          color: #ffffff;
        }

        .payment-main-meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .partner-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .partner-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text, #EDEFFA);
        }

        .is-completed .partner-name {
          text-decoration: line-through;
          color: var(--muted, #8B949E);
        }

        .category-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--bg3, rgba(124, 111, 255, 0.12));
          color: var(--blue, #7C6FFF);
          border: 1px solid rgba(124, 111, 255, 0.25);
        }

        .student-link-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          color: var(--muted, #94A3B8);
        }

        .student-link-badge strong {
          color: var(--text, #EDEFFA);
          font-weight: 600;
        }

        .payment-right-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .amount-display-box {
          text-align: right;
          min-width: 130px;
        }

        .amount-val {
          font-size: 18px;
          font-weight: 800;
          color: var(--text, #EDEFFA);
          letter-spacing: -0.01em;
        }

        .gst-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(245, 158, 11, 0.18);
          color: #F59E0B;
          margin-left: 6px;
        }

        .due-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          margin-top: 3px;
        }

        /* Star Button */
        .btn-star-priority {
          background: transparent;
          border: none;
          color: var(--muted, #6B7280);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.15s, color 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-star-priority:hover {
          color: #F59E0B;
          transform: scale(1.15);
        }

        .btn-star-priority.active {
          color: #F59E0B;
        }

        /* Action Buttons */
        .action-icon-btn {
          background: transparent;
          border: 1px solid transparent;
          color: var(--muted, #8B949E);
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.15s;
        }

        .action-icon-btn:hover {
          background: var(--bg3, rgba(148, 163, 225, 0.15));
          color: var(--text, #EDEFFA);
        }

        .action-icon-btn.delete:hover {
          color: #EF4444;
          background: rgba(239, 68, 68, 0.12);
        }

        /* Collapsible Completed Section */
        .completed-accordion-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 4px;
          cursor: pointer;
          user-select: none;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--muted, #8B949E);
          transition: color 0.15s;
        }

        .completed-accordion-header:hover {
          color: var(--text, #EDEFFA);
        }

        .completed-count-pill {
          background: var(--bg3, rgba(148, 163, 225, 0.15));
          color: var(--muted, #8B949E);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
        }

        /* Modal Styles */
        .b2b-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: modalFadeIn 0.2s ease-out;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .b2b-modal-window {
          background: var(--bg2solid, #14192D);
          border: 1px solid var(--border-strong, rgba(148, 163, 225, 0.25));
          border-radius: 16px;
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .b2b-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .b2b-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text, #EDEFFA);
        }

        .b2b-modal-close {
          background: transparent;
          border: none;
          color: var(--muted, #8B949E);
          font-size: 20px;
          cursor: pointer;
        }

        .b2b-modal-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group-b2b {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
        }

        .form-label-b2b {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text, #EDEFFA);
        }

        .form-input-b2b {
          padding: 9px 12px;
          background: var(--bg, #080A12);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          border-radius: 8px;
          color: var(--text, #EDEFFA);
          font-size: 13.5px;
          font-family: inherit;
          outline: none;
        }

        .form-input-b2b:focus {
          border-color: var(--blue, #7C6FFF);
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .form-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }

        .student-autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg2solid, #14192D);
          border: 1px solid var(--border-strong, rgba(148, 163, 225, 0.3));
          border-radius: 8px;
          margin-top: 4px;
          max-height: 180px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .student-autocomplete-item {
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.1));
        }

        .student-autocomplete-item:hover {
          background: var(--blue, #7C6FFF);
          color: #ffffff;
        }

        .b2b-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-modal-cancel {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          color: var(--text, #EDEFFA);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .btn-modal-save {
          padding: 8px 20px;
          background: var(--blue, #7C6FFF);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-modal-save:hover {
          opacity: 0.9;
        }

        /* Settlement Details Box */
        .settlement-card-note {
          background: rgba(16, 185, 129, 0.08);
          border: 1px dashed rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          color: #10B981;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }

        @media (max-width: 768px) {
          .payment-card-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .payment-right-group {
            width: 100%;
            justify-content: space-between;
          }
          .amount-display-box {
            text-align: left;
          }
        }
      `}</style>

      {/* 1. URGENT NOTIFICATION BANNER */}
      {metrics.urgentTotal > 0 && (
        <div className="urgent-alert-banner">
          <div className="alert-banner-text">
            <span className="alert-bell-pulse">🔔</span>
            <div>
              <strong>Payment Attention Needed:</strong> You have{' '}
              <span style={{ color: '#EF4444', fontWeight: 700 }}>
                {metrics.urgentTotal} B2B payment{metrics.urgentTotal > 1 ? 's' : ''}
              </span>{' '}
              due or overdue totaling{' '}
              <strong>{formatMoney(metrics.pendingINR, 'INR')}</strong>. Settle them on time so you never forget!
            </div>
          </div>
          <button
            className="alert-action-btn"
            onClick={() => setStatusFilter(statusFilter === 'urgent' ? 'pending' : 'urgent')}
          >
            {statusFilter === 'urgent' ? 'Show All Pending' : 'View Urgent Items'}
          </button>
        </div>
      )}

      {/* 2. TOP METRIC KPI CARDS */}
      <div className="b2b-kpi-grid">
        <div className="b2b-kpi-card">
          <div className="kpi-title">
            <span>Pending to Pay (INR)</span>
            <span>🇮🇳</span>
          </div>
          <div className="kpi-val">{formatMoney(metrics.pendingINR, 'INR')}</div>
          <div className="kpi-sub">
            Across {metrics.totalPendingCount} pending payable{metrics.totalPendingCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="b2b-kpi-card foreign">
          <div className="kpi-title">
            <span>Pending Foreign FX</span>
            <span>🌐</span>
          </div>
          <div className="kpi-val" style={{ fontSize: '20px' }}>
            {metrics.pendingUSD > 0 && `$${metrics.pendingUSD.toLocaleString()} USD`}
            {metrics.pendingUSD > 0 && metrics.pendingEUR > 0 && ' + '}
            {metrics.pendingEUR > 0 && `€${metrics.pendingEUR.toLocaleString()} EUR`}
            {metrics.pendingUSD === 0 && metrics.pendingEUR === 0 && '$0 USD'}
          </div>
          <div className="kpi-sub">Future Factory, Empire Lithuania, etc.</div>
        </div>

        <div className={`b2b-kpi-card ${metrics.urgentTotal > 0 ? 'urgent' : ''}`}>
          <div className="kpi-title">
            <span>Due Soon & Overdue</span>
            <span>⚠️</span>
          </div>
          <div className="kpi-val" style={{ color: metrics.urgentTotal > 0 ? '#EF4444' : 'inherit' }}>
            {metrics.urgentTotal}
          </div>
          <div className="kpi-sub">
            {metrics.overdueCount} overdue &bull; {metrics.dueSoonCount} due within 3 days
          </div>
        </div>

        <div className="b2b-kpi-card settled">
          <div className="kpi-title">
            <span>Completed / Settled</span>
            <span>✅</span>
          </div>
          <div className="kpi-val" style={{ color: '#10B981' }}>
            {metrics.completedCount}
          </div>
          <div className="kpi-sub">Paid & recorded transactions</div>
        </div>

        <div className="b2b-kpi-card">
          <div className="kpi-title">
            <span>B2B Partners</span>
            <span>🤝</span>
          </div>
          <div className="kpi-val">{metrics.totalPartners}</div>
          <div className="kpi-sub">Consult Fox, Future Factory, etc.</div>
        </div>
      </div>

      {/* 3. MICROSOFT TO-DO STYLE QUICK ADD BAR */}
      <form className="todo-quick-add-box" onSubmit={handleQuickAddSubmit}>
        <span className="todo-add-icon">➕</span>
        <input
          type="text"
          className="todo-input-field"
          placeholder='Try typing: "Consult Fox - 1,80,000 - Thejus & Nivil" or "Future Factory 500 usd for Vivek"'
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
        />
        <div className="todo-quick-add-actions">
          {quickInput.trim() && (
            <button type="submit" className="btn-quick-add-submit">
              Add Reminder
            </button>
          )}
          <button type="button" className="btn-detailed-modal" onClick={handleOpenAddModal}>
            <span>+</span>
            <span>Detailed Entry</span>
          </button>
        </div>
      </form>

      {/* 4. FILTER & SEARCH CONTROL BAR */}
      <div className="b2b-filter-bar">
        {/* Status Pills */}
        <div className="filter-status-pills">
          <button
            className={`status-pill ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({metrics.totalPendingCount})
          </button>
          <button
            className={`status-pill urgent ${statusFilter === 'urgent' ? 'active' : ''}`}
            onClick={() => setStatusFilter('urgent')}
          >
            ⚠️ Due Soon / Overdue ({metrics.urgentTotal})
          </button>
          <button
            className={`status-pill starred ${statusFilter === 'starred' ? 'active' : ''}`}
            onClick={() => setStatusFilter('starred')}
          >
            ⭐ Starred ({metrics.starredCount})
          </button>
          <button
            className={`status-pill completed ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            ✓ Completed ({metrics.completedCount})
          </button>
          <button
            className={`status-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Items ({payments.length})
          </button>
        </div>

        {/* Filter Dropdowns & Tools */}
        <div className="filter-right-tools">
          {/* Partner Filter */}
          <select
            className="filter-select"
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
          >
            <option value="All">All Partners ({uniquePartners.length})</option>
            {uniquePartners.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>

          {/* Currency Filter */}
          <select
            className="filter-select"
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
          >
            <option value="All">All Currencies</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>

          {/* Sort By */}
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="due_date_asc">Sort: Due Date (Earliest)</option>
            <option value="amount_desc">Sort: Amount (High to Low)</option>
            <option value="priority">Sort: Starred First</option>
            <option value="newest">Sort: Recently Added</option>
          </select>

          {/* Search Box */}
          <div className="search-input-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search B2B, student, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Export to CSV */}
          <button className="btn-export-csv" onClick={handleExportCSV} title="Export statement to CSV">
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 5. PENDING / ACTIVE PAYABLES LIST */}
      <div className="payments-list-section">
        {pendingList.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--muted, #8B949E)',
              background: 'var(--bg2, rgba(20,25,45,0.4))',
              borderRadius: '12px',
              border: '1px dashed var(--border, rgba(148,163,225,0.2))',
            }}
          >
            {statusFilter === 'urgent' ? (
              <div>
                <span style={{ fontSize: '28px' }}>🎉</span>
                <p style={{ marginTop: '8px', fontSize: '15px', fontWeight: 600 }}>No urgent payments right now!</p>
                <p style={{ fontSize: '13px' }}>All B2B obligations are up to date.</p>
              </div>
            ) : statusFilter === 'starred' ? (
              <div>
                <span style={{ fontSize: '28px' }}>⭐</span>
                <p style={{ marginTop: '8px', fontSize: '15px', fontWeight: 600 }}>No starred payments</p>
                <p style={{ fontSize: '13px' }}>Click the star icon on any payment to prioritize it here.</p>
              </div>
            ) : (
              <div>
                <span style={{ fontSize: '28px' }}>🤝</span>
                <p style={{ marginTop: '8px', fontSize: '15px', fontWeight: 600 }}>No pending B2B payments found</p>
                <p style={{ fontSize: '13px' }}>Use the quick bar above or click "Detailed Entry" to add one.</p>
              </div>
            )}
          </div>
        ) : (
          pendingList.map((payment) => {
            const due = getDueStatus(payment.due_date);
            return (
              <div
                key={payment.id}
                className={`payment-card-row ${due.urgent ? 'is-urgent' : ''}`}
              >
                {/* Left Group: Checkbox circle + info */}
                <div className="payment-left-group">
                  <button
                    className="todo-check-circle"
                    title="Click to Mark as Paid"
                    onClick={() => handleOpenSettle(payment)}
                  >
                    ✓
                  </button>

                  <div className="payment-main-meta">
                    <div className="partner-title-row">
                      <span className="partner-name">{payment.partner_name}</span>
                      <span className="category-pill">{payment.category}</span>
                      {payment.has_gst && <span className="gst-badge">+ GST</span>}
                    </div>

                    <div className="student-link-badge">
                      <span>🎓 Student(s):</span>
                      <strong>{payment.student_names || 'General B2B Settlement'}</strong>
                      {payment.notes && payment.notes !== payment.student_names && (
                        <span style={{ opacity: 0.75, marginLeft: '6px' }}>&bull; {payment.notes}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Group: Amount, Due Date Badge, Star, Actions */}
                <div className="payment-right-group">
                  <div className="amount-display-box">
                    <div className="amount-val">
                      {formatMoney(payment.amount, payment.currency)}
                    </div>
                    <div
                      className="due-badge"
                      style={{
                        backgroundColor: due.bg,
                        color: due.color,
                        border: due.border ? `1px solid ${due.border}` : 'none',
                      }}
                    >
                      {due.urgent && <span>⚠️</span>}
                      <span>{due.text}</span>
                    </div>
                  </div>

                  {/* Star Toggle */}
                  <button
                    className={`btn-star-priority ${payment.priority ? 'active' : ''}`}
                    title={payment.priority ? 'Remove Priority' : 'Mark High Priority'}
                    onClick={() => handleToggleStar(payment.id)}
                  >
                    {payment.priority ? '★' : '☆'}
                  </button>

                  {/* Edit */}
                  <button
                    className="action-icon-btn"
                    title="Edit Payment"
                    onClick={() => handleOpenEditModal(payment)}
                  >
                    ✏️
                  </button>

                  {/* Delete */}
                  <button
                    className="action-icon-btn delete"
                    title="Delete Reminder"
                    onClick={() => handleDelete(payment.id, payment.partner_name)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. COLLAPSIBLE COMPLETED SECTION (Microsoft To-Do style) */}
      {(statusFilter === 'all' || statusFilter === 'completed' || completedList.length > 0) && (
        <div style={{ marginTop: '10px' }}>
          <div
            className="completed-accordion-header"
            onClick={() => setCompletedOpen(!completedOpen)}
          >
            <span>{completedOpen ? '▼' : '▶'}</span>
            <span>Completed</span>
            <span className="completed-count-pill">{completedList.length}</span>
          </div>

          {completedOpen && (
            <div className="payments-list-section" style={{ marginTop: '6px' }}>
              {completedList.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--muted, #8B949E)', fontSize: '13px' }}>
                  No completed payments in this view.
                </div>
              ) : (
                completedList.map((payment) => (
                  <div key={payment.id} className="payment-card-row is-completed">
                    <div className="payment-left-group">
                      <button
                        className="todo-check-circle completed"
                        title="Click to restore to Pending"
                        onClick={() => handleOpenSettle(payment)}
                      >
                        ✓
                      </button>

                      <div className="payment-main-meta">
                        <div className="partner-title-row">
                          <span className="partner-name">{payment.partner_name}</span>
                          <span className="category-pill">{payment.category}</span>
                        </div>
                        <div className="student-link-badge">
                          <span>🎓 Student(s):</span>
                          <strong>{payment.student_names || 'General'}</strong>
                        </div>
                        {payment.settled_at && (
                          <div className="settlement-card-note">
                            <span>
                              ✓ Paid on {payment.settled_at} via <strong>{payment.payment_mode || 'Bank Transfer'}</strong>
                              {payment.utr_number ? ` (UTR: ${payment.utr_number})` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="payment-right-group">
                      <div className="amount-display-box">
                        <div className="amount-val" style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                          {formatMoney(payment.amount, payment.currency)}
                        </div>
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Settled</span>
                      </div>

                      <button
                        className="action-icon-btn delete"
                        title="Delete record"
                        onClick={() => handleDelete(payment.id, payment.partner_name)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. SETTLEMENT / MARK AS PAID MODAL */}
      {settlingPayment && (
        <div className="b2b-modal-overlay" onClick={() => setSettlingPayment(null)}>
          <div className="b2b-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <div className="b2b-modal-title">
                Settle & Mark Payment as Paid
              </div>
              <button className="b2b-modal-close" onClick={() => setSettlingPayment(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement}>
              <div className="b2b-modal-body">
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(124, 111, 255, 0.12)',
                    border: '1px solid rgba(124, 111, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>Partner / Beneficiary</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text, #EDEFFA)' }}>
                      {settlingPayment.partner_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text, #EDEFFA)', opacity: 0.85, marginTop: '2px' }}>
                      🎓 {settlingPayment.student_names}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>Amount to Settle</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                      {formatMoney(settlingPayment.amount, settlingPayment.currency)}
                    </div>
                    {settlingPayment.has_gst && <span className="gst-badge">+ GST</span>}
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group-b2b">
                    <label className="form-label-b2b">Payment Date</label>
                    <input
                      type="date"
                      className="form-input-b2b"
                      required
                      value={settlementData.settled_at}
                      onChange={(e) => setSettlementData({ ...settlementData, settled_at: e.target.value })}
                    />
                  </div>

                  <div className="form-group-b2b">
                    <label className="form-label-b2b">Payment Mode</label>
                    <select
                      className="form-input-b2b"
                      value={settlementData.payment_mode}
                      onChange={(e) => setSettlementData({ ...settlementData, payment_mode: e.target.value })}
                    >
                      <option value="Bank Transfer (IMPS / NEFT)">Bank Transfer (IMPS / NEFT)</option>
                      <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                      <option value="Forex Wire / Wise">Forex Wire / Wise</option>
                      <option value="Direct University Settlement">Direct University Settlement</option>
                      <option value="Cash Disbursement">Cash Disbursement</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-b2b">
                  <label className="form-label-b2b">Bank UTR / Transaction Reference # (Optional)</label>
                  <input
                    type="text"
                    className="form-input-b2b"
                    placeholder="e.g. UTR329482910482 or Ref #5492"
                    value={settlementData.utr_number}
                    onChange={(e) => setSettlementData({ ...settlementData, utr_number: e.target.value })}
                  />
                </div>

                <div className="form-group-b2b">
                  <label className="form-label-b2b">Settlement Notes (Optional)</label>
                  <input
                    type="text"
                    className="form-input-b2b"
                    placeholder="e.g. Account debited, verified with agent WhatsApp confirmation"
                    value={settlementData.notes}
                    onChange={(e) => setSettlementData({ ...settlementData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="b2b-modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setSettlingPayment(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save" style={{ background: '#10B981' }}>
                  ✓ Confirm & Mark as Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. ADD / EDIT PAYMENT MODAL */}
      {showModal && (
        <div className="b2b-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="b2b-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <div className="b2b-modal-title">
                {editingPayment ? 'Edit B2B Payment Reminder' : 'Add New B2B Partner Payment'}
              </div>
              <button className="b2b-modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="b2b-modal-body">
                {/* Partner Name with suggestion list */}
                <div className="form-group-b2b">
                  <label className="form-label-b2b">
                    Partner / Agency / Vendor Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-b2b"
                    placeholder="e.g. Consult Fox, Future Factory, Medwizard..."
                    required
                    value={formData.partner_name}
                    onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                    list="partner-datalist"
                  />
                  <datalist id="partner-datalist">
                    {uniquePartners.map((pt) => (
                      <option key={pt} value={pt} />
                    ))}
                  </datalist>
                </div>

                {/* Linked Student with ERP Autocomplete */}
                <div className="form-group-b2b">
                  <label className="form-label-b2b">
                    Linked Student(s) (One or Multiple) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input-b2b"
                    placeholder="Type student names (e.g. Thejus & Nivil, Vivek & Hanock)"
                    required
                    value={formData.student_names}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, student_names: val });
                      if (val.trim().length >= 2 && erpStudents.length > 0) {
                        const matches = erpStudents.filter((s) =>
                          s.name?.toLowerCase().includes(val.toLowerCase())
                        ).slice(0, 5);
                        setStudentSuggestions(matches);
                        setShowStudentSuggestions(matches.length > 0);
                      } else {
                        setShowStudentSuggestions(false);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 200)}
                  />

                  {/* Autocomplete Dropdown */}
                  {showStudentSuggestions && (
                    <div className="student-autocomplete-dropdown">
                      {studentSuggestions.map((stu) => (
                        <div
                          key={stu.id}
                          className="student-autocomplete-item"
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
                          <div>
                            <strong>{stu.name}</strong>
                            <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '6px' }}>
                              ({stu.country || 'Global'} - {stu.intake || 'Intake'})
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--blue, #7C6FFF)' }}>+ Link</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount, Currency & GST */}
                <div className="form-row-3">
                  <div className="form-group-b2b" style={{ gridColumn: 'span 1' }}>
                    <label className="form-label-b2b">Amount</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input-b2b"
                      placeholder="e.g. 180000"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group-b2b">
                    <label className="form-label-b2b">Currency</label>
                    <select
                      className="form-input-b2b"
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

                  <div className="form-group-b2b">
                    <label className="form-label-b2b">Category</label>
                    <select
                      className="form-input-b2b"
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

                {/* Due Date & Quick Presets */}
                <div className="form-group-b2b">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="form-label-b2b">When to Pay (Due Date Reminder)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '11.5px',
                          color: 'var(--blue, #7C6FFF)',
                          cursor: 'pointer',
                        }}
                        onClick={() =>
                          setFormData({ ...formData, due_date: new Date().toISOString().split('T')[0] })
                        }
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '11.5px',
                          color: 'var(--blue, #7C6FFF)',
                          cursor: 'pointer',
                        }}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
                          })
                        }
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '11.5px',
                          color: 'var(--blue, #7C6FFF)',
                          cursor: 'pointer',
                        }}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                          })
                        }
                      >
                        +7 Days
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    className="form-input-b2b"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                {/* Checkboxes: GST & Star Priority */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formData.has_gst}
                      onChange={(e) => setFormData({ ...formData, has_gst: e.target.checked })}
                    />
                    <span>Includes / Plus GST (+ GST)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.checked })}
                    />
                    <span>⭐ Mark High Priority / Starred</span>
                  </label>
                </div>

                {/* Additional Notes */}
                <div className="form-group-b2b">
                  <label className="form-label-b2b">Notes & Memo (Optional)</label>
                  <textarea
                    className="form-input-b2b"
                    rows={2}
                    placeholder="e.g. Visa filed, pay immediately after approval or invoice ref #..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="b2b-modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save">
                  {editingPayment ? 'Save Changes' : '+ Add Payment Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
