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

// Error boundary to catch and display any rendering issue gracefully
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error caught by ErrorBoundary:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#080A12',
          color: '#EDEFFA',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(20, 25, 45, 0.9)',
            border: '1px solid rgba(255, 111, 142, 0.4)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FF6F8E', margin: 0 }}>
                Application Workspace Error
              </h2>
            </div>
            <p style={{ fontSize: '13.5px', color: '#A8B2C7', lineHeight: 1.6, marginBottom: '16px' }}>
              A component error occurred while rendering the workspace:
            </p>
            <pre style={{
              background: '#0e1220',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#FFB020',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              marginBottom: '20px',
              border: '1px solid rgba(255, 176, 32, 0.2)'
            }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #7C6FFF, #5B4FE0)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reload Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  flex: 1,
                  background: 'rgba(255, 111, 142, 0.15)',
                  color: '#FF6F8E',
                  border: '1px solid #FF6F8E',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Clear Cache & Sign Out
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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

  return (
    <ErrorBoundary>
      <Shell />
    </ErrorBoundary>
  );
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
