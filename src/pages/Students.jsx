import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import PaymentModal from '../components/PaymentModal';
import GoogleSheetImporterModal from '../components/GoogleSheetImporterModal';
import { extractReceiptUrl } from '../utils/paymentProofHelper';

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

// --- INLINE ICONS (Zero external icon dependency) ---
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const UploadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SortArrow = ({ dir }) => (
  <span style={{ display: 'inline-block', marginLeft: '4px', fontSize: '10px' }}>
    {dir === 'asc' ? '▲' : '▼'}
  </span>
);

// --- CURRENCY FORMATTERS ---
/**
 * Formats a number to ₹ in Lakhs if large (e.g. ₹12.45L) or standard Indian comma grouping
 */
function formatLakhs(amount) {
  const val = Number(amount || 0);
  if (Math.abs(val) >= 100000) {
    return `₹${(val / 100000).toFixed(2)}L`;
  }
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatINR(amount) {
  const val = Number(amount || 0);
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// --- CONSTANTS ---
const COMMON_COUNTRIES = [
  'United Kingdom',
  'Germany',
  'France',
  'Ireland',
  'Italy',
  'Malta',
  'Georgia',
  'Albania',
  'United States',
  'Canada',
  'Australia',
  'New Zealand',
  'Poland',
  'Latvia',
  'Cyprus',
  'Spain',
  'Netherlands',
];

const ENROLL_STATUSES = ['Active', 'Enrolled', 'Dropped', 'Refund'];

const PAY_STAGES = [
  'Pending',
  '1st Installment',
  '2nd Installment',
  '3rd Installment',
  '4th Installment',
  '5th Installment',
  'Full Payment',
  'Refund',
];

const LEAD_SOURCES = [
  'Digital Marketing',
  'Director Reference',
  'Walk-in',
  'Agent',
  'Social Media',
  'Alumni Referral',
  'Educational Fair',
  'Other',
];

const COMMON_INTAKES = [
  'Jan 2025',
  'May 2025',
  'Sept 2025',
  'Jan 2026',
  'May 2026',
  'Sept 2026',
  'Jan 2027',
];

export default function Students({ setCurrentPage, initialFilter } = {}) {
  const auth = useAuth();
  const { user, role, companyId, isDirector, isCompanyAdmin, isSuperAdmin, isManager, isCounselor } = auth;

  // Role hierarchy privileges
  const canViewFinance = isDirector || isCompanyAdmin || isSuperAdmin;
  const canAddStudent = isManager || isDirector || isCompanyAdmin || isSuperAdmin;
  const canDeleteStudent = isDirector || isCompanyAdmin || isSuperAdmin;

  // --- COMPONENT STATE ---
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    country: 'All',
    counselor: 'All',
    enroll_status: initialFilter && ENROLL_STATUSES.includes(initialFilter) ? initialFilter : 'All',
    pay_stage: 'All',
    intake: 'All',
  });

  // Sorting
  const [sortBy, setSortBy] = useState('last_activity');
  const [sortDir, setSortDir] = useState('desc');

  // Multi-select bulk state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBulkLedgerModal, setShowBulkLedgerModal] = useState(false);
  const [showMasterImporterModal, setShowMasterImporterModal] = useState(false);

  // Active student & payment selections
  const [currentStudent, setCurrentStudent] = useState(null);
  const [paymentSlot, setPaymentSlot] = useState(null);
  const [paymentToEdit, setPaymentToEdit] = useState(null);

  // Detail Modal Tab & Edit Mode
  const [detailTab, setDetailTab] = useState('details'); // 'details' | 'payments' | 'finance' | 'notes'
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Dynamic dropdowns
  const [counselorsList, setCounselorsList] = useState([]);

  // --- DATA FETCHING ---
  const fetchStudents = async () => {
    try {
      setRefreshing(true);
      const activeCompany = companyId || 'a1b2c3d4-0000-0000-0000-000000000001';

      // 1. Fetch Counselors for Company
      try {
        const { data: membersData } = await supabase
          .from('company_members')
          .select('user_id, role, team_name, profiles(id, full_name)')
          .eq('company_id', activeCompany)
          .eq('is_active', true);

        if (membersData && membersData.length > 0) {
          const list = membersData
            .map((m) => ({
              id: m.user_id,
              name: m.profiles?.full_name || 'Counselor',
              role: m.role,
              team: m.team_name,
            }))
            .filter((c) => Boolean(c.name));
          setCounselorsList(list);
        }
      } catch (e) {
        console.warn('Note fetching counselor profiles:', e.message);
      }

      // 2. Query students table
      let studentQuery = supabase
        .from('students')
        .select('*, payments(*)')
        .eq('company_id', activeCompany);

      // Role-specific scoping
      if (role === 'counselor' && user?.id) {
        studentQuery = studentQuery.eq('counselor_id', user.id);
      }

      const { data: rawStudents, error } = await studentQuery;

      if (error) {
        throw error;
      }

      // 3. Compute derived values
      const computed = (rawStudents || []).map((s) => {
        const paymentsList = s.payments || [];
        const collected = paymentsList.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );
        const committed = Number(s.committed || 0);

        // remaining = max(0, committed - collected) — only if status is Active or Enrolled
        const remaining = ['Active', 'Enrolled'].includes(s.enroll_status)
          ? Math.max(0, committed - collected)
          : 0;

        const refund = Number(s.refund || 0);
        const b2b_charge = Number(s.b2b_charge || 0);
        const incentive_student = Number(s.incentive_student || 0);
        const incentive_company = Number(s.incentive_company || 0);
        const other_expense = Number(s.other_expense || 0);
        const commission = Number(s.commission || 0);

        // profit = collected - refund - b2b_charge - incentive_student - incentive_company - other_expense + commission
        const profit =
          collected -
          refund -
          b2b_charge -
          incentive_student -
          incentive_company -
          other_expense +
          commission;

        // Calculate most recent activity
        const paymentDates = paymentsList
          .map((p) => p.payment_date || p.created_at)
          .filter(Boolean);
        const candidateDates = [
          s.updated_at,
          s.created_at,
          ...paymentDates,
        ].filter(Boolean);

        const last_activity =
          candidateDates.length > 0
            ? candidateDates.sort().reverse()[0]
            : s.created_at || new Date().toISOString();

        return {
          ...s,
          payments: paymentsList,
          collected,
          remaining,
          profit,
          last_activity,
        };
      });

      setStudents(computed);

      // Update currentStudent if open in modal
      if (currentStudent) {
        const updatedCurrent = computed.find((item) => item.id === currentStudent.id);
        if (updatedCurrent) {
          setCurrentStudent(updatedCurrent);
          setEditFormData(updatedCurrent);
        }
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [companyId, user?.id, role]);

  // Dynamic filter lists from data
  const dynamicCountries = useMemo(() => {
    const list = new Set(COMMON_COUNTRIES);
    students.forEach((s) => {
      if (s.country) list.add(s.country);
    });
    return Array.from(list).sort();
  }, [students]);

  const dynamicIntakes = useMemo(() => {
    const list = new Set(COMMON_INTAKES);
    students.forEach((s) => {
      if (s.intake) list.add(s.intake);
    });
    return Array.from(list).sort();
  }, [students]);

  const dynamicCounselors = useMemo(() => {
    const list = new Map();
    counselorsList.forEach((c) => list.set(c.id, c.name));
    students.forEach((s) => {
      if (s.counselor_id && s.counselor_name) {
        list.set(s.counselor_id, s.counselor_name);
      }
    });
    return Array.from(list.entries()).map(([id, name]) => ({ id, name }));
  }, [counselorsList, students]);

  // --- FILTER & SORT LOGIC ---
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesMobile = s.mobile?.toLowerCase().includes(q);
        const matchesCountry = s.country?.toLowerCase().includes(q);
        const matchesUni = s.university?.toLowerCase().includes(q);
        const matchesCourse = s.course?.toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesCountry && !matchesUni && !matchesCourse) {
          return false;
        }
      }

      // Status
      if (filters.enroll_status !== 'All' && s.enroll_status !== filters.enroll_status) {
        return false;
      }

      // Country
      if (filters.country !== 'All' && s.country !== filters.country) {
        return false;
      }

      // Counselor
      if (filters.counselor !== 'All' && s.counselor_id !== filters.counselor) {
        return false;
      }

      // Intake
      if (filters.intake !== 'All' && s.intake !== filters.intake) {
        return false;
      }

      // Pay Stage
      if (filters.pay_stage !== 'All' && s.pay_stage !== filters.pay_stage) {
        return false;
      }

      return true;
    });
  }, [students, search, filters]);

  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents];
    sorted.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'name') {
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (['committed', 'collected', 'remaining', 'profit'].includes(sortBy)) {
        aVal = Number(aVal || 0);
        bVal = Number(bVal || 0);
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortBy === 'last_activity' || sortBy === 'created_at') {
        const dateA = new Date(aVal || 0).getTime();
        const dateB = new Date(bVal || 0).getTime();
        return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? (aVal || '').localeCompare(bVal || '')
          : (bVal || '').localeCompare(aVal || '');
      }

      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return sorted;
  }, [filteredStudents, sortBy, sortDir]);

  // --- KPI SUMMARIES ---
  const kpis = useMemo(() => {
    const totalCount = sortedStudents.length;
    const activeCount = sortedStudents.filter(
      (s) => s.enroll_status === 'Active' || s.enroll_status === 'Enrolled'
    ).length;
    const totalCollected = sortedStudents.reduce((acc, s) => acc + s.collected, 0);
    const totalRemaining = sortedStudents.reduce((acc, s) => acc + s.remaining, 0);
    const totalProfit = sortedStudents.reduce((acc, s) => acc + s.profit, 0);

    return {
      totalCount,
      activeCount,
      totalCollected,
      totalRemaining,
      totalProfit,
    };
  }, [sortedStudents]);

  // --- SELECTION HANDLERS ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(sortedStudents.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // --- SORT TOGGLER ---
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = () => {
    if (sortedStudents.length === 0) {
      toast.error('No student records to export');
      return;
    }

    try {
      const exportData = sortedStudents.map((s, index) => {
        const row = {
          '#': index + 1,
          'Student Name': s.name || '',
          'Mobile': s.mobile || '',
          'Email': s.email || '',
          'Target Country': s.country || '',
          'Counselor': s.counselor_name || '',
          'Team Lead': s.team_lead || '',
          'Intake': s.intake || '',
          'University': s.university || '',
          'Course': s.course || '',
          'Enrollment Status': s.enroll_status || '',
          'Payment Stage': s.pay_stage || '',
          'Committed (₹)': s.committed || 0,
          'Collected (₹)': s.collected || 0,
          'Remaining (₹)': s.remaining || 0,
        };

        if (canViewFinance) {
          row['B2B Charge (₹)'] = s.b2b_charge || 0;
          row['Commission (₹)'] = s.commission || 0;
          row['Incentive Student (₹)'] = s.incentive_student || 0;
          row['Incentive Company (₹)'] = s.incentive_company || 0;
          row['Refund (₹)'] = s.refund || 0;
          row['Other Expense (₹)'] = s.other_expense || 0;
          row['Net Profit (₹)'] = s.profit || 0;
        }

        row['Lead Source'] = s.lead_source || '';
        row['Notes'] = s.notes || '';
        row['Last Activity'] = s.last_activity ? new Date(s.last_activity).toLocaleDateString() : '';

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

      const fileName = `Sterling_Students_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(`Exported ${sortedStudents.length} records to Excel`);
    } catch (err) {
      console.error('Export Excel failed:', err);
      toast.error('Failed to export students to Excel');
    }
  };

  // --- BULK IMPORT FROM GOOGLE SHEET / EXCEL ---
  const fileInputRef = React.useRef(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    setImportProgress({ current: 0, total: 0 });
    const toastId = toast.loading('Reading Google Sheet file...');

    try {
      const arrayBuf = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuf, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rows || rows.length < 2) {
        throw new Error('The selected sheet is empty or has no data rows.');
      }

      // Find header row by searching for 'student', 'name', or 'counselor'
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(6, rows.length); i++) {
        const rowStr = rows[i].map(c => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('student') || rowStr.includes('name') || rowStr.includes('counselor')) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rows[headerRowIndex].map(h => String(h || '').trim());
      const dataRows = rows.slice(headerRowIndex + 1);

      // Helper to find column index by matching aliases
      const findCol = (aliases, fallbackIdx = -1) => {
        const lowerAliases = aliases.map(a => a.toLowerCase().trim());
        const found = headers.findIndex(h => {
          const lh = h.toLowerCase().trim();
          return lowerAliases.some(alias => lh === alias || lh.includes(alias));
        });
        return found !== -1 ? found : fallbackIdx;
      };

      // Column mapping matching exact Google Sheet layout
      const colName = findCol(['student full name', 'full name', 'student name', 'name'], 2);
      const colEmail = findCol(['email address', 'email', 'e-mail'], 1);
      const colMobile = findCol(['phone number', 'mobile number', 'mobile', 'phone'], 3);
      const colCounselor = findCol(['counselor'], 4);
      const colTeamLead = findCol(['team lead', 'team_lead', 'tl'], 5);
      const colLeadSource = findCol(['lead source', 'lead_source', 'source'], 6);
      const colUniversity = findCol(['university'], 7);
      const colCourse = findCol(['course', 'course name'], 8);
      const colCountry = findCol(['country'], 9);
      const colIntake = findCol(['intake'], 10);
      const colStage = findCol(['payment stage', 'stage', 'pay stage'], 11);

      // Installments 1 to 5
      const colBnk1 = findCol(['1st acc', '1st bank', 'bnk1', 'bank 1'], 12);
      const colAmt1 = findCol(['1st amount', 'amt1', 'amount 1'], 13);
      const colDt1  = findCol(['paid date-1', 'paid date 1', 'dt1', 'date 1'], 14);

      const colBnk2 = findCol(['2nd acc', '2nd bank', 'bnk2', 'bank 2'], 15);
      const colAmt2 = findCol(['2nd amount', 'amt2', 'amount 2'], 16);
      const colDt2  = findCol(['paid date-2', 'paid date 2', 'dt2', 'date 2'], 17);

      const colBnk3 = findCol(['3rd acc', '3rd bank', 'bnk3', 'bank 3'], 18);
      const colAmt3 = findCol(['3rd amount', 'amt3', 'amount 3'], 19);
      const colDt3  = findCol(['paid date-3', 'paid date 3', 'dt3', 'date 3'], 20);

      const colBnk4 = findCol(['4th acc', '4th bank', 'bnk4', 'bank 4'], 21);
      const colAmt4 = findCol(['4th amount', 'amt4', 'amount 4'], 22);
      const colDt4  = findCol(['paid date-4', 'paid date 4', 'dt4', 'date 4'], 23);

      const colBnk5 = findCol(['5th acc', '5th bank', 'bnk5', 'bank 5'], 24);
      const colAmt5 = findCol(['5th amount', 'amt5', 'amount 5'], 25);
      const colDt5  = findCol(['paid date-5', 'paid date 5', 'dt5', 'date 5'], 26);

      const colRefund = findCol(['refund'], 27);
      const colCommitted = findCol(['total service charge', 'committed', 'service charge', 'total committed'], 29);
      const colStatus = findCol(['active/dropped', 'enroll_status', 'status', 'active / dropped'], 31);
      const colB2B = findCol(['b2b charge', 'b2b'], 32);
      const colIncStudent = findCol(['incentive from student', 'anna incentive student', 'incentive student'], 33);
      const colIncCompany = findCol(['incentive from sterling', 'anna incentive sterling', 'incentive company'], 34);
      const colCommission = findCol(['commission'], 35);
      const colOtherExpense = findCol(['other expenses', 'other expense'], 36);

      const numVal = (v) => {
        if (!v) return 0;
        const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
        return isNaN(n) ? 0 : n;
      };

      const dateVal = (v) => {
        if (!v) return new Date().toISOString().split('T')[0];
        if (v instanceof Date && !isNaN(v)) return v.toISOString().split('T')[0];
        const parsed = new Date(v);
        if (!isNaN(parsed)) return parsed.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
      };

      const parseStatus = (v) => {
        const s = String(v || '').trim().toLowerCase();
        if (s.includes('drop')) return 'Dropped';
        if (s.includes('refund')) return 'Refund';
        if (s.includes('enroll')) return 'Enrolled';
        return 'Active';
      };

      const parseStage = (v) => {
        const s = String(v || '').trim();
        const valid = ['Pending', '1st Installment', '2nd Installment', '3rd Installment', '4th Installment', '5th Installment', 'Full Payment', 'Refund'];
        const found = valid.find(st => st.toLowerCase() === s.toLowerCase());
        return found || 'Pending';
      };

      const targetCompanyId = companyId || 'a1b2c3d4-0000-0000-0000-000000000001';
      const parsedStudents = [];

      dataRows.forEach((r) => {
        const name = String(r[colName] || '').trim();
        if (!name) return; // Skip empty row

        const studentObj = {
          company_id: targetCompanyId,
          name,
          email: String(r[colEmail] || '').trim() || null,
          mobile: String(r[colMobile] || '').trim(),
          counselor_name: String(r[colCounselor] || 'Unknown').trim(),
          team_lead: String(r[colTeamLead] || '').trim(),
          lead_source: String(r[colLeadSource] || 'Unknown').trim(),
          university: String(r[colUniversity] || '').trim(),
          course: String(r[colCourse] || '').trim(),
          country: String(r[colCountry] || 'Unknown').trim(),
          intake: String(r[colIntake] || 'Unknown').trim(),
          pay_stage: parseStage(r[colStage]),
          enroll_status: parseStatus(r[colStatus]),
          committed: numVal(r[colCommitted]),
          refund: numVal(r[colRefund]),
          b2b_charge: numVal(r[colB2B]),
          incentive_student: numVal(r[colIncStudent]),
          incentive_company: numVal(r[colIncCompany]),
          commission: numVal(r[colCommission]),
          other_expense: numVal(r[colOtherExpense]),
        };

        const rawPayments = [];
        const slots = [
          { slot: 1, bnk: r[colBnk1], amt: numVal(r[colAmt1]), dt: r[colDt1] },
          { slot: 2, bnk: r[colBnk2], amt: numVal(r[colAmt2]), dt: r[colDt2] },
          { slot: 3, bnk: r[colBnk3], amt: numVal(r[colAmt3]), dt: r[colDt3] },
          { slot: 4, bnk: r[colBnk4], amt: numVal(r[colAmt4]), dt: r[colDt4] },
          { slot: 5, bnk: r[colBnk5], amt: numVal(r[colAmt5]), dt: r[colDt5] },
        ];

        slots.forEach(({ slot, bnk, amt, dt }) => {
          const bankName = String(bnk || '').trim();
          if (amt > 0 && bankName) {
            rawPayments.push({
              slot,
              bank_name: bankName,
              amount: amt,
              payment_date: dateVal(dt),
              payment_type: 'standard',
            });
          }
        });

        parsedStudents.push({ student: studentObj, payments: rawPayments });
      });

      if (parsedStudents.length === 0) {
        throw new Error('No valid students found in the sheet. Please make sure the sheet has student names.');
      }

      toast.loading(`Importing ${parsedStudents.length} students into ERP...`, { id: toastId });
      setImportProgress({ current: 0, total: parsedStudents.length });

      let importedStudentsCount = 0;
      let importedPaymentsCount = 0;

      // Batch insert in chunks of 20
      const BATCH_SIZE = 20;
      for (let i = 0; i < parsedStudents.length; i += BATCH_SIZE) {
        const batch = parsedStudents.slice(i, i + BATCH_SIZE);
        const studentsToInsert = batch.map(b => b.student);

        const { data: insertedStudents, error: insertErr } = await supabase
          .from('students')
          .insert(studentsToInsert)
          .select('id, name');

        if (insertErr) throw insertErr;

        const paymentsToInsert = [];
        insertedStudents.forEach((inserted, idx) => {
          const original = batch[idx];
          if (original && original.payments && original.payments.length > 0) {
            original.payments.forEach(p => {
              paymentsToInsert.push({
                ...p,
                student_id: inserted.id,
                company_id: targetCompanyId,
              });
            });
          }
        });

        if (paymentsToInsert.length > 0) {
          const { error: pErr } = await supabase.from('payments').insert(paymentsToInsert);
          if (pErr) console.warn('Payment insert warning:', pErr.message);
          importedPaymentsCount += paymentsToInsert.length;
        }

        importedStudentsCount += batch.length;
        setImportProgress({ current: importedStudentsCount, total: parsedStudents.length });
      }

      toast.success(`Successfully imported ${importedStudentsCount} students & ${importedPaymentsCount} installments!`, {
        id: toastId,
        duration: 7000,
      });

      fetchStudents();
    } catch (err) {
      console.error('Import error:', err);
      toast.error(err.message || 'Failed to import Google Sheet', { id: toastId, duration: 7000 });
    } finally {
      setImporting(false);
    }
  };

  // --- ACTIONS: DELETE STUDENT ---
  const handleDeleteStudent = async (student, e) => {
    e.stopPropagation();
    if (!canDeleteStudent) {
      toast.error('Only directors and company admins can delete students');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete "${student.name}" and all associated payments?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('students').delete().eq('id', student.id);
      if (error) throw error;

      toast.success(`Student "${student.name}" deleted`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(student.id);
        return next;
      });
      if (currentStudent?.id === student.id) {
        setShowStudentModal(false);
      }
      fetchStudents();
    } catch (err) {
      console.error('Error deleting student:', err);
      toast.error(err.message || 'Failed to delete student');
    }
  };

  // --- OPEN PAYMENT MODAL ---
  const handleOpenAddPayment = (student, slotNum = null, e = null) => {
    if (e) e.stopPropagation();
    setCurrentStudent(student);
    setPaymentSlot(slotNum);
    setPaymentToEdit(null);
    setShowPaymentModal(true);
  };

  const handleOpenEditPayment = (student, paymentObj, e = null) => {
    if (e) e.stopPropagation();
    setCurrentStudent(student);
    setPaymentSlot(paymentObj.slot);
    setPaymentToEdit(paymentObj);
    setShowPaymentModal(true);
  };

  // --- OPEN STUDENT DETAIL MODAL ---
  const handleOpenStudentDetail = (student, startInEdit = false, initialTab = 'details') => {
    setCurrentStudent(student);
    setEditFormData({ ...student });
    setIsEditingDetails(startInEdit);
    setDetailTab(initialTab);
    setShowStudentModal(true);
  };

  // --- SAVE EDITED STUDENT DETAILS ---
  const handleSaveStudentDetails = async () => {
    if (!currentStudent?.id) return;
    try {
      const updatePayload = {
        name: editFormData.name,
        mobile: editFormData.mobile || null,
        email: editFormData.email || null,
        country: editFormData.country || null,
        intake: editFormData.intake || null,
        lead_source: editFormData.lead_source || null,
        university: editFormData.university || null,
        course: editFormData.course || null,
        enroll_status: editFormData.enroll_status,
        pay_stage: editFormData.pay_stage,
        committed: Number(editFormData.committed || 0),
        b2b_charge: Number(editFormData.b2b_charge || 0),
        commission: Number(editFormData.commission || 0),
        incentive_student: Number(editFormData.incentive_student || 0),
        incentive_company: Number(editFormData.incentive_company || 0),
        refund: Number(editFormData.refund || 0),
        other_expense: Number(editFormData.other_expense || 0),
        counselor_id: editFormData.counselor_id || null,
        counselor_name: editFormData.counselor_name || null,
        team_lead: editFormData.team_lead || null,
        notes: editFormData.notes || null,
      };

      const { data, error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', currentStudent.id)
        .select('*, payments(*)')
        .single();

      if (error) throw error;

      toast.success('Student details updated successfully');
      setIsEditingDetails(false);
      fetchStudents();
    } catch (err) {
      console.error('Error updating student details:', err);
      toast.error(err.message || 'Failed to update student details');
    }
  };

  // --- SAVE STUDENT NOTES ONLY ---
  const handleSaveNotes = async () => {
    if (!currentStudent?.id) return;
    try {
      const { error } = await supabase
        .from('students')
        .update({ notes: editFormData.notes })
        .eq('id', currentStudent.id);

      if (error) throw error;
      toast.success('Notes saved successfully');
      fetchStudents();
    } catch (err) {
      toast.error(err.message || 'Failed to save notes');
    }
  };

  // --- DELETE A PAYMENT INSTALLMENT ---
  const handleDeletePayment = async (paymentId, slotNum) => {
    if (!canDeleteStudent) {
      toast.error('Only directors and company admins can delete recorded payments');
      return;
    }
    if (!window.confirm(`Delete payment record for Slot ${slotNum}?`)) {
      return;
    }
    try {
      const { error } = await supabase.from('payments').delete().eq('id', paymentId);
      if (error) throw error;
      toast.success(`Payment Slot ${slotNum} deleted`);
      fetchStudents();
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  // --- RESET ALL FILTERS ---
  const handleResetFilters = () => {
    setSearch('');
    setFilters({
      country: 'All',
      counselor: 'All',
      enroll_status: 'All',
      pay_stage: 'All',
      intake: 'All',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* --- TOP HEADER & ACTIONS --- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            Student Management
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(124, 111, 255, 0.15)',
                color: 'var(--blue)',
                border: '1px solid rgba(124, 111, 255, 0.3)',
              }}
            >
              {filteredStudents.length} Active Records
            </span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            Multi-country study abroad intake pipeline, installments tracker, and yield analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchStudents}
            disabled={refreshing}
            style={{ padding: '9px 14px', fontSize: '13px' }}
            title="Refresh student records"
          >
            <RefreshIcon />
            <span className="hidden-mobile">Refresh</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportExcel}
            style={{ padding: '9px 16px', fontSize: '13px' }}
            title="Export filtered records to Microsoft Excel"
          >
            <DownloadIcon />
            <span>Export Excel</span>
          </button>

          {canAddStudent && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowMasterImporterModal(true)}
              style={{
                padding: '9px 18px',
                fontSize: '13px',
                background: 'linear-gradient(135deg, rgba(0, 229, 160, 0.18) 0%, rgba(54, 209, 220, 0.15) 100%)',
                color: '#00E5A0',
                border: '1px solid rgba(0, 229, 160, 0.5)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 229, 160, 0.2)',
              }}
              title="Bulk import students & installments from your Europe Sterling Master Google Sheet (.xlsx / .csv)"
            >
              <UploadIcon />
              <span>Import Google Sheet</span>
            </button>
          )}

          {canAddStudent && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ padding: '9px 18px', fontSize: '13px' }}
            >
              <PlusIcon />
              <span>Add Student</span>
            </button>
          )}
        </div>
      </div>

      {/* --- KPI SUMMARY ROW --- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: canViewFinance
            ? 'repeat(auto-fit, minmax(210px, 1fr))'
            : 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total Students */}
        <div className="glass-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Cohort
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
            {kpis.totalCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--cyan)', marginTop: '4px' }}>
            {kpis.activeCount} currently active
          </div>
        </div>

        {/* Active Enrolled */}
        <div className="glass-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active / Enrolled
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--green)', marginTop: '6px' }}>
            {kpis.activeCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            {((kpis.activeCount / (kpis.totalCount || 1)) * 100).toFixed(0)}% retention rate
          </div>
        </div>

        {/* Collected Revenue */}
        <div className="glass-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Collected
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--green)', marginTop: '6px' }}>
            {formatLakhs(kpis.totalCollected)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Realized cash inflow
          </div>
        </div>

        {/* Remaining Dues */}
        <div className="glass-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Outstanding Balance
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: kpis.totalRemaining > 0 ? 'var(--amber)' : 'var(--muted)',
              marginTop: '6px',
            }}
          >
            {formatLakhs(kpis.totalRemaining)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Pending installments
          </div>
        </div>

        {/* Realized Profit (Director+ Only) */}
        {canViewFinance && (
          <div className="glass-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sterling Profit
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: kpis.totalProfit >= 0 ? 'var(--blue)' : 'var(--red)',
                marginTop: '6px',
              }}
            >
              {formatLakhs(kpis.totalProfit)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              Net margin after commission & B2B
            </div>
          </div>
        )}
      </div>

      {/* --- FILTERS BAR --- */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search by name, mobile, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Enrollment Status */}
          <select
            value={filters.enroll_status}
            onChange={(e) => setFilters({ ...filters, enroll_status: e.target.value })}
            style={{
              padding: '9px 12px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Statuses</option>
            {ENROLL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Country */}
          <select
            value={filters.country}
            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            style={{
              padding: '9px 12px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Countries</option>
            {dynamicCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Counselor (Hidden for Counselor role) */}
          {!isCounselor && (
            <select
              value={filters.counselor}
              onChange={(e) => setFilters({ ...filters, counselor: e.target.value })}
              style={{
                padding: '9px 12px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Counselors</option>
              {dynamicCounselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Intake */}
          <select
            value={filters.intake}
            onChange={(e) => setFilters({ ...filters, intake: e.target.value })}
            style={{
              padding: '9px 12px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Intakes</option>
            {dynamicIntakes.map((itk) => (
              <option key={itk} value={itk}>
                {itk}
              </option>
            ))}
          </select>

          {/* Payment Stage */}
          <select
            value={filters.pay_stage}
            onChange={(e) => setFilters({ ...filters, pay_stage: e.target.value })}
            style={{
              padding: '9px 12px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Payment Stages</option>
            {PAY_STAGES.map((stg) => (
              <option key={stg} value={stg}>
                {stg}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetFilters}
            style={{
              padding: '9px 14px',
              fontSize: '12px',
              justifyContent: 'center',
            }}
          >
            Reset Filters
          </button>
        </div>

        {/* --- BULK ACTIONS FLOATING/INLINE BAR --- */}
        {selectedIds.size > 0 && (
          <div
            style={{
              background: 'rgba(124, 111, 255, 0.15)',
              border: '1px solid rgba(124, 111, 255, 0.35)',
              borderRadius: '8px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--blue)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {selectedIds.size}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                Students Selected
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {canViewFinance && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowBulkLedgerModal(true)}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Bulk Add Ledger Entry
                </button>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedIds(new Set())}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Deselect All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- DESKTOP TABLE VIEW --- */}
      <div className="table-container-responsive glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {/* Select All Checkbox */}
                <th style={{ padding: '14px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={
                      sortedStudents.length > 0 &&
                      selectedIds.size === sortedStudents.length
                    }
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', accentColor: 'var(--blue)' }}
                  />
                </th>

                {/* Sticky Name & Mobile Column */}
                <th
                  onClick={() => handleSort('name')}
                  style={{
                    padding: '14px 16px',
                    position: 'sticky',
                    left: 0,
                    background: 'var(--bg2solid)',
                    zIndex: 2,
                    cursor: 'pointer',
                    boxShadow: '2px 0 6px rgba(0,0,0,0.3)',
                  }}
                >
                  Name & Mobile {sortBy === 'name' && <SortArrow dir={sortDir} />}
                </th>

                <th
                  onClick={() => handleSort('country')}
                  style={{ padding: '14px 16px', cursor: 'pointer' }}
                >
                  Country {sortBy === 'country' && <SortArrow dir={sortDir} />}
                </th>

                <th
                  onClick={() => handleSort('counselor_name')}
                  style={{ padding: '14px 16px', cursor: 'pointer' }}
                >
                  Counselor {sortBy === 'counselor_name' && <SortArrow dir={sortDir} />}
                </th>

                <th
                  onClick={() => handleSort('intake')}
                  style={{ padding: '14px 16px', cursor: 'pointer' }}
                >
                  Intake {sortBy === 'intake' && <SortArrow dir={sortDir} />}
                </th>

                <th
                  onClick={() => handleSort('enroll_status')}
                  style={{ padding: '14px 16px', cursor: 'pointer' }}
                >
                  Status {sortBy === 'enroll_status' && <SortArrow dir={sortDir} />}
                </th>

                <th
                  onClick={() => handleSort('collected')}
                  style={{ padding: '14px 16px', textAlign: 'right', cursor: 'pointer' }}
                >
                  Collected {sortBy === 'collected' && <SortArrow dir={sortDir} />}
                </th>

                <th
                  onClick={() => handleSort('committed')}
                  style={{ padding: '14px 16px', textAlign: 'right', cursor: 'pointer' }}
                >
                  Committed {sortBy === 'committed' && <SortArrow dir={sortDir} />}
                </th>

                <th
                  onClick={() => handleSort('remaining')}
                  style={{ padding: '14px 16px', textAlign: 'right', cursor: 'pointer' }}
                >
                  Remaining {sortBy === 'remaining' && <SortArrow dir={sortDir} />}
                </th>

                {canViewFinance && (
                  <th
                    onClick={() => handleSort('profit')}
                    style={{ padding: '14px 16px', textAlign: 'right', cursor: 'pointer' }}
                  >
                    Profit {sortBy === 'profit' && <SortArrow dir={sortDir} />}
                  </th>
                )}

                <th
                  onClick={() => handleSort('last_activity')}
                  style={{ padding: '14px 16px', cursor: 'pointer' }}
                >
                  Last Activity {sortBy === 'last_activity' && <SortArrow dir={sortDir} />}
                </th>

                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canViewFinance ? 12 : 11}
                    style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        width: '28px',
                        height: '28px',
                        border: '3px solid var(--border)',
                        borderTopColor: 'var(--blue)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        marginBottom: '12px',
                      }}
                    />
                    <div>Loading student database records...</div>
                  </td>
                </tr>
              ) : sortedStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={canViewFinance ? 12 : 11}
                    style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                      No students found
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      Try adjusting your search criteria or add a new student record.
                    </div>
                  </td>
                </tr>
              ) : (
                sortedStudents.map((s, idx) => {
                  const isSelected = selectedIds.has(s.id);
                  const statusClass =
                    s.enroll_status === 'Active'
                      ? 'badge-active'
                      : s.enroll_status === 'Enrolled'
                      ? 'badge-enrolled'
                      : s.enroll_status === 'Dropped'
                      ? 'badge-dropped'
                      : 'badge-pending';

                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleOpenStudentDetail(s, false)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isSelected
                          ? 'rgba(124, 111, 255, 0.08)'
                          : idx % 2 === 0
                          ? 'transparent'
                          : 'rgba(255, 255, 255, 0.015)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background =
                            idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)';
                        }
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(s.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer', accentColor: 'var(--blue)' }}
                        />
                      </td>

                      {/* Sticky Name & Mobile */}
                      <td
                        style={{
                          padding: '14px 16px',
                          position: 'sticky',
                          left: 0,
                          background: 'var(--bg2solid)',
                          zIndex: 1,
                          boxShadow: '2px 0 6px rgba(0,0,0,0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #7C6FFF 0%, #36D1DC 100%)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '12px',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(124, 111, 255, 0.3)',
                            }}
                          >
                            {(s.name || 'S').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                              {s.mobile || 'No Mobile'}
                              {s.university && <span> &bull; {s.university}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Country */}
                      <td style={{ padding: '14px 16px', color: 'var(--text)' }}>
                        <div style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span>{COUNTRY_FLAGS[s.country] || '🌍'}</span>
                          <span>{s.country || '—'}</span>
                        </div>
                        {s.course && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.course}</div>
                        )}
                      </td>

                      {/* Counselor */}
                      <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>
                        {s.counselor_name || 'Unassigned'}
                      </td>

                      {/* Intake */}
                      <td style={{ padding: '14px 16px', color: 'var(--text)' }}>
                        {s.intake || '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${statusClass}`}>{s.enroll_status}</span>
                      </td>

                      {/* Collected */}
                      <td
                        style={{
                          padding: '14px 16px',
                          textAlign: 'right',
                          color: 'var(--green)',
                          fontWeight: 700,
                        }}
                      >
                        {formatINR(s.collected)}
                      </td>

                      {/* Committed */}
                      <td
                        style={{
                          padding: '14px 16px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: 'var(--text)',
                        }}
                      >
                        {formatINR(s.committed)}
                      </td>

                      {/* Remaining */}
                      <td
                        style={{
                          padding: '14px 16px',
                          textAlign: 'right',
                          color: s.remaining > 0 ? 'var(--amber)' : 'var(--muted)',
                          fontWeight: 600,
                        }}
                      >
                        {formatINR(s.remaining)}
                      </td>

                      {/* Profit (Director+ Only) */}
                      {canViewFinance && (
                        <td
                          style={{
                            padding: '14px 16px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: s.profit >= 0 ? 'var(--blue)' : 'var(--red)',
                          }}
                        >
                          {formatINR(s.profit)}
                        </td>
                      )}

                      {/* Last Activity */}
                      <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: '12px' }}>
                        {s.last_activity
                          ? new Date(s.last_activity).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Add Payment Button */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenAddPayment(s, null, e)}
                            title="Add Payment Installment"
                            style={{
                              background: 'rgba(0, 229, 160, 0.12)',
                              border: '1px solid rgba(0, 229, 160, 0.3)',
                              color: 'var(--green)',
                              borderRadius: '6px',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <PlusIcon />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenStudentDetail(s, true)}
                            title="Edit Student Info"
                            style={{
                              background: 'var(--bg3)',
                              border: '1px solid var(--border)',
                              color: 'var(--text)',
                              borderRadius: '6px',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <EditIcon />
                          </button>

                          {/* Delete Button (Director+ only) */}
                          {canDeleteStudent && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteStudent(s, e)}
                              title="Delete Student"
                              style={{
                                background: 'rgba(255, 111, 142, 0.12)',
                                border: '1px solid rgba(255, 111, 142, 0.3)',
                                color: 'var(--red)',
                                borderRadius: '6px',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- RESPONSIVE MOBILE CARDS VIEW --- */}
      <div className="mobile-cards-view" style={{ display: 'none', flexDirection: 'column', gap: '12px' }}>
        {sortedStudents.map((s) => {
          const isSelected = selectedIds.has(s.id);
          return (
            <div
              key={s.id}
              onClick={() => handleOpenStudentDetail(s, false)}
              className="glass-card"
              style={{
                padding: '16px',
                border: isSelected ? '1px solid var(--blue)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(124, 111, 255, 0.08)' : 'var(--glass-strong)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectRow(s.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', accentColor: 'var(--blue)' }}
                  />
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                      {s.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {s.mobile || 'No Mobile'}
                    </div>
                  </div>
                </div>

                <span
                  className={`badge ${
                    s.enroll_status === 'Active'
                      ? 'badge-active'
                      : s.enroll_status === 'Enrolled'
                      ? 'badge-enrolled'
                      : s.enroll_status === 'Dropped'
                      ? 'badge-dropped'
                      : 'badge-pending'
                  }`}
                >
                  {s.enroll_status}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  margin: '12px 0',
                  padding: '10px',
                  background: 'var(--bg3)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--muted)' }}>Country: </span>
                  <strong>{s.country || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Intake: </span>
                  <strong>{s.intake || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Collected: </span>
                  <strong style={{ color: 'var(--green)' }}>{formatINR(s.collected)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Remaining: </span>
                  <strong style={{ color: s.remaining > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                    {formatINR(s.remaining)}
                  </strong>
                </div>
                {canViewFinance && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--muted)' }}>Sterling Profit: </span>
                    <strong style={{ color: s.profit >= 0 ? 'var(--blue)' : 'var(--red)' }}>
                      {formatINR(s.profit)}
                    </strong>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: 'var(--muted)',
                }}
              >
                <span>Counselor: {s.counselor_name || 'Unassigned'}</span>
                <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => handleOpenAddPayment(s, null, e)}
                    style={{
                      background: 'rgba(0, 229, 160, 0.15)',
                      border: 'none',
                      color: 'var(--green)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    + Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenStudentDetail(s, true)}
                    style={{
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          ADD STUDENT MODAL
         ========================================================================= */}
      {showAddModal && (
        <AddStudentModal
          counselorsList={counselorsList}
          currentUserId={user?.id}
          currentUserName={auth.profile?.full_name}
          isCounselor={isCounselor}
          companyId={companyId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchStudents();
          }}
        />
      )}

      {/* =========================================================================
          STUDENT DETAIL & EDIT MODAL
         ========================================================================= */}
      {showStudentModal && currentStudent && (
        <StudentDetailModal
          student={currentStudent}
          activeTab={detailTab}
          setActiveTab={setDetailTab}
          isEditing={isEditingDetails}
          setIsEditing={setIsEditingDetails}
          editFormData={editFormData}
          setEditFormData={setEditFormData}
          canViewFinance={canViewFinance}
          canDeleteStudent={canDeleteStudent}
          counselorsList={counselorsList}
          onSaveDetails={handleSaveStudentDetails}
          onSaveNotes={handleSaveNotes}
          onOpenAddPayment={(slot) => handleOpenAddPayment(currentStudent, slot)}
          onOpenEditPayment={(pmt) => handleOpenEditPayment(currentStudent, pmt)}
          onDeletePayment={handleDeletePayment}
          onClose={() => setShowStudentModal(false)}
        />
      )}

      {/* =========================================================================
          PAYMENT INSTALLMENT MODAL
         ========================================================================= */}
      {showPaymentModal && currentStudent && (
        <PaymentModal
          student={currentStudent}
          slot={paymentSlot}
          payment={paymentToEdit}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentToEdit(null);
          }}
          onSave={() => {
            fetchStudents();
          }}
        />
      )}

      {/* =========================================================================
          BULK ADD LEDGER ENTRY MODAL
         ========================================================================= */}
      {showBulkLedgerModal && selectedIds.size > 0 && (
        <BulkLedgerModal
          selectedIds={Array.from(selectedIds)}
          companyId={companyId}
          userId={user?.id}
          onClose={() => setShowBulkLedgerModal(false)}
          onSuccess={() => {
            setShowBulkLedgerModal(false);
            setSelectedIds(new Set());
            fetchStudents();
          }}
        />
      )}

      {/* =========================================================================
          MASTER GOOGLE SHEET IMPORTER MODAL
         ========================================================================= */}
      <GoogleSheetImporterModal
        isOpen={showMasterImporterModal}
        onClose={() => setShowMasterImporterModal(false)}
        onImportSuccess={() => fetchStudents()}
      />

      {/* Responsive CSS styling */}
      <style>{`
        @media (max-width: 900px) {
          .table-container-responsive {
            display: none !important;
          }
          .mobile-cards-view {
            display: flex !important;
          }
          .hidden-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ===============================================================================
// ADD STUDENT MODAL COMPONENT (Inline Form inside a Modal)
// ===============================================================================
function AddStudentModal({
  counselorsList,
  currentUserId,
  currentUserName,
  isCounselor,
  companyId,
  onClose,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    country: 'United Kingdom',
    intake: 'Sept 2025',
    lead_source: 'Digital Marketing',
    counselor_id: isCounselor ? currentUserId : '',
    counselor_name: isCounselor ? currentUserName : '',
    team_lead: '',
    university: '',
    course: '',
    enroll_status: 'Active',
    pay_stage: 'Pending',
    committed: '',
    b2b_charge: '0',
    commission: '0',
    incentive_student: '0',
    incentive_company: '0',
    refund: '0',
    other_expense: '0',
    notes: '',
    // Optional first payment
    hasFirstPayment: false,
    firstPaymentBank: '',
    firstPaymentAmount: '',
    firstPaymentDate: new Date().toISOString().split('T')[0],
    firstPaymentType: 'Normal',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCounselorChange = (e) => {
    const counselorId = e.target.value;
    const found = counselorsList.find((c) => c.id === counselorId);
    setFormData((prev) => ({
      ...prev,
      counselor_id: counselorId,
      counselor_name: found ? found.name : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Student name is required');
      return;
    }

    setSubmitting(true);
    try {
      const activeCompany = companyId || 'a1b2c3d4-0000-0000-0000-000000000001';

      const studentPayload = {
        company_id: activeCompany,
        name: formData.name.trim(),
        mobile: formData.mobile.trim() || null,
        email: formData.email.trim() || null,
        country: formData.country.trim() || null,
        intake: formData.intake.trim() || null,
        lead_source: formData.lead_source || null,
        counselor_id: formData.counselor_id || null,
        counselor_name: formData.counselor_name || null,
        team_lead: formData.team_lead.trim() || null,
        university: formData.university.trim() || null,
        course: formData.course.trim() || null,
        enroll_status: formData.enroll_status,
        pay_stage: formData.pay_stage,
        committed: Number(formData.committed || 0),
        b2b_charge: Number(formData.b2b_charge || 0),
        commission: Number(formData.commission || 0),
        incentive_student: Number(formData.incentive_student || 0),
        incentive_company: Number(formData.incentive_company || 0),
        refund: Number(formData.refund || 0),
        other_expense: Number(formData.other_expense || 0),
        notes: formData.notes.trim() || null,
      };

      // 1. Insert into students
      const { data: insertedStudent, error: studentError } = await supabase
        .from('students')
        .insert([studentPayload])
        .select()
        .single();

      if (studentError) throw studentError;

      // 2. Insert first payment if option is checked and amount > 0
      if (
        formData.hasFirstPayment &&
        Number(formData.firstPaymentAmount) > 0 &&
        insertedStudent?.id
      ) {
        const paymentPayload = {
          student_id: insertedStudent.id,
          company_id: activeCompany,
          slot: 1,
          bank_name: formData.firstPaymentBank.trim() || 'HDFC Bank Current A/C',
          amount: Number(formData.firstPaymentAmount),
          payment_date: formData.firstPaymentDate,
          payment_type: formData.firstPaymentType,
        };

        const { error: pmtErr } = await supabase
          .from('payments')
          .insert([paymentPayload]);

        if (pmtErr) {
          console.warn('First payment creation note:', pmtErr.message);
        }
      }

      toast.success(`Student "${insertedStudent.name}" enrolled successfully!`);
      onSuccess();
    } catch (err) {
      console.error('Error inserting student:', err);
      toast.error(err.message || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(8, 10, 18, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg2solid)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg3)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
              Add New Student Application
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Record candidate details, intake targets, contract values, and initial payment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Section 1: Personal & Contact */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--blue)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Candidate Profile
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Full Name <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="name"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    placeholder="+91 98765 43210"
                    value={formData.mobile}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Destination & Academic */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cyan)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Target Destination & Course
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Destination Country
                  </label>
                  <input
                    type="text"
                    list="country-datalist"
                    name="country"
                    placeholder="Select or type country"
                    value={formData.country}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <datalist id="country-datalist">
                    {COMMON_COUNTRIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Target Intake
                  </label>
                  <input
                    type="text"
                    list="intake-datalist"
                    name="intake"
                    placeholder="e.g. Sept 2025"
                    value={formData.intake}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <datalist id="intake-datalist">
                    {COMMON_INTAKES.map((itk) => (
                      <option key={itk} value={itk} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    University / College
                  </label>
                  <input
                    type="text"
                    name="university"
                    placeholder="e.g. University of Leeds"
                    value={formData.university}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Course / Degree Program
                  </label>
                  <input
                    type="text"
                    name="course"
                    placeholder="e.g. MSc Data Science"
                    value={formData.course}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Counselor, Lead Source & Stages */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Lead Assignment & Status
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Lead Source
                  </label>
                  <select
                    name="lead_source"
                    value={formData.lead_source}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {LEAD_SOURCES.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                {!isCounselor && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                      Assigned Counselor
                    </label>
                    <select
                      name="counselor_id"
                      value={formData.counselor_id}
                      onChange={handleCounselorChange}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    >
                      <option value="">Select Counselor</option>
                      {counselorsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Team Lead
                  </label>
                  <input
                    type="text"
                    name="team_lead"
                    placeholder="e.g. Ananya Sen"
                    value={formData.team_lead}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Enrollment Status
                  </label>
                  <select
                    name="enroll_status"
                    value={formData.enroll_status}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {ENROLL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Payment Stage
                  </label>
                  <select
                    name="pay_stage"
                    value={formData.pay_stage}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {PAY_STAGES.map((ps) => (
                      <option key={ps} value={ps}>
                        {ps}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Financial Structure */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Financial Contract & Costs (₹)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Committed Amount (₹) <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    name="committed"
                    placeholder="e.g. 150000"
                    value={formData.committed}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    B2B Charge (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="b2b_charge"
                    value={formData.b2b_charge}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    University Commission (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="commission"
                    value={formData.commission}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Incentive Student (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="incentive_student"
                    value={formData.incentive_student}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Incentive Company (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="incentive_company"
                    value={formData.incentive_company}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                    Other Expenses (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    name="other_expense"
                    value={formData.other_expense}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Optional First Payment */}
            <div
              style={{
                background: 'var(--bg3)',
                padding: '16px 20px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                <input
                  type="checkbox"
                  name="hasFirstPayment"
                  checked={formData.hasFirstPayment}
                  onChange={handleChange}
                  style={{ accentColor: 'var(--green)', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Record Initial Payment Installment Now (Slot 1)
              </label>

              {formData.hasFirstPayment && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginTop: '14px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Bank / Account
                    </label>
                    <input
                      type="text"
                      name="firstPaymentBank"
                      placeholder="e.g. HDFC Bank Current A/C"
                      value={formData.firstPaymentBank}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg4)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="firstPaymentAmount"
                      placeholder="e.g. 35000"
                      value={formData.firstPaymentAmount}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg4)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Payment Date
                    </label>
                    <input
                      type="date"
                      name="firstPaymentDate"
                      value={formData.firstPaymentDate}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg4)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                      Type
                    </label>
                    <select
                      name="firstPaymentType"
                      value={formData.firstPaymentType}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg4)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    >
                      <option value="Normal">Normal</option>
                      <option value="B2B">B2B</option>
                      <option value="Direct to Counselor">Direct to Counselor</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Section 6: Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                Internal Application Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Candidate remarks, passport status, English test waivers, etc..."
                value={formData.notes}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ padding: '8px 24px', fontSize: '13px' }}
            >
              {submitting ? 'Enrolling...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===============================================================================
// STUDENT DETAIL MODAL COMPONENT (View, Edit, Statement Payments, Finance, Notes)
// ===============================================================================
function StudentDetailModal({
  student,
  activeTab,
  setActiveTab,
  isEditing,
  setIsEditing,
  editFormData,
  setEditFormData,
  canViewFinance,
  canDeleteStudent,
  counselorsList,
  onSaveDetails,
  onSaveNotes,
  onOpenAddPayment,
  onOpenEditPayment,
  onDeletePayment,
  onClose,
}) {
  const payments = student.payments || [];
  const percentCollected =
    student.committed > 0
      ? Math.min(100, Math.round((student.collected / student.committed) * 100))
      : 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(8, 10, 18, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg2solid)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Header with Student Identity & Close */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
              }}
            >
              {(student.name || 'S')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {student.name}
                </h2>
                <span
                  className={`badge ${
                    student.enroll_status === 'Active'
                      ? 'badge-active'
                      : student.enroll_status === 'Enrolled'
                      ? 'badge-enrolled'
                      : student.enroll_status === 'Dropped'
                      ? 'badge-dropped'
                      : 'badge-pending'
                  }`}
                >
                  {student.enroll_status}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                {student.country} &bull; {student.intake} &bull; {student.mobile || 'No Phone'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'details' && (
              <button
                type="button"
                className={isEditing ? 'btn-secondary' : 'btn-primary'}
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                    setEditFormData({ ...student });
                  } else {
                    setIsEditing(true);
                  }
                }}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                {isEditing ? 'Cancel Edit' : 'Edit Student'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            padding: '0 28px',
            background: 'var(--bg3)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '16px',
          }}
        >
          {['details', 'payments', ...(canViewFinance ? ['finance'] : []), 'notes'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setIsEditing(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--blue)' : '2px solid transparent',
                padding: '14px 4px',
                color: activeTab === tab ? '#fff' : 'var(--muted)',
                fontWeight: activeTab === tab ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'var(--transition)',
              }}
            >
              {tab === 'payments' ? `Payments (${payments.length}/5)` : tab}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div>
              {!isEditing ? (
                // View Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    <DetailItem label="Mobile Number" value={student.mobile || '—'} />
                    <DetailItem label="Email Address" value={student.email || '—'} />
                    <DetailItem label="Destination Country" value={student.country || '—'} />
                    <DetailItem label="Intake" value={student.intake || '—'} />
                    <DetailItem label="University" value={student.university || '—'} />
                    <DetailItem label="Degree Course" value={student.course || '—'} />
                    <DetailItem label="Assigned Counselor" value={student.counselor_name || 'Unassigned'} />
                    <DetailItem label="Team Lead" value={student.team_lead || '—'} />
                    <DetailItem label="Lead Source" value={student.lead_source || '—'} />
                    <DetailItem label="Payment Stage" value={student.pay_stage || '—'} highlight="var(--purple)" />
                    <DetailItem label="Committed Value" value={formatINR(student.committed)} highlight="#fff" />
                    <DetailItem label="Collected So Far" value={formatINR(student.collected)} highlight="var(--green)" />
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <EditField label="Full Name" name="name" value={editFormData.name} onChange={handleInputChange} />
                    <EditField label="Mobile" name="mobile" value={editFormData.mobile} onChange={handleInputChange} />
                    <EditField label="Email" name="email" value={editFormData.email} onChange={handleInputChange} />
                    <EditField label="Country" name="country" value={editFormData.country} onChange={handleInputChange} />
                    <EditField label="Intake" name="intake" value={editFormData.intake} onChange={handleInputChange} />
                    <EditField label="University" name="university" value={editFormData.university} onChange={handleInputChange} />
                    <EditField label="Course" name="course" value={editFormData.course} onChange={handleInputChange} />
                    <EditField label="Team Lead" name="team_lead" value={editFormData.team_lead} onChange={handleInputChange} />

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                        Counselor
                      </label>
                      <select
                        name="counselor_id"
                        value={editFormData.counselor_id || ''}
                        onChange={(e) => {
                          const cid = e.target.value;
                          const found = counselorsList.find((c) => c.id === cid);
                          setEditFormData((prev) => ({
                            ...prev,
                            counselor_id: cid,
                            counselor_name: found ? found.name : prev.counselor_name,
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      >
                        <option value="">Select Counselor</option>
                        {counselorsList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                        Enrollment Status
                      </label>
                      <select
                        name="enroll_status"
                        value={editFormData.enroll_status}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      >
                        {ENROLL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                        Payment Stage
                      </label>
                      <select
                        name="pay_stage"
                        value={editFormData.pay_stage}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      >
                        {PAY_STAGES.map((stg) => (
                          <option key={stg} value={stg}>
                            {stg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <EditField label="Committed (₹)" name="committed" type="number" value={editFormData.committed} onChange={handleInputChange} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setEditFormData({ ...student });
                      }}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={onSaveDetails}
                      style={{ padding: '8px 20px', fontSize: '13px' }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS (Statement Style) */}
          {activeTab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Payment Summary Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'var(--bg3)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Installments Collected</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--green)', marginTop: '2px' }}>
                    {formatINR(student.collected)}{' '}
                    <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
                      of {formatINR(student.committed)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onOpenAddPayment(null)}
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  <PlusIcon />
                  <span>Record Next Installment</span>
                </button>
              </div>

              {/* Statement List */}
              {payments.length === 0 ? (
                <div
                  style={{
                    padding: '48px 20px',
                    textAlign: 'center',
                    background: 'var(--bg3)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)',
                    color: 'var(--muted)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px' }}>No payment installments recorded yet.</p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => onOpenAddPayment(1)}
                    style={{ marginTop: '14px', padding: '8px 18px', fontSize: '12px' }}
                  >
                    + Add Slot 1 Payment
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {payments
                    .sort((a, b) => Number(a.slot) - Number(b.slot))
                    .map((pmt) => (
                      <div
                        key={pmt.id}
                        style={{
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: 'rgba(0, 229, 160, 0.15)',
                              color: 'var(--green)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '14px',
                            }}
                          >
                            #{pmt.slot}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                              {pmt.bank_name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                              Date: {new Date(pmt.payment_date).toLocaleDateString()} &bull; Type:{' '}
                              <span style={{ color: 'var(--cyan)' }}>{pmt.payment_type || 'Normal'}</span>
                              {pmt.reference_no && <span> &bull; Ref: {pmt.reference_no}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--green)' }}>
                              {formatINR(pmt.amount)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              Slot {pmt.slot} of 5
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Receipt Proof Preview Link */}
                            {(() => {
                              const rUrl = pmt.receipt_url || extractReceiptUrl(pmt);
                              if (!rUrl) return null;
                              return (
                                <a
                                  href={rUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View Payment Screenshot / Receipt Proof"
                                  style={{
                                    background: 'rgba(54, 209, 220, 0.15)',
                                    border: '1px solid rgba(54, 209, 220, 0.35)',
                                    color: '#36D1DC',
                                    borderRadius: '6px',
                                    padding: '5px 9px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <span>🧾</span> Proof
                                </a>
                              );
                            })()}

                            <button
                              type="button"
                              onClick={() => onOpenEditPayment(pmt)}
                              title="Edit Installment"
                              style={{
                                background: 'var(--bg4)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                borderRadius: '6px',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <EditIcon />
                            </button>

                            {canDeleteStudent && (
                              <button
                                type="button"
                                onClick={() => onDeletePayment(pmt.id, pmt.slot)}
                                title="Delete Installment"
                                style={{
                                  background: 'rgba(255, 111, 142, 0.12)',
                                  border: '1px solid rgba(255, 111, 142, 0.3)',
                                  color: 'var(--red)',
                                  borderRadius: '6px',
                                  width: '30px',
                                  height: '30px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FINANCE (Director+ Only) */}
          {activeTab === 'finance' && canViewFinance && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Payment Progress Bar */}
              <div
                style={{
                  background: 'var(--bg3)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
                    Installment Collection Progress
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>
                    {percentCollected}% Completed
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '10px',
                    borderRadius: '5px',
                    background: 'var(--bg4)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${percentCollected}%`,
                      background: 'linear-gradient(90deg, var(--green) 0%, var(--cyan) 100%)',
                      borderRadius: '5px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Finance Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                }}
              >
                <FinanceCard label="Committed Amount" value={formatINR(student.committed)} sub="Total Contract Value" />
                <FinanceCard label="Collected Revenue" value={formatINR(student.collected)} sub="Actual Cash Realized" color="var(--green)" />
                <FinanceCard label="Outstanding Remaining" value={formatINR(student.remaining)} sub="Uncollected Balance" color={student.remaining > 0 ? 'var(--amber)' : 'var(--muted)'} />
                <FinanceCard label="University Commission" value={formatINR(student.commission)} sub="Payable by Institution" color="var(--cyan)" />
                <FinanceCard label="B2B Sub-Agent Charge" value={`- ${formatINR(student.b2b_charge)}`} sub="External Partner Share" color="var(--red)" />
                <FinanceCard label="Student Incentive / Rebate" value={`- ${formatINR(student.incentive_student)}`} sub="Direct Discount Given" color="var(--red)" />
                <FinanceCard label="Company Sales Incentive" value={`- ${formatINR(student.incentive_company)}`} sub="Internal Counselor Bonus" color="var(--red)" />
                <FinanceCard label="Refunds Processed" value={`- ${formatINR(student.refund)}`} sub="Returned to Candidate" color="var(--amber)" />
                <FinanceCard label="Other Operational Expense" value={`- ${formatINR(student.other_expense)}`} sub="Courier, Visa, Legal" color="var(--red)" />
              </div>

              {/* Net Profit Highlight Banner */}
              <div
                style={{
                  background: student.profit >= 0 ? 'rgba(124, 111, 255, 0.12)' : 'rgba(255, 111, 142, 0.12)',
                  border: student.profit >= 0 ? '1px solid rgba(124, 111, 255, 0.35)' : '1px solid rgba(255, 111, 142, 0.35)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Net Sterling ERP Realized Profit
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                    Formula: Collected - Refund - B2B - Incentives - Expenses + Commission
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: student.profit >= 0 ? 'var(--blue)' : 'var(--red)',
                  }}
                >
                  {formatINR(student.profit)}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTES */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                Application History & Counselor Logs
              </label>
              <textarea
                rows={6}
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Type internal candidate notes, communication logs, visa interview feedback..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onSaveNotes}
                  style={{ padding: '8px 20px', fontSize: '13px' }}
                >
                  Save Notes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===============================================================================
// BULK LEDGER ENTRY MODAL
// ===============================================================================
function BulkLedgerModal({ selectedIds, companyId, userId, onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState('expense');
  const [category, setCategory] = useState('Group Marketing Expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidFromCompany, setPaidFromCompany] = useState(true);
  const [deductFromProfit, setDeductFromProfit] = useState(true);

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid ledger amount');
      return;
    }

    setSubmitting(true);
    try {
      const activeCompany = companyId || 'a1b2c3d4-0000-0000-0000-000000000001';

      // 1. Insert into ledger_entries
      const { data: ledgerEntry, error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert([
          {
            company_id: activeCompany,
            entry_date: entryDate,
            type: entryType,
            category: category.trim(),
            amount: numAmount,
            description: description.trim() || `Bulk allocation for ${selectedIds.length} students`,
            scope: 'student',
            paid_from_company: paidFromCompany,
            deduct_from_profit: deductFromProfit,
            created_by: userId || null,
          },
        ])
        .select()
        .single();

      if (ledgerError) throw ledgerError;

      // 2. Insert allocations across selected students
      const perStudentAmount = parseFloat((numAmount / selectedIds.length).toFixed(2));
      const allocations = selectedIds.map((studentId) => ({
        ledger_entry_id: ledgerEntry.id,
        student_id: studentId,
        allocated_amount: perStudentAmount,
      }));

      const { error: allocError } = await supabase
        .from('ledger_allocations')
        .insert(allocations);

      if (allocError) {
        console.warn('Allocations insert note:', allocError.message);
      }

      toast.success(
        `Recorded ${formatINR(numAmount)} ledger entry allocated to ${selectedIds.length} students`
      );
      onSuccess();
    } catch (err) {
      console.error('Bulk ledger entry failed:', err);
      toast.error(err.message || 'Failed to post bulk ledger entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(8, 10, 18, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg2solid)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>
              Bulk Add Ledger Entry
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
              Allocating across <strong>{selectedIds.length}</strong> selected candidate files
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleBulkSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                Entry Type
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <option value="expense">Expense (Disbursement)</option>
                <option value="income">Income (Miscellaneous)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                Date
              </label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
              Category
            </label>
            <input
              type="text"
              required
              list="ledger-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
              }}
            />
            <datalist id="ledger-categories">
              <option value="Group Marketing Expense" />
              <option value="Embassy & Visa Fees" />
              <option value="University Application Portal Fee" />
              <option value="Foreign Courier & Translation" />
              <option value="Agent Commission Disbursement" />
              <option value="Office Administrative Charge" />
            </datalist>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
              Total Ledger Amount (₹) <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="number"
              step="any"
              min="1"
              required
              placeholder="e.g. 25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
              }}
            />
            {amount && !isNaN(Number(amount)) && selectedIds.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--cyan)', marginTop: '4px' }}>
                Equals ~{formatINR(Number(amount) / selectedIds.length)} allocated per student
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Ledger entry justification or voucher number..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--muted)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={paidFromCompany}
                onChange={(e) => setPaidFromCompany(e.target.checked)}
                style={{ accentColor: 'var(--blue)' }}
              />
              Paid from Company Operational Account
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={deductFromProfit}
                onChange={(e) => setDeductFromProfit(e.target.checked)}
                style={{ accentColor: 'var(--blue)' }}
              />
              Deduct from Net Cohort Profit
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              {submitting ? 'Posting...' : 'Post Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS FOR CLEAN MODAL RENDERING ---
function DetailItem({ label, value, highlight }) {
  return (
    <div style={{ background: 'var(--bg3)', padding: '12px 16px', borderRadius: '8px' }}>
      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: highlight || 'var(--text)',
          marginTop: '4px',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EditField({ label, name, type = 'text', value, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '9px 12px',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '13px',
          outline: 'none',
        }}
      />
    </div>
  );
}

function FinanceCard({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: color || '#fff', marginTop: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
        {sub}
      </div>
    </div>
  );
}
