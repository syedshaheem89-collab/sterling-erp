import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * Login Component - Sterling ERP
 * 
 * Features:
 * - Ultra-modern Instagram-style animated dark canvas with radial gradients & floating mesh grid
 * - Smooth floating ambient orbs with organic keyframe float & scale cycles
 * - Glassmorphic login card with dynamic conic-gradient spinning ring around 🌍
 * - Fully managed email & password inputs with reveal/hide toggle
 * - 'Keep me signed in' persistent session control
 * - Real-time Supabase Auth authentication (no hardcoded credentials)
 * - Enter-to-submit support, loading spinners, and styled error notification banner
 */
export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const isSignup = mode === 'signup';

  const toggleMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setErrorMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSignup = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!fullName.trim() || !cleanEmail || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        toast.success('Account created. If email confirmation is on, check your inbox; otherwise you are signed in.', { duration: 7000 });
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (isSignup) {
      await handleSignup();
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        // As per requirements: on error show 'Invalid email or password'
        setErrorMessage('Invalid email or password');
      } else {
        // On success: auth context updates automatically via supabase.auth.onAuthStateChange listener
        // Session persistence is handled by Supabase client
      }
    } catch (err) {
      setErrorMessage('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-viewport">
      {/* Dynamic Keyframes & Component Scoped Styles */}
      <style>{`
        .login-viewport {
          position: relative;
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg, #080A12);
          overflow: hidden;
          padding: 24px 16px;
          font-family: var(--font, 'Plus Jakarta Sans', sans-serif);
          color: var(--text, #EDEFFA);
        }

        /* Animated Grid Pattern Background */
        .login-grid-bg {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(148, 163, 225, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 225, 0.05) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 80%);
          animation: gridPulse 8s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 1;
        }

        @keyframes gridPulse {
          0% {
            opacity: 0.45;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.02);
          }
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
        }

        /* Radial Gradient Ambient Aura */
        .login-aura-gradient {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 18% 25%, rgba(124, 111, 255, 0.22) 0%, transparent 45%),
            radial-gradient(circle at 82% 75%, rgba(244, 114, 182, 0.20) 0%, transparent 48%),
            radial-gradient(circle at 50% 50%, rgba(54, 209, 220, 0.12) 0%, transparent 55%);
          pointer-events: none;
          z-index: 2;
          filter: blur(40px);
          animation: auraShift 14s ease-in-out infinite alternate;
        }

        @keyframes auraShift {
          0% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.06);
          }
          100% {
            transform: translateY(15px) scale(0.98);
          }
        }

        /* Floating Orb Elements */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          z-index: 2;
          opacity: 0.65;
        }

        .orb-1 {
          width: 380px;
          height: 380px;
          top: -60px;
          left: -40px;
          background: linear-gradient(135deg, #7C6FFF 0%, #36D1DC 100%);
          animation: orbFloat1 18s ease-in-out infinite alternate;
        }

        .orb-2 {
          width: 420px;
          height: 420px;
          bottom: -100px;
          right: -60px;
          background: linear-gradient(135deg, #F472B6 0%, #A78BFA 100%);
          animation: orbFloat2 22s ease-in-out infinite alternate;
        }

        .orb-3 {
          width: 260px;
          height: 260px;
          top: 30%;
          right: 15%;
          background: linear-gradient(135deg, #36D1DC 0%, #00E5A0 100%);
          opacity: 0.4;
          animation: orbFloat3 16s ease-in-out infinite alternate;
        }

        .orb-4 {
          width: 280px;
          height: 280px;
          bottom: 15%;
          left: 12%;
          background: linear-gradient(135deg, #FFB020 0%, #FF6F8E 100%);
          opacity: 0.35;
          animation: orbFloat4 20s ease-in-out infinite alternate;
        }

        @keyframes orbFloat1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 80px) scale(1.12); }
          100% { transform: translate(-30px, 40px) scale(0.92); }
        }

        @keyframes orbFloat2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-70px, -60px) scale(1.08); }
          100% { transform: translate(40px, -30px) scale(0.95); }
        }

        @keyframes orbFloat3 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-45px, 50px) rotate(120deg); }
          100% { transform: translate(30px, -40px) rotate(240deg); }
        }

        @keyframes orbFloat4 {
          0% { transform: translate(0, 0) scale(0.9); }
          50% { transform: translate(50px, -45px) scale(1.15); }
          100% { transform: translate(-35px, 30px) scale(1); }
        }

        /* Glassmorphism Login Card */
        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: rgba(17, 22, 40, 0.72);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(148, 163, 225, 0.22);
          border-radius: 24px;
          padding: 40px 36px;
          box-shadow: 
            0 24px 60px -12px rgba(0, 0, 0, 0.7),
            0 0 40px -8px rgba(124, 111, 255, 0.22),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.12);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
            border-radius: 20px;
          }
        }

        /* Spinning Multi-stop Conic Gradient Ring */
        .logo-ring-wrapper {
          position: relative;
          width: 84px;
          height: 84px;
          margin: 0 auto 20px auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinning-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            #7C6FFF 0%,
            #36D1DC 25%,
            #00E5A0 45%,
            #FFB020 65%,
            #F472B6 85%,
            #7C6FFF 100%
          );
          animation: spinInfinite 4s linear infinite;
          padding: 3px;
          box-shadow: 0 0 24px rgba(124, 111, 255, 0.45);
        }

        @keyframes spinInfinite {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .logo-emblem-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #0d1222;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .logo-emoji {
          font-size: 38px;
          line-height: 1;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
          animation: emojiFloat 3s ease-in-out infinite alternate;
        }

        @keyframes emojiFloat {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-2px) scale(1.04); }
        }

        /* Typography */
        .brand-heading {
          text-align: center;
          margin-bottom: 28px;
        }

        .brand-name {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.025em;
          background: linear-gradient(135deg, #FFFFFF 30%, #CFD8F6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 4px;
        }

        .brand-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--blue, #7C6FFF);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .brand-subtitle {
          font-size: 12px;
          color: var(--muted, #A8B2C7);
          font-weight: 400;
          letter-spacing: 0.01em;
        }

        /* Form Controls */
        .form-group {
          margin-bottom: 18px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #CFD8F6;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--muted, #A8B2C7);
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .form-input {
          width: 100%;
          background: rgba(22, 27, 46, 0.75);
          border: 1px solid rgba(148, 163, 225, 0.18);
          border-radius: 12px;
          padding: 13px 44px 13px 42px;
          font-size: 14px;
          font-family: inherit;
          color: var(--text, #EDEFFA);
          outline: none;
          transition: all 0.2s ease;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25);
        }

        .form-input::placeholder {
          color: rgba(168, 178, 199, 0.45);
        }

        .form-input:focus {
          border-color: var(--blue, #7C6FFF);
          background: rgba(26, 33, 56, 0.9);
          box-shadow: 
            0 0 0 3px rgba(124, 111, 255, 0.25),
            inset 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .form-input:focus ~ .input-icon {
          color: var(--blue, #7C6FFF);
        }

        .password-toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--muted, #A8B2C7);
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.15s ease;
        }

        .password-toggle-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        /* Checkbox & Helpers */
        .form-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 14px;
          margin-bottom: 24px;
          font-size: 13px;
        }

        .checkbox-container {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          cursor: pointer;
          user-select: none;
          color: var(--text, #EDEFFA);
        }

        .custom-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1.5px solid rgba(148, 163, 225, 0.35);
          background: rgba(22, 27, 46, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .custom-checkbox.checked {
          background: linear-gradient(135deg, var(--blue, #7C6FFF) 0%, #9065ff 100%);
          border-color: var(--blue, #7C6FFF);
          box-shadow: 0 0 10px rgba(124, 111, 255, 0.45);
        }

        .checkbox-check-icon {
          width: 12px;
          height: 12px;
          color: #ffffff;
        }

        .forgot-link {
          color: var(--muted, #A8B2C7);
          text-decoration: none;
          font-size: 12px;
          transition: color 0.2s ease;
        }

        .forgot-link:hover {
          color: var(--cyan, #36D1DC);
          text-decoration: underline;
        }

        /* Error Banner */
        .error-banner {
          background: rgba(255, 111, 142, 0.14);
          border: 1px solid rgba(255, 111, 142, 0.35);
          color: #FFB3C3;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: shakeIn 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes shakeIn {
          0% { transform: translateY(-6px); opacity: 0; }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          100% { transform: translateY(0); opacity: 1; }
        }

        /* Login Button */
        .btn-submit-login {
          width: 100%;
          background: linear-gradient(135deg, #7C6FFF 0%, #8E78FF 40%, #D946EF 100%);
          border: none;
          color: #ffffff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 14px 20px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 
            0 8px 24px -4px rgba(124, 111, 255, 0.5),
            0 0 16px 0 rgba(217, 70, 239, 0.25);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .btn-submit-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 
            0 12px 30px -4px rgba(124, 111, 255, 0.65),
            0 0 24px 0 rgba(217, 70, 239, 0.4);
          filter: brightness(1.06);
        }

        .btn-submit-login:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-submit-login:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          filter: grayscale(20%);
        }

        /* Loading Spinner */
        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer System Badge */
        .card-footer {
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid rgba(148, 163, 225, 0.12);
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          color: var(--muted, #A8B2C7);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--green, #00E5A0);
          box-shadow: 0 0 8px var(--green, #00E5A0);
          animation: pulseDot 2s infinite;
        }

        @keyframes pulseDot {
          0% { transform: scale(0.95); box-shadow: 0 0 4px var(--green); }
          50% { transform: scale(1.15); box-shadow: 0 0 10px var(--green); }
          100% { transform: scale(0.95); box-shadow: 0 0 4px var(--green); }
        }
      `}</style>

      {/* Background Ambience & Animated Elements */}
      <div className="login-grid-bg" />
      <div className="login-aura-gradient" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />

      {/* Main Glassmorphic Login Card */}
      <div className="login-card">
        {/* Animated Conic-Gradient Ring with 🌍 */}
        <div className="logo-ring-wrapper">
          <div className="spinning-ring" />
          <div className="logo-emblem-inner">
            <span className="logo-emoji" role="img" aria-label="Global Earth">
              🌍
            </span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="brand-heading">
          <h1 className="brand-name">Sterling Study Abroad</h1>
          <div className="brand-title">ERP Management System</div>
          <p className="brand-subtitle">Multi-company &bull; Role-based &bull; Real-time</p>
        </div>

        {/* Error Message Div */}
        {errorMessage && (
          <div className="error-banner" role="alert">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <div className="form-group">
              <label className="form-label" htmlFor="sterling-fullname">Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="sterling-fullname"
                  type="text"
                  className="form-input"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); if (errorMessage) setErrorMessage(''); }}
                  onKeyDown={handleKeyDown}
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            </div>
          )}
          {/* Work Email Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="sterling-email">
              Work Email Address
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                id="sterling-email"
                type="email"
                className="form-input"
                placeholder="name@sterling-edu.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                onKeyDown={handleKeyDown}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="sterling-password">
              Password
            </label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="sterling-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {isSignup && (
            <div className="form-group">
              <label className="form-label" htmlFor="sterling-confirm">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="sterling-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (errorMessage) setErrorMessage(''); }}
                  onKeyDown={handleKeyDown}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Options Row: Keep Signed In & Help */}
          <div className="form-options-row" style={isSignup ? { display: 'none' } : undefined}>
            <label
              className="checkbox-container"
              onClick={() => setKeepSignedIn(!keepSignedIn)}
            >
              <div className={`custom-checkbox ${keepSignedIn ? 'checked' : ''}`}>
                {keepSignedIn && (
                  <svg
                    className="checkbox-check-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span>Keep me signed in</span>
            </label>

            <span
              className="forgot-link"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                alert('Please contact your Sterling ERP System Administrator to reset your security credentials.');
              }}
            >
              Need help?
            </span>
          </div>

          {/* Submit Button with Loading State */}
          <button
            type="submit"
            className="btn-submit-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>{isSignup ? 'Creating account...' : 'Authenticating...'}</span>
              </>
            ) : (
              <>
                <span>{isSignup ? 'Create Account' : 'Sign In to ERP'}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: isSignup ? '18px' : '16px', fontSize: '13px', color: 'var(--muted, #A8B2C7)' }}>
            {isSignup ? 'Already have an account? ' : 'Invited by your company? '}
            <span
              className="forgot-link"
              style={{ cursor: 'pointer', color: 'var(--cyan, #36D1DC)', fontSize: '13px', fontWeight: 600 }}
              onClick={toggleMode}
            >
              {isSignup ? 'Sign in' : 'Create account'}
            </span>
          </div>
        </form>

        {/* Card Footer: Multi-tenant Security Indicator */}
        <div className="card-footer">
          <div className="status-dot" />
          <span>Supabase Enterprise Auth &bull; 256-bit SSL</span>
        </div>
      </div>
    </div>
  );
}
