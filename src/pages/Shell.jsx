import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Overview from './Overview';
import Students from './Students';
import Ledger from './Ledger';
import Users from './Users';
import Admin from './Admin';

/**
 * Shell Component - Sterling ERP
 * 
 * Layout container after login featuring:
 * - Desktop 240px glassmorphism sidebar & mobile slide-out drawer
 * - Company branding with company initial avatar & role-based user tag
 * - Role-governed navigation:
 *    * Overview: all roles
 *    * Students: all roles (scoped by role level)
 *    * Country: director & above
 *    * Admissions: manager & above
 *    * Finance: director & above
 *    * Ledger: director & above
 *    * Users: company_admin & above
 *    * Companies: super_admin only
 * - Topbar with mobile hamburger toggle, dynamic page titles, live data refresh, theme toggle (dark/light)
 * - Cohesive content view switcher with cross-navigation `setCurrentPage` propagation
 * - Light/Dark theme switching updating data-theme on <html>
 */
export default function Shell() {
  const { user, profile, role, company, signOut, refreshUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sterling_theme') || 'dark';
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync theme to document.documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sterling_theme', theme);
  }, [theme]);

  // Close mobile sidebar on window resize if crossing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992 && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileSidebarOpen]);

  // Handle data refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshUser) {
        await refreshUser();
      }
      // Broadcast refresh event for active child page listeners
      window.dispatchEvent(new CustomEvent('sterling:refresh'));
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Role hierarchy validation
  // Roles: super_admin > company_admin > director > manager > counselor
  const getRoleLevel = (r) => {
    switch (r) {
      case 'super_admin': return 5;
      case 'company_admin': return 4;
      case 'director': return 3;
      case 'manager': return 2;
      case 'counselor': return 1;
      default: return 3; // default director fallback
    }
  };

  const currentLevel = getRoleLevel(role);

  // Define nav items with their required minimum role
  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊', minLevel: 1 },
    { id: 'students', label: 'Students', icon: '👥', minLevel: 1 },
    { id: 'country', label: 'Country', icon: '🌍', minLevel: 3 }, // director & above
    { id: 'admissions', label: 'Admissions', icon: '🏆', minLevel: 2 }, // manager & above
    { id: 'finance', label: 'Finance', icon: '💰', minLevel: 3 }, // director & above
    { id: 'ledger', label: 'Ledger', icon: '📒', minLevel: 3 }, // director & above
    { id: 'users', label: 'Users', icon: '👤', minLevel: 4 }, // company_admin & above
    { id: 'companies', label: 'Companies', icon: '🏢', minLevel: 5 }, // super_admin only
  ];

  const visibleNavItems = navItems.filter((item) => currentLevel >= item.minLevel);

  // Compute Page Header Titles & Descriptions
  const getPageMeta = (page) => {
    switch (page) {
      case 'overview':
        return {
          title: 'Executive Overview',
          description: 'Multi-cohort intake metrics, revenue yield, and global student KPIs.',
        };
      case 'students':
        return {
          title: 'Student Directory',
          description: role === 'counselor'
            ? 'Your dedicated portfolio of study abroad applicants.'
            : role === 'manager'
            ? 'Branch & team counselor admissions roster.'
            : 'Company-wide global student enrollment records.',
        };
      case 'country':
        return {
          title: 'Country & Destination Analytics',
          description: 'Application volume, visa conversion rates, and country yield.',
        };
      case 'admissions':
        return {
          title: 'Admissions Pipeline',
          description: 'Offer letter staging, CAS/I-20 issuance, and university enrollments.',
        };
      case 'finance':
        return {
          title: 'Financial Revenue & Margin Analytics',
          description: 'Installment tracking, counselor incentives, and net profit.',
        };
      case 'ledger':
        return {
          title: 'Company Ledger & Expenses',
          description: 'Official double-entry books, overhead allocations, and disbursements.',
        };
      case 'users':
        return {
          title: 'Staff & Access Management',
          description: 'Manage counselor assignments, team leads, and system credentials.',
        };
      case 'companies':
        return {
          title: 'Multi-Company Organizations',
          description: 'System-wide tenant governance, branch licensing, and global settings.',
        };
      default:
        return {
          title: 'ERP Portal',
          description: 'Sterling Study Abroad Management System.',
        };
    }
  };

  const pageMeta = getPageMeta(currentPage);

  // Determine user display initials & name
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Sterling User';
  const userInitial = (userName[0] || 'U').toUpperCase();
  const companyName = company?.name || 'Sterling Study Abroad';
  const companyInitial = (companyName[0] || 'S').toUpperCase();

  // Helper for role badge colors
  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'super_admin':
        return { bg: 'rgba(244, 114, 182, 0.15)', color: '#F472B6', border: 'rgba(244, 114, 182, 0.35)', label: 'Super Admin' };
      case 'company_admin':
        return { bg: 'rgba(255, 176, 32, 0.15)', color: '#FFB020', border: 'rgba(255, 176, 32, 0.35)', label: 'Company Admin' };
      case 'director':
        return { bg: 'rgba(124, 111, 255, 0.15)', color: '#7C6FFF', border: 'rgba(124, 111, 255, 0.35)', label: 'Director' };
      case 'manager':
        return { bg: 'rgba(54, 209, 220, 0.15)', color: '#36D1DC', border: 'rgba(54, 209, 220, 0.35)', label: 'Manager' };
      case 'counselor':
        return { bg: 'rgba(0, 229, 160, 0.15)', color: '#00E5A0', border: 'rgba(0, 229, 160, 0.35)', label: 'Counselor' };
      default:
        return { bg: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA', border: 'rgba(167, 139, 250, 0.35)', label: 'Member' };
    }
  };

  const badge = getRoleBadgeStyle(role);

  // Render content area based on currentPage
  const renderContent = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview setCurrentPage={setCurrentPage} />;
      case 'students':
        return <Students setCurrentPage={setCurrentPage} />;
      case 'ledger':
        return <Ledger setCurrentPage={setCurrentPage} />;
      case 'users':
        return <Users setCurrentPage={setCurrentPage} />;
      case 'companies':
        return <Admin setCurrentPage={setCurrentPage} defaultTab="companies" />;
      case 'country':
        // Country analytics view: rendered using Overview with 'country' filter or view
        return <Overview setCurrentPage={setCurrentPage} initialView="country" />;
      case 'admissions':
        // Admissions pipeline view: rendered using Students with 'Admissions' stage
        return <Students setCurrentPage={setCurrentPage} initialFilter="Admissions" />;
      case 'finance':
        // Finance breakdown view: rendered using Ledger with 'finance' view
        return <Ledger setCurrentPage={setCurrentPage} initialTab="finance" />;
      default:
        return <Overview setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="shell-container">
      {/* Shell Styles & Theme Adaptation */}
      <style>{`
        :root[data-theme="light"] {
          --bg: #F4F6FC;
          --bg2: #FFFFFF;
          --bg2solid: #F9FAFD;
          --bg3: #EAEFFC;
          --bg4: #DEE5F7;
          --border: rgba(120, 135, 185, 0.18);
          --border-strong: rgba(120, 135, 185, 0.32);
          --text: #0E1326;
          --muted: #5C6782;
          --glass: rgba(255, 255, 255, 0.85);
          --glass-strong: rgba(255, 255, 255, 0.94);
          --shadow-glass: 0 8px 30px rgba(0, 0, 0, 0.08);
          --shadow-glow: 0 0 20px rgba(124, 111, 255, 0.18);
        }

        .shell-container {
          min-height: 100vh;
          display: flex;
          background-color: var(--bg, #080A12);
          color: var(--text, #EDEFFA);
          font-family: var(--font, 'Plus Jakarta Sans', sans-serif);
          position: relative;
        }

        /* Mobile Backdrop Overlay */
        .mobile-overlay {
          display: none;
        }

        @media (max-width: 991px) {
          .mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 90;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }

          .mobile-overlay.active {
            opacity: 1;
            pointer-events: auto;
          }
        }

        /* Sidebar Styling */
        .shell-sidebar {
          width: 240px;
          min-width: 240px;
          background: var(--glass-strong, rgba(20, 25, 45, 0.88));
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid var(--border, rgba(148, 163, 225, 0.12));
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 100;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (max-width: 991px) {
          .shell-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
          }

          .shell-sidebar.mobile-open {
            transform: translateX(0);
          }
        }

        /* Company Brand in Sidebar */
        .sidebar-brand-box {
          padding: 22px 20px 18px 20px;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.12));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .brand-logo-circle {
          width: 38px;
          height: 38px;
          min-width: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--blue, #7C6FFF) 0%, #36D1DC 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(124, 111, 255, 0.35);
        }

        .brand-meta {
          flex: 1;
          overflow: hidden;
        }

        .brand-company-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text, #EDEFFA);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }

        .brand-sub-badge {
          font-size: 11px;
          color: var(--muted, #A8B2C7);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 2px;
        }

        .sidebar-close-btn {
          display: none;
          background: none;
          border: none;
          color: var(--muted, #A8B2C7);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }

        @media (max-width: 991px) {
          .sidebar-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        /* User Profile Pill */
        .sidebar-user-box {
          padding: 16px 18px;
          margin: 12px 14px;
          background: var(--bg2, rgba(17, 22, 35, 0.45));
          border: 1px solid var(--border, rgba(148, 163, 225, 0.1));
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar-circle {
          width: 36px;
          height: 36px;
          min-width: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7C6FFF 0%, #A78BFA 100%);
          border: 2px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }

        .user-info-text {
          flex: 1;
          overflow: hidden;
        }

        .user-name-display {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #EDEFFA);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role-badge {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 20px;
          margin-top: 3px;
          letter-spacing: 0.02em;
        }

        /* Navigation Links List */
        .sidebar-nav {
          flex: 1;
          padding: 8px 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 14px;
          border-radius: 11px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--muted, #A8B2C7);
          font-size: 13.5px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          transition: var(--transition, all 0.2s cubic-bezier(0.16, 1, 0.3, 1));
          position: relative;
        }

        .nav-item-btn:hover {
          background: var(--bg3, rgba(22, 27, 46, 0.7));
          color: var(--text, #EDEFFA);
        }

        .nav-item-btn.active {
          background: rgba(124, 111, 255, 0.14);
          color: #ffffff;
          border-color: rgba(124, 111, 255, 0.35);
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(124, 111, 255, 0.15);
        }

        .nav-item-btn.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 3.5px;
          background: var(--blue, #7C6FFF);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px var(--blue, #7C6FFF);
        }

        .nav-icon {
          font-size: 16px;
          line-height: 1;
        }

        .nav-label {
          flex: 1;
        }

        /* Bottom Action / Logout Box */
        .sidebar-footer {
          padding: 14px 14px;
          border-top: 1px solid var(--border, rgba(148, 163, 225, 0.12));
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(255, 111, 142, 0.08);
          border: 1px solid rgba(255, 111, 142, 0.22);
          color: var(--red, #FF6F8E);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: rgba(255, 111, 142, 0.18);
          border-color: rgba(255, 111, 142, 0.4);
          transform: translateY(-1px);
        }

        /* Main Workspace Area */
        .shell-main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background-color: var(--bg, #080A12);
        }

        /* Sticky Topbar */
        .shell-topbar {
          position: sticky;
          top: 0;
          z-index: 80;
          background: var(--glass-strong, rgba(20, 25, 45, 0.85));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.12));
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
        }

        @media (max-width: 768px) {
          .shell-topbar {
            padding: 0 16px;
            height: 58px;
          }
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hamburger-btn {
          display: none;
          background: var(--bg3, #161b2e);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          color: var(--text, #EDEFFA);
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          line-height: 0;
        }

        @media (max-width: 991px) {
          .hamburger-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        .topbar-title-block {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .topbar-page-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text, #EDEFFA);
          letter-spacing: -0.01em;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .topbar-btn {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: var(--bg3, #161b2e);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          color: var(--text, #EDEFFA);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .topbar-btn:hover {
          background: var(--bg4, #1e2439);
          border-color: var(--border-strong, rgba(148, 163, 225, 0.3));
          transform: translateY(-1px);
        }

        .spin-active {
          animation: spinRefresh 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes spinRefresh {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .topbar-user-badge {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 6px 12px;
          background: var(--bg3, #161b2e);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #EDEFFA);
        }

        @media (max-width: 600px) {
          .topbar-user-badge span {
            display: none;
          }
          .topbar-user-badge {
            padding: 6px;
          }
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--green, #00E5A0);
          box-shadow: 0 0 6px var(--green, #00E5A0);
        }

        /* Main Workspace Scroll Content */
        .shell-content-container {
          flex: 1;
          padding: 24px 28px;
          overflow-y: auto;
          position: relative;
        }

        @media (max-width: 768px) {
          .shell-content-container {
            padding: 18px 14px;
          }
        }
      `}</style>

      {/* Mobile Backdrop Click Overlay */}
      <div
        className={`mobile-overlay ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* 240px Glassmorphism Sidebar */}
      <aside className={`shell-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        {/* Company Header */}
        <div className="sidebar-brand-box">
          <div className="brand-logo-circle">{companyInitial}</div>
          <div className="brand-meta">
            <div className="brand-company-title" title={companyName}>
              {companyName}
            </div>
            <div className="brand-sub-badge">Study Abroad ERP</div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* User Card with Role Badge */}
        <div className="sidebar-user-box">
          <div className="user-avatar-circle">{userInitial}</div>
          <div className="user-info-text">
            <div className="user-name-display" title={userName}>
              {userName}
            </div>
            <span
              className="user-role-badge"
              style={{
                backgroundColor: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
              }}
            >
              {badge.label}
            </span>
          </div>
        </div>

        {/* Navigation Items (Filtered by Role Hierarchy) */}
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage(item.id);
                  setMobileSidebarOpen(false);
                }}
              >
                <span className="nav-icon" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Logout Button */}
        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={() => {
              if (signOut) signOut();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main App Workspace */}
      <div className="shell-main-area">
        {/* Sticky Topbar */}
        <header className="shell-topbar">
          <div className="topbar-left">
            {/* Hamburger button (visible on mobile only) */}
            <button
              className="hamburger-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Current Page Title */}
            <div className="topbar-title-block">
              <h2 className="topbar-page-title">{pageMeta.title}</h2>
            </div>
          </div>

          {/* Right Controls: Refresh, Theme Toggle, User Display */}
          <div className="topbar-right">
            {/* Live Data Refresh Button */}
            <button
              className={`topbar-btn ${isRefreshing ? 'spin-active' : ''}`}
              onClick={handleRefresh}
              title="Refresh ERP Data"
              aria-label="Refresh data"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            {/* Dark / Light Theme Toggle */}
            <button
              className="topbar-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? (
                // Sun Icon
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                // Moon Icon
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* User Name & Live Connection Dot */}
            <div className="topbar-user-badge">
              <div className="live-dot" />
              <span>{userName}</span>
            </div>
          </div>
        </header>

        {/* Content Area Rendering the Active Page */}
        <main className="shell-content-container">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
