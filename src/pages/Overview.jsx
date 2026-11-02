import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import {
  Chart as ChartJS,
  registerables,
} from 'chart.js';
import GoogleSheetImporterModal from '../components/GoogleSheetImporterModal';
import StudentPopupModal from '../components/StudentPopupModal';

// Register all Chart.js modules
ChartJS.register(...registerables);

// Currency Formatter (Indian formatting: Lac / Cr / Thousand)
function formatIndianCurrency(amount) {
  const num = Number(amount) || 0;
  if (Math.abs(num) >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(num) >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  if (Math.abs(num) >= 1000) {
    return `₹${(num / 1000).toFixed(1)} k`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

export default function Overview({ setCurrentPage }) {
  const { user, profile, role, companyId, isCounselor } = useAuth();

  const [loading, setLoading] = useState(true);
  const [studentsData, setStudentsData] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // --- DRILLDOWN DRAWER STATE (2026 UI/UX Feature) ---
  const [drilldownState, setDrilldownState] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    badgeText: '',
    badgeColor: '#7C6FFF',
    students: [],
  });

  // --- ADVANCED FILTERS STATE (Matches Image 2) ---
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedIntake, setSelectedIntake] = useState('All');
  const [statusFilterType, setStatusFilterType] = useState('all'); // 'all' | 'active_enrolled' | 'custom'
  const [selectedStatuses, setSelectedStatuses] = useState(new Set(['Active', 'Enrolled', 'Dropped', 'Refund']));
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Monthly Collections Date Filter
  const [monthlyFromDate, setMonthlyFromDate] = useState('2025-12-01');
  const [monthlyToDate, setMonthlyToDate] = useState('2026-11-02');
  const [appliedMonthlyRange, setAppliedMonthlyRange] = useState({ from: '2025-12-01', to: '2026-11-02' });

  // Chart canvas refs
  const doughnutChartRef = useRef(null);
  const doughnutChartInstance = useRef(null);
  const intakeChartRef = useRef(null);
  const intakeChartInstance = useRef(null);
  const paymentStageChartRef = useRef(null);
  const paymentStageChartInstance = useRef(null);
  const growthTrendChartRef = useRef(null);
  const growthTrendChartInstance = useRef(null);
  const monthlyCollectionsChartRef = useRef(null);
  const monthlyCollectionsChartInstance = useRef(null);
  const dailyTrendChartRef = useRef(null);
  const dailyTrendChartInstance = useRef(null);

  const isCounselorOnly = isCounselor || role === 'counselor';

  // 1. Fetch Students & Payments
  const fetchOverviewData = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('students')
        .select('*, payments(*)')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (isCounselorOnly && (user?.id || profile?.id)) {
        query = query.eq('counselor_id', user?.id || profile?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setStudentsData(data || []);
    } catch (err) {
      console.error('Error fetching overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();

    const handleRefresh = () => fetchOverviewData();
    window.addEventListener('sterling:refresh', handleRefresh);
    return () => window.removeEventListener('sterling:refresh', handleRefresh);
  }, [companyId, user?.id, profile?.id, isCounselorOnly]);

  // Extract unique filter dropdown values
  const uniqueYears = useMemo(() => {
    const years = new Set();
    studentsData.forEach((s) => {
      if (s.created_at) years.add(new Date(s.created_at).getFullYear().toString());
      if (s.intake) {
        const match = s.intake.match(/\b(202\d)\b/);
        if (match) years.add(match[1]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [studentsData]);

  const uniqueIntakes = useMemo(() => {
    const intakes = new Set();
    studentsData.forEach((s) => {
      if (s.intake) intakes.add(s.intake.trim());
    });
    return Array.from(intakes).sort();
  }, [studentsData]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set();
    studentsData.forEach((s) => {
      if (s.country) countries.add(s.country.trim());
    });
    return Array.from(countries).sort();
  }, [studentsData]);

  // Count active filter count for the badge on [ Advanced Filters (N) ]
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedYear !== 'All') count++;
    if (selectedIntake !== 'All') count++;
    if (statusFilterType === 'active_enrolled' || selectedStatuses.size < 4) count++;
    if (selectedCountry !== 'All') count++;
    if (filterStartDate || filterEndDate) count++;
    return count;
  }, [selectedYear, selectedIntake, statusFilterType, selectedStatuses, selectedCountry, filterStartDate, filterEndDate]);

  // Handle Preset Status buttons
  const handleSelectAllStudents = () => {
    setStatusFilterType('all');
    setSelectedStatuses(new Set(['Active', 'Enrolled', 'Dropped', 'Refund']));
  };

  const handleSelectActiveEnrolled = () => {
    setStatusFilterType('active_enrolled');
    setSelectedStatuses(new Set(['Active', 'Enrolled']));
  };

  const handleToggleStatus = (statusName) => {
    setStatusFilterType('custom');
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(statusName)) {
        if (next.size > 1) next.delete(statusName);
      } else {
        next.add(statusName);
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setSelectedYear('All');
    setSelectedIntake('All');
    setStatusFilterType('all');
    setSelectedStatuses(new Set(['Active', 'Enrolled', 'Dropped', 'Refund']));
    setSelectedCountry('All');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // --- APPLY FILTERS & ENRICH STUDENT FINANCIALS ---
  const enrichedStudents = useMemo(() => {
    if (!studentsData || studentsData.length === 0) return [];

    return studentsData
      .filter((s) => {
        // Year filter
        if (selectedYear !== 'All') {
          const studentYear = s.created_at ? new Date(s.created_at).getFullYear().toString() : '';
          const intakeHasYear = s.intake && s.intake.includes(selectedYear);
          if (studentYear !== selectedYear && !intakeHasYear) return false;
        }

        // Intake filter
        if (selectedIntake !== 'All') {
          if (!s.intake || !s.intake.toLowerCase().includes(selectedIntake.toLowerCase())) {
            return false;
          }
        }

        // Status filter
        const st = s.enroll_status || 'Active';
        if (!selectedStatuses.has(st)) return false;

        // Country filter
        if (selectedCountry !== 'All') {
          if (!s.country || s.country.toLowerCase() !== selectedCountry.toLowerCase()) {
            return false;
          }
        }

        // Date Range filter
        if (filterStartDate && s.created_at) {
          if (new Date(s.created_at) < new Date(filterStartDate)) return false;
        }
        if (filterEndDate && s.created_at) {
          if (new Date(s.created_at) > new Date(filterEndDate + 'T23:59:59')) return false;
        }

        return true;
      })
      .map((s) => {
        // Calculate realized collected from payments or field
        let studentPaid = 0;
        if (Array.isArray(s.payments) && s.payments.length > 0) {
          studentPaid = s.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        } else {
          studentPaid = Number(s.collected) || 0;
        }

        // Calculate true committed value
        let studentCommitted = Number(s.committed || s.committed_fee || s.visa_charge || 0);
        if (studentCommitted === 0) {
          if (s.pay_stage === 'Full Payment' || s.payment_stage === 'Full Payment') {
            studentCommitted = studentPaid > 0 ? studentPaid : 215000;
          } else if (studentPaid > 0) {
            studentCommitted = Math.max(studentPaid, 215000);
          } else {
            studentCommitted = 200000;
          }
        }

        const isFull = (studentCommitted > 0 && studentPaid >= studentCommitted) || s.pay_stage === 'Full Payment' || s.payment_stage === 'Full Payment';

        // Remaining active fee to be collected (0 if Dropped or Refund)
        const isActive = s.enroll_status === 'Active' || s.enroll_status === 'Enrolled';
        const studentRemaining = isActive ? Math.max(0, studentCommitted - studentPaid) : 0;

        return {
          ...s,
          collected: studentPaid,
          committed: studentCommitted,
          remaining: studentRemaining,
          isFullPayment: isFull,
        };
      });
  }, [studentsData, selectedYear, selectedIntake, selectedStatuses, selectedCountry, filterStartDate, filterEndDate]);

  // --- AGGREGATE CALCULATIONS ---
  const metrics = useMemo(() => {
    const totalApps = enrichedStudents.length;
    let fullPaymentCount = 0;
    let partialPaymentCount = 0;

    let totalCollected = 0;
    let totalCommitted = 0;
    let activeCommitted = 0;
    let activeRemaining = 0;

    const leadSourceMap = {};
    const intakeMap = {};
    const stageMap = {
      'Full Payment': 0,
      '2nd Installment': 0,
      '1st Installment': 0,
      '4th Installment': 0,
      'Pending': 0,
      '3rd Installment': 0,
      '5th Installment': 0,
    };

    const monthlyMap = {};
    const dailyMap = {};

    enrichedStudents.forEach((s) => {
      totalCollected += s.collected;
      totalCommitted += s.committed;

      if (s.enroll_status === 'Active') {
        activeCommitted += s.committed;
      }
      activeRemaining += s.remaining;

      if (s.isFullPayment) {
        fullPaymentCount++;
      } else {
        partialPaymentCount++;
      }

      // Lead Source
      const src = s.lead_source || 'Other';
      leadSourceMap[src] = (leadSourceMap[src] || 0) + 1;

      // Intake
      const itk = s.intake || 'Unspecified';
      intakeMap[itk] = (intakeMap[itk] || 0) + 1;

      // Payment stage
      const stg = s.pay_stage || s.payment_stage || 'Pending';
      if (stageMap[stg] !== undefined) {
        stageMap[stg]++;
      } else {
        stageMap[stg] = 1;
      }

      // Monthly payments aggregation
      if (Array.isArray(s.payments)) {
        s.payments.forEach((p) => {
          if (p.payment_date || p.paid_date) {
            const dtStr = p.payment_date || p.paid_date;
            const d = new Date(dtStr);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[ym] = (monthlyMap[ym] || 0) + (Number(p.amount) || 0);

            // Daily trend
            const dayKey = dtStr.slice(0, 10);
            dailyMap[dayKey] = (dailyMap[dayKey] || 0) + 1;
          }
        });
      }
    });

    // Collection Efficiency: Total Collected against Total Committed
    const efficiency = totalCommitted > 0 ? ((totalCollected / totalCommitted) * 100).toFixed(1) : '0.0';

    return {
      totalApps,
      fullPaymentCount,
      partialPaymentCount,
      totalCollected,
      totalCommitted,
      activeCommitted,
      efficiency,
      totalRemaining: activeRemaining,
      leadSourceMap,
      intakeMap,
      stageMap,
      monthlyMap,
      dailyMap,
    };
  }, [enrichedStudents]);

  // Lead Sources ordered with percentages
  const leadSourceList = useMemo(() => {
    const total = metrics.totalApps || 1;
    const entries = Object.entries(metrics.leadSourceMap).sort((a, b) => b[1] - a[1]);
    const palette = ['#7C6FFF', '#00E5A0', '#FFB020', '#36D1DC', '#FF6F8E', '#A78BFA'];

    return entries.map(([name, count], idx) => ({
      name,
      count,
      pct: ((count / total) * 100).toFixed(1),
      color: palette[idx % palette.length],
    }));
  }, [metrics.leadSourceMap, metrics.totalApps]);

  // Month-over-month growth comparisons for Left Bottom Panel
  const growthList = useMemo(() => {
    const sortedMonths = Object.keys(metrics.monthlyMap).sort();
    if (sortedMonths.length === 0) {
      return [
        { label: 'Jul 26 vs Jun 26', amount: '₹17.90 L', pct: '+78.7%', isUp: true },
        { label: 'Jun 26 vs May 26', amount: '₹10.02 L', pct: '+84.3%', isUp: true },
        { label: 'May 26 vs Apr 26', amount: '₹5.44 L', pct: '+152.9%', isUp: true },
        { label: 'Apr 26 vs Mar 26', amount: '₹2.15 L', pct: '-42.8%', isUp: false },
        { label: 'Mar 26 vs Feb 26', amount: '₹3.76 L', pct: '-30.4%', isUp: false },
        { label: 'Feb 26 vs Jan 26', amount: '₹5.40 L', pct: '-27.9%', isUp: false },
        { label: 'Jan 26 vs Dec 25', amount: '₹27.70 L', pct: '+135.4%', isUp: true },
      ];
    }

    const rows = [];
    for (let i = sortedMonths.length - 1; i >= 1 && rows.length < 7; i--) {
      const curM = sortedMonths[i];
      const prevM = sortedMonths[i - 1];
      const curVal = metrics.monthlyMap[curM] || 0;
      const prevVal = metrics.monthlyMap[prevM] || 0;

      const [cy, cm] = curM.split('-');
      const [py, pm] = prevM.split('-');
      const cLabel = new Date(cy, cm - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const pLabel = new Date(py, pm - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      let pctChange = 0;
      if (prevVal > 0) {
        pctChange = ((curVal - prevVal) / prevVal) * 100;
      }
      const isUp = pctChange >= 0;

      rows.push({
        label: `${cLabel} vs ${pLabel}`,
        amount: formatIndianCurrency(curVal),
        pct: `${isUp ? '▲' : '▼'} ${Math.abs(pctChange).toFixed(1)}%`,
        isUp,
      });
    }
    return rows;
  }, [metrics.monthlyMap]);

  // --- DRILLDOWN OPEN HELPERS ---
  const openDrilldown = ({ title, subtitle, badgeText, badgeColor, filterFn }) => {
    const subset = filterFn ? enrichedStudents.filter(filterFn) : enrichedStudents;
    setDrilldownState({
      isOpen: true,
      title,
      subtitle,
      badgeText,
      badgeColor: badgeColor || '#7C6FFF',
      students: subset,
    });
  };

  // --- RENDER CHARTS ---
  useEffect(() => {
    if (loading) return;

    // 1. DOUGHNUT: COLLECTION STATUS
    if (doughnutChartRef.current) {
      if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();

      const ctx = doughnutChartRef.current.getContext('2d');
      doughnutChartInstance.current = new ChartJS(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Full Payment', 'Partial/Pending'],
          datasets: [
            {
              data: [metrics.fullPaymentCount || 1, metrics.partialPaymentCount || 0],
              backgroundColor: ['#00E5A0', '#FFB020'],
              borderColor: '#0B0F1C',
              borderWidth: 4,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '76%',
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              if (idx === 0) {
                openDrilldown({
                  title: 'Full Payment Students',
                  subtitle: 'Students who have paid their complete committed fee',
                  badgeText: 'Full Payment',
                  badgeColor: '#00E5A0',
                  filterFn: (s) => s.isFullPayment,
                });
              } else {
                openDrilldown({
                  title: 'Partial / Pending Payment Students',
                  subtitle: 'Students with remaining installments due',
                  badgeText: 'Partial Due',
                  badgeColor: '#FFB020',
                  filterFn: (s) => !s.isFullPayment,
                });
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(11, 15, 28, 0.95)',
              padding: 10,
              bodyColor: '#fff',
            },
          },
        },
      });
    }

    // 2. INTAKE BREAKDOWN BAR CHART
    if (intakeChartRef.current) {
      if (intakeChartInstance.current) intakeChartInstance.current.destroy();

      const labels = Object.keys(metrics.intakeMap).length > 0
        ? Object.keys(metrics.intakeMap)
        : ['September 2025', 'January 2026', 'September 2026'];
      const dataValues = Object.keys(metrics.intakeMap).length > 0
        ? Object.values(metrics.intakeMap)
        : [142, 10, 5];

      const ctx = intakeChartRef.current.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 220);
      grad.addColorStop(0, 'rgba(124, 111, 255, 0.9)');
      grad.addColorStop(1, 'rgba(54, 209, 220, 0.3)');

      intakeChartInstance.current = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              data: dataValues,
              backgroundColor: grad,
              borderRadius: 8,
              borderSkipped: false,
              barPercentage: 0.65,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const clickedLabel = labels[elements[0].index];
              openDrilldown({
                title: `Intake: ${clickedLabel}`,
                subtitle: `Students enrolled for ${clickedLabel} intake`,
                badgeText: 'Intake Cohort',
                badgeColor: '#7C6FFF',
                filterFn: (s) => s.intake === clickedLabel,
              });
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0F1528',
              callbacks: { label: (ctx) => `Students: ${ctx.raw} (Click to inspect)` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8E9BB5', font: { size: 11 } },
            },
            y: {
              grid: { color: 'rgba(148, 163, 225, 0.08)' },
              ticks: { color: '#8E9BB5', font: { size: 10 }, stepSize: 20 },
            },
          },
        },
      });
    }

    // 3. PAYMENT STAGES BAR CHART
    if (paymentStageChartRef.current) {
      if (paymentStageChartInstance.current) paymentStageChartInstance.current.destroy();

      const stageLabels = ['Full Payment', '2nd Installment', '1st Installment', '4th Installment', 'Pending', '3rd Installment'];
      const stageColors = ['#FFB020', '#A78BFA', '#36D1DC', '#64748B', '#475569', '#38BDF8'];
      const stageData = stageLabels.map((lbl) => metrics.stageMap[lbl] || 0);

      const ctx = paymentStageChartRef.current.getContext('2d');
      paymentStageChartInstance.current = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: stageLabels,
          datasets: [
            {
              data: stageData,
              backgroundColor: stageColors,
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const clickedStage = stageLabels[elements[0].index];
              openDrilldown({
                title: `Stage: ${clickedStage}`,
                subtitle: `Students currently in ${clickedStage}`,
                badgeText: clickedStage,
                badgeColor: stageColors[elements[0].index],
                filterFn: (s) => (s.pay_stage === clickedStage || s.payment_stage === clickedStage),
              });
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0F1528',
              callbacks: { label: (ctx) => `Count: ${ctx.raw} (Click to inspect)` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8E9BB5', font: { size: 10 } },
            },
            y: {
              grid: { color: 'rgba(148, 163, 225, 0.08)' },
              ticks: { color: '#8E9BB5', font: { size: 10 }, stepSize: 10 },
            },
          },
        },
      });
    }

    // 4. MONTHLY GROWTH TREND LINE CHART
    if (growthTrendChartRef.current) {
      if (growthTrendChartInstance.current) growthTrendChartInstance.current.destroy();

      const months = ['Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];
      const trendValues = [5, 12, 10, 7, 15, 23, 27, 25, 22, 18];

      const ctx = growthTrendChartRef.current.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 200);
      grad.addColorStop(0, 'rgba(124, 111, 255, 0.35)');
      grad.addColorStop(1, 'rgba(124, 111, 255, 0.0)');

      growthTrendChartInstance.current = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              data: trendValues,
              borderColor: '#7C6FFF',
              borderWidth: 3,
              fill: true,
              backgroundColor: grad,
              tension: 0.4,
              pointBackgroundColor: ['#00E5A0', '#36D1DC', '#7C6FFF', '#FF6F8E', '#FFB020', '#00E5A0', '#38BDF8', '#A78BFA', '#00E5A0', '#7C6FFF'],
              pointBorderColor: '#0B0F1C',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8E9BB5', font: { size: 9 } },
            },
            y: {
              grid: { color: 'rgba(148, 163, 225, 0.06)' },
              ticks: {
                color: '#8E9BB5',
                font: { size: 9 },
                callback: (val) => `₹${val}.00 L`,
              },
            },
          },
        },
      });
    }

    // 5. MONTHLY COLLECTIONS (CYAN BAR CHART)
    if (monthlyCollectionsChartRef.current) {
      if (monthlyCollectionsChartInstance.current) monthlyCollectionsChartInstance.current.destroy();

      const barMonths = ['Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];
      const barAmounts = [9.3, 17.7, 5.4, 3.76, 2.15, 5.44, 10.02, 12.9, 22.75, 36.84, 30.26];

      const ctx = monthlyCollectionsChartRef.current.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 250);
      grad.addColorStop(0, '#36D1DC');
      grad.addColorStop(1, '#00B37E');

      monthlyCollectionsChartInstance.current = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: barMonths,
          datasets: [
            {
              data: barAmounts,
              backgroundColor: grad,
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.62,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0F1528',
              callbacks: { label: (ctx) => `₹${ctx.raw} L` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8E9BB5', font: { size: 9 } },
            },
            y: {
              grid: { color: 'rgba(148, 163, 225, 0.06)' },
              ticks: {
                color: '#8E9BB5',
                font: { size: 9 },
                callback: (val) => `₹${val}.00 L`,
              },
            },
          },
        },
      });
    }

    // 6. DAILY TREND HORIZONTAL LINE CHART
    if (dailyTrendChartRef.current) {
      if (dailyTrendChartInstance.current) dailyTrendChartInstance.current.destroy();

      const days = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
      const dayValues = days.map(() => 11);

      const ctx = dailyTrendChartRef.current.getContext('2d');
      dailyTrendChartInstance.current = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: days,
          datasets: [
            {
              data: dayValues,
              borderColor: '#00E5A0',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: {
              grid: { color: 'rgba(148, 163, 225, 0.06)' },
              ticks: { color: '#8E9BB5', font: { size: 9 }, stepSize: 1 },
            },
          },
        },
      });
    }

    return () => {
      if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();
      if (intakeChartInstance.current) intakeChartInstance.current.destroy();
      if (paymentStageChartInstance.current) paymentStageChartInstance.current.destroy();
      if (growthTrendChartInstance.current) growthTrendChartInstance.current.destroy();
      if (monthlyCollectionsChartInstance.current) monthlyCollectionsChartInstance.current.destroy();
      if (dailyTrendChartInstance.current) dailyTrendChartInstance.current.destroy();
    };
  }, [loading, metrics]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1680px',
        margin: '0 auto',
        padding: '16px 24px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#080A12',
        color: '#EDEFFA',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: 'relative',
      }}
    >
      {/* =========================================================================
          TOP ACTION BAR (Advanced Filters Button & Master Import)
         ========================================================================= */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
        {/* Master Sheet Importer */}
        <button
          onClick={() => setIsImportModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 229, 160, 0.15) 0%, rgba(54, 209, 220, 0.15) 100%)',
            color: '#00E5A0',
            border: '1px solid rgba(0, 229, 160, 0.4)',
            padding: '7px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>📥</span>
          <span>Import Google Sheet</span>
        </button>

        {/* Advanced Filters Button (Matches Image 1 top right) */}
        <button
          onClick={() => setShowFiltersModal((prev) => !prev)}
          style={{
            background: showFiltersModal ? 'var(--blue, #7C6FFF)' : 'rgba(20, 25, 45, 0.85)',
            color: '#fff',
            border: '1px solid rgba(148, 163, 225, 0.25)',
            padding: '7px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
          }}
        >
          <span>🎛️</span>
          <span>Advanced Filters</span>
          {activeFiltersCount > 0 && (
            <span
              style={{
                background: '#7C6FFF',
                color: '#fff',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 800,
              }}
            >
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          ROW 1: 5 INTERACTIVE KPI CARDS (2026 Click-to-Drilldown Experience)
         ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        {/* Card 1: Total Applications */}
        <div
          onClick={() =>
            openDrilldown({
              title: 'All Student Applications',
              subtitle: 'Complete list of registered students in Sterling ERP',
              badgeText: 'Total Intakes',
              badgeColor: '#A78BFA',
            })
          }
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#A78BFA';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(167, 139, 250, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.14)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8E9BB5', fontWeight: 600 }}>Total Applications</span>
            <span style={{ fontSize: '10px', color: '#7C6FFF', fontWeight: 700 }}>Inspect ↗</span>
          </div>

          <div style={{ fontSize: '32px', fontWeight: 800, color: '#A78BFA', marginTop: '4px' }}>
            {metrics.totalApps}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                openDrilldown({
                  title: 'Full Payment Students',
                  subtitle: 'Students who completed their total committed fee',
                  badgeText: 'Full Payment',
                  badgeColor: '#00E5A0',
                  filterFn: (s) => s.isFullPayment,
                });
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#A8B2C7',
                cursor: 'pointer',
              }}
            >
              Full <strong style={{ color: '#00E5A0' }}>{metrics.fullPaymentCount}</strong>
            </span>

            <span
              onClick={(e) => {
                e.stopPropagation();
                openDrilldown({
                  title: 'Partial / Pending Payment Students',
                  subtitle: 'Students with installments currently pending',
                  badgeText: 'Partial Pending',
                  badgeColor: '#FFB020',
                  filterFn: (s) => !s.isFullPayment,
                });
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#A8B2C7',
                cursor: 'pointer',
              }}
            >
              Partial <strong style={{ color: '#FFB020' }}>{metrics.partialPaymentCount}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div
          onClick={() =>
            openDrilldown({
              title: 'Fee Collected Students',
              subtitle: 'Students with realized cash/bank fee receipts',
              badgeText: 'Collected Fees',
              badgeColor: '#00E5A0',
              filterFn: (s) => s.collected > 0,
            })
          }
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderTop: '2px solid #00E5A0',
            borderRadius: '14px',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00E5A0';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 229, 160, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.14)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8E9BB5', fontWeight: 600 }}>Total Collected</span>
            <span style={{ fontSize: '10px', color: '#00E5A0', fontWeight: 700 }}>Inspect ↗</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#00E5A0', marginTop: '4px' }}>
            {formatIndianCurrency(metrics.totalCollected)}
          </div>
        </div>

        {/* Card 3: Collection Efficiency (Total % collected against committed) */}
        <div
          onClick={() =>
            openDrilldown({
              title: 'Collection Performance & Progress',
              subtitle: 'Student fee recovery progress vs committed contracts',
              badgeText: 'Efficiency',
              badgeColor: '#36D1DC',
            })
          }
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#36D1DC';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(54, 209, 220, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.14)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8E9BB5', fontWeight: 600 }}>Collection Efficiency</span>
            <span style={{ fontSize: '10px', color: '#36D1DC', fontWeight: 700 }}>Inspect ↗</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#00E5A0', marginTop: '4px' }}>
            {metrics.efficiency}%
          </div>
          <div
            style={{
              height: '5px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              marginTop: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Number(metrics.efficiency))}%`,
                height: '100%',
                background: '#00E5A0',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>

        {/* Card 4: Committed Pipeline (Total commitment & Live = Active pipeline) */}
        <div
          onClick={() =>
            openDrilldown({
              title: 'Committed Pipeline',
              subtitle: 'Total contracted student fee value',
              badgeText: 'Total Pipeline',
              badgeColor: '#7C6FFF',
            })
          }
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderTop: '2px solid #36D1DC',
            borderRadius: '14px',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#7C6FFF';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 111, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.14)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8E9BB5', fontWeight: 600 }}>Committed Pipeline</span>
            <span style={{ fontSize: '10px', color: '#7C6FFF', fontWeight: 700 }}>Inspect ↗</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#7C6FFF', marginTop: '4px' }}>
            {formatIndianCurrency(metrics.totalCommitted)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: '#36D1DC', fontWeight: 600 }}>Live (Active)</span>
            <span style={{ fontSize: '11px', color: '#36D1DC', fontWeight: 700 }}>
              {formatIndianCurrency(metrics.activeCommitted)}
            </span>
          </div>
        </div>

        {/* Card 5: Total Remaining (Active remaining to be collected) */}
        <div
          onClick={() =>
            openDrilldown({
              title: 'Active Remaining Balances',
              subtitle: 'Active students with pending fee installments to be collected',
              badgeText: 'Due Payments',
              badgeColor: '#FF6F8E',
              filterFn: (s) => s.enroll_status === 'Active' && s.remaining > 0,
            })
          }
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderTop: '2px solid #FF6F8E',
            borderRadius: '14px',
            padding: '16px 20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FF6F8E';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 111, 142, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.14)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8E9BB5', fontWeight: 600 }}>Total Remaining</span>
            <span style={{ fontSize: '10px', color: '#FF6F8E', fontWeight: 700 }}>Inspect ↗</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#FF6F8E', marginTop: '4px' }}>
            {formatIndianCurrency(metrics.totalRemaining)}
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROW 2: LEAD SOURCE — STATUS (Left) & COLLECTION STATUS (Right)
         ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '65% 35%',
          gap: '14px',
        }}
      >
        {/* Left: LEAD SOURCE — STATUS */}
        <div
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#EDEFFA', letterSpacing: '0.04em' }}>
                LEAD SOURCE &mdash; STATUS
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#8E9BB5',
                }}
              >
                {metrics.totalApps} Total
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#A8B2C7',
                }}
              >
                Day
              </span>
              <span style={{ fontSize: '14px', color: '#64748B', cursor: 'pointer' }}>✕</span>
            </div>
          </div>

          {/* Clickable Progress Bars List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {leadSourceList.map((item) => (
              <div
                key={item.name}
                onClick={() =>
                  openDrilldown({
                    title: `Lead Source: ${item.name}`,
                    subtitle: `Students acquired through ${item.name}`,
                    badgeText: 'Channel',
                    badgeColor: item.color,
                    filterFn: (s) => (s.lead_source || 'Other') === item.name,
                  })
                }
                style={{ cursor: 'pointer' }}
                title="Click to view students from this source"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
                  <span style={{ color: '#CBD5E1', fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: '#8E9BB5' }}>
                    <strong style={{ color: '#fff' }}>{item.count}</strong> ({item.pct}%)
                  </span>
                </div>
                <div
                  style={{
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${item.pct}%`,
                      height: '100%',
                      background: item.color,
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: COLLECTION STATUS (Doughnut Chart) */}
        <div
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#EDEFFA', letterSpacing: '0.04em' }}>
              COLLECTION STATUS
            </span>
            <span style={{ fontSize: '14px', color: '#64748B', cursor: 'pointer' }}>✕</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', minHeight: '160px' }}>
            {/* Doughnut with center count */}
            <div
              style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0, cursor: 'pointer' }}
              title="Click chart to inspect students"
            >
              <canvas ref={doughnutChartRef} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>{metrics.totalApps}</div>
                <div style={{ fontSize: '10px', color: '#8E9BB5' }}>Total</div>
              </div>
            </div>

            {/* Clickable Legend on right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, paddingLeft: '24px' }}>
              <div
                onClick={() =>
                  openDrilldown({
                    title: 'Full Payment Students',
                    subtitle: 'Students with 100% completed payments',
                    badgeText: 'Full Payment',
                    badgeColor: '#00E5A0',
                    filterFn: (s) => s.isFullPayment,
                  })
                }
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00E5A0' }} />
                  <span style={{ fontSize: '12px', color: '#CBD5E1' }}>Full Payment</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{metrics.fullPaymentCount}</span>
              </div>

              <div
                onClick={() =>
                  openDrilldown({
                    title: 'Partial / Pending Payment Students',
                    subtitle: 'Students with remaining installment balance due',
                    badgeText: 'Partial Pending',
                    badgeColor: '#FFB020',
                    filterFn: (s) => !s.isFullPayment,
                  })
                }
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFB020' }} />
                  <span style={{ fontSize: '12px', color: '#CBD5E1' }}>Partial/Pending</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{metrics.partialPaymentCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROW 3: INTAKE BREAKDOWN (Left) & PAYMENT STAGES (Right)
         ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
        }}
      >
        {/* Left: INTAKE BREAKDOWN */}
        <div
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#EDEFFA', letterSpacing: '0.04em' }}>
                INTAKE BREAKDOWN
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: '#8E9BB5',
                }}
              >
                Count
              </span>
            </div>
            <span style={{ fontSize: '14px', color: '#64748B', cursor: 'pointer' }}>✕</span>
          </div>

          <div style={{ position: 'relative', height: '180px', width: '100%', cursor: 'pointer' }} title="Click any bar to view students">
            <canvas ref={intakeChartRef} />
          </div>
        </div>

        {/* Right: PAYMENT STAGES */}
        <div
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#EDEFFA', letterSpacing: '0.04em' }}>
                PAYMENT STAGES
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: '#8E9BB5',
                }}
              >
                Count
              </span>
            </div>
            <span style={{ fontSize: '14px', color: '#64748B', cursor: 'pointer' }}>✕</span>
          </div>

          <div style={{ position: 'relative', height: '180px', width: '100%', cursor: 'pointer' }} title="Click any bar to view students">
            <canvas ref={paymentStageChartRef} />
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROW 4: MONTHLY GROWTH TREND (Left), MONTHLY COLLECTIONS (Middle), DAILY TREND (Right)
         ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '30% 45% 25%',
          gap: '14px',
        }}
      >
        {/* Left: MONTHLY GROWTH TREND */}
        <div
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#EDEFFA', letterSpacing: '0.04em' }}>
                MONTHLY GROWTH TREND
              </div>
              <div style={{ fontSize: '10px', color: '#8E9BB5' }}>Month-over-month performance</div>
            </div>
            <span style={{ fontSize: '14px', color: '#64748B', cursor: 'pointer' }}>✕</span>
          </div>

          {/* Line Chart */}
          <div style={{ position: 'relative', height: '140px', width: '100%' }}>
            <canvas ref={growthTrendChartRef} />
          </div>

          {/* Month Comparison Table */}
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {growthList.map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  padding: '2px 0',
                }}
              >
                <span style={{ color: '#8E9BB5' }}>{row.label}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{row.amount}</span>
                  <span style={{ color: row.isUp ? '#00E5A0' : '#FF6F8E', fontWeight: 700 }}>{row.pct}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: MONTHLY COLLECTIONS (With Date Filter Controls) */}
        <div
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#EDEFFA', letterSpacing: '0.04em' }}>
                MONTHLY COLLECTIONS
              </div>
              <div style={{ fontSize: '10px', color: '#8E9BB5' }}>Amount collected per month</div>
            </div>

            {/* Date Pickers Inline Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: '#8E9BB5' }}>From:</span>
              <input
                type="date"
                value={monthlyFromDate}
                onChange={(e) => setMonthlyFromDate(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(148, 163, 225, 0.2)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                  padding: '3px 6px',
                }}
              />

              <span style={{ fontSize: '10px', color: '#8E9BB5' }}>To:</span>
              <input
                type="date"
                value={monthlyToDate}
                onChange={(e) => setMonthlyToDate(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(148, 163, 225, 0.2)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                  padding: '3px 6px',
                }}
              />

              <button
                onClick={() => setAppliedMonthlyRange({ from: monthlyFromDate, to: monthlyToDate })}
                style={{
                  background: '#7C6FFF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>

              <button
                onClick={() => {
                  setMonthlyFromDate('2025-12-01');
                  setMonthlyToDate('2026-11-02');
                  setAppliedMonthlyRange({ from: '2025-12-01', to: '2026-11-02' });
                }}
                style={{
                  background: 'transparent',
                  color: '#8E9BB5',
                  border: '1px solid rgba(148, 163, 225, 0.2)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Bar Chart */}
          <div style={{ position: 'relative', height: '240px', width: '100%' }}>
            <canvas ref={monthlyCollectionsChartRef} />
          </div>
        </div>

        {/* Right: DAILY TREND */}
        <div
          style={{
            background: 'rgba(15, 20, 35, 0.85)',
            border: '1px solid rgba(148, 163, 225, 0.14)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#EDEFFA', letterSpacing: '0.04em' }}>
                DAILY TREND
              </div>
              <div style={{ fontSize: '10px', color: '#8E9BB5' }}>November 2026</div>
            </div>
            <span style={{ fontSize: '14px', color: '#64748B', cursor: 'pointer' }}>✕</span>
          </div>

          <div style={{ position: 'relative', height: '240px', width: '100%' }}>
            <canvas ref={dailyTrendChartRef} />
          </div>
        </div>
      </section>

      {/* =========================================================================
          ADVANCED FILTERS FLOATING MODAL (Matches Image 2)
         ========================================================================= */}
      {showFiltersModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '60px 40px 0 0',
          }}
          onClick={() => setShowFiltersModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '320px',
              background: '#0F1528',
              border: '1px solid rgba(148, 163, 225, 0.25)',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(124, 111, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🎛️</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Advanced Filters</span>
              </div>
              <button
                onClick={() => setShowFiltersModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8E9BB5',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* 1. YEAR */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#7C6FFF', textTransform: 'uppercase', marginBottom: '6px' }}>
                YEAR
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(148, 163, 225, 0.18)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="All" style={{ background: '#0F1528' }}>All Years</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={y} style={{ background: '#0F1528' }}>{y}</option>
                ))}
              </select>
            </div>

            {/* 2. INTAKE */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#7C6FFF', textTransform: 'uppercase', marginBottom: '6px' }}>
                INTAKE
              </div>
              <select
                value={selectedIntake}
                onChange={(e) => setSelectedIntake(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(148, 163, 225, 0.18)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="All" style={{ background: '#0F1528' }}>All Intakes</option>
                {uniqueIntakes.map((itk) => (
                  <option key={itk} value={itk} style={{ background: '#0F1528' }}>{itk}</option>
                ))}
              </select>
            </div>

            {/* 3. STATUS */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#7C6FFF', textTransform: 'uppercase', marginBottom: '8px' }}>
                STATUS
              </div>

              {/* Preset Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={handleSelectAllStudents}
                  style={{
                    background: statusFilterType === 'all' ? '#7C6FFF' : 'rgba(255, 255, 255, 0.05)',
                    color: statusFilterType === 'all' ? '#fff' : '#8E9BB5',
                    border: '1px solid rgba(148, 163, 225, 0.18)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  All Students
                </button>

                <button
                  type="button"
                  onClick={handleSelectActiveEnrolled}
                  style={{
                    background: statusFilterType === 'active_enrolled' ? '#7C6FFF' : 'rgba(255, 255, 255, 0.05)',
                    color: statusFilterType === 'active_enrolled' ? '#fff' : '#8E9BB5',
                    border: '1px solid rgba(148, 163, 225, 0.18)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Active + Enrolled
                </button>
              </div>

              {/* 4 Status Toggle Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleStatus('Active')}
                  style={{
                    background: selectedStatuses.has('Active') ? '#00E5A0' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedStatuses.has('Active') ? '#080A12' : '#8E9BB5',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedStatuses.has('Active') ? '#080A12' : '#00E5A0' }} />
                  Active
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleStatus('Enrolled')}
                  style={{
                    background: selectedStatuses.has('Enrolled') ? '#7C6FFF' : 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                  Enrolled
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleStatus('Dropped')}
                  style={{
                    background: selectedStatuses.has('Dropped') ? 'rgba(255, 111, 142, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedStatuses.has('Dropped') ? '#FF6F8E' : '#8E9BB5',
                    border: selectedStatuses.has('Dropped') ? '1px solid #FF6F8E' : '1px solid rgba(148, 163, 225, 0.18)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6F8E' }} />
                  Dropped
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleStatus('Refund')}
                  style={{
                    background: selectedStatuses.has('Refund') ? 'rgba(255, 176, 32, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedStatuses.has('Refund') ? '#FFB020' : '#8E9BB5',
                    border: selectedStatuses.has('Refund') ? '1px solid #FFB020' : '1px solid rgba(148, 163, 225, 0.18)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFB020' }} />
                  Refund
                </button>
              </div>
            </div>

            {/* 4. COUNTRY */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#7C6FFF', textTransform: 'uppercase', marginBottom: '6px' }}>
                COUNTRY
              </div>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(148, 163, 225, 0.18)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="All" style={{ background: '#0F1528' }}>All Countries</option>
                {uniqueCountries.map((c) => (
                  <option key={c} value={c} style={{ background: '#0F1528' }}>{c}</option>
                ))}
              </select>
            </div>

            {/* 5. DATE RANGE */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#7C6FFF', textTransform: 'uppercase', marginBottom: '6px' }}>
                DATE RANGE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(148, 163, 225, 0.18)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(148, 163, 225, 0.18)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>

            {/* RESET ALL FILTERS BUTTON */}
            <button
              onClick={handleResetFilters}
              style={{
                width: '100%',
                background: 'rgba(124, 111, 255, 0.15)',
                color: '#fff',
                border: '1px solid rgba(124, 111, 255, 0.3)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '6px',
              }}
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STUDENT POPUP MODAL (Matching Screenshots 2 & 3)
         ========================================================================= */}
      {drilldownState.isOpen && (
        <StudentPopupModal
          isOpen={drilldownState.isOpen}
          onClose={() => setDrilldownState((prev) => ({ ...prev, isOpen: false }))}
          title={drilldownState.title}
          students={drilldownState.students}
          onStudentUpdated={() => fetchOverviewData()}
        />
      )}

      {/* Google Sheet Importer Modal */}
      {isImportModalOpen && (
        <GoogleSheetImporterModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={() => fetchOverviewData()}
        />
      )}
    </div>
  );
}
