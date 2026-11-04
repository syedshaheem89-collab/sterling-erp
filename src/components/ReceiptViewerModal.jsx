import React, { useEffect } from 'react';

/**
 * ReceiptViewerModal
 * High-definition lightbox modal for inspecting payment screenshots and receipts.
 */
export default function ReceiptViewerModal({
  isOpen,
  onClose,
  receiptUrl,
  studentName = 'Student',
  installmentSlot = 1,
  amount = 0,
  date = null,
  bank = '',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !receiptUrl) return null;

  const isPdf = typeof receiptUrl === 'string' && receiptUrl.toLowerCase().includes('.pdf');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(4, 6, 14, 0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          background: '#0B0F1C',
          border: '1px solid rgba(124, 111, 255, 0.35)',
          borderRadius: '18px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 229, 160, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#EDEFFA',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(148, 163, 225, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🧾</span>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Payment Receipt Proof
              </h3>
              <span
                style={{
                  background: 'rgba(0, 229, 160, 0.15)',
                  color: '#00E5A0',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                Installment #{installmentSlot}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#8E9BB5', marginTop: '3px' }}>
              Student: <strong style={{ color: '#fff' }}>{studentName}</strong>
              {bank ? ` • ${bank}` : ''}
              {amount > 0 ? ` • ₹${Number(amount).toLocaleString('en-IN')}` : ''}
              {date ? ` • ${date}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Download / Open in New Tab Button */}
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={`Payment_Proof_${studentName}_Slot_${installmentSlot}`}
              style={{
                background: 'rgba(54, 209, 220, 0.15)',
                border: '1px solid rgba(54, 209, 220, 0.35)',
                color: '#36D1DC',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>↗</span> Open Full
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(148, 163, 225, 0.2)',
                color: '#8E9BB5',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Image Preview Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.4)',
            minHeight: '280px',
          }}
        >
          {isPdf ? (
            <iframe
              src={receiptUrl}
              title="PDF Receipt"
              style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }}
            />
          ) : (
            <img
              src={receiptUrl}
              alt={`Payment Proof Installment #${installmentSlot}`}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '10px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(148, 163, 225, 0.15)',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid rgba(148, 163, 225, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#8E9BB5',
            background: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <span>Verified Payment Documentation</span>
          <span>Press ESC or click outside to close</span>
        </div>
      </div>
    </div>
  );
}
