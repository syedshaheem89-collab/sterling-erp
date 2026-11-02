import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import {
  Chart as ChartJS,
  registerables,
} from 'chart.js';
import GoogleSheetImporterModal from '../components/GoogleSheetImporterModal';

// Register all Chart.js modules
ChartJS.register(...registerables);

// Currency Formatter (Indian formatting: Lac / Cr / Thousand)
function formatIndianCurrency(amount) {
  const num = Number(amount) || 0;
  if (Math.abs(num) >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(num) >= 100000) {
    return `₹${(num / 100000).toFixed(2)} Lac`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

// Destination photography cards & country flag mapping
const DESTINATION_PHOTOS = {
  Germany: {
    photo: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&auto=format&fit=crop&q=80',
    flag: '🇩🇪',
    tagline: 'Technical & Research Universities',
  },
  'United Kingdom': {
    photo: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop&q=80',
    flag: '🇬🇧',
    tagline: 'Russell Group & Historic Campuses',
  },
  UK: {
    photo: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop&q=80',
    flag: '🇬🇧',
    tagline: 'Russell Group & Historic Campuses',
  },
  France: {
    photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80',
    flag: '🇫🇷',
    tagline: 'Business Grandes Écoles & Arts',
  },
  Georgia: {
    photo: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600&auto=format&fit=crop&q=80',
    flag: '🇬🇪',
    tagline: 'Leading Medical & MBBS Programs',
  },
  Malta: {
    photo: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&auto=format&fit=crop&q=80',
    flag: '🇲🇹',
    tagline: 'Schengen Gateway & Hospitality',
  },
  Albania: {
    photo: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=600&auto=format&fit=crop&q=80',
    flag: '🇦🇱',
    tagline: 'European Accredited Medical Hub',
  },
  Poland: {
    photo: 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=600&auto=format&fit=crop&q=80',
    flag: '🇵🇱',
    tagline: 'Engineering & Affordable Tuition',
  },
  Canada: {
    photo: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=600&auto=format&fit=crop&q=80',
    flag: '🇨🇦',
    tagline: 'Top Global Research & PR Pathways',
  },
  Default: {
    photo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=80',
    flag: '🌍',
    tagline: 'International University Network',
  },
};

// Counselor photo avatars
const COUNSELOR_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
];

export default function Overview({ setCurrentPage }) {
  const { user, profile, role, company, companyId, isDirector, isCounselor } = useAuth();

  const [loading, setLoading] = useState(true);
  const [studentsData, setStudentsData] = useState([]);
  const [dateRange, setDateRange] = useState('all_time');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const lineChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const lineChartInstance = useRef(null);
  const doughnutChartInstance = useRef(null);

  const canViewFinancials = isDirector || role === 'director' || role === 'company_admin' || role === 'super_admin';
  const isCounselorOnly = isCounselor || role === 'counselor';

  // Fetch Students & Payments on mount or refresh
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

  // Filter students by Date Range
  const filteredStudents = useMemo(() => {
    if (!studentsData || studentsData.length === 0) return [];
    if (dateRange === 'all_time') return studentsData;

    const now = new Date();
    return studentsData.filter((s) => {
      if (!s.created_at) return true;
      const createdAt = new Date(s.created_at);

      if (dateRange === 'this_month') {
        return (
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear()
        );
      }
      if (dateRange === 'last_3_months') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return createdAt >= threeMonthsAgo;
      }
      if (dateRange === 'this_year') {
        return createdAt.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [studentsData, dateRange]);

  // Aggregated KPIs & Financial Metrics
  const computed = useMemo(() => {
    let totalStudents = filteredStudents.length;
    let active = 0;
    let enrolled = 0;
    let dropped = 0;
    let refund = 0;

    let totalCollected = 0;
    let totalCommitted = 0;
    let totalRefund = 0;
    let totalB2B = 0;
    let totalIncentiveStudent = 0;
    let totalIncentiveCompany = 0;
    let totalCommission = 0;
    let totalOtherExpense = 0;

    const byCountry = {};
    const byCounselor = {};
    const byLeadSource = {};
    const monthlyReceipts = {};

    filteredStudents.forEach((s) => {
      const status = s.enroll_status || 'Active';
      if (status === 'Active') active++;
      else if (status === 'Enrolled') enrolled++;
      else if (status === 'Dropped') dropped++;
      else if (status === 'Refund') refund++;

      // Compute collected from payments array or fallback
      let studentCollected = 0;
      if (Array.isArray(s.payments) && s.payments.length > 0) {
        studentCollected = s.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      } else {
        studentCollected = Number(s.collected) || 0;
      }

      const committed = Number(s.committed_fee) || 0;
      const refAmt = Number(s.refund) || 0;
      const b2b = Number(s.b2b_charge) || 0;
      const incStudent = Number(s.partner_incentive_student) || 0;
      const incCompany = Number(s.partner_incentive_company) || 0;
      const comm = Number(s.commission) || 0;
      const otherExp = Number(s.other_expense) || 0;

      totalCollected += studentCollected;
      totalCommitted += committed;
      totalRefund += refAmt;
      totalB2B += b2b;
      totalIncentiveStudent += incStudent;
      totalIncentiveCompany += incCompany;
      totalCommission += comm;
      totalOtherExpense += otherExp;

      // Group by Destination Country
      const country = s.country || 'Other';
      if (!byCountry[country]) {
        byCountry[country] = { count: 0, collected: 0, committed: 0, remaining: 0, profit: 0 };
      }
      byCountry[country].count++;
      byCountry[country].collected += studentCollected;
      byCountry[country].committed += committed;

      const studentRemaining = (status === 'Dropped' || status === 'Refund')
        ? 0
        : Math.max(0, committed - studentCollected);
      byCountry[country].remaining += studentRemaining;

      const studentProfit = (status === 'Dropped' || status === 'Refund')
        ? 0
        : (studentCollected - refAmt - b2b - incStudent - incCompany - otherExp + comm);
      byCountry[country].profit += studentProfit;

      // Group by Counselor
      const counselorName = s.counselor_name || 'Unassigned';
      if (!byCounselor[counselorName]) {
        byCounselor[counselorName] = { count: 0, collected: 0, profit: 0, enrolled: 0 };
      }
      byCounselor[counselorName].count++;
      byCounselor[counselorName].collected += studentCollected;
      byCounselor[counselorName].profit += studentProfit;
      if (status === 'Enrolled') byCounselor[counselorName].enrolled++;

      // Group by Lead Source
      const source = s.lead_source || 'Other';
      byLeadSource[source] = (byLeadSource[source] || 0) + 1;

      // Group payments by month for timeline
      if (Array.isArray(s.payments)) {
        s.payments.forEach((p) => {
          if (p.paid_date) {
            const dateObj = new Date(p.paid_date);
            const mKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            monthlyReceipts[mKey] = (monthlyReceipts[mKey] || 0) + (Number(p.amount) || 0);
          }
        });
      }
    });

    const totalRemaining = Math.max(0, totalCommitted - totalCollected);
    const totalProfit =
      totalCollected -
      totalRefund -
      totalB2B -
      totalIncentiveStudent -
      totalIncentiveCompany -
      totalOtherExpense +
      totalCommission;

    return {
      totalStudents,
      active,
      enrolled,
      dropped,
      refund,
      totalCollected,
      totalCommitted,
      totalRemaining,
      totalProfit,
      byCountry,
      byCounselor,
      byLeadSource,
      monthlyReceipts,
    };
  }, [filteredStudents]);

  // Render Charts
  useEffect(() => {
    if (loading) return;

    // Monthly Fee Line Chart
    if (lineChartRef.current) {
      if (lineChartInstance.current) lineChartInstance.current.destroy();

      const sortedMonths = Object.keys(computed.monthlyReceipts).sort();
      const last12Months = sortedMonths.slice(-12);

      const labels =
        last12Months.length > 0
          ? last12Months.map((m) => {
              const [y, mon] = m.split('-');
              return new Date(y, mon - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            })
          : ['Current'];

      const dataValues =
        last12Months.length > 0
          ? last12Months.map((m) => computed.monthlyReceipts[m])
          : [computed.totalCollected || 0];

      const ctx1 = lineChartRef.current.getContext('2d');
      const gradient = ctx1.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(124, 111, 255, 0.45)');
      gradient.addColorStop(1, 'rgba(124, 111, 255, 0.0)');

      lineChartInstance.current = new ChartJS(ctx1, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Collections',
              data: dataValues,
              borderColor: '#7C6FFF',
              borderWidth: 3,
              backgroundColor: gradient,
              fill: true,
              tension: 0.38,
              pointBackgroundColor: '#00E5A0',
              pointBorderColor: '#080A12',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 7,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(17, 22, 40, 0.95)',
              titleColor: '#fff',
              bodyColor: '#00E5A0',
              borderColor: 'rgba(124, 111, 255, 0.4)',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: (ctx) => `Collected: ${formatIndianCurrency(ctx.raw)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(148, 163, 225, 0.05)' },
              ticks: { color: '#A8B2C7', font: { size: 11 } },
            },
            y: {
              grid: { color: 'rgba(148, 163, 225, 0.08)' },
              ticks: {
                color: '#A8B2C7',
                font: { size: 11 },
                callback: (val) => {
                  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                  if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
                  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                  return `₹${val}`;
                },
              },
            },
          },
        },
      });
    }

    // Doughnut Chart: Country Distribution
    if (doughnutChartRef.current) {
      if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();

      const countries = Object.keys(computed.byCountry);
      const counts = countries.map((c) => computed.byCountry[c].count);
      const palette = ['#7C6FFF', '#00E5A0', '#FFB020', '#36D1DC', '#FF6F8E', '#A78BFA', '#F472B6', '#38BDF8'];

      const ctx2 = doughnutChartRef.current.getContext('2d');
      doughnutChartInstance.current = new ChartJS(ctx2, {
        type: 'doughnut',
        data: {
          labels: countries.length > 0 ? countries : ['No Data'],
          datasets: [
            {
              data: counts.length > 0 ? counts : [1],
              backgroundColor: countries.length > 0 ? palette.slice(0, countries.length) : ['#1e2439'],
              borderColor: '#080A12',
              borderWidth: 3,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#A8B2C7',
                padding: 12,
                boxWidth: 10,
                boxHeight: 10,
                font: { size: 11 },
              },
            },
          },
        },
      });
    }

    return () => {
      if (lineChartInstance.current) lineChartInstance.current.destroy();
      if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();
    };
  }, [computed, loading]);

  // Greeting and Time
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Director';
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  // Counselor Leaderboard Ranking
  const counselorRanking = useMemo(() => {
    return Object.entries(computed.byCounselor)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.collected - a.collected);
  }, [computed.byCounselor]);

  // Lead sources
  const totalLeads = computed.totalStudents || 1;
  const leadSourceList = Object.entries(computed.byLeadSource).map(([source, count]) => ({
    source,
    count,
    percentage: Math.round((count / totalLeads) * 100) || 0,
  }));

  // Top Destination Country Cards
  const topCountries = useMemo(() => {
    const list = Object.entries(computed.byCountry)
      .map(([country, stats]) => ({ country, ...stats }))
      .sort((a, b) => b.count - a.count);

    // If empty or small, provide default popular destinations
    if (list.length === 0) {
      return [
        { country: 'Germany', count: 0, collected: 0, remaining: 0 },
        { country: 'United Kingdom', count: 0, collected: 0, remaining: 0 },
        { country: 'France', count: 0, collected: 0, remaining: 0 },
        { country: 'Georgia', count: 0, collected: 0, remaining: 0 },
      ];
    }
    return list.slice(0, 6);
  }, [computed.byCountry]);

  // Recent 8 students
  const recentStudents = useMemo(() => {
    return [...studentsData]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8);
  }, [studentsData]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* =========================================================================
          1. 2026 EXECUTIVE CAMPUS HERO COCKPIT BANNER
         ========================================================================= */}
      <section
        style={{
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(124, 111, 255, 0.12)',
        }}
      >
        {/* Background Campus Photo with Glass Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&auto=format&fit=crop&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.3) saturate(1.2)',
          }}
        />

        {/* Ambient Gradient Mesh */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(8, 10, 18, 0.94) 0%, rgba(17, 22, 40, 0.82) 50%, rgba(124, 111, 255, 0.25) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        />

        {/* Hero Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '36px 40px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <span
                style={{
                  background: 'rgba(0, 229, 160, 0.2)',
                  color: 'var(--green)',
                  border: '1px solid rgba(0, 229, 160, 0.4)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 10px var(--green)' }} />
                Sterling Executive 2026
              </span>
              <span style={{ fontSize: '13px', color: '#CBD5E1' }}>&bull; {todayFormatted}</span>
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>
              {greeting}, <span style={{ background: 'linear-gradient(135deg, #7C6FFF 0%, #36D1DC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{userName}</span>
            </h1>

            <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '8px', maxWidth: '640px', lineHeight: 1.6 }}>
              Study Abroad Global Operations & Financial Command for{' '}
              <strong style={{ color: '#F1F5F9' }}>{company?.name || 'Europe Sterling Study Abroad'}</strong>.
              Real-time multi-currency revenue, visa milestones, and counselor performance.
            </p>
          </div>

          {/* Quick Action Cockpit Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            {/* 1-Click Master Sheet Import Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #00E5A0 0%, #00B37E 100%)',
                color: '#080A12',
                padding: '12px 22px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0, 229, 160, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span style={{ fontSize: '16px' }}>📥</span>
              <span>Import Master Sheet</span>
            </button>

            {/* View All Students */}
            {setCurrentPage && (
              <button
                onClick={() => setCurrentPage('students')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              >
                <span>👥</span>
                <span>Student Directory</span>
              </button>
            )}

            {/* Date Range Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(10, 14, 26, 0.8)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(148, 163, 225, 0.2)',
                gap: '2px',
              }}
            >
              {[
                { id: 'this_month', label: 'Month' },
                { id: 'last_3_months', label: 'Quarter' },
                { id: 'this_year', label: '2026' },
                { id: 'all_time', label: 'All Time' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDateRange(tab.id)}
                  style={{
                    background: dateRange === tab.id ? 'var(--blue)' : 'transparent',
                    color: dateRange === tab.id ? '#fff' : 'var(--muted)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. 6 FUTURISTIC FROSTED GLASS KPI CARDS
         ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '18px',
        }}
      >
        {/* KPI 1: Total Students */}
        <div
          className="glass-card"
          style={{
            position: 'relative',
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(20, 26, 48, 0.7) 0%, rgba(12, 16, 30, 0.8) 100%)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7C6FFF, #36D1DC)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Total Applicants</span>
            <span style={{ fontSize: '20px' }}>🎓</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginTop: '12px', letterSpacing: '-0.02em' }}>
            {computed.totalStudents}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--blue)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <span>↑ Active Intakes</span>
            <span style={{ color: 'var(--muted)' }}>across all years</span>
          </div>
        </div>

        {/* KPI 2: Active Pipeline */}
        <div
          className="glass-card"
          style={{
            position: 'relative',
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(20, 26, 48, 0.7) 0%, rgba(12, 16, 30, 0.8) 100%)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #36D1DC, #00E5A0)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Active Pipeline</span>
            <span style={{ fontSize: '20px' }}>⚡</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--cyan)', marginTop: '12px', letterSpacing: '-0.02em' }}>
            {computed.active}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
            In counseling & visa processing
          </div>
        </div>

        {/* KPI 3: Total Collected */}
        <div
          className="glass-card"
          style={{
            position: 'relative',
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(20, 26, 48, 0.7) 0%, rgba(12, 16, 30, 0.8) 100%)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #00E5A0, #00B37E)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Total Collected</span>
            <span style={{ fontSize: '20px' }}>💰</span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--green)', marginTop: '12px', letterSpacing: '-0.02em' }}>
            {formatIndianCurrency(computed.totalCollected)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
            Realized bank fee receipts
          </div>
        </div>

        {/* KPI 4: Pending Outstanding */}
        <div
          className="glass-card"
          style={{
            position: 'relative',
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(20, 26, 48, 0.7) 0%, rgba(12, 16, 30, 0.8) 100%)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #FFB020, #FF6F8E)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Outstanding Balance</span>
            <span style={{ fontSize: '20px' }}>⏳</span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--amber)', marginTop: '12px', letterSpacing: '-0.02em' }}>
            {formatIndianCurrency(computed.totalRemaining)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
            Committed fees due
          </div>
        </div>

        {/* KPI 5: Net Profit (Director Level) */}
        <div
          className="glass-card"
          style={{
            position: 'relative',
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(20, 26, 48, 0.7) 0%, rgba(12, 16, 30, 0.8) 100%)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #A78BFA, #F472B6)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Sterling Net Profit</span>
            <span style={{ fontSize: '20px' }}>💎</span>
          </div>
          {canViewFinancials ? (
            <>
              <div
                style={{
                  fontSize: '30px',
                  fontWeight: 800,
                  color: computed.totalProfit >= 0 ? 'var(--purple)' : 'var(--red)',
                  marginTop: '12px',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatIndianCurrency(computed.totalProfit)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                Net after B2B & partner incentive
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--muted)', marginTop: '16px' }}>
                Confidential 🔒
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                Director clearance required
              </div>
            </>
          )}
        </div>

        {/* KPI 6: Confirmed Enrollments */}
        <div
          className="glass-card"
          style={{
            position: 'relative',
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(20, 26, 48, 0.7) 0%, rgba(12, 16, 30, 0.8) 100%)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #38BDF8, #818CF8)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Visa / Enrolled</span>
            <span style={{ fontSize: '20px' }}>🎉</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#38BDF8', marginTop: '12px', letterSpacing: '-0.02em' }}>
            {computed.enrolled}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
            Successful university arrivals
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. DESTINATION SHOWCASE — PHOTOGRAPHIC CARDS WITH REAL IMAGES
         ========================================================================= */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Top Study Destinations
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Real-time application intake distribution across European and global campuses
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 600 }}>
            {Object.keys(computed.byCountry).length} Destinations Active
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {topCountries.map((dest) => {
            const countryMeta = DESTINATION_PHOTOS[dest.country] || DESTINATION_PHOTOS.Default;
            return (
              <div
                key={dest.country}
                style={{
                  position: 'relative',
                  height: '220px',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '1px solid rgba(148, 163, 225, 0.18)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(124, 111, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.4)';
                }}
                onClick={() => setCurrentPage && setCurrentPage('students')}
              >
                {/* Photo Background */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url('${countryMeta.photo}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.65)',
                    transition: 'transform 0.5s ease',
                  }}
                />

                {/* Gradient Overlay for Legibility */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(8, 10, 18, 0.95) 0%, rgba(8, 10, 18, 0.4) 60%, rgba(8, 10, 18, 0.1) 100%)',
                  }}
                />

                {/* Country Flag & Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    right: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(8, 10, 18, 0.75)',
                      backdropFilter: 'blur(8px)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{countryMeta.flag}</span>
                    <span>{dest.country}</span>
                  </span>

                  <span
                    style={{
                      background: 'rgba(0, 229, 160, 0.2)',
                      color: 'var(--green)',
                      border: '1px solid rgba(0, 229, 160, 0.4)',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {dest.count} Students
                  </span>
                </div>

                {/* Bottom Stats */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    right: '16px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#CBD5E1', marginBottom: '6px' }}>
                    {countryMeta.tagline}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>Collected</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--green)' }}>
                        {formatIndianCurrency(dest.collected)}
                      </div>
                    </div>
                    {dest.remaining > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>Due</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--amber)' }}>
                          {formatIndianCurrency(dest.remaining)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          4. CHARTS SUITE: MONTHLY COLLECTIONS & GEOGRAPHIC PIE
         ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Left Chart: Monthly Collections */}
        <div
          className="glass-panel"
          style={{
            padding: '26px',
            borderRadius: '20px',
            background: 'var(--glass)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Monthly Fee Receipts (12M)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                Aggregated cashflow across all 5 student installments
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(124, 111, 255, 0.15)',
                color: 'var(--blue)',
                fontWeight: 700,
              }}
            >
              Audited
            </span>
          </div>

          <div style={{ position: 'relative', height: '280px', width: '100%' }}>
            <canvas ref={lineChartRef} />
          </div>
        </div>

        {/* Right Chart: Country Distribution */}
        <div
          className="glass-panel"
          style={{
            padding: '26px',
            borderRadius: '20px',
            background: 'var(--glass)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Intake Distribution by Country
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                Application volume breakdown across destination partners
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(0, 229, 160, 0.15)',
                color: 'var(--green)',
                fontWeight: 700,
              }}
            >
              Live Share
            </span>
          </div>

          <div style={{ position: 'relative', height: '280px', width: '100%' }}>
            <canvas ref={doughnutChartRef} />
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. COUNSELOR HALL OF FAME & LEAD SOURCE ATTRIBUTION
         ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: canViewFinancials ? 'repeat(auto-fit, minmax(460px, 1fr))' : '1fr',
          gap: '24px',
        }}
      >
        {/* Counselor Hall of Fame */}
        {canViewFinancials && (
          <div
            className="glass-panel"
            style={{
              padding: '26px',
              borderRadius: '20px',
              background: 'var(--glass)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Counselor Hall of Fame 🏆
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                  Ranked by revenue collected and student conversion
                </p>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--cyan)', fontWeight: 700 }}>
                {counselorRanking.length} Counselors
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {counselorRanking.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)', fontSize: '13px' }}>
                  No counselor activity logged yet.
                </div>
              ) : (
                counselorRanking.slice(0, 6).map((c, idx) => {
                  const avatarUrl = COUNSELOR_AVATARS[idx % COUNSELOR_AVATARS.length];
                  const medals = ['🥇', '🥈', '🥉'];
                  const isPodium = idx < 3;

                  return (
                    <div
                      key={c.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        background: isPodium ? 'rgba(124, 111, 255, 0.08)' : 'var(--bg3)',
                        border: isPodium ? '1px solid rgba(124, 111, 255, 0.25)' : '1px solid var(--border)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      {/* Left: Medal + Avatar + Name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>
                          {idx < 3 ? medals[idx] : `#${idx + 1}`}
                        </span>

                        <img
                          src={avatarUrl}
                          alt={c.name}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: isPodium ? '2px solid var(--blue)' : '2px solid var(--border)',
                          }}
                        />

                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{c.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            <strong style={{ color: 'var(--cyan)' }}>{c.count}</strong> students &bull;{' '}
                            <span style={{ color: 'var(--green)' }}>{c.enrolled} enrolled</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Collected & Profit */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--green)' }}>
                          {formatIndianCurrency(c.collected)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 600 }}>
                          Profit: {formatIndianCurrency(c.profit)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Lead Source Attribution */}
        <div
          className="glass-panel"
          style={{
            padding: '26px',
            borderRadius: '20px',
            background: 'var(--glass)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Lead Source Attribution 🎯
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                Conversion share by student inquiry acquisition channel
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {leadSourceList.map(({ source, count, percentage }) => {
              const colors = {
                'Digital Marketing': '#7C6FFF',
                'Director Reference': '#A78BFA',
                'Walk-in': '#00E5A0',
                'Agent': '#FFB020',
                'Social Media': '#F472B6',
                'Other': '#36D1DC',
              };
              const color = colors[source] || '#7C6FFF';

              return (
                <div key={source}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{source}</span>
                    <span style={{ color: 'var(--muted)' }}>
                      <strong style={{ color: '#fff' }}>{count}</strong> ({percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: 'var(--bg3)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: color,
                        borderRadius: '4px',
                        boxShadow: `0 0 10px ${color}66`,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. RECENT STUDENT INTAKES WITH AVATARS & FLAGS
         ========================================================================= */}
      <section
        className="glass-panel"
        style={{
          padding: '26px',
          borderRadius: '20px',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
              Live Student Applications Stream
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Real-time feed of the latest registered students in Sterling ERP
            </p>
          </div>
          {setCurrentPage && (
            <button
              onClick={() => setCurrentPage('students')}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--blue)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View Full Directory &rarr;
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <th style={{ padding: '12px 16px' }}>Student</th>
                <th style={{ padding: '12px 16px' }}>Destination</th>
                <th style={{ padding: '12px 16px' }}>Course & University</th>
                <th style={{ padding: '12px 16px' }}>Counselor</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Installment Progress</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    No student applications found. Click <strong>Import Master Sheet</strong> above to load your Google Sheet!
                  </td>
                </tr>
              ) : (
                recentStudents.map((s, sIdx) => {
                  const countryMeta = DESTINATION_PHOTOS[s.country] || DESTINATION_PHOTOS.Default;
                  const initials = (s.name || 'Student')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  // Compute payments sum
                  let paid = 0;
                  if (Array.isArray(s.payments) && s.payments.length > 0) {
                    paid = s.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
                  } else {
                    paid = Number(s.collected) || 0;
                  }
                  const committed = Number(s.committed_fee) || 200000;
                  const pct = Math.min(100, Math.round((paid / (committed || 1)) * 100));

                  const statusStyles = {
                    Active: { bg: 'rgba(0, 229, 160, 0.15)', text: 'var(--green)' },
                    Enrolled: { bg: 'rgba(54, 209, 220, 0.15)', text: 'var(--cyan)' },
                    Dropped: { bg: 'rgba(255, 111, 142, 0.15)', text: 'var(--red)' },
                    Refund: { bg: 'rgba(255, 176, 32, 0.15)', text: 'var(--amber)' },
                  };
                  const stStyle = statusStyles[s.enroll_status] || statusStyles.Active;

                  return (
                    <tr
                      key={s.id || sIdx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Student Name + Avatar */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #7C6FFF 0%, #36D1DC 100%)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff' }}>{s.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {s.intake || 'Intake pending'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Destination with Flag */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--bg3)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#fff',
                          }}
                        >
                          <span>{countryMeta.flag}</span>
                          <span>{s.country || 'Global'}</span>
                        </span>
                      </td>

                      {/* Course & University */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: 'var(--text)', fontWeight: 600 }}>{s.course || 'Undergraduate'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {s.university || 'University to be finalized'}
                        </div>
                      </td>

                      {/* Counselor */}
                      <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>
                        {s.counselor_name || 'Unassigned'}
                      </td>

                      {/* Installment Progress */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>
                          {formatIndianCurrency(paid)}{' '}
                          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                            / {formatIndianCurrency(committed)}
                          </span>
                        </div>
                        <div
                          style={{
                            width: '120px',
                            height: '5px',
                            background: 'var(--bg3)',
                            borderRadius: '3px',
                            marginLeft: 'auto',
                            marginTop: '4px',
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
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            background: stStyle.bg,
                            color: stStyle.text,
                            padding: '4px 10px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {s.enroll_status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =========================================================================
          7. MASTER GOOGLE SHEET IMPORTER MODAL
         ========================================================================= */}
      <GoogleSheetImporterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => fetchOverviewData()}
      />

    </div>
  );
}
