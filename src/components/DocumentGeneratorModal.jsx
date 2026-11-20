import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';

/**
 * DocumentGeneratorModal
 * Enterprise SAP-grade Invoice & Remittance Receipt Generator
 * 
 * Generates:
 * 1. Dubai Student Service Fee Invoice & Official Payment Receipt (WIO Bank Abu Dhabi)
 * 2. B2B Payment Disbursement Voucher & Remittance Receipt with official "PAID & SETTLED" seal stamp
 * 
 * Features:
 * - 100% Solid Pitch-Black Font & High-Contrast Borders (Fixes faded/invisible fonts)
 * - Blank Paper Mode (Hides digital letterhead for printing onto pre-printed corporate stationery)
 * - Blank Template Reset (Start from blank canvas anytime)
 * - Student Selector & Real-Time Student Field Updaters
 * - Company Disbursing Bank Selector (Our 4+ Sterling Bank Accounts)
 */

export const STERLING_COMPANY_BANKS_DEFAULT = [
  {
    id: 'comp-bank-fed-1',
    bank_name: 'Federal Bank',
    account_number: '14200200039281',
    ifsc: 'FDRL0001420',
    branch: 'Valanchery Main, Malappuram',
    label: 'Federal Bank Current A/C (Valanchery)',
    currency: 'INR',
  },
  {
    id: 'comp-bank-hdfc-1',
    bank_name: 'HDFC Bank',
    account_number: '50200049281039',
    ifsc: 'HDFC0000042',
    branch: 'Calicut Bypass Road, Hi-Lite Business Park',
    label: 'HDFC Bank Current A/C (Calicut)',
    currency: 'INR',
  },
  {
    id: 'comp-bank-icici-1',
    bank_name: 'ICICI Bank',
    account_number: '002905009182',
    ifsc: 'ICIC0000029',
    branch: 'Kottakkal / Malappuram',
    label: 'ICICI Bank Corporate A/C',
    currency: 'INR',
  },
  {
    id: 'comp-bank-wio-1',
    bank_name: 'WIO Bank Abu Dhabi (UAE)',
    account_number: 'AE620860000009569370024',
    ifsc: 'WIOBAEADXXX',
    branch: 'Etihad Airways Centre 5th Floor, Abu Dhabi, UAE',
    label: 'WIO Bank UAE Foreign Currency (USD / EUR / AED)',
    currency: 'USD',
  },
  {
    id: 'comp-bank-axis-1',
    bank_name: 'Axis Bank',
    account_number: '921020048291039',
    ifsc: 'UTIB0000829',
    branch: 'Tirur / Malappuram',
    label: 'Axis Bank Operations A/C',
    currency: 'INR',
  },
];

