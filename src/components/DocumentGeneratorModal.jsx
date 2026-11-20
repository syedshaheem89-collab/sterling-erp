import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * DocumentGeneratorModal
 * Enterprise SAP-grade Invoice & Remittance Receipt Generator
 * 
 * Generates:
 * 1. Dubai Student Service Fee Invoice (based on WIO Bank UAE template)
 * 2. B2B Payment Disbursement Voucher & Remittance Receipt with official "PAID & SETTLED" seal stamp
 * 
 * Both rendered seamlessly on the official Sterling Letterhead.
 */

export default function DocumentGeneratorModal({
  isOpen,
  onClose,
  initialMode = 'dubai_invoice', // 'dubai_invoice' | 'b2b_receipt'
  studentData = null,
  b2bPaymentData = null,
}) {
  const [mode, setMode] = useState(initialMode);
  const [includeLetterheadBg, setIncludeLetterheadBg] = useState(true);
  const [showPaidSeal, setShowPaidSeal] = useState(true);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const printContainerRef = useRef(null);

  // --- 1. STUDENT DUBAI INVOICE STATE (WIO Bank Abu Dhabi Template) ---
  const [studentInvoice, setStudentInvoice] = useState({
    invoiceNumber: 'INV-2026-081',
    invoiceDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    dueDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    studentName: 'JOICE SAMUEL',
    studentAddress: 'INDIA',
    terms: 'Due on date',
    currency: 'USD',
    items: [
      {
        id: 1,
        description: 'Administration Service Fee',
        quantity: 1,
        unitPrice: 1000,
        taxPercent: 0,
        amount: 1000,
      },
    ],
    subTotal: 1000,
    taxTotal: 0,
    grandTotal: 1000,
    bankDetails: {
      accountHolder: 'Sterling Overseas Consultancy LLC',
      businessId: 'WIOBAEADXXX',
      bankName: 'WIO BANK',
      address: 'Etihad Airways Centre 5th Floor, Abu Dhabi, UAE',
      accountNumber: 'AE620860000009569370024',
      iban: 'AE620860000009569370024',
      swiftCode: 'WIOBAEADXXX',
    },
    footerNote: 'Note: Please note that the transfer fee of the banks are not included in this fee!',
  });

  // --- 2. B2B PAYMENT REMITTANCE RECEIPT STATE (with PAID Seal) ---
  const [b2bReceipt, setB2BReceipt] = useState({
    receiptNumber: 'REC-B2B-2026-019',
    voucherDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    settledDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    partnerName: 'Consult Fox Edutech Pvt Ltd',
    studentNames: 'Thejus & Nivil',
    purpose: 'B2B Sub-Agent Admission Commission & University Coordination',
    currency: 'INR',
    baseAmount: 152542,
    gstRate: 18,
    gstAmount: 27458,
    totalDisbursed: 180000,
    paymentMode: 'Bank Transfer (IMPS / NEFT)',
    utrNumber: 'HDFC638291048291',
    transferAccount: 'HDFC Bank A/C: 50200038291048 | IFSC: HDFC0000240 | Beneficiary: Consult Fox Edutech Pvt Ltd',
    debitAccount: 'Sterling Overseas Consultancy Operating A/C',
    authorizedSignatory: 'Accounts Department - Sterling Overseas',
    status: 'PAID',
    remarks: 'Full settlement disbursed and cleared as per contract agreement.',
  });

  // Populate data when props or mode change
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (studentData) {
      const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
      const feeAmount = Number(studentData.service_fee || studentData.total_fee || studentData.amount || 1000);
      const feeCurr = studentData.currency || (studentData.destination === 'Europe' ? 'EUR' : 'USD');
      
      setStudentInvoice((prev) => ({
        ...prev,
        invoiceNumber: `INV-DXB-${new Date().getFullYear()}-${String(studentData.id || Math.floor(100 + Math.random() * 900)).padStart(3, '0')}`,
        invoiceDate: todayStr,
        dueDate: todayStr,
        studentName: (studentData.name || studentData.student_name || 'STUDENT NAME').toUpperCase(),
        studentAddress: (studentData.country || studentData.nationality || studentData.state || 'INDIA').toUpperCase(),
        currency: feeCurr,
        items: [
          {
            id: 1,
            description: `Administration Service Fee - ${studentData.course || 'Higher Education Consultation'}`,
            quantity: 1,
            unitPrice: feeAmount,
            taxPercent: 0,
            amount: feeAmount,
          },
        ],
        subTotal: feeAmount,
        grandTotal: feeAmount,
      }));
    }
  }, [studentData]);

  useEffect(() => {
    if (b2bPaymentData) {
      const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
      const settledStr = b2bPaymentData.settled_at 
        ? new Date(b2bPaymentData.settled_at).toLocaleDateString('en-GB').replace(/\//g, '.')
        : todayStr;

      const curr = b2bPaymentData.currency || 'INR';
      const tot = Number(b2bPaymentData.amount || 0);
      const isDomestic = curr === 'INR';
      const gstRate = isDomestic && b2bPaymentData.is_gst_applicable !== false ? 18 : 0;
      let base = tot;
      let gst = 0;

      if (gstRate > 0) {
        if (b2bPaymentData.gst_type === 'exclusive') {
          base = tot;
          gst = Math.round(tot * 0.18);
        } else {
          base = Math.round(tot / 1.18);
          gst = tot - base;
        }
      }

      setB2BReceipt({
        receiptNumber: `REC-B2B-${new Date().getFullYear()}-${String(b2bPaymentData.id || Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`,
        voucherDate: todayStr,
        settledDate: settledStr,
        partnerName: b2bPaymentData.partner_name || 'B2B Partner Company',
        studentNames: b2bPaymentData.student_names || 'Student Referral Services',
        purpose: b2bPaymentData.category ? `${b2bPaymentData.category} Settlement` : 'B2B Sub-Agent Commission & University Processing',
        currency: curr,
        baseAmount: base,
        gstRate: gstRate,
        gstAmount: gst,
        totalDisbursed: base + gst,
        paymentMode: b2bPaymentData.payment_mode || 'Bank Transfer (IMPS / NEFT)',
        utrNumber: b2bPaymentData.utr_number || `UTR/${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        transferAccount: b2bPaymentData.transfer_account || 'Partner Bank Account',
        debitAccount: 'Sterling Overseas Consultancy Operating A/C',
        authorizedSignatory: 'Accounts Department - Sterling Overseas',
        status: b2bPaymentData.status === 'completed' ? 'PAID' : 'SETTLED',
        remarks: b2bPaymentData.notes || 'Full payment settled and confirmed through electronic fund transfer.',
      });
    }
  }, [b2bPaymentData]);

  if (!isOpen) return null;

  // Recalculate Student Invoice totals
  const handleItemChange = (index, field, value) => {
    setStudentInvoice((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      const qty = Number(newItems[index].quantity) || 1;
      const unit = Number(newItems[index].unitPrice) || 0;
      newItems[index].amount = qty * unit;

      const sub = newItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      const grand = sub; // Tax 0%

      return {
        ...prev,
        items: newItems,
        subTotal: sub,
        grandTotal: grand,
      };
    });
  };

  // Add Item to Student Invoice
  const handleAddItem = () => {
    setStudentInvoice((prev) => {
      const nextId = prev.items.length + 1;
      const newItems = [
        ...prev.items,
        {
          id: nextId,
          description: 'Document Processing / Visa Guidance',
          quantity: 1,
          unitPrice: 200,
          taxPercent: 0,
          amount: 200,
        },
      ];
      const sub = newItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      return {
        ...prev,
        items: newItems,
        subTotal: sub,
        grandTotal: sub,
      };
    });
  };

  // Remove Item
  const handleRemoveItem = (index) => {
    if (studentInvoice.items.length <= 1) {
      toast.error('Invoice must contain at least one line item');
      return;
    }
    setStudentInvoice((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const sub = newItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      return {
        ...prev,
        items: newItems,
        subTotal: sub,
        grandTotal: sub,
      };
    });
  };

  // --- PRINT / DOWNLOAD PDF HANDLER ---
  const handlePrint = () => {
    const printArea = printContainerRef.current;
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print or save PDF.');
      return;
    }

    const docTitle = mode === 'dubai_invoice'
      ? `Sterling_Invoice_${studentInvoice.invoiceNumber}_${studentInvoice.studentName.replace(/\s+/g, '_')}`
      : `Sterling_Receipt_${b2bReceipt.receiptNumber}_${b2bReceipt.partnerName.replace(/\s+/g, '_')}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #111827;
              display: flex;
              justify-content: center;
            }
            .a4-sheet {
              width: 210mm;
              min-height: 297mm;
              height: 297mm;
              position: relative;
              padding: 50mm 18mm 25mm 18mm;
              background-color: #ffffff;
              ${includeLetterheadBg ? "background-image: url('/sterling-letterhead.jpg'); background-size: 100% 100%; background-repeat: no-repeat;" : ''}
              overflow: hidden;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid #111827;
              padding: 6px 10px;
              font-size: 12px;
            }
            .rubber-stamp {
              position: absolute;
              bottom: 45mm;
              right: 25mm;
              border: 3.5px dashed #059669;
              color: #059669;
              padding: 10px 16px;
              border-radius: 12px;
              text-align: center;
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-weight: 800;
              transform: rotate(-6deg);
              background: rgba(240, 253, 244, 0.85);
              box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.15);
              z-index: 50;
            }
          </style>
        </head>
        <body>
          <div class="a4-sheet">
            ${printArea.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2200,
        background: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '98%',
          maxWidth: '1240px',
          height: '94vh',
          maxHeight: '96vh',
          background: 'var(--bg2solid, #0B0F1C)',
          borderRadius: '16px',
          border: '1px solid var(--border-strong, rgba(124, 111, 255, 0.35))',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--text, #EDEFFA)',
        }}
      >
        {/* TOP BAR / CONTROLS */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(148, 163, 225, 0.15)',
            background: 'var(--bg1, #080A12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Left: Document Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📄</span>
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px' }}>
              <button
                type="button"
                onClick={() => setMode('dubai_invoice')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mode === 'dubai_invoice' ? '#4F46E5' : 'transparent',
                  color: mode === 'dubai_invoice' ? '#fff' : '#94A3B8',
                  transition: 'all 0.15s ease',
                }}
              >
                🇦🇪 Student Dubai Invoice
              </button>
              <button
                type="button"
                onClick={() => setMode('b2b_receipt')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mode === 'b2b_receipt' ? '#059669' : 'transparent',
                  color: mode === 'b2b_receipt' ? '#fff' : '#94A3B8',
                  transition: 'all 0.15s ease',
                }}
              >
                🧾 B2B Remittance Receipt (PAID Seal)
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Toggle Letterhead BG */}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#CBD5E1',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              title="Toggle full Sterling letterhead artwork"
            >
              <input
                type="checkbox"
                checked={includeLetterheadBg}
                onChange={(e) => setIncludeLetterheadBg(e.target.checked)}
              />
              <span>Letterhead Artwork</span>
            </label>

            {mode === 'b2b_receipt' && (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#CBD5E1',
                  cursor: 'pointer',
                  background: 'rgba(5, 150, 105, 0.15)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(5, 150, 105, 0.3)',
                }}
                title="Toggle official green PAID rubber seal stamp"
              >
                <input
                  type="checkbox"
                  checked={showPaidSeal}
                  onChange={(e) => setShowPaidSeal(e.target.checked)}
                />
                <span style={{ color: '#34D399', fontWeight: 600 }}>PAID Seal Stamp</span>
              </label>
            )}

            {/* Toggle Edit Controls Drawer */}
            <button
              type="button"
              onClick={() => setShowEditDrawer(!showEditDrawer)}
              style={{
                background: showEditDrawer ? '#3B82F6' : 'rgba(59, 130, 246, 0.15)',
                color: showEditDrawer ? '#fff' : '#60A5FA',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>✏️</span>
              <span>{showEditDrawer ? 'Hide Edit Fields' : 'Edit Fields'}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#10B981',
                color: '#fff',
                border: 'none',
                padding: '7px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <span>🖨️</span>
              <span>Print / Save as PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#94A3B8',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* WORKSPACE AREA: EDIT DRAWER (LEFT) + A4 PREVIEW (RIGHT) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* EDIT FORM DRAWER (Expandable) */}
          {showEditDrawer && (
            <div
              style={{
                width: '360px',
                background: 'var(--bg1, #080A12)',
                borderRight: '1px solid rgba(148, 163, 225, 0.15)',
                padding: '16px',
                overflowY: 'auto',
                fontSize: '12.5px',
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#fff' }}>
                {mode === 'dubai_invoice' ? 'Edit Dubai Invoice Data' : 'Edit B2B Receipt Data'}
              </h4>

              {mode === 'dubai_invoice' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Invoice #</label>
                    <input
                      type="text"
                      value={studentInvoice.invoiceNumber}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, invoiceNumber: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Date</label>
                      <input
                        type="text"
                        value={studentInvoice.invoiceDate}
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, invoiceDate: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Due On</label>
                      <input
                        type="text"
                        value={studentInvoice.dueDate}
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, dueDate: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Bill TO (Student Name)</label>
                    <input
                      type="text"
                      value={studentInvoice.studentName}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, studentName: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Address / Country</label>
                    <input
                      type="text"
                      value={studentInvoice.studentAddress}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, studentAddress: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Currency</label>
                    <select
                      value={studentInvoice.currency}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, currency: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>

                  {/* Line Items */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ color: '#94A3B8', fontWeight: 600 }}>Invoice Line Items</label>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        + Add Item
                      </button>
                    </div>

                    {studentInvoice.items.map((it, idx) => (
                      <div key={it.id || idx} style={{ background: '#131B2E', padding: '8px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #232E48' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#A5B4FC' }}>Item #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ✕
                          </button>
                        </div>
                        <input
                          type="text"
                          value={it.description}
                          placeholder="Description"
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', marginBottom: '4px' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <input
                            type="number"
                            value={it.quantity}
                            placeholder="Qty"
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff' }}
                          />
                          <input
                            type="number"
                            value={it.unitPrice}
                            placeholder="Unit Price"
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bank Details Editor */}
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>WIO Bank UAE Details</label>
                    <input
                      type="text"
                      value={studentInvoice.bankDetails.accountHolder}
                      placeholder="Account Holder"
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, bankDetails: { ...studentInvoice.bankDetails, accountHolder: e.target.value } })}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', marginBottom: '4px' }}
                    />
                    <input
                      type="text"
                      value={studentInvoice.bankDetails.accountNumber}
                      placeholder="Account No / IBAN"
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, bankDetails: { ...studentInvoice.bankDetails, accountNumber: e.target.value, iban: e.target.value } })}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', marginBottom: '4px' }}
                    />
                    <input
                      type="text"
                      value={studentInvoice.bankDetails.swiftCode}
                      placeholder="SWIFT Code"
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, bankDetails: { ...studentInvoice.bankDetails, swiftCode: e.target.value } })}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>
                </div>
              ) : (
                /* B2B Receipt Edit Form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Voucher / Receipt #</label>
                    <input
                      type="text"
                      value={b2bReceipt.receiptNumber}
                      onChange={(e) => setB2BReceipt({ ...b2bReceipt, receiptNumber: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Date</label>
                      <input
                        type="text"
                        value={b2bReceipt.voucherDate}
                        onChange={(e) => setB2BReceipt({ ...b2bReceipt, voucherDate: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Settled Date</label>
                      <input
                        type="text"
                        value={b2bReceipt.settledDate}
                        onChange={(e) => setB2BReceipt({ ...b2bReceipt, settledDate: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>B2B Beneficiary Partner</label>
                    <input
                      type="text"
                      value={b2bReceipt.partnerName}
                      onChange={(e) => setB2BReceipt({ ...b2bReceipt, partnerName: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Student(s) Linked</label>
                    <input
                      type="text"
                      value={b2bReceipt.studentNames}
                      onChange={(e) => setB2BReceipt({ ...b2bReceipt, studentNames: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Currency</label>
                      <select
                        value={b2bReceipt.currency}
                        onChange={(e) => setB2BReceipt({ ...b2bReceipt, currency: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>GST Rate (%)</label>
                      <input
                        type="number"
                        value={b2bReceipt.gstRate}
                        onChange={(e) => {
                          const rate = Number(e.target.value) || 0;
                          const gst = Math.round((b2bReceipt.baseAmount * rate) / 100);
                          setB2BReceipt({
                            ...b2bReceipt,
                            gstRate: rate,
                            gstAmount: gst,
                            totalDisbursed: b2bReceipt.baseAmount + gst,
                          });
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Base Amount</label>
                      <input
                        type="number"
                        value={b2bReceipt.baseAmount}
                        onChange={(e) => {
                          const b = Number(e.target.value) || 0;
                          const gst = Math.round((b * b2bReceipt.gstRate) / 100);
                          setB2BReceipt({
                            ...b2bReceipt,
                            baseAmount: b,
                            gstAmount: gst,
                            totalDisbursed: b + gst,
                          });
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Total Disbursed</label>
                      <input
                        type="number"
                        value={b2bReceipt.totalDisbursed}
                        readOnly
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #2B3A5A', color: '#34D399', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Bank UTR / Transaction Ref</label>
                    <input
                      type="text"
                      value={b2bReceipt.utrNumber}
                      onChange={(e) => setB2BReceipt({ ...b2bReceipt, utrNumber: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Payment Mode</label>
                    <input
                      type="text"
                      value={b2bReceipt.paymentMode}
                      onChange={(e) => setB2BReceipt({ ...b2bReceipt, paymentMode: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Credited To (Account)</label>
                    <textarea
                      rows={2}
                      value={b2bReceipt.transferAccount}
                      onChange={(e) => setB2BReceipt({ ...b2bReceipt, transferAccount: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENT PREVIEW CONTAINER (CENTERED A4 CANVAS) */}
          <div
            style={{
              flex: 1,
              background: '#04060E',
              overflowY: 'auto',
              padding: '28px 16px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {/* A4 CANVAS SIMULATION */}
            <div
              style={{
                width: '794px', // 210mm at 96 DPI
                minHeight: '1123px', // 297mm at 96 DPI
                backgroundColor: '#ffffff',
                color: '#111827',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)',
                borderRadius: '2px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                lineHeight: 1.45,
                backgroundImage: includeLetterheadBg ? "url('/sterling-letterhead.jpg')" : 'none',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                padding: '175px 50px 75px 50px', // Exact space for letterhead top header & bottom footer
              }}
            >
              {/* PRINT CONTENT REF */}
              <div ref={printContainerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                
                {/* ======================================================== */}
                {/* 1. DUBAI STUDENT INVOICE (WIO Bank Layout) */}
                {/* ======================================================== */}
                {mode === 'dubai_invoice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      {/* Top Entity & Title */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A', letterSpacing: '-0.2px' }}>
                            Sterling Overseas Consultancy LLC
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600, letterSpacing: '0.5px' }}>
                            WIOBAEADXXX
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#0F172A', letterSpacing: '1px' }}>
                            INVOICE
                          </h1>
                        </div>
                      </div>

                      {/* 2-Column Meta Table (Bill TO & Invoice Details) */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '22px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #0F172A', padding: '9px 12px', width: '52%', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                                Bill TO:
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.2px' }}>
                                {studentInvoice.studentName}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '9px 12px', width: '48%', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>Invoice #:</span>
                                <span style={{ fontWeight: 800, color: '#0F172A' }}>{studentInvoice.invoiceNumber}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #0F172A', padding: '9px 12px', verticalAlign: 'top' }}>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>Address: </span>
                              <span style={{ fontWeight: 600, color: '#334155' }}>{studentInvoice.studentAddress}</span>
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '9px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>Date:</span>
                                <span style={{ fontWeight: 600, color: '#334155' }}>{studentInvoice.invoiceDate}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #0F172A', padding: '9px 12px', verticalAlign: 'top' }}>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>Terms: </span>
                              <span style={{ fontWeight: 600, color: '#334155' }}>{studentInvoice.terms}</span>
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '9px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>Due On:</span>
                                <span style={{ fontWeight: 600, color: '#334155' }}>{studentInvoice.dueDate}</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Line Items Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                        <thead>
                          <tr style={{ background: '#E2E8F0' }}>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'center', width: '48px', fontWeight: 800 }}>Item</th>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'left', fontWeight: 800 }}>Description</th>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'center', width: '70px', fontWeight: 800 }}>Quantity</th>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'right', width: '110px', fontWeight: 800 }}>Unit Price</th>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'center', width: '70px', fontWeight: 800 }}>Tax (%)</th>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'right', width: '110px', fontWeight: 800 }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentInvoice.items.map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td style={{ border: '1.5px solid #0F172A', padding: '10px 10px', textAlign: 'center', fontWeight: 700 }}>
                                {idx + 1}
                              </td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '10px 10px', fontStyle: 'italic', fontWeight: 500 }}>
                                {it.description}
                              </td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                                {it.quantity}
                              </td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>
                                {Number(it.unitPrice).toLocaleString()} {studentInvoice.currency}
                              </td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                                {it.taxPercent.toFixed(2)}
                              </td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '10px 10px', textAlign: 'right', fontWeight: 700 }}>
                                {Number(it.amount).toLocaleString()} {studentInvoice.currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals Section */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '22px' }}>
                        <div style={{ width: '280px', fontSize: '13px', lineHeight: 1.8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span>Sub Total:</span>
                            <span>{Number(studentInvoice.subTotal).toLocaleString()} {studentInvoice.currency}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span>Total (Tax):</span>
                            <span>0.00</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px', borderTop: '1.5px solid #0F172A', paddingTop: '4px', marginTop: '4px' }}>
                            <span>Total:</span>
                            <span>{Number(studentInvoice.grandTotal).toLocaleString()} {studentInvoice.currency}</span>
                          </div>
                        </div>
                      </div>

                      {/* Official WIO Bank Details Table */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontWeight: 800, fontSize: '12px', fontStyle: 'italic', marginBottom: '4px', color: '#0F172A' }}>
                          Bank Details:
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', width: '32%', fontWeight: 700 }}>Account Holder:</td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 700 }}>{studentInvoice.bankDetails.accountHolder}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 700 }}>Business Identification No:</td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 600 }}>{studentInvoice.bankDetails.businessId}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 700 }}>Bank Name:</td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 700, color: '#047857' }}>{studentInvoice.bankDetails.bankName}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 700 }}>Address:</td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 500 }}>{studentInvoice.bankDetails.address}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 700 }}>Account No:</td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 800, letterSpacing: '0.5px' }}>{studentInvoice.bankDetails.accountNumber}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 700 }}>IBAN:</td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 800, letterSpacing: '0.5px' }}>{studentInvoice.bankDetails.iban}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 700 }}>SWIFT Code:</td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '5px 10px', fontWeight: 800, letterSpacing: '0.5px' }}>{studentInvoice.bankDetails.swiftCode}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Note */}
                      <div style={{ fontSize: '11px', color: '#334155', fontStyle: 'italic', fontWeight: 500 }}>
                        {studentInvoice.footerNote}
                      </div>
                    </div>

                    {/* Authorized Signature Block */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px' }}>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>
                        This is an official computer generated tax invoice issued by Sterling Overseas Consultancy LLC.
                      </div>
                      <div style={{ textAlign: 'center', width: '220px' }}>
                        <div style={{ height: '36px', borderBottom: '1.5px solid #0F172A', marginBottom: '6px' }}></div>
                        <div style={{ fontWeight: 800, fontSize: '11px', color: '#0F172A' }}>Sterling Overseas Consultancy LLC</div>
                        <div style={{ fontSize: '10px', color: '#475569' }}>Authorized Signatory</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* 2. B2B REMITTANCE RECEIPT (with Official PAID Seal) */}
                {/* ======================================================== */}
                {mode === 'b2b_receipt' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', position: 'relative' }}>
                    <div>
                      {/* Top Entity & Title */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                            Sterling Study Abroad & Overseas Consultancy
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                            Central Accounts & Disbursements Division
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0F172A', letterSpacing: '0.5px' }}>
                            PAYMENT REMITTANCE RECEIPT
                          </h2>
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                            SETTLEMENT & DISBURSEMENT VOUCHER
                          </div>
                        </div>
                      </div>

                      {/* Metadata Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #0F172A', padding: '8px 12px', width: '52%', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>PAID TO / BENEFICIARY:</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                                {b2bReceipt.partnerName}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '8px 12px', width: '48%', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700 }}>Voucher / Receipt #:</span>
                                <span style={{ fontWeight: 800, color: '#0F172A' }}>{b2bReceipt.receiptNumber}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #0F172A', padding: '8px 12px', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>FOR STUDENT(S):</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                                {b2bReceipt.studentNames}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '8px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700 }}>Payment Settled Date:</span>
                                <span style={{ fontWeight: 700, color: '#059669' }}>{b2bReceipt.settledDate}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #0F172A', padding: '8px 12px', verticalAlign: 'top' }}>
                              <span style={{ fontWeight: 700 }}>Purpose: </span>
                              <span style={{ fontWeight: 500, color: '#334155' }}>{b2bReceipt.purpose}</span>
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '8px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700 }}>Payment Status:</span>
                                <span style={{ fontWeight: 800, color: '#059669' }}>✓ SETTLED & PAID</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Transaction Audit Execution Box */}
                      <div style={{ border: '1.5px solid #0F172A', background: '#F8FAFC', padding: '10px 14px', borderRadius: '4px', marginBottom: '18px' }}>
                        <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#0F172A', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          🏦 Electronic Fund Transfer & Remittance Audit
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                          <div>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Payment Mode: </span>
                            <strong style={{ color: '#0F172A' }}>{b2bReceipt.paymentMode}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Bank UTR / Transaction Ref: </span>
                            <strong style={{ color: '#047857', letterSpacing: '0.5px' }}>{b2bReceipt.utrNumber}</strong>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Credited Beneficiary Account: </span>
                            <strong style={{ color: '#0F172A' }}>{b2bReceipt.transferAccount}</strong>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Disbursed From: </span>
                            <span style={{ color: '#334155' }}>{b2bReceipt.debitAccount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Dissection Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                        <thead>
                          <tr style={{ background: '#E2E8F0' }}>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'left', fontWeight: 800 }}>Disbursement Particulars</th>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'center', width: '110px', fontWeight: 800 }}>Tax / GST</th>
                            <th style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'right', width: '140px', fontWeight: 800 }}>Amount Disbursed</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #0F172A', padding: '10px', fontWeight: 600 }}>
                              Base Professional Commission / Sub-Agent Fee
                              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>
                                Candidate(s): {b2bReceipt.studentNames}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '10px', textAlign: 'center', fontWeight: 600 }}>
                              {b2bReceipt.gstRate > 0 ? `${b2bReceipt.gstRate}% GST` : '0% (Exempt)'}
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '10px', textAlign: 'right', fontWeight: 700 }}>
                              {Number(b2bReceipt.baseAmount).toLocaleString()} {b2bReceipt.currency}
                            </td>
                          </tr>

                          {b2bReceipt.gstAmount > 0 && (
                            <tr>
                              <td style={{ border: '1.5px solid #0F172A', padding: '8px 10px', fontWeight: 600 }}>
                                Goods and Services Tax (GST 18%)
                              </td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>
                                18.00%
                              </td>
                              <td style={{ border: '1.5px solid #0F172A', padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#D97706' }}>
                                +{Number(b2bReceipt.gstAmount).toLocaleString()} {b2bReceipt.currency}
                              </td>
                            </tr>
                          )}

                          {/* Grand Total Row */}
                          <tr style={{ background: '#F1F5F9' }}>
                            <td style={{ border: '1.5px solid #0F172A', padding: '10px', fontWeight: 800, fontSize: '13px' }}>
                              TOTAL REMITTANCE SETTLED (NET PAID)
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '10px', textAlign: 'center', fontWeight: 700 }}>
                              FULL
                            </td>
                            <td style={{ border: '1.5px solid #0F172A', padding: '10px', textAlign: 'right', fontWeight: 900, fontSize: '14px', color: '#047857' }}>
                              {Number(b2bReceipt.totalDisbursed).toLocaleString()} {b2bReceipt.currency}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Remarks */}
                      <div style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', marginBottom: '20px' }}>
                        Note: {b2bReceipt.remarks}
                      </div>
                    </div>

                    {/* OFFICIAL "PAID & SETTLED" RUBBER STAMP */}
                    {showPaidSeal && (
                      <div
                        className="rubber-stamp"
                        style={{
                          position: 'absolute',
                          bottom: '65px',
                          right: '25px',
                          border: '3.5px dashed #059669',
                          color: '#059669',
                          padding: '12px 18px',
                          borderRadius: '12px',
                          textAlign: 'center',
                          fontWeight: 800,
                          transform: 'rotate(-6deg)',
                          background: 'rgba(240, 253, 244, 0.92)',
                          boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.15)',
                          zIndex: 20,
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                          STERLING OVERSEAS
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1.5px', margin: '2px 0' }}>
                          ★ PAID ★
                        </div>
                        <div style={{ fontSize: '10.5px', fontWeight: 700 }}>
                          DATE: {b2bReceipt.settledDate}
                        </div>
                        <div style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.4px', marginTop: '2px' }}>
                          UTR: {b2bReceipt.utrNumber}
                        </div>
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px', opacity: 0.85 }}>
                          VERIFIED REMITTANCE
                        </div>
                      </div>
                    )}

                    {/* Bottom Signatory */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px' }}>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>
                        This disbursement receipt is an official audit-proof remittance voucher generated by Sterling ERP.
                      </div>
                      <div style={{ textAlign: 'center', width: '220px' }}>
                        <div style={{ height: '36px', borderBottom: '1.5px solid #0F172A', marginBottom: '6px' }}></div>
                        <div style={{ fontWeight: 800, fontSize: '11px', color: '#0F172A' }}>
                          Sterling Overseas Consultancy
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569' }}>
                          Authorized Accounts Signatory
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
