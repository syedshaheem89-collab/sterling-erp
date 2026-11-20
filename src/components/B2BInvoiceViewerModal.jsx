import React, { useEffect } from 'react';

/**
 * B2BInvoiceViewerModal
 * Lightbox modal to inspect, review, and download attached B2B Partner bills/invoices.
 * Displays official "PAID & SETTLED" seal watermark overlay when the payment has been disbursed!
 */
export default function B2BInvoiceViewerModal({
  isOpen,
  onClose,
  payment,
  onRemoveInvoice,
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

  if (!isOpen || !payment) return null;

  const isCompleted = payment.status === 'completed';
  const fileName = payment.invoice_file_name || 'B2B_Vendor_Invoice.pdf';
  const fileData = payment.invoice_file_data || '';
  const isImage = fileData.startsWith('data:image/') || fileName.match(/\.(png|jpe?g|webp|gif)$/i);
  const isPdf = fileData.startsWith('data:application/pdf') || fileName.match(/\.pdf$/i);

  const handleDownload = () => {
    if (!fileData) return;
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFull = () => {
    if (!fileData) return;
    if (fileData.startsWith('data:')) {
      try {
        const arr = fileData.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (e) {
        window.open(fileData, '_blank');
      }
    } else {
      window.open(fileData, '_blank');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2200,
        background: 'rgba(5, 7, 15, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '94vh',
          background: 'var(--bg2solid, #0B0F1C)',
          border: '1px solid var(--border-strong, rgba(124, 111, 255, 0.35))',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--text, #EDEFFA)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(148, 163, 225, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📎</span>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0 }}>
                B2B Vendor Invoice
              </h3>
              {isCompleted ? (
                <span
                  style={{
                    background: 'rgba(5, 150, 105, 0.15)',
                    color: '#34D399',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ✓ Settled & Paid
                </span>
              ) : (
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#FBBF24',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ⏳ Pending Payment
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
              Partner: <strong style={{ color: '#fff' }}>{payment.partner_name}</strong>
              {payment.student_names ? ` • Students: ${payment.student_names}` : ''}
              {payment.amount ? ` • ${payment.currency === 'INR' ? '₹' : payment.currency} ${Number(payment.amount).toLocaleString()}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {fileData && (
              <>
                <button
                  type="button"
                  onClick={handleOpenFull}
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    color: '#60A5FA',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#34D399',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📥 Download
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body / Document Preview Canvas */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#04060E',
            position: 'relative',
            minHeight: '420px',
          }}
        >
          {/* If the payment is completed, stamp the official PAID SEAL across the invoice! */}
          {isCompleted && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '40px',
                border: '4px dashed #059669',
                color: '#059669',
                padding: '12px 20px',
                borderRadius: '14px',
                textAlign: 'center',
                fontWeight: 900,
                transform: 'rotate(-10deg)',
                background: 'rgba(240, 253, 244, 0.95)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(5, 150, 105, 0.2)',
                zIndex: 30,
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                STERLING OVERSEAS
              </div>
              <div style={{ fontSize: '24px', letterSpacing: '2px', margin: '2px 0' }}>
                ★ PAID & SETTLED ★
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700 }}>
                DATE: {payment.settled_at || 'VERIFIED'}
              </div>
              {payment.utr_number && (
                <div style={{ fontSize: '10px', fontWeight: 600, marginTop: '2px' }}>
                  UTR: {payment.utr_number}
                </div>
              )}
            </div>
          )}

          {fileData ? (
            isImage ? (
              <img
                src={fileData}
                alt={fileName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              />
            ) : isPdf ? (
              <iframe
                src={fileData}
                title="B2B Invoice PDF"
                style={{
                  width: '100%',
                  height: '75vh',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#fff',
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{fileName}</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>Uploaded vendor invoice file</div>
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    background: '#4F46E5',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Download File
                </button>
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>📄</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>No invoice preview available</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(148, 163, 225, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
            fontSize: '12px',
          }}
        >
          <div style={{ color: '#94A3B8' }}>
            File: <strong style={{ color: '#fff' }}>{fileName}</strong>
            {payment.invoice_uploaded_at ? ` • Uploaded: ${new Date(payment.invoice_uploaded_at).toLocaleDateString()}` : ''}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onRemoveInvoice && (
              <button
                type="button"
                onClick={() => onRemoveInvoice(payment.id)}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Remove Invoice
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#EDEFFA',
                padding: '5px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
