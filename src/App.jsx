import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Shell from './pages/Shell';

// Centered inline loading screen with Sterling ERP brand emblem and glowing spinner
function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading Sterling ERP">
      <div className="loading-logo">
        <div className="loading-logo-inner">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '4px' }}>
          Sterling ERP
        </h2>
        <p className="loading-text">
          Securing workspace...
        </p>
      </div>

      <div className="spinner" style={{ marginTop: '8px' }} />
    </div>
  );
}

// Internal auth-aware component router
function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  return <Shell />;
}

// Master App Component with Context and Toast notification providers
export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'rgba(20, 25, 45, 0.94)',
            color: '#EDEFFA',
            border: '1px solid rgba(148, 163, 225, 0.22)',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: 600,
            boxShadow: '0 14px 34px rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
          success: {
            iconTheme: {
              primary: '#00E5A0',
              secondary: '#080A12',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF6F8E',
              secondary: '#080A12',
            },
          },
        }}
      />
      <AppInner />
    </AuthProvider>
  );
}