export default function DocumentGeneratorModal({
  isOpen,
  onClose,
  initialMode = 'dubai_invoice', // 'dubai_invoice' | 'b2b_receipt'
  studentData = null,
  b2bPaymentData = null,
  companyBanks = STERLING_COMPANY_BANKS_DEFAULT,
}) {
  const [mode, setMode] = useState(initialMode);
  const [studentDocType, setStudentDocType] = useState('invoice'); // 'invoice' | 'receipt'
  const [includeLetterheadBg, setIncludeLetterheadBg] = useState(true);
  const [showPaidSeal, setShowPaidSeal] = useState(true);
  const [showEditDrawer, setShowEditDrawer] = useState(true);
  const [erpStudentsList, setErpStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const printContainerRef = useRef(null);

  // --- 1. STUDENT DUBAI INVOICE / RECEIPT STATE (WIO Bank Abu Dhabi Template) ---
  const [studentInvoice, setStudentInvoice] = useState({
    invoiceNumber: 'INV-2026-081',
    invoiceDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    dueDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    studentName: 'JOICE SAMUEL',
    studentAddress: 'INDIA',
    courseDetails: 'Bachelor of Business Administration',
    intake: 'Jan 2027',
    passportNumber: '',
    applicationNumber: '',
    terms: 'Due on date',
    currency: 'USD',
    paymentMode: 'Direct Bank Wire (TT / SWIFT)',
    utrNumber: '',
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
    selectedPayingBankId: 'comp-bank-fed-1',
    debitAccount: 'Federal Bank Current A/C: 14200200039281 (Valanchery Main)',
    authorizedSignatory: 'Accounts Department - Sterling Overseas',
    status: 'PAID',
    remarks: 'Full settlement disbursed and cleared as per contract agreement.',
  });

  // Fetch all ERP Students for instant selection in the document editor
  useEffect(() => {
    async function loadStudents() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, name, country, intake, course, service_fee, total_fee, passport_number')
          .order('name');
        if (!error && data && data.length > 0) {
          setErpStudentsList(data);
        } else {
          // Fallback to local storage if available
          const localStr = localStorage.getItem('sterling_students_cache');
          if (localStr) setErpStudentsList(JSON.parse(localStr));
        }
      } catch (err) {
        console.warn('Could not fetch students for doc dropdown:', err);
      }
    }
    loadStudents();
  }, []);

  // Update mode when props change
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode, isOpen]);

  // Handle student data incoming prop
  useEffect(() => {
    if (studentData) {
      applyStudentToInvoice(studentData);
    }
  }, [studentData]);

  // Handle B2B payment incoming prop
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

      // Check which of Sterling's 4+ banks was used
      const matchedPayingBank = companyBanks.find(
        (b) => b.id === b2bPaymentData.paying_bank_id || b.bank_name.toLowerCase().includes((b2bPaymentData.payment_mode || '').toLowerCase())
      ) || companyBanks[0];

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
        selectedPayingBankId: matchedPayingBank.id,
        debitAccount: b2bPaymentData.debit_account || `${matchedPayingBank.bank_name} A/C: ${matchedPayingBank.account_number} (${matchedPayingBank.branch})`,
        authorizedSignatory: 'Accounts Department - Sterling Overseas',
        status: b2bPaymentData.status === 'completed' ? 'PAID' : 'SETTLED',
        remarks: b2bPaymentData.notes || 'Full payment settled and confirmed through electronic fund transfer.',
      });
    }
  }, [b2bPaymentData, companyBanks]);

  if (!isOpen) return null;

  // Apply a selected student record to the Dubai Invoice fields
  const applyStudentToInvoice = (stu) => {
    if (!stu) return;
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    const feeAmount = Number(stu.service_fee || stu.total_fee || stu.amount || 1000);
    const feeCurr = stu.currency || (stu.country === 'Malta' || stu.country === 'Germany' || stu.country === 'France' ? 'EUR' : 'USD');
    const courseName = stu.course || 'Study Abroad Consultation & Processing';

    setSelectedStudentId(stu.id || '');
    setStudentInvoice((prev) => ({
      ...prev,
      invoiceNumber: `INV-DXB-${new Date().getFullYear()}-${String(stu.id || Math.floor(100 + Math.random() * 900)).padStart(3, '0')}`,
      invoiceDate: todayStr,
      dueDate: todayStr,
      studentName: (stu.name || 'STUDENT NAME').toUpperCase(),
      studentAddress: (stu.country || stu.state || 'INDIA').toUpperCase(),
      courseDetails: courseName,
      intake: stu.intake || 'Upcoming Intake',
      passportNumber: stu.passport_number || '',
      currency: feeCurr,
      items: [
        {
          id: 1,
          description: `Administration Service Fee - ${courseName}`,
          quantity: 1,
          unitPrice: feeAmount,
          taxPercent: 0,
          amount: feeAmount,
        },
      ],
      subTotal: feeAmount,
      grandTotal: feeAmount,
    }));
    toast.success(`Loaded details for ${stu.name}`);
  };

  // Reset to a 100% Blank Invoice for manual billing
  const handleResetToBlankInvoice = () => {
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    setSelectedStudentId('');
    setStudentInvoice({
      invoiceNumber: `INV-DXB-${new Date().getFullYear()}-001`,
      invoiceDate: todayStr,
      dueDate: todayStr,
      studentName: '',
      studentAddress: '',
      courseDetails: '',
      intake: '',
      passportNumber: '',
      applicationNumber: '',
      terms: 'Due on date',
      currency: 'USD',
      paymentMode: 'Direct Bank Wire (TT / SWIFT)',
      utrNumber: '',
      items: [
        {
          id: 1,
          description: 'Administration Service Fee',
          quantity: 1,
          unitPrice: 0,
          taxPercent: 0,
          amount: 0,
        },
      ],
      subTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
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
    toast.success('Reset to Blank Invoice template');
  };

  // Reset to a 100% Blank B2B Receipt
  const handleResetToBlankReceipt = () => {
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    const firstBank = companyBanks[0] || STERLING_COMPANY_BANKS_DEFAULT[0];
    setB2BReceipt({
      receiptNumber: `REC-B2B-${new Date().getFullYear()}-001`,
      voucherDate: todayStr,
      settledDate: todayStr,
      partnerName: '',
      studentNames: '',
      purpose: 'Sub-Agent Commission & University Admission Coordination',
      currency: 'INR',
      baseAmount: 0,
      gstRate: 0,
      gstAmount: 0,
      totalDisbursed: 0,
      paymentMode: 'Bank Transfer (IMPS / NEFT)',
      utrNumber: '',
      transferAccount: '',
      selectedPayingBankId: firstBank.id,
      debitAccount: `${firstBank.bank_name} A/C: ${firstBank.account_number} (${firstBank.branch})`,
      authorizedSignatory: 'Accounts Department - Sterling Overseas',
      status: 'PAID',
      remarks: 'Payment settled and confirmed through electronic fund transfer.',
    });
    toast.success('Reset to Blank B2B Receipt template');
  };

  // Recalculate Student Invoice totals
  const handleItemChange = (index, field, value) => {
    setStudentInvoice((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      const qty = Number(newItems[index].quantity) || 1;
      const unit = Number(newItems[index].unitPrice) || 0;
      newItems[index].amount = qty * unit;

      const sub = newItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      return {
        ...prev,
        items: newItems,
        subTotal: sub,
        grandTotal: sub,
      };
    });
  };

  // Add Item
  const handleAddItem = () => {
    setStudentInvoice((prev) => {
      const nextId = prev.items.length + 1;
      const newItems = [
        ...prev.items,
        {
          id: nextId,
          description: 'Document Verification / Processing Fee',
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

  // Handle changing Sterling's Paying Bank in B2B Receipt
  const handleSelectPayingBank = (bankId) => {
    const chosen = companyBanks.find((b) => b.id === bankId);
    if (!chosen) return;
    setB2BReceipt((prev) => ({
      ...prev,
      selectedPayingBankId: chosen.id,
      debitAccount: `${chosen.bank_name} A/C: ${chosen.account_number} (${chosen.branch})`,
    }));
  };

  // --- PRINT / DOWNLOAD PDF HANDLER (100% Black Crisp Typography & Proper Spacing) ---
  const handlePrint = () => {
    const printArea = printContainerRef.current;
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print or save PDF.');
      return;
    }

    const docTitle = mode === 'dubai_invoice'
      ? `Sterling_${studentDocType.toUpperCase()}_${studentInvoice.invoiceNumber}_${studentInvoice.studentName.replace(/\s+/g, '_') || 'Customer'}`
      : `Sterling_Receipt_${b2bReceipt.receiptNumber}_${b2bReceipt.partnerName.replace(/\s+/g, '_') || 'Partner'}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000000 !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #000000 !important;
              display: flex;
              justify-content: center;
            }
            .a4-sheet {
              width: 210mm;
              min-height: 297mm;
              height: 297mm;
              position: relative;
              padding: ${includeLetterheadBg ? '48mm 18mm 25mm 18mm' : '45mm 18mm 25mm 18mm'};
              background-color: #ffffff !important;
              ${includeLetterheadBg ? "background-image: url('/sterling-letterhead.jpg'); background-size: 100% 100%; background-repeat: no-repeat;" : 'background-image: none !important;'}
              overflow: hidden;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              background-color: #ffffff !important;
            }
            th {
              border: 1.5px solid #000000 !important;
              padding: 6px 10px !important;
              font-size: 11.5px !important;
              font-weight: 800 !important;
              color: #000000 !important;
              background-color: #f1f5f9 !important;
            }
            td {
              border: 1.5px solid #000000 !important;
              padding: 6px 10px !important;
              font-size: 11.5px !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
            .rubber-stamp {
              position: absolute;
              bottom: 45mm;
              right: 25mm;
              border: 3.5px dashed #047857 !important;
              color: #047857 !important;
              padding: 10px 16px;
              border-radius: 12px;
              text-align: center;
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-weight: 900;
              transform: rotate(-6deg);
              background: rgba(240, 253, 244, 0.95) !important;
              box-shadow: 0 0 0 4px rgba(4, 120, 87, 0.2);
              z-index: 50;
            }
            .rubber-stamp * {
              color: #047857 !important;
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
        background: 'rgba(5, 7, 15, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
      onClick={onClose}
    >
      <style>{`
        /* FORCED HIGH-CONTRAST PITCH-BLACK TYPOGRAPHY ON INVOICE PAPER */
        .invoice-sheet-canvas {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        .invoice-sheet-canvas,
        .invoice-sheet-canvas div,
        .invoice-sheet-canvas p,
        .invoice-sheet-canvas span,
        .invoice-sheet-canvas strong,
        .invoice-sheet-canvas h1,
        .invoice-sheet-canvas h2,
        .invoice-sheet-canvas h3,
        .invoice-sheet-canvas h4 {
          color: #000000 !important;
        }
        .invoice-sheet-canvas table {
          border-collapse: collapse !important;
          width: 100% !important;
          background-color: #ffffff !important;
        }
        .invoice-sheet-canvas th {
          background-color: #E2E8F0 !important;
          color: #000000 !important;
          font-weight: 800 !important;
          border: 1.5px solid #000000 !important;
          padding: 7px 10px !important;
          font-size: 11.5px !important;
        }
        .invoice-sheet-canvas td {
          background-color: #ffffff !important;
          color: #000000 !important;
          border: 1.5px solid #000000 !important;
          padding: 7px 10px !important;
          font-size: 11.5px !important;
        }
        .invoice-sheet-canvas .accent-dark {
          color: #000000 !important;
          font-weight: 800 !important;
        }
        .invoice-sheet-canvas .bank-accent {
          color: #047857 !important;
          font-weight: 800 !important;
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '98%',
          maxWidth: '1280px',
          height: '95vh',
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
          {/* Left: Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📄</span>
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
                🇦🇪 Student Dubai Invoices & Receipts
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            
            {/* 1. Letterhead Artwork vs Blank Paper Switcher */}
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setIncludeLetterheadBg(true)}
                title="Includes top black/gold corporate banner & crest watermark"
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: includeLetterheadBg ? 'rgba(79, 70, 229, 0.25)' : 'transparent',
                  color: includeLetterheadBg ? '#818CF8' : '#94A3B8',
                }}
              >
                🎨 Letterhead Artwork
              </button>
              <button
                type="button"
                onClick={() => setIncludeLetterheadBg(false)}
                title="Hides letterhead artwork for printing on pre-printed office stationery paper"
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: !includeLetterheadBg ? '#10B981' : 'transparent',
                  color: !includeLetterheadBg ? '#fff' : '#94A3B8',
                }}
              >
                📄 Blank Paper Mode
              </button>
            </div>

            {/* 2. Reset to Blank Template Button */}
            <button
              type="button"
              onClick={mode === 'dubai_invoice' ? handleResetToBlankInvoice : handleResetToBlankReceipt}
              title="Clear all fields and start fresh with a blank document"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#CBD5E1',
                padding: '6px 11px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ➕ Blank {mode === 'dubai_invoice' ? 'Invoice' : 'Receipt'}
            </button>

            {/* 3. Paid Seal Toggle for B2B Receipt */}
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
                  padding: '5px 10px',
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
                <span style={{ color: '#34D399', fontWeight: 600 }}>PAID Seal</span>
              </label>
            )}

            {/* 4. Toggle Edit Form */}
            <button
              type="button"
              onClick={() => setShowEditDrawer(!showEditDrawer)}
              style={{
                background: showEditDrawer ? '#3B82F6' : 'rgba(59, 130, 246, 0.15)',
                color: showEditDrawer ? '#fff' : '#60A5FA',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showEditDrawer ? 'Hide Fields' : '✏️ Edit Fields'}
            </button>

            {/* 5. Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#10B981',
                color: '#fff',
                border: 'none',
                padding: '7px 16px',
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
              <span>Print / Save PDF</span>
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

        {/* WORKSPACE AREA: EDIT DRAWER (LEFT) + A4 CANVAS PREVIEW (RIGHT) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* EDIT FORM DRAWER (LEFT) */}
          {showEditDrawer && (
            <div
              style={{
                width: '380px',
                background: 'var(--bg1, #080A12)',
                borderRight: '1px solid rgba(148, 163, 225, 0.15)',
                padding: '16px',
                overflowY: 'auto',
                fontSize: '12.5px',
              }}
            >
              {/* Header inside drawer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 700 }}>
                  {mode === 'dubai_invoice' ? 'Student Document Editor' : 'B2B Remittance Editor'}
                </h4>
                {mode === 'dubai_invoice' && (
                  <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setStudentDocType('invoice')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: studentDocType === 'invoice' ? '#4F46E5' : 'transparent',
                        color: studentDocType === 'invoice' ? '#fff' : '#94A3B8',
                      }}
                    >
                      Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentDocType('receipt')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: studentDocType === 'receipt' ? '#059669' : 'transparent',
                        color: studentDocType === 'receipt' ? '#fff' : '#94A3B8',
                      }}
                    >
                      Receipt
                    </button>
                  </div>
                )}
              </div>

              {/* MODE 1: STUDENT DUBAI INVOICE / RECEIPT CONTROLS */}
              {mode === 'dubai_invoice' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Select Student from ERP Dropdown */}
                  <div style={{ background: '#131B2E', padding: '10px', borderRadius: '8px', border: '1px solid #2B3A5A' }}>
                    <label style={{ display: 'block', color: '#60A5FA', fontWeight: 700, marginBottom: '4px' }}>
                      ⚡ Pick Existing Student from ERP:
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        const match = erpStudentsList.find((s) => String(s.id) === String(sid));
                        if (match) applyStudentToInvoice(match);
                      }}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #3B82F6', color: '#fff', fontSize: '12px' }}
                    >
                      <option value="">-- Choose Student to Auto-fill --</option>
                      {erpStudentsList.map((stu) => (
                        <option key={stu.id} value={stu.id}>
                          {stu.name} &bull; {stu.country || 'Global'} {stu.course ? `(${stu.course.substring(0, 22)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Document #</label>
                    <input
                      type="text"
                      value={studentInvoice.invoiceNumber}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, invoiceNumber: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Issue Date</label>
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
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Student Name (Bill TO) *</label>
                    <input
                      type="text"
                      value={studentInvoice.studentName}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, studentName: e.target.value })}
                      placeholder="e.g. JOICE SAMUEL"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Student Address / Country</label>
                    <input
                      type="text"
                      value={studentInvoice.studentAddress}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, studentAddress: e.target.value })}
                      placeholder="e.g. INDIA or Kerala, India"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Course / Program</label>
                      <input
                        type="text"
                        value={studentInvoice.courseDetails}
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, courseDetails: e.target.value })}
                        placeholder="Course title"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Intake</label>
                      <input
                        type="text"
                        value={studentInvoice.intake}
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, intake: e.target.value })}
                        placeholder="e.g. Jan 2027"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
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

                  {/* If Receipt Mode: Settlement Info */}
                  {studentDocType === 'receipt' && (
                    <div style={{ background: 'rgba(5, 150, 105, 0.12)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
                      <div style={{ color: '#34D399', fontWeight: 700, marginBottom: '6px', fontSize: '11.5px' }}>
                        ✓ Student Payment Confirmation Details
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Bank Transaction UTR / Ref #"
                          value={studentInvoice.utrNumber}
                          onChange={(e) => setStudentInvoice({ ...studentInvoice, utrNumber: e.target.value })}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #2B3A5A', color: '#fff' }}
                        />
                        <input
                          type="text"
                          placeholder="Payment Mode (Wire / Online)"
                          value={studentInvoice.paymentMode}
                          onChange={(e) => setStudentInvoice({ ...studentInvoice, paymentMode: e.target.value })}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #2B3A5A', color: '#fff' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Line Items Editor */}
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ color: '#94A3B8', fontWeight: 600 }}>Invoice Line Items</label>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}
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
                  <div>
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
                /* MODE 2: B2B REMITTANCE RECEIPT EDIT FORM */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* SELECT WHICH OF STERLING'S 4+ BANKS PAID THE MONEY */}
                  <div style={{ background: '#131B2E', padding: '10px', borderRadius: '8px', border: '1px solid #3B82F6' }}>
                    <label style={{ display: 'block', color: '#60A5FA', fontWeight: 700, marginBottom: '4px' }}>
                      🏦 Paid From Sterling Bank (Our Bank) *:
                    </label>
                    <select
                      value={b2bReceipt.selectedPayingBankId}
                      onChange={(e) => handleSelectPayingBank(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #3B82F6', color: '#fff', fontSize: '12px' }}
                    >
                      {companyBanks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      Debited A/C: <span style={{ color: '#fff' }}>{b2bReceipt.debitAccount}</span>
                    </div>
                  </div>

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
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Voucher Date</label>
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
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>B2B Beneficiary Partner *</label>
                    <input
                      type="text"
                      value={b2bReceipt.partnerName}
                      onChange={(e) => setB2BReceipt({ ...b2bReceipt, partnerName: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontWeight: 600 }}
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
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Credited To (Partner Account)</label>
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

          {/* DOCUMENT PREVIEW CONTAINER (CENTERED A4 CANVAS WITH SOLID PITCH-BLACK FONT) */}
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
              className="invoice-sheet-canvas"
              style={{
                width: '794px', // 210mm at 96 DPI
                minHeight: '1123px', // 297mm at 96 DPI
                backgroundColor: '#ffffff',
                color: '#000000',
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
                {/* 1. DUBAI STUDENT INVOICE & OFFICIAL RECEIPT */}
                {/* ======================================================== */}
                {mode === 'dubai_invoice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', position: 'relative' }}>
                    <div>
                      {/* Top Entity & Title */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '16px', color: '#000000', letterSpacing: '-0.2px' }}>
                            Sterling Overseas Consultancy LLC
                          </div>
                          <div style={{ fontSize: '12px', color: '#000000', fontWeight: 700, letterSpacing: '0.5px' }}>
                            WIOBAEADXXX
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#000000', letterSpacing: '1px' }}>
                            {studentDocType === 'receipt' ? 'OFFICIAL RECEIPT' : 'INVOICE'}
                          </h1>
                          {studentDocType === 'receipt' && (
                            <div style={{ fontSize: '11px', color: '#047857', fontWeight: 800 }}>
                              SERVICE CHARGE PAYMENT RECEIPT
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2-Column Meta Table (Bill TO & Invoice Details) */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '22px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', width: '52%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ fontSize: '11px', color: '#000000', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>
                                {studentDocType === 'receipt' ? 'RECEIVED FROM:' : 'BILL TO:'}
                              </div>
                              <div style={{ fontSize: '14.5px', fontWeight: 900, color: '#000000', letterSpacing: '0.2px' }}>
                                {studentInvoice.studentName || 'STUDENT NAME'}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', width: '48%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>{studentDocType === 'receipt' ? 'Receipt #:' : 'Invoice #:'}</span>
                                <span style={{ fontWeight: 900, color: '#000000' }}>{studentInvoice.invoiceNumber}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <span style={{ fontWeight: 800, color: '#000000' }}>Address: </span>
                              <span style={{ fontWeight: 700, color: '#000000' }}>{studentInvoice.studentAddress || 'INDIA'}</span>
                              {studentInvoice.courseDetails && (
                                <div style={{ fontSize: '11.5px', color: '#000000', fontWeight: 600, marginTop: '2px' }}>
                                  Program: {studentInvoice.courseDetails} {studentInvoice.intake ? `(${studentInvoice.intake})` : ''}
                                </div>
                              )}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Date:</span>
                                <span style={{ fontWeight: 700, color: '#000000' }}>{studentInvoice.invoiceDate}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <span style={{ fontWeight: 800, color: '#000000' }}>Terms: </span>
                              <span style={{ fontWeight: 700, color: '#000000' }}>{studentDocType === 'receipt' ? 'Paid in Full' : studentInvoice.terms}</span>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>{studentDocType === 'receipt' ? 'Payment Status:' : 'Due On:'}</span>
                                <span style={{ fontWeight: 800, color: studentDocType === 'receipt' ? '#047857' : '#000000' }}>
                                  {studentDocType === 'receipt' ? 'PAID & RECEIVED' : studentInvoice.dueDate}
                                </span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Line Items Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                        <thead>
                          <tr style={{ background: '#E2E8F0' }}>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'center', width: '48px', fontWeight: 900, color: '#000000' }}>Item</th>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'left', fontWeight: 900, color: '#000000' }}>Description</th>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'center', width: '70px', fontWeight: 900, color: '#000000' }}>Quantity</th>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'right', width: '110px', fontWeight: 900, color: '#000000' }}>Unit Price</th>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'center', width: '70px', fontWeight: 900, color: '#000000' }}>Tax (%)</th>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'right', width: '110px', fontWeight: 900, color: '#000000' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentInvoice.items.map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                                {idx + 1}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', fontStyle: 'italic', fontWeight: 700, color: '#000000' }}>
                                {it.description}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                                {it.quantity}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                                {Number(it.unitPrice).toLocaleString()} {studentInvoice.currency}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                                {it.taxPercent.toFixed(2)}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#000000' }}>
                                {Number(it.amount).toLocaleString()} {studentInvoice.currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals Section */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '22px' }}>
                        <div style={{ width: '280px', fontSize: '13px', lineHeight: 1.8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#000000' }}>
                            <span>Sub Total:</span>
                            <span>{Number(studentInvoice.subTotal).toLocaleString()} {studentInvoice.currency}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#000000' }}>
                            <span>Total (Tax):</span>
                            <span>0.00</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '15px', borderTop: '2px solid #000000', paddingTop: '4px', marginTop: '4px', color: '#000000' }}>
                            <span>Total:</span>
                            <span>{Number(studentInvoice.grandTotal).toLocaleString()} {studentInvoice.currency}</span>
                          </div>
                        </div>
                      </div>

                      {/* Official WIO Bank Details Table */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontWeight: 900, fontSize: '12px', fontStyle: 'italic', marginBottom: '4px', color: '#000000' }}>
                          Bank Details:
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', width: '32%', fontWeight: 800, color: '#000000' }}>Account Holder:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 800, color: '#000000' }}>{studentInvoice.bankDetails.accountHolder}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 800, color: '#000000' }}>Business Identification No:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 700, color: '#000000' }}>{studentInvoice.bankDetails.businessId}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 800, color: '#000000' }}>Bank Name:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 900, color: '#047857' }}>{studentInvoice.bankDetails.bankName}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 800, color: '#000000' }}>Address:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 600, color: '#000000' }}>{studentInvoice.bankDetails.address}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 800, color: '#000000' }}>Account No:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px' }}>{studentInvoice.bankDetails.accountNumber}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 800, color: '#000000' }}>IBAN:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px' }}>{studentInvoice.bankDetails.iban}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 800, color: '#000000' }}>SWIFT Code:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 10px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px' }}>{studentInvoice.bankDetails.swiftCode}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Note */}
                      <div style={{ fontSize: '11px', color: '#000000', fontStyle: 'italic', fontWeight: 600 }}>
                        {studentInvoice.footerNote}
                      </div>
                    </div>

                    {/* If Receipt Mode: Paid Seal */}
                    {studentDocType === 'receipt' && (
                      <div
                        className="rubber-stamp"
                        style={{
                          position: 'absolute',
                          bottom: '60px',
                          right: '25px',
                          border: '3.5px dashed #047857',
                          color: '#047857',
                          padding: '12px 18px',
                          borderRadius: '12px',
                          textAlign: 'center',
                          fontWeight: 900,
                          transform: 'rotate(-7deg)',
                          background: 'rgba(240, 253, 244, 0.95)',
                          boxShadow: '0 0 0 4px rgba(4, 120, 87, 0.2)',
                          zIndex: 20,
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9, color: '#047857' }}>
                          STERLING OVERSEAS LLC
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1.5px', margin: '2px 0', color: '#047857' }}>
                          ★ PAID &amp; RECEIVED ★
                        </div>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857' }}>
                          DATE: {studentInvoice.invoiceDate}
                        </div>
                        {studentInvoice.utrNumber && (
                          <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.4px', marginTop: '2px', color: '#047857' }}>
                            REF: {studentInvoice.utrNumber}
                          </div>
                        )}
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px', opacity: 0.85, color: '#047857' }}>
                          OFFICIAL RECEIPT
                        </div>
                      </div>
                    )}

                    {/* Authorized Signature Block */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '26px' }}>
                      <div style={{ fontSize: '10px', color: '#000000', fontWeight: 600 }}>
                        Official computer generated {studentDocType === 'receipt' ? 'receipt' : 'tax invoice'} issued by Sterling Overseas Consultancy LLC.
                      </div>
                      <div style={{ textAlign: 'center', width: '220px' }}>
                        <div style={{ height: '36px', borderBottom: '1.5px solid #000000', marginBottom: '6px' }}></div>
                        <div style={{ fontWeight: 900, fontSize: '11px', color: '#000000' }}>Sterling Overseas Consultancy LLC</div>
                        <div style={{ fontSize: '10px', color: '#000000', fontWeight: 600 }}>Authorized Signatory</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* 2. B2B REMITTANCE RECEIPT (with Official PAID Seal & House Bank) */}
                {/* ======================================================== */}
                {mode === 'b2b_receipt' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', position: 'relative' }}>
                    <div>
                      {/* Top Entity & Title */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '16px', color: '#000000' }}>
                            Sterling Study Abroad &amp; Overseas Consultancy
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#000000', fontWeight: 700 }}>
                            Central Accounts &amp; Disbursements Division
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px' }}>
                            PAYMENT REMITTANCE RECEIPT
                          </h2>
                          <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 800, marginTop: '2px' }}>
                            DISBURSEMENT VOUCHER &amp; PAYMENT ADVICE
                          </div>
                        </div>
                      </div>

                      {/* Metadata Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', width: '52%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ fontSize: '11px', color: '#000000', fontWeight: 800 }}>PAID TO / BENEFICIARY:</div>
                              <div style={{ fontSize: '15px', fontWeight: 900, color: '#000000' }}>
                                {b2bReceipt.partnerName || 'PARTNER COMPANY'}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', width: '48%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Voucher / Receipt #:</span>
                                <span style={{ fontWeight: 900, color: '#000000' }}>{b2bReceipt.receiptNumber}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ fontSize: '11px', color: '#000000', fontWeight: 800 }}>FOR STUDENT(S):</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#000000' }}>
                                {b2bReceipt.studentNames || 'General'}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Payment Settled Date:</span>
                                <span style={{ fontWeight: 800, color: '#047857' }}>{b2bReceipt.settledDate}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <span style={{ fontWeight: 800, color: '#000000' }}>Purpose: </span>
                              <span style={{ fontWeight: 600, color: '#000000' }}>{b2bReceipt.purpose}</span>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Payment Status:</span>
                                <span style={{ fontWeight: 900, color: '#047857' }}>✓ SETTLED &amp; PAID</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Transaction Audit Execution Box (Both Our Bank & Partner Bank) */}
                      <div style={{ border: '1.5px solid #000000', background: '#F8FAFC', padding: '12px 14px', borderRadius: '4px', marginBottom: '18px' }}>
                        <div style={{ fontWeight: 900, fontSize: '12px', color: '#000000', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          🏦 Electronic Fund Transfer &amp; Bank Clearance Audit
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                          <div>
                            <span style={{ color: '#000000', fontWeight: 800 }}>Payment Mode: </span>
                            <strong style={{ color: '#000000' }}>{b2bReceipt.paymentMode}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#000000', fontWeight: 800 }}>Bank UTR / Transaction Ref: </span>
                            <strong style={{ color: '#047857', letterSpacing: '0.5px' }}>{b2bReceipt.utrNumber}</strong>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: '#000000', fontWeight: 800 }}>Debited From (Our Bank): </span>
                            <strong style={{ color: '#000000' }}>{b2bReceipt.debitAccount}</strong>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: '#000000', fontWeight: 800 }}>Credited To (Beneficiary Bank): </span>
                            <strong style={{ color: '#000000' }}>{b2bReceipt.transferAccount}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Financial Dissection Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                        <thead>
                          <tr style={{ background: '#E2E8F0' }}>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'left', fontWeight: 900, color: '#000000' }}>Disbursement Particulars</th>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'center', width: '110px', fontWeight: 900, color: '#000000' }}>Tax / GST</th>
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'right', width: '140px', fontWeight: 900, color: '#000000' }}>Amount Disbursed</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '10px', fontWeight: 700, color: '#000000' }}>
                              Base Professional Commission / Sub-Agent Fee
                              <div style={{ fontSize: '11px', color: '#000000', fontWeight: 500 }}>
                                Candidate(s): {b2bReceipt.studentNames || 'General'}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '10px', textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                              {b2bReceipt.gstRate > 0 ? `${b2bReceipt.gstRate}% GST` : '0% (Exempt)'}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '10px', textAlign: 'right', fontWeight: 800, color: '#000000' }}>
                              {Number(b2bReceipt.baseAmount).toLocaleString()} {b2bReceipt.currency}
                            </td>
                          </tr>

                          {b2bReceipt.gstAmount > 0 && (
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '8px 10px', fontWeight: 700, color: '#000000' }}>
                                Goods and Services Tax (GST 18%)
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                                18.00%
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#000000' }}>
                                +{Number(b2bReceipt.gstAmount).toLocaleString()} {b2bReceipt.currency}
                              </td>
                            </tr>
                          )}

                          {/* Grand Total Row */}
                          <tr style={{ background: '#F1F5F9' }}>
                            <td style={{ border: '1.5px solid #000000', padding: '10px', fontWeight: 900, fontSize: '13px', color: '#000000' }}>
                              TOTAL REMITTANCE SETTLED (NET PAID)
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '10px', textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                              FULL
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '10px', textAlign: 'right', fontWeight: 900, fontSize: '14.5px', color: '#047857' }}>
                              {Number(b2bReceipt.totalDisbursed).toLocaleString()} {b2bReceipt.currency}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Remarks */}
                      <div style={{ fontSize: '11px', color: '#000000', fontStyle: 'italic', marginBottom: '20px', fontWeight: 600 }}>
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
                          border: '3.5px dashed #047857',
                          color: '#047857',
                          padding: '12px 18px',
                          borderRadius: '12px',
                          textAlign: 'center',
                          fontWeight: 900,
                          transform: 'rotate(-6deg)',
                          background: 'rgba(240, 253, 244, 0.95)',
                          boxShadow: '0 0 0 4px rgba(4, 120, 87, 0.2)',
                          zIndex: 20,
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9, color: '#047857' }}>
                          STERLING OVERSEAS
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1.5px', margin: '2px 0', color: '#047857' }}>
                          ★ PAID ★
                        </div>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857' }}>
                          DATE: {b2bReceipt.settledDate}
                        </div>
                        <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.4px', marginTop: '2px', color: '#047857' }}>
                          UTR: {b2bReceipt.utrNumber}
                        </div>
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px', opacity: 0.85, color: '#047857' }}>
                          VERIFIED REMITTANCE
                        </div>
                      </div>
                    )}

                    {/* Bottom Signatory */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px' }}>
                      <div style={{ fontSize: '10px', color: '#000000', fontWeight: 600 }}>
                        This disbursement receipt is an official audit-proof remittance voucher generated by Sterling ERP.
                      </div>
                      <div style={{ textAlign: 'center', width: '220px' }}>
                        <div style={{ height: '36px', borderBottom: '1.5px solid #000000', marginBottom: '6px' }}></div>
                        <div style={{ fontWeight: 900, fontSize: '11px', color: '#000000' }}>
                          Sterling Overseas Consultancy
                        </div>
                        <div style={{ fontSize: '10px', color: '#000000', fontWeight: 600 }}>
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
