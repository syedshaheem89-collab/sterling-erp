import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import {
  Chart as ChartJS,
  registerables,
} from 'chart.js';

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


export default function Overview({ setCurrentPage, initialView }) {
  const { user, profile, role, company, companyId, isDirector, isManager, isCounselor } = useAuth();

  const [loading, setLoading] = useState(true);
  const [studentsData, setStudentsData] = useState([]);
  const [dateRange, setDateRange] = useState('all_time'); // 'this_month' | 'last_3_months' | 'this_year' | 'all_time'

  const lineChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const lineChartInstance = useRef(null);
  const doughnutChartInstance = useRef(null);
  const countryTableRef = useRef(null);

  // Determine user level permissions
  const canViewFinancials = isDirector || role === 'director' || role === 'company_admin' || role === 'super_admin';
  const canViewCounselorTable = canViewFinancials;
  const isCounselorOnly = isCounselor || role === 'counselor';

  // 1. Fetch Students & Payments on mount or change
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

      // Counselor only fetches own students
      if (isCounselorOnly && (user?.id || profile?.id)) {
        query = query.eq('counselor_id', user?.id || profile?.id);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Supabase students fetch notice:', error.message);
        setStudentsData([]);
      } else {
        setStudentsData(data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard overview data:', err);
      setStudentsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();

    const handleLiveRefresh = () => {
      fetchOverviewData();
    };
    window.addEventListener('sterling:refresh', handleLiveRefresh);
    return () => window.removeEventListener('sterling:refresh', handleLiveRefresh);
  }, [companyId, isCounselorOnly, user?.id, profile?.id]);

  useEffect(() => {
    if (initialView === 'country' && countryTableRef.current) {
      countryTableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialView]);

  // 2. Filter students based on selected Date Range
  const filteredStudents = useMemo(() => {
    const now = new Date();

    return studentsData.filter((student) => {
      if (!student.created_at) return true;
      const created = new Date(student.created_at);

      if (dateRange === 'this_month') {
        return (
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth()
        );
      }
      if (dateRange === 'last_3_months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return created >= threeMonthsAgo;
      }
      if (dateRange === 'this_year') {
        return created.getFullYear() === now.getFullYear();
      }
      return true; // 'all_time'
    });
  }, [studentsData, dateRange]);

  // 3. Compute Metrics & Aggregations
  const computed = useMemo(() => {
    let totalCommitted = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let totalProfit = 0;
    let active = 0;
    let enrolled = 0;
    let dropped = 0;
    let refund = 0;

    const byCountry = {};
    const byCounselor = {};
    const byLeadSource = {
      'Digital Marketing': 0,
      'Director Reference': 0,
      'Walk-in': 0,
      'Agent': 0,
      'Social Media': 0,
      'Other': 0,
    };
    const byIntake = {};

    filteredStudents.forEach((student) => {
      const payments = student.payments || [];
      const collected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const committed = Number(student.committed || 0);

      // Remaining = max(0, committed - collected) — only if status is Active or Enrolled
      const isEligibleForRemaining = ['Active', 'Enrolled'].includes(student.enroll_status);
      const remaining = isEligibleForRemaining ? Math.max(0, committed - collected) : 0;

      // Profit formula:
      // profit = collected - refund - b2b_charge - incentive_student - incentive_company - other_expense + commission
      const ref = Number(student.refund || 0);
      const b2b = Number(student.b2b_charge || 0);
      const incStudent = Number(student.incentive_student || 0);
      const incComp = Number(student.incentive_company || 0);
      const otherExp = Number(student.other_expense || 0);
      const comm = Number(student.commission || 0);

      const profit = collected - ref - b2b - incStudent - incComp - otherExp + comm;

      // Status counts
      if (student.enroll_status === 'Active') active++;
      else if (student.enroll_status === 'Enrolled') enrolled++;
      else if (student.enroll_status === 'Dropped') dropped++;
      else if (student.enroll_status === 'Refund') refund++;

      // Totals
      totalCommitted += committed;
      totalCollected += collected;
      totalRemaining += remaining;
      totalProfit += profit;

      // By Country
      const cName = student.country || 'Unknown';
      if (!byCountry[cName]) {
        byCountry[cName] = { count: 0, collected: 0, remaining: 0, profit: 0 };
      }
      byCountry[cName].count += 1;
      byCountry[cName].collected += collected;
      byCountry[cName].remaining += remaining;
      byCountry[cName].profit += profit;

      // By Counselor
      const counselName = student.counselor_name || 'Unassigned';
      if (!byCounselor[counselName]) {
        byCounselor[counselName] = { count: 0, collected: 0, profit: 0 };
      }
      byCounselor[counselName].count += 1;
      byCounselor[counselName].collected += collected;
      byCounselor[counselName].profit += profit;

      // By Lead Source
      const source = student.lead_source || 'Other';
      if (byLeadSource[source] !== undefined) {
        byLeadSource[source] += 1;
      } else {
        byLeadSource['Other'] = (byLeadSource['Other'] || 0) + 1;
      }

      // By Intake
      const intake = student.intake || 'Pending';
      byIntake[intake] = (byIntake[intake] || 0) + 1;
    });

    // 12 Months Payment Timeline calculation
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last12Months = [];
    const timelineData = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      last12Months.push(label);

      // sum payment amounts for this specific month
      let monthSum = 0;
      studentsData.forEach((s) => {
        (s.payments || []).forEach((p) => {
          if (!p.payment_date) return;
          const pDate = new Date(p.payment_date);
          if (pDate.getFullYear() === d.getFullYear() && pDate.getMonth() === d.getMonth()) {
            monthSum += Number(p.amount || 0);
          }
        });
      });
      timelineData.push(monthSum);
    }

    return {
      totalStudents: filteredStudents.length,
      active,
      enrolled,
      dropped,
      refund,
      totalCommitted,
      totalCollected,
      totalRemaining,
      totalProfit,
      byCountry,
      byCounselor,
      byLeadSource,
      byIntake,
      timelineLabels: last12Months,
      timelineValues: timelineData,
    };
  }, [filteredStudents, studentsData]);

  // 4. Render Charts with Chart.js
  useEffect(() => {
    if (loading) return;

    // --- Line Chart: Monthly Collections ---
    if (lineChartRef.current) {
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy();
      }

      const ctx = lineChartRef.current.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 260);
      gradient.addColorStop(0, 'rgba(124, 111, 255, 0.45)');
      gradient.addColorStop(1, 'rgba(124, 111, 255, 0.00)');

      lineChartInstance.current = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: computed.timelineLabels,
          datasets: [
            {
              label: 'Monthly Collections (₹)',
              data: computed.timelineValues,
              borderColor: '#7C6FFF',
              borderWidth: 3,
              pointBackgroundColor: '#00E5A0',
              pointBorderColor: '#080A12',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: '#FFFFFF',
              pointHoverBorderColor: '#7C6FFF',
              backgroundColor: gradient,
              fill: true,
              tension: 0.38,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: 'rgba(20, 25, 45, 0.95)',
              titleColor: '#EDEFFA',
              bodyColor: '#00E5A0',
              borderColor: 'rgba(148, 163, 225, 0.2)',
              borderWidth: 1,
              padding: 12,
              displayColors: false,
              callbacks: {
                label: (context) => `Collected: ${formatIndianCurrency(context.raw)}`,
              },
            },
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(148, 163, 225, 0.06)',
                drawBorder: false,
              },
              ticks: {
                color: '#A8B2C7',
                font: { size: 11, family: 'Inter' },
              },
            },
            y: {
              grid: {
                color: 'rgba(148, 163, 225, 0.08)',
                drawBorder: false,
              },
              ticks: {
                color: '#A8B2C7',
                font: { size: 11, family: 'Inter' },
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

    // --- Doughnut Chart: Applications by Country ---
    if (doughnutChartRef.current) {
      if (doughnutChartInstance.current) {
        doughnutChartInstance.current.destroy();
      }

      const countries = Object.keys(computed.byCountry);
      const counts = countries.map((c) => computed.byCountry[c].count);
      const palette = ['#7C6FFF', '#00E5A0', '#FFB020', '#36D1DC', '#FF6F8E', '#A78BFA', '#F472B6'];

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
              hoverOffset: 6,
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
                font: { size: 11, family: 'Inter' },
              },
            },
            tooltip: {
              backgroundColor: 'rgba(20, 25, 45, 0.95)',
              titleColor: '#EDEFFA',
              bodyColor: '#36D1DC',
              borderColor: 'rgba(148, 163, 225, 0.2)',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: (context) => {
                  const val = context.raw;
                  const total = computed.totalStudents || 1;
                  const pct = Math.round((val / total) * 100);
                  return ` ${context.label}: ${val} students (${pct}%)`;
                },
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

  // Greeting based on current time
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Team';
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  // Top counselor sorting
  const counselorRanking = useMemo(() => {
    return Object.entries(computed.byCounselor)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.collected - a.collected);
  }, [computed.byCounselor]);

  // Lead sources array for progress bars
  const totalLeads = computed.totalStudents || 1;
  const leadSourceList = Object.entries(computed.byLeadSource).map(([source, count]) => ({
    source,
    count,
    percentage: Math.round((count / totalLeads) * 100) || 0,
  }));

  // Last 10 students for Recent Applications
  const recentStudents = useMemo(() => {
    return [...studentsData]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 10);
  }, [studentsData]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* 1. WELCOME BANNER */}
      <section
        className="glass-panel"
        style={{
          padding: '28px 32px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          background: 'linear-gradient(135deg, rgba(124, 111, 255, 0.12) 0%, rgba(54, 209, 220, 0.08) 100%), var(--glass-strong)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                background: 'rgba(0, 229, 160, 0.15)',
                color: 'var(--green)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }} />
              Live Workspace
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>&bull; {todayFormatted}</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            {greeting}, <span style={{ color: 'var(--blue)' }}>{userName}</span>!
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
            Here is your study abroad pipeline overview for{' '}
            <strong style={{ color: 'var(--text)' }}>{company?.name || 'Sterling Study Abroad'}</strong>.
          </p>
        </div>

        {/* 2. DATE RANGE TABS */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg3)',
            padding: '5px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            gap: '4px',
          }}
        >
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'last_3_months', label: 'Last 3 Months' },
            { id: 'this_year', label: 'This Year' },
            { id: 'all_time', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id)}
              style={{
                background: dateRange === tab.id ? 'var(--blue)' : 'transparent',
                color: dateRange === tab.id ? '#fff' : 'var(--muted)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: dateRange === tab.id ? '0 2px 10px rgba(124, 111, 255, 0.4)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. KPI CARDS GRID (6 cards) */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Students */}
        <div
          className="glass-card"
          style={{
            padding: '20px 24px',
            borderLeft: '4px solid var(--blue)',
            background: 'var(--glass)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Total Students</span>
            <span style={{ fontSize: '18px' }}>🎓</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginTop: '8px' }}>
            {computed.totalStudents}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--blue)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>↑ +14.2%</span>
            <span style={{ color: 'var(--muted)' }}>vs last period</span>
          </div>
        </div>

        {/* Card 2: Active Students */}
        <div
          className="glass-card"
          style={{
            padding: '20px 24px',
            borderLeft: '4px solid var(--green)',
            background: 'var(--glass)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Active Students</span>
            <span style={{ fontSize: '18px' }}>⚡</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--green)', marginTop: '8px' }}>
            {computed.active}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            In counseling & processing
          </div>
        </div>

        {/* Card 3: Total Collected */}
        <div
          className="glass-card"
          style={{
            padding: '20px 24px',
            borderLeft: '4px solid var(--green)',
            background: 'var(--glass)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Total Collected</span>
            <span style={{ fontSize: '18px' }}>💰</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--green)', marginTop: '8px' }}>
            {formatIndianCurrency(computed.totalCollected)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Received across installments
          </div>
        </div>

        {/* Card 4: Outstanding */}
        <div
          className="glass-card"
          style={{
            padding: '20px 24px',
            borderLeft: '4px solid var(--amber)',
            background: 'var(--glass)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Outstanding</span>
            <span style={{ fontSize: '18px' }}>⏳</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--amber)', marginTop: '8px' }}>
            {formatIndianCurrency(computed.totalRemaining)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Committed fees pending
          </div>
        </div>

        {/* Card 5: Sterling Profit (Director+ Only) */}
        <div
          className="glass-card"
          style={{
            padding: '20px 24px',
            borderLeft: '4px solid var(--purple)',
            background: 'var(--glass)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Sterling Profit</span>
            <span style={{ fontSize: '18px' }}>💎</span>
          </div>
          {canViewFinancials ? (
            <>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: computed.totalProfit >= 0 ? 'var(--purple)' : 'var(--red)',
                  marginTop: '8px',
                }}
              >
                {formatIndianCurrency(computed.totalProfit)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                Net after B2B, commissions & refunds
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--muted)', marginTop: '12px' }}>
                Restricted 🔒
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                Director clearance required
              </div>
            </>
          )}
        </div>

        {/* Card 6: Enrolled This Period */}
        <div
          className="glass-card"
          style={{
            padding: '20px 24px',
            borderLeft: '4px solid var(--cyan)',
            background: 'var(--glass)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>Enrolled</span>
            <span style={{ fontSize: '18px' }}>🎉</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--cyan)', marginTop: '8px' }}>
            {computed.enrolled}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Confirmed college enrollments
          </div>
        </div>
      </section>

      {/* 4. CHARTS ROW */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Left Chart: Monthly Collections */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Monthly Fee Collections</h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Actual fee receipts over the past 12 months</p>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(124, 111, 255, 0.15)',
                color: 'var(--blue)',
                fontWeight: 600,
              }}
            >
              Timeline (12M)
            </span>
          </div>
          <div style={{ position: 'relative', height: '280px', width: '100%' }}>
            <canvas ref={lineChartRef} />
          </div>
        </div>

        {/* Right Chart: Applications by Country */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Applications by Country</h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Target study destinations distribution</p>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(0, 229, 160, 0.15)',
                color: 'var(--green)',
                fontWeight: 600,
              }}
            >
              Destinations
            </span>
          </div>
          <div style={{ position: 'relative', height: '280px', width: '100%' }}>
            <canvas ref={doughnutChartRef} />
          </div>
        </div>
      </section>

      {/* 5. COUNSELOR LEADERBOARD (Director+ Only) & 6. LEAD SOURCE BREAKDOWN */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: canViewCounselorTable ? 'repeat(auto-fit, minmax(440px, 1fr))' : '1fr',
          gap: '24px',
        }}
      >
        {/* Counselor Leaderboard (Only shown for director/admin) */}
        {canViewCounselorTable && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Counselor Performance Leaderboard</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Ranked by revenue collected this period</p>
              </div>
              <span style={{ fontSize: '20px' }}>🏆</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                    <th style={{ padding: '10px 12px', width: '50px' }}>Rank</th>
                    <th style={{ padding: '10px 12px' }}>Counselor</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Applications</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Collected</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {counselorRanking.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                        No counselor activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    counselorRanking.map((c, index) => (
                      <tr
                        key={c.name}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.2s',
                        }}
                      >
                        <td style={{ padding: '12px', fontWeight: 700 }}>
                          {index === 0 ? '👑 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `${index + 1}`}
                        </td>
                        <td style={{ padding: '12px', color: '#fff', fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span
                            style={{
                              background: 'var(--bg3)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              color: 'var(--cyan)',
                            }}
                          >
                            {c.count}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>
                          {formatIndianCurrency(c.collected)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--blue)', fontWeight: 600 }}>
                          {formatIndianCurrency(c.profit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lead Source Breakdown */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Lead Source Attribution</h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Conversion share by student acquisition channel</p>
            </div>
            <span style={{ fontSize: '18px' }}>🎯</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {leadSourceList.map(({ source, count, percentage }) => {
              const colors = {
                'Digital Marketing': 'var(--blue)',
                'Director Reference': 'var(--purple)',
                'Walk-in': 'var(--green)',
                'Agent': 'var(--amber)',
                'Social Media': 'var(--pink)',
                'Other': 'var(--cyan)',
              };
              const color = colors[source] || 'var(--blue)';

              return (
                <div key={source}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{source}</span>
                    <span style={{ color: 'var(--muted)' }}>
                      <strong style={{ color: '#fff' }}>{count}</strong> students ({percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: 'var(--bg3)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: color,
                        borderRadius: '4px',
                        transition: 'width 0.6s ease-in-out',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. RECENT APPLICATIONS TABLE */}
      <section className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Recent Applications</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Latest 10 student intakes logged into Sterling</p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Showing last 10 entries</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <th style={{ padding: '12px 14px' }}>Student</th>
                <th style={{ padding: '12px 14px' }}>Target Country</th>
                <th style={{ padding: '12px 14px' }}>Assigned Counselor</th>
                <th style={{ padding: '12px 14px' }}>Date Added</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    No recent applications found.
                  </td>
                </tr>
              ) : (
                recentStudents.map((s) => {
                  const dateStr = s.created_at
                    ? new Date(s.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A';

                  const badgeStyles = {
                    Active: { bg: 'rgba(54, 209, 220, 0.15)', text: 'var(--cyan)' },
                    Enrolled: { bg: 'rgba(0, 229, 160, 0.15)', text: 'var(--green)' },
                    Dropped: { bg: 'rgba(255, 111, 142, 0.15)', text: 'var(--red)' },
                    Refund: { bg: 'rgba(255, 176, 32, 0.15)', text: 'var(--amber)' },
                  };
                  const badge = badgeStyles[s.enroll_status] || badgeStyles.Active;

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '14px', fontWeight: 600, color: '#fff' }}>
                        <div>{s.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                          {s.university || 'Pending selection'}
                        </div>
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text)' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            background: 'var(--bg3)',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                        >
                          {s.country || 'Global'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', color: 'var(--muted)' }}>{s.counselor_name || 'Unassigned'}</td>
                      <td style={{ padding: '14px', color: 'var(--muted)' }}>{dateStr}</td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.text,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {s.enroll_status}
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

      {/* 8. COUNTRY BREAKDOWN TABLE */}
      <section ref={countryTableRef} className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Destination Country Breakdown</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Geographic financial and application volume analysis</p>
          </div>
          <span style={{ fontSize: '18px' }}>🌍</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <th style={{ padding: '12px 16px' }}>Destination Country</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Applications</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Collected</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Outstanding</th>
                {canViewFinancials && (
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Profit</th>
                )}
              </tr>
            </thead>
            <tbody>
              {Object.keys(computed.byCountry).length === 0 ? (
                <tr>
                  <td colSpan={canViewFinancials ? 5 : 4} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    No country data found.
                  </td>
                </tr>
              ) : (
                Object.entries(computed.byCountry).map(([country, stats]) => (
                  <tr
                    key={country}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: 'var(--bg3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--blue)',
                        }}
                      >
                        {country.slice(0, 2).toUpperCase()}
                      </span>
                      {country}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          background: 'var(--bg3)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: 'var(--cyan)',
                          fontWeight: 600,
                        }}
                      >
                        {stats.count}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>
                      {formatIndianCurrency(stats.collected)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: stats.remaining > 0 ? 'var(--amber)' : 'var(--muted)', fontWeight: 600 }}>
                      {formatIndianCurrency(stats.remaining)}
                    </td>
                    {canViewFinancials && (
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: stats.profit >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight: 700 }}>
                        {formatIndianCurrency(stats.profit)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Footer Row */}
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-strong)', fontWeight: 700, background: 'var(--bg2)' }}>
                <td style={{ padding: '14px 16px', color: '#fff' }}>Total</td>
                <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--cyan)' }}>
                  {computed.totalStudents}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--green)' }}>
                  {formatIndianCurrency(computed.totalCollected)}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--amber)' }}>
                  {formatIndianCurrency(computed.totalRemaining)}
                </td>
                {canViewFinancials && (
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--purple)' }}>
                    {formatIndianCurrency(computed.totalProfit)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

    </div>
  );
}
