import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';
import { parseTransferAccountDetails, numberToWordsINR, getStudentAgentMeta, saveStudentAgentMeta, updateStudentFromB2BSettlement } from '../utils/studentAgentHelper';

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
  onPaymentSettled = null,
}) {
  const [mode, setMode] = useState(initialMode);
  const [studentDocType, setStudentDocType] = useState('invoice'); // 'invoice' | 'receipt'
  const [includeLetterheadBg, setIncludeLetterheadBg] = useState(true);
  const [showPaidSeal, setShowPaidSeal] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [erpStudentsList, setErpStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showSettleInlineModal, setShowSettleInlineModal] = useState(false);
  const [inlineSettlementData, setInlineSettlementData] = useState({
    paying_bank_id: '',
    settled_at: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer (IMPS / NEFT)',
    utr_number: '',
    notes: '',
  });
  const printContainerRef = useRef(null);

  // Unified Document Type calculation and handler
  const currentDocType =
    mode === 'dubai_invoice'
      ? studentDocType === 'receipt'
        ? 'student_receipt'
        : 'student_invoice'
      : mode === 'b2b_receipt'
      ? 'b2b_voucher'
      : 'university_claim';

  const handleDocTypeChange = (newType) => {
    if (newType === 'student_invoice') {
      setMode('dubai_invoice');
      setStudentDocType('invoice');
    } else if (newType === 'student_receipt') {
      setMode('dubai_invoice');
      setStudentDocType('receipt');
    } else if (newType === 'b2b_voucher') {
      setMode('b2b_receipt');
    } else if (newType === 'university_claim') {
      setMode('university_commission');
    }
  };

  // --- 1. STUDENT DUBAI INVOICE / RECEIPT STATE (WIO Bank Abu Dhabi Template) ---
  const [studentInvoice, setStudentInvoice] = useState({
    companyName: 'Sterling Study Abroad',
    companyAddress: 'Etihad Airways Centre 5th Floor, Abu Dhabi, United Arab Emirates',
    docHeading: 'INVOICE', // 'INVOICE' | 'PROFORMA INVOICE' | 'TAX INVOICE' | 'FEE PAYMENT ADVICE'
    applyGst: false,
    gstRate: 18,
    invoiceNumber: `INV-DXB-${new Date().getFullYear()}-084`,
    invoiceDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    dueDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    studentName: 'DELWIN TOMY',
    studentAddress: 'Room No. 4, Green Valley, Thodupuzha Road, Pala, Kottayam, Kerala - 686575, India',
    destinationCountry: 'Malta',
    targetUniversity: '',
    courseDetails: 'Post Graduate Diploma in Transportation, Logistics & Supply Chain Management',
    intake: 'Jan 2027',
    passportNumber: 'V4819204',
    applicationNumber: '',
    terms: 'Due on date',
    currency: 'USD',
    paymentMode: 'Direct Bank Wire (TT / SWIFT)',
    utrNumber: '',
    items: [
      {
        id: 1,
        description: 'Professional Documentation, University Application & Visa Facilitation Fee (Malta)',
        quantity: 1,
        unitPrice: 1000,
        taxPercent: 0,
        amount: 1000,
      },
    ],
    subTotal: 1000,
    taxTotal: 0,
    grandTotal: 1000,
    selectedBankId: 'comp-bank-wio-1',
    bankDetails: {
      accountHolder: 'Sterling Overseas Consultancy LLC',
      businessId: '', // Blank by default (user can add real TRN/Tax ID if needed)
      licenseNumber: '',
      bankName: 'WIO BANK PJSC',
      address: 'Etihad Airways Centre 5th Floor, Abu Dhabi, UAE',
      accountNumber: '0860000009569370024',
      iban: 'AE620860000009569370024',
      swiftCode: 'WIOBAEADXXX',
      isDomestic: false,
    },
    footerNote: 'Note: Please note that the transfer fee of the banks are not included in this fee!',
  });

  // --- 2. B2B PAYMENT REMITTANCE RECEIPT / REQUISITION STATE ---
  const [b2bReceipt, setB2BReceipt] = useState({
    receiptNumber: 'REQ-B2B-2026-019',
    voucherDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    settledDate: 'Pending Disbursement',
    partnerName: 'Consult Fox Edutech Pvt Ltd',
    studentNames: 'Thejus & Nivil',
    purpose: 'B2B Sub-Agent Admission Commission & University Coordination',
    currency: 'INR',
    baseAmount: 152542,
    gstRate: 18,
    gstAmount: 27458,
    totalDisbursed: 180000,
    paymentMode: 'Bank Transfer (IMPS / NEFT)',
    utrNumber: 'Pending Bank Transfer',
    transferAccount: 'HDFC Bank A/C: 50200038291048 | IFSC: HDFC0000240 | Beneficiary: Consult Fox Edutech Pvt Ltd',
    selectedPayingBankId: 'comp-bank-fed-1',
    debitAccount: 'Federal Bank Current A/C: 14200200039281 (Valanchery Main)',
    authorizedSignatory: 'Accounts Department - Sterling Overseas',
    status: 'PENDING_APPROVAL', // 'PAID' | 'PENDING_APPROVAL'
    remarks: 'Payment voucher submitted for Accounts verification & bank payout.',
  });

  // --- 3. UNIVERSITY / B2B COMMISSION CLAIM INVOICE STATE ---
  const [universityInvoice, setUniversityInvoice] = useState({
    invoiceNumber: 'INV-UNI-2026-042',
    invoiceDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    dueDate: 'Due on Receipt',
    recipientType: 'Partner University', // 'Partner University' | 'University Representative' | 'B2B Partner Agency'
    universityName: 'MCAST - Malta College of Arts, Science and Technology',
    universityCampus: 'Main Campus, Corradino Hill, Paola, Malta',
    financeEmail: 'finance.admissions@mcast.edu.mt',
    studentName: 'JOICE SAMUEL',
    studentId: 'MCAST-2026-8910',
    courseDetails: 'Introductory Certificate in Applied Science',
    intake: 'February 2027',
    tuitionFeePaid: 5400,
    commissionPercent: 15,
    commissionAmount: 810,
    currency: 'EUR',
    applyGst: false,
    gstRate: 18,
    students: [
      {
        id: 'stu-1',
        studentName: 'JOICE SAMUEL',
        studentId: 'MCAST-2026-8910',
        country: 'Malta',
        university: 'MCAST - Malta College of Arts, Science and Technology',
        courseDetails: 'Introductory Certificate in Applied Science',
        intake: 'February 2027',
        tuitionFeePaid: 5400,
        commissionPercent: 15,
        commissionAmount: 810,
      },
    ],
    selectedBankId: 'comp-bank-wio-1',
    companyAddress: 'Etihad Airways Centre 5th Floor, Abu Dhabi, United Arab Emirates',
    bankDetails: {
      accountHolder: 'Sterling Overseas Consultancy LLC',
      businessId: 'WIOBAEADXXX',
      bankName: 'WIO BANK PJSC',
      address: 'Etihad Airways Centre 5th Floor, Abu Dhabi, UAE',
      accountNumber: '0860000009569370024',
      iban: 'AE620860000009569370024',
      swiftCode: 'WIOBAEADXXX',
      isDomestic: false,
    },
    remarks: 'Official Agency Commission claim for student recruitment and enrollment.',
  });

  // Fetch all ERP Students for instant selection in the document editor
  useEffect(() => {
    async function loadStudents() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
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
      setShowEditDrawer(false);
      const isCompleted = b2bPaymentData.status === 'completed';
      const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
      const settledStr = b2bPaymentData.settled_at 
        ? new Date(b2bPaymentData.settled_at).toLocaleDateString('en-GB').replace(/\//g, '.')
        : (isCompleted ? todayStr : 'Pending Clearance');

      const curr = b2bPaymentData.currency || 'INR';
      const isDomestic = curr === 'INR';
      const hasGst = isDomestic && (b2bPaymentData.has_gst === true || b2bPaymentData.is_gst_applicable === true);
      const gstRate = hasGst ? 18 : 0;
      const base = Number(b2bPaymentData.amount || 0);
      const gst = gstRate > 0 ? Math.round(base * (gstRate / 100)) : 0;
      const total = base + gst;

      // Clean short reference code (e.g. REQ-2026-089 or REQ-2026-QDTX)
      let rawId = String(b2bPaymentData.id || '');
      let shortCode = '';
      if (rawId.includes('-')) {
        const parts = rawId.split('-').filter(Boolean);
        shortCode = parts[parts.length - 1];
      } else {
        shortCode = rawId.slice(-4);
      }
      if (!shortCode || shortCode.length < 3) {
        shortCode = String(Date.now()).slice(-4);
      }
      const cleanRef = shortCode.toUpperCase();
      const prefix = isCompleted ? 'REC' : 'REQ';

      // Check which of Sterling's 4+ banks was used
      const matchedPayingBank = companyBanks.find(
        (b) => b.id === b2bPaymentData.paying_bank_id || b.bank_name.toLowerCase().includes((b2bPaymentData.payment_mode || '').toLowerCase())
      ) || companyBanks[0];

      setInlineSettlementData({
        paying_bank_id: matchedPayingBank.id,
        settled_at: new Date().toISOString().split('T')[0],
        payment_mode: b2bPaymentData.payment_mode || 'Bank Transfer (IMPS / NEFT)',
        utr_number: b2bPaymentData.utr_number || '',
        notes: '',
      });

      setB2BReceipt({
        receiptNumber: `${prefix}-${new Date().getFullYear()}-${cleanRef}`,
        voucherDate: todayStr,
        settledDate: settledStr,
        partnerName: b2bPaymentData.partner_name || 'B2B Partner Company',
        studentNames: b2bPaymentData.student_names || 'Student Referral Services',
        purpose: b2bPaymentData.category ? `${b2bPaymentData.category} Settlement` : 'B2B Sub-Agent Commission & University Processing',
        currency: curr,
        baseAmount: base,
        gstRate: gstRate,
        gstAmount: gst,
        totalDisbursed: total,
        paymentMode: isCompleted ? (b2bPaymentData.payment_mode || 'Bank Transfer (IMPS / NEFT)') : 'Bank Transfer (Awaiting Release)',
        utrNumber: isCompleted ? (b2bPaymentData.utr_number || 'UTR-NOT-SPECIFIED') : 'Pending Bank Transfer',
        transferAccount: b2bPaymentData.transfer_account || 'Partner Bank Account',
        selectedPayingBankId: matchedPayingBank.id,
        debitAccount: isCompleted 
          ? (b2bPaymentData.debit_account || `${matchedPayingBank.bank_name} A/C: ${matchedPayingBank.account_number} (${matchedPayingBank.branch})`)
          : `Proposed Disbursing Bank: ${matchedPayingBank.bank_name} (${matchedPayingBank.branch})`,
        authorizedSignatory: 'Accounts Department - Sterling Overseas',
        status: isCompleted ? 'PAID' : 'PENDING_APPROVAL',
        remarks: b2bPaymentData.notes || (isCompleted ? 'Full payment settled and confirmed through electronic fund transfer.' : 'Payment voucher submitted for Accounts verification & payout.'),
      });

      // CRITICAL FIX: Only stamp PAID if ACTUALLY completed in ERP! Never on pending payables!
      setShowPaidSeal(isCompleted);
    }
  }, [b2bPaymentData, companyBanks]);

  // Handle Mark as Paid settlement from inside Document Modal
  const handleConfirmInlineSettlement = (e) => {
    if (e) e.preventDefault();
    if (!inlineSettlementData.utr_number.trim()) {
      toast.error('Please enter the Bank UTR / Transaction Reference number');
      return;
    }

    const chosenBank = companyBanks.find((b) => b.id === inlineSettlementData.paying_bank_id) || companyBanks[0];
    const dateFormatted = inlineSettlementData.settled_at 
      ? new Date(inlineSettlementData.settled_at).toLocaleDateString('en-GB').replace(/\//g, '.')
      : new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    const utr = inlineSettlementData.utr_number.trim();
    const updatedDebitAcc = `${chosenBank.bank_name} A/C: ${chosenBank.account_number} (${chosenBank.branch})`;
    const updatedReceiptNumber = b2bReceipt.receiptNumber.replace(/^REQ-/, 'REC-');

    setB2BReceipt((prev) => ({
      ...prev,
      status: 'PAID',
      receiptNumber: updatedReceiptNumber,
      settledDate: dateFormatted,
      paymentMode: inlineSettlementData.payment_mode,
      utrNumber: utr,
      selectedPayingBankId: chosenBank.id,
      debitAccount: updatedDebitAcc,
      remarks: inlineSettlementData.notes || 'Full payment settled and confirmed through electronic fund transfer.',
    }));
    setShowPaidSeal(true);
    setShowSettleInlineModal(false);

    // Persist to localStorage 'sterling_b2b_payments'
    if (b2bPaymentData?.id) {
      try {
        const saved = localStorage.getItem('sterling_b2b_payments');
        if (saved) {
          const all = JSON.parse(saved);
          const next = all.map((p) =>
            p.id === b2bPaymentData.id
              ? {
                  ...p,
                  status: 'completed',
                  settled_at: inlineSettlementData.settled_at,
                  payment_mode: inlineSettlementData.payment_mode,
                  paying_bank_id: chosenBank.id,
                  paying_bank_name: chosenBank.bank_name,
                  debit_account: updatedDebitAcc,
                  utr_number: utr,
                  notes: inlineSettlementData.notes || p.notes,
                }
              : p
          );
          localStorage.setItem('sterling_b2b_payments', JSON.stringify(next));
        }
      } catch (err) {
        console.error('Failed to sync payment settlement to localStorage', err);
      }
    }

    if (onPaymentSettled) {
      onPaymentSettled({
        id: b2bPaymentData?.id,
        status: 'completed',
        settled_at: inlineSettlementData.settled_at,
        payment_mode: inlineSettlementData.payment_mode,
        paying_bank_id: chosenBank.id,
        paying_bank_name: chosenBank.bank_name,
        debit_account: updatedDebitAcc,
        utr_number: utr,
      });
    }

    // Synchronize settlement back to student application (updates B2B Paid and recalculates net profit)
    if (b2bPaymentData) {
      updateStudentFromB2BSettlement(b2bPaymentData, utr, chosenBank.bank_name);
    }

    toast.success('Payment marked as Settled! Official Paid Receipt generated.');
  };

  // Revert back to Pending Requisition
  const handleRevertToPending = () => {
    if (!window.confirm('Are you sure you want to revert this payment to Pending Requisition?')) return;

    const revertedReceiptNumber = b2bReceipt.receiptNumber.replace(/^REC-/, 'REQ-');
    setB2BReceipt((prev) => ({
      ...prev,
      status: 'PENDING_APPROVAL',
      receiptNumber: revertedReceiptNumber,
      settledDate: 'Pending Clearance',
      utrNumber: 'Pending Bank Transfer',
      remarks: 'Payment voucher submitted for Accounts verification & payout.',
    }));
    setShowPaidSeal(false);

    if (b2bPaymentData?.id) {
      try {
        const saved = localStorage.getItem('sterling_b2b_payments');
        if (saved) {
          const all = JSON.parse(saved);
          const next = all.map((p) =>
            p.id === b2bPaymentData.id
              ? {
                  ...p,
                  status: 'pending',
                  settled_at: null,
                  utr_number: '',
                }
              : p
          );
          localStorage.setItem('sterling_b2b_payments', JSON.stringify(next));
        }
      } catch (err) {
        console.error('Failed to revert payment settlement in localStorage', err);
      }
    }

    if (onPaymentSettled) {
      onPaymentSettled({
        id: b2bPaymentData?.id,
        status: 'pending',
        settled_at: null,
        utr_number: '',
      });
    }

    toast.success('Reverted payment to Pending Requisition.');
  };

  if (!isOpen) return null;

  // Apply a selected student record to the Dubai Invoice fields
  const applyStudentToInvoice = (stu) => {
    if (!stu) return;
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    const rawFee = stu.service_fee || stu.total_fee || stu.committed || stu.amount || 1000;
    const feeAmount = typeof rawFee === 'string' ? Number(rawFee.replace(/[^0-9.-]+/g, '')) || 1000 : Number(rawFee) || 1000;
    const feeCurr = stu.currency || (stu.country === 'Malta' || stu.country === 'Germany' || stu.country === 'France' || stu.country === 'Ireland' || stu.country === 'Italy' ? 'EUR' : (stu.country === 'UK' || stu.country === 'United Kingdom' ? 'GBP' : 'USD'));
    const courseName = stu.course || 'Post Graduate Diploma in Transportation, Logistics & Supply Chain Management';
    
    // Construct fullest exact residential Indian KYC address
    const addressParts = [
      stu.address,
      stu.city,
      stu.district,
      stu.state || 'Kerala',
      stu.pincode || stu.postal_code || '',
      'India'
    ].filter(Boolean);
    const studentAddress = (stu.address && stu.address.length > 20)
      ? stu.address
      : (addressParts.length > 2 ? addressParts.join(', ') : (stu.address || (stu.city ? `${stu.city}, ${stu.state || 'Kerala'}, India` : 'TC 14/192, Rose Villa, MG Road, Thrissur, Kerala - 680001, India')));
    
    const destinationCountry = stu.country || 'Malta';
    const passportNo = stu.passport_number || stu.passport || '';

    // Generate clean short 3-4 char ID instead of raw UUID
    let rawId = String(stu.id || '');
    let cleanSuffix = '';
    if (rawId.includes('-')) {
      const parts = rawId.split('-').filter(Boolean);
      cleanSuffix = parts[parts.length - 1].slice(-4);
    } else {
      cleanSuffix = rawId.slice(-4);
    }
    if (!cleanSuffix || cleanSuffix.length < 3) {
      cleanSuffix = String(Math.floor(100 + Math.random() * 900));
    }
    const cleanInvNumber = `INV-DXB-${new Date().getFullYear()}-${cleanSuffix.toUpperCase()}`;
    const cleanUniInvNumber = `INV-UNI-${new Date().getFullYear()}-${cleanSuffix.toUpperCase()}`;

    setSelectedStudentId(stu.id || '');
    setStudentInvoice((prev) => ({
      ...prev,
      companyAddress: prev.companyAddress || 'Etihad Airways Centre 5th Floor, Abu Dhabi, United Arab Emirates',
      invoiceNumber: cleanInvNumber,
      invoiceDate: todayStr,
      dueDate: todayStr,
      studentName: (stu.name || 'STUDENT NAME').toUpperCase(),
      studentAddress: studentAddress,
      destinationCountry: destinationCountry,
      courseDetails: courseName,
      intake: stu.intake || '',
      passportNumber: passportNo,
      currency: feeCurr,
      items: [
        {
          id: 1,
          description: 'Administration & Visa Processing Fee',
          quantity: 1,
          unitPrice: feeAmount,
          taxPercent: 0,
          amount: feeAmount,
        },
      ],
      subTotal: feeAmount,
      taxTotal: 0,
      grandTotal: feeAmount,
    }));

    // Also auto-populate University Commission Claim Invoice for this student
    const meta = getStudentAgentMeta(stu);
    const uniFee = Number(stu.tuition_fee || stu.tuition || 5400);
    const commRate = 15;
    const existingComm = Number(meta.uni_commission_committed || stu.commission || 0);
    const commAmt = existingComm > 0 ? existingComm : Math.round((uniFee * commRate) / 100);
    const uniName = stu.university || stu.college || (stu.country === 'Malta' ? 'MCAST - Malta College of Arts, Science & Technology' : 'Partner European University');
    const isAlreadyReceived = Number(meta.uni_commission_received || 0) >= commAmt && commAmt > 0;

    const newStuRow = {
      id: `stu-${Date.now()}`,
      studentName: (stu.name || 'STUDENT NAME').toUpperCase(),
      studentId: stu.student_id || stu.passport_number || `STU-${cleanSuffix.toUpperCase()}`,
      country: destinationCountry,
      university: uniName,
      courseDetails: courseName,
      intake: stu.intake || 'Upcoming Intake',
      tuitionFeePaid: uniFee,
      commissionPercent: commRate,
      commissionAmount: commAmt,
    };

    setUniversityInvoice((prev) => ({
      ...prev,
      invoiceNumber: cleanUniInvNumber,
      studentName: newStuRow.studentName,
      studentId: newStuRow.studentId,
      courseDetails: courseName,
      intake: newStuRow.intake,
      universityName: uniName,
      tuitionFeePaid: uniFee,
      commissionPercent: commRate,
      commissionAmount: commAmt,
      currency: feeCurr,
      students: [newStuRow],
      isReceived: isAlreadyReceived,
      receivedAmount: Number(meta.uni_commission_received || 0),
    }));

    toast.success(`Loaded details for ${stu.name}`);
  };

  // Mark university commission as received and connect directly to ALL linked student applications (updates Profit)
  const handleMarkCommissionReceived = async () => {
    const claimRows = universityInvoice.students && universityInvoice.students.length > 0
      ? universityInvoice.students
      : [];

    const linkedTargets = [];
    claimRows.forEach((row) => {
      const matched = row.erpStudentId
        ? erpStudentsList.find((s) => String(s.id) === String(row.erpStudentId))
        : erpStudentsList.find((s) => s.name?.trim().toLowerCase() === row.studentName?.trim().toLowerCase());
      if (matched) {
        linkedTargets.push({ matched, row });
      }
    });

    if (linkedTargets.length === 0 && selectedStudentId) {
      const matched = erpStudentsList.find((s) => String(s.id) === String(selectedStudentId));
      if (matched) {
        linkedTargets.push({ matched, row: { commissionAmount: universityInvoice.commissionAmount } });
      }
    }

    if (linkedTargets.length === 0) {
      toast.error('Please pick at least one existing ERP student to link and update profit');
      return;
    }

    try {
      let totalReceived = 0;
      for (const { matched, row } of linkedTargets) {
        const sId = matched.id;
        const sName = matched.name || row.studentName || 'Student';
        const rowComm = Number(row.commissionAmount || 0);
        totalReceived += rowComm;

        const meta = getStudentAgentMeta(matched);
        meta.uni_commission_committed = Math.max(Number(meta.uni_commission_committed || 0), rowComm);
        meta.uni_commission_received = rowComm;
        meta.uni_commission_remaining = Math.max(0, meta.uni_commission_committed - meta.uni_commission_received);

        const finalNotes = saveStudentAgentMeta(sId, sName, meta, matched.notes || '');

        await supabase
          .from('students')
          .update({
            commission: rowComm,
            notes: finalNotes,
          })
          .eq('id', sId);
      }

      setUniversityInvoice((prev) => ({
        ...prev,
        isReceived: true,
        receivedAmount: totalReceived,
      }));

      toast.success(
        `✓ Commission of ${universityInvoice.currency} ${totalReceived.toLocaleString('en-IN')} marked received & synced to ${linkedTargets.length} student profit(s)!`
      );
      if (onPaymentSettled) onPaymentSettled();
    } catch (e) {
      console.error('Error marking university commission received', e);
      toast.error('Could not update commission status');
    }
  };

  // Reset to a 100% Blank Invoice for manual billing
  const handleResetToBlankInvoice = () => {
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    setSelectedStudentId('');
    setStudentInvoice({
      companyName: 'Sterling Study Abroad',
      companyAddress: 'Etihad Airways Centre 5th Floor, Abu Dhabi, United Arab Emirates',
      docHeading: 'INVOICE',
      applyGst: false,
      gstRate: 18,
      invoiceNumber: `INV-DXB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      invoiceDate: todayStr,
      dueDate: todayStr,
      studentName: '',
      studentAddress: '',
      destinationCountry: '',
      targetUniversity: '',
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
          description: 'Professional Documentation, Higher Education & Visa Processing Fee',
          quantity: 1,
          unitPrice: 0,
          taxPercent: 0,
          amount: 0,
        },
      ],
      subTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
      selectedBankId: 'comp-bank-wio-1',
      bankDetails: {
        accountHolder: 'Sterling Overseas Consultancy LLC',
        businessId: '',
        licenseNumber: '',
        bankName: 'WIO BANK PJSC',
        address: 'Etihad Airways Centre 5th Floor, Abu Dhabi, UAE',
        accountNumber: '0860000009569370024',
        iban: 'AE620860000009569370024',
        swiftCode: 'WIOBAEADXXX',
        isDomestic: false,
      },
      footerNote: 'Note: Please note that the transfer fee of the banks are not included in this fee!',
    });
    toast.success('Reset to Blank Invoice template');
  };

  // Reset to a 100% Blank B2B Requisition / Receipt
  const handleResetToBlankReceipt = () => {
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    const firstBank = companyBanks[0] || STERLING_COMPANY_BANKS_DEFAULT[0];
    setB2BReceipt({
      receiptNumber: `REQ-B2B-${new Date().getFullYear()}-001`,
      voucherDate: todayStr,
      settledDate: 'Pending Clearance',
      partnerName: '',
      studentNames: '',
      purpose: 'Sub-Agent Commission & University Admission Coordination',
      currency: 'INR',
      baseAmount: 0,
      gstRate: 0,
      gstAmount: 0,
      totalDisbursed: 0,
      paymentMode: 'Bank Transfer (IMPS / NEFT)',
      utrNumber: 'Pending Transfer',
      transferAccount: '',
      selectedPayingBankId: firstBank.id,
      debitAccount: `${firstBank.bank_name} A/C: ${firstBank.account_number} (${firstBank.branch})`,
      authorizedSignatory: 'Accounts Department - Sterling Overseas',
      status: 'PENDING_APPROVAL',
      remarks: 'Payment voucher awaiting Accounts clearance & bank transfer.',
    });
    setShowPaidSeal(false);
    toast.success('Reset to Blank B2B Payment Requisition template');
  };

  // Reset to a 100% Blank University Commission Claim Invoice
  const handleResetToBlankUniversityInvoice = () => {
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    setSelectedStudentId('');
    setUniversityInvoice({
      invoiceNumber: `INV-UNI-${new Date().getFullYear()}-001`,
      invoiceDate: todayStr,
      dueDate: 'Due on Receipt',
      recipientType: 'Partner University',
      universityName: '',
      universityCampus: '',
      financeEmail: '',
      studentName: '',
      studentId: '',
      courseDetails: '',
      intake: '',
      tuitionFeePaid: 0,
      commissionPercent: 15,
      commissionAmount: 0,
      currency: 'EUR',
      applyGst: false,
      gstRate: 18,
      students: [
        {
          id: `stu-${Date.now()}`,
          studentName: '',
          studentId: '',
          country: '',
          university: '',
          courseDetails: '',
          intake: '',
          tuitionFeePaid: 0,
          commissionPercent: 15,
          commissionAmount: 0,
        },
      ],
      selectedBankId: 'comp-bank-wio-1',
      companyAddress: 'Etihad Airways Centre 5th Floor, Abu Dhabi, United Arab Emirates',
      bankDetails: {
        accountHolder: 'Sterling Overseas Consultancy LLC',
        businessId: 'WIOBAEADXXX',
        bankName: 'WIO BANK PJSC',
        address: 'Etihad Airways Centre 5th Floor, Abu Dhabi, UAE',
        accountNumber: '0860000009569370024',
        iban: 'AE620860000009569370024',
        swiftCode: 'WIOBAEADXXX',
        isDomestic: false,
      },
      remarks: 'Official Agency Commission claim for student recruitment and enrollment.',
    });
    toast.success('Reset to Blank Commission Claim Invoice');
  };

  // Multi-Student Commission Claim Handlers
  const handleUniStudentChange = (idx, field, value) => {
    setUniversityInvoice((prev) => {
      const list = [...(prev.students || [])];
      const row = { ...list[idx], [field]: value };
      if (field === 'tuitionFeePaid' || field === 'commissionPercent') {
        const fee = Number(row.tuitionFeePaid) || 0;
        const pct = Number(row.commissionPercent) || 0;
        if (fee > 0 && pct > 0) {
          row.commissionAmount = Math.round((fee * pct) / 100);
        }
      }
      list[idx] = row;
      const totalComm = list.reduce((sum, s) => sum + (Number(s.commissionAmount) || 0), 0);
      return {
        ...prev,
        students: list,
        studentName: list[0]?.studentName || '',
        studentId: list[0]?.studentId || '',
        courseDetails: list[0]?.courseDetails || '',
        intake: list[0]?.intake || '',
        commissionAmount: totalComm,
      };
    });
  };

  const handleAddUniStudent = () => {
    setUniversityInvoice((prev) => ({
      ...prev,
      students: [
        ...(prev.students || []),
        {
          id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentName: '',
          studentId: '',
          country: '',
          university: prev.universityName || '',
          courseDetails: '',
          intake: '',
          tuitionFeePaid: 0,
          commissionPercent: 15,
          commissionAmount: 0,
        },
      ],
    }));
  };

  const handleRemoveUniStudent = (idx) => {
    setUniversityInvoice((prev) => {
      const list = [...(prev.students || [])];
      if (list.length <= 1) return prev;
      list.splice(idx, 1);
      const totalComm = list.reduce((sum, s) => sum + (Number(s.commissionAmount) || 0), 0);
      return {
        ...prev,
        students: list,
        commissionAmount: totalComm,
      };
    });
  };

  const buildUniRowFromStudent = (stu) => {
    const meta = getStudentAgentMeta(stu);
    const uniFee = Number(stu.tuition_fee || stu.tuition || 0);
    const commRate = 15;
    const existingComm = Number(meta.uni_commission_committed || stu.commission || 0);
    const commAmt = existingComm > 0 ? existingComm : (uniFee > 0 ? Math.round((uniFee * commRate) / 100) : 0);
    const uniName = stu.university || stu.college || '';
    return {
      id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      erpStudentId: stu.id,
      studentName: (stu.name || 'STUDENT').toUpperCase(),
      studentId: stu.student_id || stu.passport_number || '',
      country: stu.country || '',
      university: uniName,
      courseDetails: stu.course || '',
      intake: stu.intake || '',
      tuitionFeePaid: uniFee,
      commissionPercent: commRate,
      commissionAmount: commAmt,
    };
  };

  const handleAddErpStudentToUniClaim = (stu) => {
    if (!stu) return;
    const newRow = buildUniRowFromStudent(stu);
    setSelectedStudentId(stu.id);

    setUniversityInvoice((prev) => {
      const current = prev.students || [];
      const isDefaultSample =
        current.length === 1 &&
        (!current[0].studentName?.trim() || current[0].id === 'stu-1');
      const updatedList = isDefaultSample ? [newRow] : [...current, newRow];
      const totalComm = updatedList.reduce((sum, s) => sum + (Number(s.commissionAmount) || 0), 0);
      const isDefaultUni = prev.universityName === 'MCAST - Malta College of Arts, Science and Technology';
      return {
        ...prev,
        universityName: (!prev.universityName || isDefaultUni) ? (newRow.university || prev.universityName) : prev.universityName,
        universityCampus: isDefaultUni ? (newRow.country || '') : prev.universityCampus,
        financeEmail: isDefaultUni ? '' : prev.financeEmail,
        students: updatedList,
        studentName: updatedList[0]?.studentName || '',
        commissionAmount: totalComm,
      };
    });
    toast.success(`Loaded ${stu.name} from ERP`);
  };

  const handleSelectErpStudentForRow = (idx, studentId) => {
    const stu = erpStudentsList.find((s) => String(s.id) === String(studentId));
    if (!stu) return;
    const newRow = buildUniRowFromStudent(stu);
    setSelectedStudentId(stu.id);

    setUniversityInvoice((prev) => {
      const list = [...(prev.students || [])];
      list[idx] = { ...newRow, id: list[idx]?.id || newRow.id };
      const totalComm = list.reduce((sum, s) => sum + (Number(s.commissionAmount) || 0), 0);
      const isDefaultUni = prev.universityName === 'MCAST - Malta College of Arts, Science and Technology';
      return {
        ...prev,
        universityName: (!prev.universityName || isDefaultUni) ? (newRow.university || prev.universityName) : prev.universityName,
        universityCampus: isDefaultUni ? (newRow.country || '') : prev.universityCampus,
        financeEmail: isDefaultUni ? '' : prev.financeEmail,
        students: list,
        studentName: list[0]?.studentName || '',
        commissionAmount: totalComm,
      };
    });
    toast.success(`Auto-filled ${stu.name} (${stu.country || 'ERP'})`);
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
      const tax = prev.applyGst ? Math.round(sub * ((Number(prev.gstRate) || 18) / 100)) : 0;
      return {
        ...prev,
        items: newItems,
        subTotal: sub,
        taxTotal: tax,
        grandTotal: sub + tax,
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
          taxPercent: prev.applyGst ? (Number(prev.gstRate) || 18) : 0,
          amount: 200,
        },
      ];
      const sub = newItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      const tax = prev.applyGst ? Math.round(sub * ((Number(prev.gstRate) || 18) / 100)) : 0;
      return {
        ...prev,
        items: newItems,
        subTotal: sub,
        taxTotal: tax,
        grandTotal: sub + tax,
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
      const tax = prev.applyGst ? Math.round(sub * ((Number(prev.gstRate) || 18) / 100)) : 0;
      return {
        ...prev,
        items: newItems,
        subTotal: sub,
        taxTotal: tax,
        grandTotal: sub + tax,
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

    const safeSlug = (str, fallback = 'Doc') =>
      String(str || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || fallback;

    let docTitle = '';
    if (mode === 'dubai_invoice') {
      const kind = studentDocType === 'receipt'
        ? 'OFFICIAL_RECEIPT'
        : safeSlug(studentInvoice.docHeading || 'INVOICE', 'INVOICE');
      const num = safeSlug(studentInvoice.invoiceNumber, 'INV');
      const stu = safeSlug(studentInvoice.studentName, 'Student');
      docTitle = `${kind}_${num}_${stu}`;
    } else if (mode === 'b2b_receipt') {
      const kind = b2bReceipt.status === 'PAID' ? 'B2B_RECEIPT' : 'B2B_VOUCHER';
      const num = safeSlug(b2bReceipt.receiptNumber, 'REQ');
      const partner = safeSlug(b2bReceipt.partnerName, 'Partner');
      docTitle = `${kind}_${num}_${partner}`;
    } else {
      const num = safeSlug(universityInvoice?.invoiceNumber, 'INV-UNI');
      const uni = safeSlug(universityInvoice?.universityName, 'Partner');
      const stuList = universityInvoice?.students || [];
      const stu = stuList.length > 1
        ? `${stuList.length}_Students`
        : safeSlug(stuList[0]?.studentName || universityInvoice?.studentName, 'Student');
      docTitle = `COMMISSION_CLAIM_${num}_${uni}_${stu}`;
    }

    const isMultiPageClaim = mode === 'university_commission' && (universityInvoice?.students?.length || 1) > 4;

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
              margin: ${isMultiPageClaim ? '8mm 0' : '0'};
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
              ${isMultiPageClaim
                ? 'min-height: 297mm; height: auto !important; max-height: none !important; overflow: visible !important;'
                : 'height: 297mm; max-height: 297mm; overflow: hidden; page-break-after: avoid; page-break-inside: avoid;'}
              position: relative;
              background-color: #ffffff !important;
            }
            thead {
              display: table-header-group !important;
            }
            tr {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .print-letterhead-bg {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              object-fit: fill !important;
              z-index: 0 !important;
              display: block !important;
            }
            .print-content-inner {
              position: relative !important;
              z-index: 1 !important;
              width: 100% !important;
              height: 100% !important;
              padding: ${includeLetterheadBg ? '53mm 14mm 12mm 14mm' : '15mm 14mm 12mm 14mm'} !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              background-color: #ffffff !important;
            }
            th {
              border: 1.5px solid #000000 !important;
              padding: 5px 8px !important;
              font-size: 11px !important;
              font-weight: 800 !important;
              color: #000000 !important;
              background-color: #f1f5f9 !important;
            }
            td {
              border: 1.5px solid #000000 !important;
              padding: 5px 8px !important;
              font-size: 11px !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
            .rubber-stamp {
              position: absolute;
              bottom: 22mm;
              right: 14mm;
              border: 2.5px dashed #047857 !important;
              color: #047857 !important;
              padding: 6px 12px;
              border-radius: 8px;
              text-align: center;
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-weight: 900;
              transform: rotate(-6deg);
              background: rgba(240, 253, 244, 0.95) !important;
              box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.2);
              z-index: 50;
            }
            .rubber-stamp * {
              color: #047857 !important;
            }
          </style>
        </head>
        <body>
          <div class="a4-sheet">
            ${includeLetterheadBg ? '<img src="/sterling-letterhead.jpg" class="print-letterhead-bg" alt="Sterling Letterhead" />' : ''}
            <div class="print-content-inner">
              ${printArea.innerHTML}
            </div>
          </div>
          <script>
            window.onload = function() {
              var imgs = document.images;
              var len = imgs.length;
              var counter = 0;
              function doPrint() {
                window.focus();
                window.print();
                window.close();
              }
              if (len === 0) {
                setTimeout(doPrint, 250);
              } else {
                for (var i = 0; i < len; i++) {
                  if (imgs[i].complete) {
                    counter++;
                    if (counter === len) setTimeout(doPrint, 250);
                  } else {
                    imgs[i].onload = imgs[i].onerror = function() {
                      counter++;
                      if (counter === len) setTimeout(doPrint, 250);
                    };
                  }
                }
              }
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
          {/* Left: Unified Document Type Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ fontSize: '20px' }}>📄</span>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#fff', whiteSpace: 'nowrap' }}>
                Create Invoice / Document
              </span>
            </div>

            {/* Document Type Dropdown */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.06)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(148,163,225,0.25)',
              }}
            >
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                Document Type:
              </label>
              <select
                value={currentDocType}
                onChange={(e) => handleDocTypeChange(e.target.value)}
                style={{
                  background: '#0F172A',
                  border: '1px solid #334155',
                  color: '#fff',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="student_invoice">🎓 Student Invoice (Payment Request)</option>
                <option value="student_receipt">🧾 Student Receipt (Payment Received)</option>
                <option value="b2b_voucher">🤝 B2B Payment Voucher &amp; Requisition</option>
                <option value="university_claim">🏛️ University Commission Claim</option>
              </select>
            </div>

            {/* Status badge if B2B */}
            {mode === 'b2b_receipt' && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  background: b2bReceipt.status === 'PAID' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: b2bReceipt.status === 'PAID' ? '#34D399' : '#FBBF24',
                  border: b2bReceipt.status === 'PAID' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                {b2bReceipt.status === 'PAID' ? '✓ SETTLED & PAID' : '⏳ PENDING CLEARANCE'}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            
            {/* Mark as Paid / Settle Action for B2B Payments */}
            {mode === 'b2b_receipt' && (
              b2bReceipt.status !== 'PAID' ? (
                <button
                  type="button"
                  onClick={() => {
                    setInlineSettlementData({
                      paying_bank_id: b2bReceipt.selectedPayingBankId || companyBanks[0]?.id || '',
                      settled_at: new Date().toISOString().split('T')[0],
                      payment_mode: 'Bank Transfer (IMPS / NEFT)',
                      utr_number: '',
                      notes: '',
                    });
                    setShowSettleInlineModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
                  }}
                  title="Click once accounts pays to record UTR and generate the official PAID receipt"
                >
                  <span>💳</span>
                  <span>Mark as Paid (Enter UTR)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRevertToPending}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#F87171',
                    padding: '6px 11px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Revert back to Pending Requisition"
                >
                  ↩ Revert to Pending
                </button>
              )
            )}

            {/* Letterhead Artwork vs Blank Paper Switcher */}
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setIncludeLetterheadBg(true)}
                title="Includes top black/gold corporate banner & crest watermark (Recommended for Bank & Client submissions)"
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: includeLetterheadBg ? '#4F46E5' : 'transparent',
                  color: includeLetterheadBg ? '#ffffff' : '#94A3B8',
                }}
              >
                🎨 Letterhead
              </button>
              <button
                type="button"
                onClick={() => setIncludeLetterheadBg(false)}
                title="Hides letterhead artwork for printing on pre-printed office stationery paper"
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: !includeLetterheadBg ? '#475569' : 'transparent',
                  color: !includeLetterheadBg ? '#ffffff' : '#94A3B8',
                }}
              >
                📄 Plain Paper Mode
              </button>
            </div>

            {/* Reset to Blank Template Button (Only when in general creator mode, NOT viewing existing B2B payment) */}
            {!b2bPaymentData && (
              <button
                type="button"
                onClick={() => {
                  if (mode === 'dubai_invoice') handleResetToBlankInvoice();
                  else if (mode === 'b2b_receipt') handleResetToBlankReceipt();
                  else handleResetToBlankUniversityInvoice();
                }}
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
                ➕ Blank {mode === 'dubai_invoice' ? 'Student Doc' : mode === 'b2b_receipt' ? 'B2B Voucher' : 'Uni Invoice'}
              </button>
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
                  {mode === 'dubai_invoice'
                    ? (studentDocType === 'receipt' ? '🧾 Student Receipt Editor' : '🎓 Student Invoice Editor')
                    : mode === 'b2b_receipt'
                    ? '🤝 B2B Voucher Editor'
                    : '🏛️ University Invoice Editor'}
                </h4>
              </div>

              {/* MODE 1: STUDENT DUBAI INVOICE / RECEIPT CONTROLS */}
              {mode === 'dubai_invoice' && (
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Company Name (Header)</label>
                      <select
                        value={studentInvoice.companyName || 'Sterling Study Abroad'}
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, companyName: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '12px' }}
                      >
                        <option value="Sterling Study Abroad">Sterling Study Abroad (India &amp; UK)</option>
                        <option value="Sterling Overseas Consultancy LLC">Sterling Overseas Consultancy LLC (Dubai)</option>
                        <option value="Sterling Study Abroad &amp; Overseas Consultancy">Sterling Study Abroad &amp; Overseas</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Document Title</label>
                      <select
                        value={studentInvoice.docHeading || 'INVOICE'}
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, docHeading: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '12px' }}
                      >
                        <option value="INVOICE">INVOICE (Bank Wire / Forex)</option>
                        <option value="PROFORMA INVOICE">PROFORMA INVOICE</option>
                        <option value="TAX INVOICE">TAX INVOICE</option>
                        <option value="FEE PAYMENT ADVICE">FEE PAYMENT ADVICE</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>
                      Company Foreign Address <span style={{ color: '#38BDF8', fontSize: '11px' }}>(Required for Forex Wire)</span>
                    </label>
                    <input
                      type="text"
                      value={studentInvoice.companyAddress || ''}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, companyAddress: e.target.value })}
                      placeholder="e.g. Etihad Airways Centre 5th Floor, Abu Dhabi, United Arab Emirates"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '12px' }}
                    />
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Student Name (Bill TO) *</label>
                      <input
                        type="text"
                        value={studentInvoice.studentName}
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, studentName: e.target.value })}
                        placeholder="e.g. DELWIN TOMY"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Passport / KYC ID</label>
                      <input
                        type="text"
                        value={studentInvoice.passportNumber || ''}
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, passportNumber: e.target.value })}
                        placeholder="e.g. V1234567"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>
                      Student Full Address <span style={{ color: '#F59E0B', fontSize: '11px' }}>(Exact Indian KYC: House / Street / City / District / PIN) *</span>
                    </label>
                    <textarea
                      rows={2}
                      value={studentInvoice.studentAddress}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, studentAddress: e.target.value })}
                      placeholder="e.g. Door No. 12/481, Rose Garden, MG Road, Pala, Kottayam, Kerala - 686575, India"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '12px', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Destination Country</label>
                    <input
                      type="text"
                      value={studentInvoice.destinationCountry || ''}
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, destinationCountry: e.target.value })}
                      placeholder="e.g. Malta, Germany, UK"
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Currency</label>
                      <select
                        value={studentInvoice.currency}
                        onChange={(e) => {
                          const newCurr = e.target.value;
                          setStudentInvoice((prev) => {
                            const sub = Number(prev.subTotal) || 0;
                            const tax = prev.applyGst ? Math.round(sub * 0.18) : 0;
                            return {
                              ...prev,
                              currency: newCurr,
                              taxTotal: tax,
                              grandTotal: sub + tax,
                            };
                          });
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="AED">AED (د.إ)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Remittance Bank</label>
                      <select
                        value={studentInvoice.selectedBankId || 'comp-bank-wio-1'}
                        onChange={(e) => {
                          const bId = e.target.value;
                          if (bId === 'comp-bank-axis-1') {
                            setStudentInvoice((prev) => ({
                              ...prev,
                              selectedBankId: bId,
                              currency: 'INR',
                              companyName: prev.companyName || 'Sterling Study Abroad',
                              companyAddress: '5th Floor, Hi-lite Business Park, Calicut, Kerala, India - 673014',
                              bankDetails: {
                                accountHolder: 'Sterling Study Abroad',
                                businessId: '',
                                licenseNumber: '',
                                bankName: 'Axis Bank',
                                address: 'Tirur / Malappuram Branch, Kerala',
                                accountNumber: '921020048291039',
                                iban: 'N/A',
                                swiftCode: 'UTIB0000829',
                                isDomestic: true,
                              },
                            }));
                          } else if (bId === 'comp-bank-fed-1') {
                            setStudentInvoice((prev) => ({
                              ...prev,
                              selectedBankId: bId,
                              currency: 'INR',
                              companyName: prev.companyName || 'Sterling Study Abroad',
                              companyAddress: '5th Floor, Hi-lite Business Park, Calicut, Kerala, India - 673014',
                              bankDetails: {
                                accountHolder: 'Sterling Study Abroad',
                                businessId: '',
                                licenseNumber: '',
                                bankName: 'Federal Bank',
                                address: 'Valanchery Main Branch, Kerala',
                                accountNumber: '14200200039281',
                                iban: 'N/A',
                                swiftCode: 'FDRL0001420',
                                isDomestic: true,
                              },
                            }));
                          } else {
                            setStudentInvoice((prev) => ({
                              ...prev,
                              selectedBankId: 'comp-bank-wio-1',
                              companyAddress: 'Etihad Airways Centre 5th Floor, Abu Dhabi, United Arab Emirates',
                              bankDetails: {
                                accountHolder: 'Sterling Overseas Consultancy LLC',
                                businessId: '',
                                licenseNumber: '',
                                bankName: 'WIO BANK PJSC',
                                address: 'Etihad Airways Centre 5th Floor, Abu Dhabi, UAE',
                                accountNumber: '0860000009569370024',
                                iban: 'AE620860000009569370024',
                                swiftCode: 'WIOBAEADXXX',
                                isDomestic: false,
                              },
                            }));
                          }
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '11px' }}
                      >
                        <option value="comp-bank-wio-1">WIO Bank UAE (USD/EUR/AED)</option>
                        <option value="comp-bank-axis-1">Axis Bank (India - INR)</option>
                        <option value="comp-bank-fed-1">Federal Bank (India - INR)</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional GST section for INR / Domestic or anytime */}
                  <div style={{ background: '#131B2E', padding: '8px 10px', borderRadius: '6px', border: studentInvoice.applyGst ? '1px solid #10B981' : '1px solid #2B3A5A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ color: '#fff', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={studentInvoice.applyGst || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const base = Number(studentInvoice.subTotal) || 0;
                            const tax = checked ? Math.round(base * 0.18) : 0;
                            setStudentInvoice((prev) => ({
                              ...prev,
                              applyGst: checked,
                              gstRate: 18,
                              taxTotal: tax,
                              grandTotal: base + tax,
                              items: prev.items.map((it) => ({ ...it, taxPercent: checked ? 18 : 0 })),
                            }));
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#3B82F6' }}
                        />
                        <span>Apply 18% GST (Optional)</span>
                      </label>
                      {studentInvoice.applyGst ? (
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 800 }}>+18% GST Added</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748B' }}>0% GST (Exempt)</span>
                      )}
                    </div>
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
                    <label style={{ color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bank & Remittance Details</label>
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
                      placeholder="SWIFT / IFSC Code"
                      onChange={(e) => setStudentInvoice({ ...studentInvoice, bankDetails: { ...studentInvoice.bankDetails, swiftCode: e.target.value } })}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', marginBottom: '4px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <input
                        type="text"
                        value={studentInvoice.bankDetails.businessId || ''}
                        placeholder="Tax / TRN # (Optional)"
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, bankDetails: { ...studentInvoice.bankDetails, businessId: e.target.value } })}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '11px' }}
                      />
                      <input
                        type="text"
                        value={studentInvoice.bankDetails.licenseNumber || ''}
                        placeholder="Trade License # (Optional)"
                        onChange={(e) => setStudentInvoice({ ...studentInvoice, bankDetails: { ...studentInvoice.bankDetails, licenseNumber: e.target.value } })}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '11px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: B2B REMITTANCE RECEIPT EDIT FORM */}
              {mode === 'b2b_receipt' && (
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

              {/* --- 3. UNIVERSITY / B2B COMMISSION CLAIM FORM --- */}
              {mode === 'university_commission' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#60A5FA' }}>
                      Commission Claim Invoice
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                      {(universityInvoice.students || []).length} Student{(universityInvoice.students || []).length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Quick Add Student from ERP */}
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '6px', padding: '8px 10px' }}>
                    <label style={{ display: 'block', color: '#93C5FD', fontSize: '11px', marginBottom: '4px', fontWeight: 700 }}>
                      ⚡ Add Student from ERP (Supports 1, 10, 30+):
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const sId = e.target.value;
                        if (sId) {
                          setSelectedStudentId(sId);
                          const match = erpStudentsList.find((s) => String(s.id) === String(sId));
                          if (match) handleAddErpStudentToUniClaim(match);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '4px',
                        background: '#0B1120',
                        border: '1px solid #3B82F6',
                        color: '#60A5FA',
                        fontWeight: 600,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="">+ Pick Student from ERP to Add to Claim...</option>
                      {erpStudentsList.map((stu) => (
                        <option key={stu.id} value={stu.id}>
                          {stu.name} {stu.country ? `(${stu.country})` : ''} - {stu.university || 'Uni'}
                        </option>
                      ))}
                    </select>

                    {/* Student Commission Link Status & Direct Mark Received Action */}
                    {(selectedStudentId || (universityInvoice.students || []).some((s) => s.erpStudentId)) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ color: '#94A3B8' }}>Commission Status:</span>
                          {universityInvoice.isReceived ? (
                            <span style={{ color: '#10B981', fontWeight: 800 }}>✓ Fully Received</span>
                          ) : (
                            <span style={{ color: '#F59E0B', fontWeight: 800 }}>
                              ⏳ Due: {universityInvoice.currency} {Number(universityInvoice.commissionAmount).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        {!universityInvoice.isReceived ? (
                          <button
                            type="button"
                            onClick={handleMarkCommissionReceived}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'linear-gradient(135deg, #10B981, #059669)',
                              border: 'none',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>💳</span>
                            <span>Mark Commission Received &amp; Sync Profit</span>
                          </button>
                        ) : (
                          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', padding: '5px 8px', borderRadius: '4px', fontSize: '10.5px', textAlign: 'center', fontWeight: 700 }}>
                            ✓ Connected &amp; Settled
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Invoice Meta */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Billed To Type</label>
                      <select
                        value={universityInvoice.recipientType || 'Partner University'}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, recipientType: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '11.5px' }}
                      >
                        <option value="Partner University">Partner University</option>
                        <option value="University Representative">University Representative</option>
                        <option value="B2B Partner Agency">B2B Partner Agency</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Invoice #</label>
                      <input
                        type="text"
                        value={universityInvoice.invoiceNumber}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, invoiceNumber: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Invoice Date</label>
                      <input
                        type="text"
                        value={universityInvoice.invoiceDate}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, invoiceDate: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Terms</label>
                      <input
                        type="text"
                        value={universityInvoice.dueDate}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, dueDate: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>
                      {universityInvoice.recipientType === 'B2B Partner Agency'
                        ? 'B2B Agency Name *'
                        : universityInvoice.recipientType === 'University Representative'
                        ? 'Representative / Company Name *'
                        : 'University Name *'}
                    </label>
                    <input
                      type="text"
                      value={universityInvoice.universityName}
                      onChange={(e) => setUniversityInvoice({ ...universityInvoice, universityName: e.target.value })}
                      placeholder="e.g. MCAST / ApplyBoard / Edvoy"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Address / Country (Optional)</label>
                      <input
                        type="text"
                        value={universityInvoice.universityCampus}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, universityCampus: e.target.value })}
                        placeholder="Campus or Agency Address"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Finance Email (Optional)</label>
                      <input
                        type="text"
                        value={universityInvoice.financeEmail}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, financeEmail: e.target.value })}
                        placeholder="finance@partner.com"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      />
                    </div>
                  </div>

                  {/* Currency & Optional GST */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px' }}>Currency</label>
                      <select
                        value={universityInvoice.currency}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, currency: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff' }}
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="AED">AED (د.إ)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#131B2E', border: '1px solid #2B3A5A', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#CBD5E1' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(universityInvoice.applyGst)}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, applyGst: e.target.checked })}
                        style={{ accentColor: '#6366F1' }}
                      />
                      <span>Add 18% GST</span>
                    </label>
                  </div>

                  {/* Multi-Student Claim List */}
                  <div style={{ borderTop: '1px solid #2B3A5A', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#38BDF8' }}>
                        Students in Claim ({(universityInvoice.students || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddUniStudent}
                        style={{
                          background: '#4F46E5',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 9px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add Student
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '310px', overflowY: 'auto', paddingRight: '2px' }}>
                      {(universityInvoice.students || []).map((stu, idx) => (
                        <div key={stu.id || idx} style={{ background: '#131B2E', border: '1px solid #2B3A5A', borderRadius: '6px', padding: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#93C5FD' }}>Student #{idx + 1}</span>
                            {(universityInvoice.students || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveUniStudent(idx)}
                                style={{ background: 'none', border: 'none', color: '#F87171', fontSize: '11px', cursor: 'pointer' }}
                              >
                                ✕ Remove
                              </button>
                            )}
                          </div>
                          <select
                            value={stu.erpStudentId || ''}
                            onChange={(e) => {
                              if (e.target.value) handleSelectErpStudentForRow(idx, e.target.value);
                            }}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B1120', border: '1px solid #3B82F6', color: '#93C5FD', fontSize: '11px', fontWeight: 600, marginBottom: '5px' }}
                          >
                            <option value="">-- Pick Existing Student from ERP (Auto-fill) --</option>
                            {erpStudentsList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} {s.country ? `(${s.country})` : ''} - {s.university || 'Uni'}
                              </option>
                            ))}
                          </select>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '6px', marginBottom: '5px' }}>
                            <input
                              type="text"
                              placeholder="Student Name *"
                              value={stu.studentName}
                              onChange={(e) => handleUniStudentChange(idx, 'studentName', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', fontSize: '11.5px', fontWeight: 600 }}
                            />
                            <input
                              type="text"
                              placeholder="App / Student ID (Opt)"
                              value={stu.studentId || ''}
                              onChange={(e) => handleUniStudentChange(idx, 'studentId', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', fontSize: '11px' }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '6px', marginBottom: '5px' }}>
                            <input
                              type="text"
                              placeholder="Country (Opt)"
                              value={stu.country || ''}
                              onChange={(e) => handleUniStudentChange(idx, 'country', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', fontSize: '11px' }}
                            />
                            <input
                              type="text"
                              placeholder="University (Opt)"
                              value={stu.university || ''}
                              onChange={(e) => handleUniStudentChange(idx, 'university', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', fontSize: '11px' }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '6px', marginBottom: '5px' }}>
                            <input
                              type="text"
                              placeholder="Course / Program (Opt)"
                              value={stu.courseDetails || ''}
                              onChange={(e) => handleUniStudentChange(idx, 'courseDetails', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', fontSize: '11px' }}
                            />
                            <input
                              type="text"
                              placeholder="Intake (Opt)"
                              value={stu.intake || ''}
                              onChange={(e) => handleUniStudentChange(idx, 'intake', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', fontSize: '11px' }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 1fr', gap: '6px' }}>
                            <input
                              type="number"
                              placeholder="Tuition (Opt)"
                              title="Tuition Fee Paid (Optional)"
                              value={stu.tuitionFeePaid || ''}
                              onChange={(e) => handleUniStudentChange(idx, 'tuitionFeePaid', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', fontSize: '11px' }}
                            />
                            <input
                              type="number"
                              placeholder="Rate %"
                              title="Commission Rate % (Optional)"
                              value={stu.commissionPercent ?? ''}
                              onChange={(e) => handleUniStudentChange(idx, 'commissionPercent', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #334155', color: '#fff', fontSize: '11px' }}
                            />
                            <input
                              type="number"
                              placeholder="Claim Amt *"
                              title="Commission Claim Amount"
                              value={stu.commissionAmount || ''}
                              onChange={(e) => handleUniStudentChange(idx, 'commissionAmount', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#0B0F1C', border: '1px solid #3B82F6', color: '#38BDF8', fontSize: '11.5px', fontWeight: 700 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Receiving Bank Account Selector (Which Sterling Account to Transfer To) */}
                  <div style={{ borderTop: '1px solid #2B3A5A', paddingTop: '10px' }}>
                    <label style={{ display: 'block', color: '#94A3B8', marginBottom: '3px', fontWeight: 700 }}>
                      🏦 Receiving Bank Account (Transfer To Sterling)
                    </label>
                    <select
                      value={universityInvoice.selectedBankId || 'comp-bank-wio-1'}
                      onChange={(e) => {
                        const bId = e.target.value;
                        if (bId === 'comp-bank-axis-1') {
                          setUniversityInvoice((prev) => ({
                            ...prev,
                            selectedBankId: bId,
                            currency: 'INR',
                            companyAddress: '5th Floor, Hi-lite Business Park, Calicut, Kerala, India - 673014',
                            bankDetails: {
                              accountHolder: 'Sterling Study Abroad',
                              businessId: '',
                              bankName: 'Axis Bank',
                              address: 'Tirur / Malappuram Branch, Kerala, India',
                              accountNumber: '921020048291039',
                              iban: 'N/A',
                              swiftCode: 'UTIB0000829',
                              isDomestic: true,
                            },
                          }));
                        } else if (bId === 'comp-bank-fed-1') {
                          setUniversityInvoice((prev) => ({
                            ...prev,
                            selectedBankId: bId,
                            currency: 'INR',
                            companyAddress: '5th Floor, Hi-lite Business Park, Calicut, Kerala, India - 673014',
                            bankDetails: {
                              accountHolder: 'Sterling Study Abroad',
                              businessId: '',
                              bankName: 'Federal Bank',
                              address: 'Valanchery Main Branch, Kerala, India',
                              accountNumber: '14200200039281',
                              iban: 'N/A',
                              swiftCode: 'FDRL0001420',
                              isDomestic: true,
                            },
                          }));
                        } else {
                          setUniversityInvoice((prev) => ({
                            ...prev,
                            selectedBankId: 'comp-bank-wio-1',
                            companyAddress: 'Etihad Airways Centre 5th Floor, Abu Dhabi, United Arab Emirates',
                            bankDetails: {
                              accountHolder: 'Sterling Overseas Consultancy LLC',
                              businessId: 'WIOBAEADXXX',
                              bankName: 'WIO BANK PJSC',
                              address: 'Etihad Airways Centre 5th Floor, Abu Dhabi, UAE',
                              accountNumber: '0860000009569370024',
                              iban: 'AE620860000009569370024',
                              swiftCode: 'WIOBAEADXXX',
                              isDomestic: false,
                            },
                          }));
                        }
                      }}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#131B2E', border: '1px solid #3B82F6', color: '#fff', fontSize: '11.5px', marginBottom: '6px' }}
                    >
                      <option value="comp-bank-wio-1">WIO Bank UAE (EUR/USD/GBP/AED)</option>
                      <option value="comp-bank-axis-1">Axis Bank (India - INR)</option>
                      <option value="comp-bank-fed-1">Federal Bank (India - INR)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Account Holder"
                      value={universityInvoice.bankDetails?.accountHolder || ''}
                      onChange={(e) => setUniversityInvoice({ ...universityInvoice, bankDetails: { ...universityInvoice.bankDetails, accountHolder: e.target.value } })}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '11px', marginBottom: '4px' }}
                    />
                    <input
                      type="text"
                      placeholder="Beneficiary Address (Foreign / India)"
                      value={universityInvoice.companyAddress || ''}
                      onChange={(e) => setUniversityInvoice({ ...universityInvoice, companyAddress: e.target.value })}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '11px', marginBottom: '4px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Account No / IBAN"
                        value={universityInvoice.bankDetails?.isDomestic ? (universityInvoice.bankDetails?.accountNumber || '') : (universityInvoice.bankDetails?.iban || '')}
                        onChange={(e) => setUniversityInvoice({
                          ...universityInvoice,
                          bankDetails: {
                            ...universityInvoice.bankDetails,
                            accountNumber: e.target.value,
                            iban: e.target.value,
                          },
                        })}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '11px' }}
                      />
                      <input
                        type="text"
                        placeholder="SWIFT / IFSC Code"
                        value={universityInvoice.bankDetails?.swiftCode || ''}
                        onChange={(e) => setUniversityInvoice({ ...universityInvoice, bankDetails: { ...universityInvoice.bankDetails, swiftCode: e.target.value } })}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: '#131B2E', border: '1px solid #2B3A5A', color: '#fff', fontSize: '11px' }}
                      />
                    </div>
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
                overflow: 'hidden',
              }}
            >
              {/* Absolute background letterhead stationery: 100% fidelity, ZERO text displacement */}
              {includeLetterheadBg && (
                <img
                  src="/sterling-letterhead.jpg"
                  alt="Sterling Study Abroad Letterhead"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* PRINT CONTENT REF */}
              <div
                ref={printContainerRef}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  minHeight: '1123px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: includeLetterheadBg ? '196px 42px 36px 42px' : '36px 42px 36px 42px',
                  boxSizing: 'border-box',
                }}
              >
                
                {/* ======================================================== */}
                {/* 1. DUBAI STUDENT INVOICE & OFFICIAL RECEIPT */}
                {/* ======================================================== */}
                {mode === 'dubai_invoice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', position: 'relative' }}>
                    <div>
                      {/* Top Entity & Title */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                          {!includeLetterheadBg ? (
                            <>
                              <div style={{ fontWeight: 900, fontSize: '16px', color: '#000000', letterSpacing: '-0.2px', marginBottom: '2px' }}>
                                {studentInvoice.companyName || 'Sterling Study Abroad'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {studentInvoice.bankDetails?.isDomestic
                                  ? (studentInvoice.bankDetails?.licenseNumber?.trim() ? `Higher Education & Visa Advisory • ${studentInvoice.bankDetails.licenseNumber}` : 'Higher Education & Visa Advisory')
                                  : (studentInvoice.companyName === 'Sterling Study Abroad'
                                      ? 'International Admissions & Higher Education'
                                      : (studentInvoice.bankDetails?.licenseNumber?.trim() ? `International Admissions & Higher Education • ${studentInvoice.bankDetails.licenseNumber}` : 'International Admissions & Higher Education'))}
                              </div>
                              {studentInvoice.companyAddress && (
                                <div style={{ fontSize: '10px', color: '#334155', fontWeight: 600, marginTop: '2px', maxWidth: '380px' }}>
                                  {studentInvoice.companyAddress}
                                </div>
                              )}
                            </>
                          ) : (
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 900, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {studentInvoice.companyName || 'Sterling Study Abroad'}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
                                {studentInvoice.bankDetails?.isDomestic 
                                  ? 'Central Admissions & Student Accounts Division' 
                                  : 'International Admissions & Student Accounts Division'}
                              </div>
                              {studentInvoice.companyAddress && (
                                <div style={{ fontSize: '9.5px', color: '#475569', fontWeight: 600, marginTop: '1px', maxWidth: '380px' }}>
                                  {studentInvoice.companyAddress}
                                </div>
                              )}
                              {studentInvoice.bankDetails?.businessId?.trim() ? (
                                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>
                                  Tax / Reg ID: {studentInvoice.bankDetails.businessId}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#000000', letterSpacing: '1px' }}>
                            {studentDocType === 'receipt' ? 'OFFICIAL RECEIPT' : (studentInvoice.docHeading || 'INVOICE')}
                          </h1>
                          <div style={{ fontSize: '10.5px', color: studentDocType === 'receipt' ? '#047857' : '#2563EB', fontWeight: 800 }}>
                            {studentDocType === 'receipt' ? 'SERVICE FEE PAYMENT CONFIRMATION' : 'OVERSEAS EDUCATION PROCESSING FEE'}
                          </div>
                        </div>
                      </div>

                      {/* 2-Column Meta Table (Bill TO & Invoice Details) */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', width: '54%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>
                                {studentDocType === 'receipt' ? 'RECEIVED FROM (CANDIDATE):' : 'BILL TO:'}
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: 900, color: '#000000', letterSpacing: '0.2px' }}>
                                {studentInvoice.studentName || 'STUDENT NAME'}
                              </div>
                              {studentInvoice.passportNumber && (
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E293B', marginTop: '3px' }}>
                                  Passport / KYC: <span style={{ fontFamily: 'monospace' }}>{studentInvoice.passportNumber}</span>
                                </div>
                              )}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', width: '46%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>{studentDocType === 'receipt' ? 'Receipt #:' : 'Invoice #:'}</span>
                                <span style={{ fontWeight: 900, color: '#000000', fontFamily: 'monospace', fontSize: '12px' }}>{studentInvoice.invoiceNumber}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Date:</span>
                                <span style={{ fontWeight: 700, color: '#000000' }}>{studentInvoice.invoiceDate}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ fontSize: '11px', color: '#000000', marginBottom: '3px', lineHeight: 1.4 }}>
                                <span style={{ fontWeight: 800 }}>Address (India KYC): </span>
                                <span>{studentInvoice.studentAddress || 'Kerala, India'}</span>
                              </div>
                              {studentInvoice.destinationCountry && (
                                <div style={{ fontSize: '11px', color: '#000000', marginBottom: '3px' }}>
                                  <span style={{ fontWeight: 800 }}>Destination Country: </span>
                                  <span style={{ fontWeight: 700 }}>{studentInvoice.destinationCountry}</span>
                                </div>
                              )}
                              {studentInvoice.courseDetails && (
                                <div style={{ fontSize: '11px', color: '#000000', fontWeight: 600 }}>
                                  <span style={{ fontWeight: 800 }}>Course / Program: </span>
                                  <span>{studentInvoice.courseDetails} {studentInvoice.intake ? `(${studentInvoice.intake})` : ''}</span>
                                </div>
                              )}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Payment Terms:</span>
                                <span style={{ fontWeight: 700, color: '#000000' }}>{studentDocType === 'receipt' ? 'Settled in Full' : studentInvoice.terms}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>{studentDocType === 'receipt' ? 'Settlement Status:' : 'Due Date:'}</span>
                                <span style={{ fontWeight: 900, color: studentDocType === 'receipt' ? '#047857' : '#000000' }}>
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
                            <th style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'left', fontWeight: 900, color: '#000000' }}>Service &amp; Particulars</th>
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
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', fontWeight: 700, color: '#000000' }}>
                                <div>{it.description}</div>
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                                {it.quantity}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#000000' }}>
                                {Number(it.unitPrice).toLocaleString()} {studentInvoice.currency}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                                {it.taxPercent.toFixed(2)}%
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#000000' }}>
                                {Number(it.amount).toLocaleString()} {studentInvoice.currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals Section */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <div style={{ width: '280px', fontSize: '13px', lineHeight: 1.8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#000000' }}>
                            <span>Sub Total:</span>
                            <span>{Number(studentInvoice.subTotal).toLocaleString()} {studentInvoice.currency}</span>
                          </div>
                          {studentInvoice.applyGst ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#000000' }}>
                              <span>GST ({studentInvoice.gstRate || 18}%):</span>
                              <span>+{Number(studentInvoice.taxTotal).toLocaleString()} {studentInvoice.currency}</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#000000' }}>
                              <span>Total (Tax):</span>
                              <span>0.00</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '15px', borderTop: '2px solid #000000', paddingTop: '4px', marginTop: '4px', color: '#000000' }}>
                            <span>Total Payable:</span>
                            <span>{Number(studentInvoice.grandTotal).toLocaleString()} {studentInvoice.currency}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bank Details Table (Domestic vs Forex) */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontWeight: 900, fontSize: '11.5px', textTransform: 'uppercase', marginBottom: '4px', color: '#000000', letterSpacing: '0.4px' }}>
                          🏦 Remittance Account Details ({studentInvoice.bankDetails?.isDomestic ? 'Domestic Indian Banking' : 'International Forex Wire / SWIFT'}):
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 10px', width: '30%', fontWeight: 800, color: '#000000' }}>Account Holder:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 900, color: '#000000' }}>{studentInvoice.bankDetails.accountHolder}</td>
                            </tr>
                            {!studentInvoice.bankDetails?.isDomestic && studentInvoice.companyAddress && (
                              <tr>
                                <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>Beneficiary Foreign Address:</td>
                                <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 700, color: '#000000' }}>
                                  {studentInvoice.companyAddress}
                                </td>
                              </tr>
                            )}
                            {studentInvoice.bankDetails?.businessId?.trim() ? (
                              <tr>
                                <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>Tax / Reg Identification:</td>
                                <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 700, color: '#000000' }}>{studentInvoice.bankDetails.businessId}</td>
                              </tr>
                            ) : null}
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>Bank Name &amp; Branch:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 900, color: '#047857' }}>
                                {studentInvoice.bankDetails.bankName} &bull; {studentInvoice.bankDetails.address}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>Account Number:</td>
                              <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                                {studentInvoice.bankDetails.accountNumber}
                              </td>
                            </tr>
                            {!studentInvoice.bankDetails?.isDomestic ? (
                              <>
                                <tr>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>IBAN (Cross-Border Wire):</td>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                                    {studentInvoice.bankDetails.iban}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>SWIFT / BIC Code:</td>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                                    {studentInvoice.bankDetails.swiftCode}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>Remittance Purpose (RBI LRS):</td>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 700, color: '#000000' }}>
                                    Education Consultancy &amp; Student Visa Facilitation (RBI Purpose Code: S0305)
                                  </td>
                                </tr>
                              </>
                            ) : (
                              <>
                                <tr>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>IFSC Code:</td>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                                    {studentInvoice.bankDetails.swiftCode}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 800, color: '#000000' }}>Transfer Purpose:</td>
                                  <td style={{ border: '1.5px solid #000000', padding: '5px 10px', fontWeight: 700, color: '#000000' }}>
                                    Higher Education Admission &amp; Visa Advisory Services
                                  </td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Note */}
                      <div style={{ fontSize: '10.5px', color: '#475569', fontStyle: 'italic', fontWeight: 600 }}>
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

                    {/* Authorized Signature & Corporate Seal Block */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '22px' }}>
                      <div style={{ fontSize: '9.5px', color: '#475569', lineHeight: '1.4', maxWidth: '380px' }}>
                        <div>* <strong>Bank &amp; Educational Loan Clearance Note:</strong> This is an authentic {studentDocType === 'receipt' ? 'official fee receipt' : 'official invoice'} issued for higher education consultation, university admission, and international student visa facilitation.</div>
                        <div style={{ marginTop: '2px' }}>{studentInvoice.bankDetails?.accountHolder || 'Sterling Overseas Consultancy LLC'} &bull; www.sterlingstudyabroad.com</div>
                      </div>
                      <div style={{ textAlign: 'center', width: '220px', position: 'relative' }}>
                        {/* Realistic Stamp Seal for Invoice */}
                        <div
                          style={{
                            border: '2px solid #1E3A8A',
                            borderRadius: '50%',
                            width: '76px',
                            height: '76px',
                            margin: '0 auto -28px auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#1E3A8A',
                            transform: 'rotate(-8deg)',
                            opacity: 0.85,
                            fontSize: '7.5px',
                            fontWeight: 900,
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase',
                            background: 'rgba(239, 246, 255, 0.4)',
                          }}
                        >
                          <div>STERLING</div>
                          <div style={{ fontSize: '8.5px', fontWeight: 900, color: '#1E40AF' }}>★ VERIFIED ★</div>
                          <div>ACCOUNTS</div>
                        </div>
                        <div style={{ height: '32px', borderBottom: '1.5px solid #000000', marginBottom: '5px' }}></div>
                        <div style={{ fontWeight: 900, fontSize: '11px', color: '#000000' }}>
                          {studentInvoice.bankDetails?.isDomestic ? 'Sterling Study Abroad' : 'Sterling Overseas Consultancy LLC'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#000000', fontWeight: 600 }}>Authorized Signatory</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* 2. B2B REMITTANCE RECEIPT OR PAYMENT REQUISITION VOUCHER */}
                {/* ======================================================== */}
                {mode === 'b2b_receipt' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', position: 'relative' }}>
                    <div>
                      {/* Top Entity & Title */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                          {!includeLetterheadBg && (
                            <div style={{ fontWeight: 900, fontSize: '16px', color: '#000000', marginBottom: '2px' }}>
                              Sterling Study Abroad &amp; Overseas Consultancy
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Central Accounts &amp; Finance Division
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px' }}>
                            {b2bReceipt.status === 'PAID' ? 'PAYMENT REMITTANCE RECEIPT' : 'PAYMENT REQUISITION & APPROVAL SLIP'}
                          </h2>
                          <div style={{ fontSize: '11px', color: b2bReceipt.status === 'PAID' ? '#047857' : '#D97706', fontWeight: 800, marginTop: '2px' }}>
                            {b2bReceipt.status === 'PAID' ? 'DISBURSEMENT VOUCHER & PAYMENT ADVICE' : 'ACCOUNTS DISBURSEMENT ORDER • STERLING ACCOUNTS CLEARANCE'}
                          </div>
                        </div>
                      </div>

                      {/* Metadata Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', width: '52%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ fontSize: '11px', color: '#000000', fontWeight: 800 }}>
                                {b2bReceipt.status === 'PAID' ? 'PAID TO / BENEFICIARY:' : 'BENEFICIARY PAYEE:'}
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: 900, color: '#000000' }}>
                                {b2bReceipt.partnerName || 'PARTNER COMPANY'}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', width: '48%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>
                                  {b2bReceipt.status === 'PAID' ? 'Remittance Receipt #:' : 'Requisition Voucher #:'}
                                </span>
                                <span style={{ fontWeight: 900, color: '#000000' }}>{b2bReceipt.receiptNumber}</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ fontSize: '11px', color: '#000000', fontWeight: 800 }}>FOR CANDIDATE(S):</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#000000' }}>
                                {b2bReceipt.studentNames || 'General'}
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>
                                  {b2bReceipt.status === 'PAID' ? 'Payment Settled Date:' : 'Requisition Date:'}
                                </span>
                                <span style={{ fontWeight: 800, color: b2bReceipt.status === 'PAID' ? '#047857' : '#D97706' }}>
                                  {b2bReceipt.status === 'PAID' ? b2bReceipt.settledDate : b2bReceipt.voucherDate}
                                </span>
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
                                <span
                                  style={{
                                    fontWeight: 900,
                                    color: b2bReceipt.status === 'PAID' ? '#047857' : '#D97706',
                                    background: b2bReceipt.status === 'PAID' ? '#E6F4EA' : '#FEF3C7',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                  }}
                                >
                                  {b2bReceipt.status === 'PAID' ? '✓ SETTLED & PAID' : '⏳ PENDING APPROVAL & RELEASE'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* BANKING INSTRUCTIONS: RECEIVER ACCOUNT vs DEBIT ACCOUNT */}
                      {(() => {
                        const receiverAcc = parseTransferAccountDetails(b2bReceipt.transferAccount, b2bReceipt.partnerName);
                        const payingBank = companyBanks.find((b) => b.id === b2bReceipt.selectedPayingBankId) || companyBanks[0];

                        return (
                          <div style={{ marginBottom: '18px' }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1.15fr 0.85fr',
                              border: '1.5px solid #000000',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              background: '#ffffff',
                            }}>
                              {/* LEFT COLUMN: RECEIVER (BENEFICIARY) BANK ACCOUNT */}
                              <div style={{
                                padding: '12px 14px',
                                borderRight: '1.5px solid #000000',
                                background: '#FAFAFA',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                                fontSize: '11px',
                                color: '#000000',
                              }}>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: 900,
                                  color: '#1E293B',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  borderBottom: '1px solid #CBD5E1',
                                  paddingBottom: '4px',
                                  marginBottom: '3px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}>
                                  <span>🏦</span>
                                  <span>Receiver / Beneficiary Account (Credit To)</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ color: '#64748B', fontWeight: 600 }}>Beneficiary Payee:</span>
                                  <strong style={{ color: '#0F172A', fontSize: '12px', textAlign: 'right' }}>
                                    {receiverAcc.beneficiary || b2bReceipt.partnerName}
                                  </strong>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ color: '#64748B', fontWeight: 600 }}>Bank Name:</span>
                                  <strong style={{ color: '#0F172A', textAlign: 'right' }}>{receiverAcc.bankName}</strong>
                                </div>

                                <div style={{
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  padding: '6px 10px',
                                  margin: '2px 0',
                                }}>
                                  <div style={{ fontSize: '9.5px', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>
                                    Account Number / IBAN (Transfer To)
                                  </div>
                                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', letterSpacing: '0.8px', fontFamily: 'monospace' }}>
                                    {receiverAcc.accountNumber}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <span style={{ color: '#64748B', fontWeight: 600 }}>IFSC Code: </span>
                                    <strong style={{ color: '#0F172A', fontFamily: 'monospace', fontWeight: 900 }}>{receiverAcc.ifsc}</strong>
                                  </div>
                                  {receiverAcc.upiId && (
                                    <div>
                                      <span style={{ color: '#64748B', fontWeight: 600 }}>UPI ID: </span>
                                      <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{receiverAcc.upiId}</strong>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* RIGHT COLUMN: DISBURSING (STERLING) ACCOUNT */}
                              <div style={{
                                padding: '12px 14px',
                                background: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                                fontSize: '11px',
                                color: '#000000',
                              }}>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: 900,
                                  color: '#1E293B',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  borderBottom: '1px solid #CBD5E1',
                                  paddingBottom: '4px',
                                  marginBottom: '3px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}>
                                  <span>🏢</span>
                                  <span>Disbursing Account (Debit From)</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ color: '#64748B', fontWeight: 600 }}>Sterling Bank:</span>
                                  <strong style={{ color: '#0F172A', fontSize: '12px', textAlign: 'right' }}>
                                    {payingBank?.bank_name || 'Sterling Operations Bank'}
                                  </strong>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ color: '#64748B', fontWeight: 600 }}>Branch / Location:</span>
                                  <strong style={{ color: '#0F172A', textAlign: 'right' }}>
                                    {payingBank?.branch || 'Calicut Main / Hi-Lite'}
                                  </strong>
                                </div>

                                <div style={{
                                  background: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '4px',
                                  padding: '6px 10px',
                                  margin: '2px 0',
                                }}>
                                  <div style={{ fontSize: '9.5px', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>
                                    Debit Account # (Sterling Current)
                                  </div>
                                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                                    {payingBank?.account_number || 'Primary Operations Current A/C'}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <span style={{ color: '#64748B', fontWeight: 600 }}>Transfer Mode: </span>
                                    <strong style={{ color: '#0F172A' }}>{b2bReceipt.paymentMode || 'NEFT / RTGS'}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748B', fontWeight: 600 }}>Bank UTR: </span>
                                    <strong style={{ color: b2bReceipt.status === 'PAID' ? '#047857' : '#D97706', fontFamily: 'monospace' }}>
                                      {b2bReceipt.status === 'PAID' ? b2bReceipt.utrNumber : '[Pending]'}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Financial Dissection Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                        <thead>
                          <tr style={{ background: '#E2E8F0' }}>
                            <th style={{ border: '1.5px solid #000000', padding: '7px 10px', textAlign: 'center', width: '35px', fontWeight: 900, color: '#000000' }}>#</th>
                            <th style={{ border: '1.5px solid #000000', padding: '7px 10px', textAlign: 'left', fontWeight: 900, color: '#000000' }}>Particulars / Service Description</th>
                            <th style={{ border: '1.5px solid #000000', padding: '7px 10px', textAlign: 'center', width: '105px', fontWeight: 900, color: '#000000' }}>Tax / GST</th>
                            <th style={{ border: '1.5px solid #000000', padding: '7px 10px', textAlign: 'right', width: '135px', fontWeight: 900, color: '#000000' }}>
                              {b2bReceipt.status === 'PAID' ? 'Amount Settled' : 'Amount to Disburse'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 10px', textAlign: 'center', fontWeight: 800, color: '#000000', verticalAlign: 'top' }}>
                              1
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 10px', fontWeight: 700, color: '#000000' }}>
                              <div style={{ fontSize: '12px', fontWeight: 900, color: '#000000' }}>
                                {b2bReceipt.purpose || 'Sub-Agent Commission & Candidate Processing'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                                Candidate Reference: <strong style={{ color: '#000000' }}>{b2bReceipt.studentNames || 'General'}</strong>
                              </div>
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: '#000000', verticalAlign: 'top' }}>
                              {b2bReceipt.gstRate > 0 ? `${b2bReceipt.gstRate}% GST` : '0% (Exempt)'}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#000000', verticalAlign: 'top', fontSize: '12.5px' }}>
                              ₹{Number(b2bReceipt.baseAmount).toLocaleString('en-IN')} {b2bReceipt.currency}
                            </td>
                          </tr>

                          {b2bReceipt.gstAmount > 0 && (
                            <tr>
                              <td style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                                2
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '8px 10px', fontWeight: 700, color: '#000000' }}>
                                Goods and Services Tax (GST @ 18.00%)
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#000000' }}>
                                18.00%
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#000000', fontSize: '12.5px' }}>
                                +₹{Number(b2bReceipt.gstAmount).toLocaleString('en-IN')} {b2bReceipt.currency}
                              </td>
                            </tr>
                          )}

                          {/* Grand Total Row */}
                          <tr style={{ background: '#F8FAFC' }}>
                            <td colSpan={2} style={{ border: '1.5px solid #000000', padding: '10px 12px', fontWeight: 900, fontSize: '12.5px', color: '#000000' }}>
                              {b2bReceipt.status === 'PAID' ? 'TOTAL REMITTANCE SETTLED (NET PAID)' : 'TOTAL NET PAYABLE AMOUNT (INCL. GST)'}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '10px', textAlign: 'center', fontWeight: 900, color: '#000000' }}>
                              FULL
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '10px 12px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: b2bReceipt.status === 'PAID' ? '#047857' : '#0F172A' }}>
                              ₹{Number(b2bReceipt.totalDisbursed).toLocaleString('en-IN')} {b2bReceipt.currency}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Amount in Words Box */}
                      <div style={{
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: '#000000',
                        marginBottom: '10px',
                      }}>
                        <span style={{ fontWeight: 800, color: '#475569' }}>Amount in Words: </span>
                        <strong style={{ color: '#0F172A' }}>{numberToWordsINR(b2bReceipt.totalDisbursed)}</strong>
                      </div>

                      {/* Remarks */}
                      {b2bReceipt.remarks && (
                        <div style={{ fontSize: '11px', color: '#334155', fontStyle: 'italic', marginBottom: '14px', fontWeight: 600 }}>
                          Note / Reference: {b2bReceipt.remarks}
                        </div>
                      )}
                    </div>

                    {/* OFFICIAL "PAID" RUBBER STAMP (ONLY IF ACTUALLY COMPLETED!) */}
                    {b2bReceipt.status === 'PAID' && showPaidSeal && (
                      <div
                        className="rubber-stamp"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '15px',
                          border: '3px dashed #047857',
                          color: '#047857',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontWeight: 900,
                          transform: 'rotate(-5deg)',
                          background: 'rgba(240, 253, 244, 0.95)',
                          boxShadow: '0 0 0 3px rgba(4, 120, 87, 0.2)',
                          zIndex: 20,
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9, color: '#047857' }}>
                          STERLING OVERSEAS
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '1px', margin: '1px 0', color: '#047857' }}>
                          ★ PAID ★
                        </div>
                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#047857' }}>
                          DATE: {b2bReceipt.settledDate}
                        </div>
                        <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.4px', marginTop: '1px', color: '#047857' }}>
                          UTR: {b2bReceipt.utrNumber}
                        </div>
                        <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px', opacity: 0.85, color: '#047857' }}>
                          VERIFIED REMITTANCE
                        </div>
                      </div>
                    )}

                    {/* PENDING APPROVAL RUBBER WATERMARK (WHEN AWAITING APPROVAL) */}
                    {b2bReceipt.status !== 'PAID' && (
                      <div
                        className="rubber-stamp"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '15px',
                          border: '2.5px dashed #D97706',
                          color: '#D97706',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontWeight: 900,
                          transform: 'rotate(-5deg)',
                          background: 'rgba(254, 243, 199, 0.95)',
                          boxShadow: '0 0 0 3px rgba(217, 119, 6, 0.15)',
                          zIndex: 20,
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ fontSize: '8.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#D97706' }}>
                          STERLING ERP
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 900, margin: '1px 0', color: '#D97706' }}>
                          ⏳ PENDING CLEARANCE
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#D97706' }}>
                          Awaiting Accounts Clearance
                        </div>
                      </div>
                    )}

                    {/* Bottom Signatories: 1-Box for Paid, 3-Columns for Pending Authorization */}
                    {b2bReceipt.status === 'PAID' ? (
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
                    ) : (
                      <div style={{ marginTop: '20px', borderTop: '1.5px solid #000000', paddingTop: '10px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#000000', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Accounts Department Verification &amp; Authorization Workflow:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '10px' }}>
                          <div style={{ border: '1px solid #000000', padding: '8px', borderRadius: '4px', background: '#F8FAFC' }}>
                            <div style={{ fontWeight: 800, color: '#000000', marginBottom: '20px' }}>1. Prepared By (Verification Desk):</div>
                            <div style={{ borderBottom: '1px solid #000000', marginBottom: '3px' }}></div>
                            <div style={{ color: '#000000', fontWeight: 600 }}>Signature &amp; Date</div>
                          </div>
                          <div style={{ border: '1.5px solid #047857', padding: '8px', borderRadius: '4px', background: '#F0FDF4' }}>
                            <div style={{ fontWeight: 900, color: '#047857', marginBottom: '20px' }}>2. Authorized (Accounts Manager):</div>
                            <div style={{ borderBottom: '1px solid #047857', marginBottom: '3px' }}></div>
                            <div style={{ color: '#047857', fontWeight: 700 }}>Accounts Clearance Sign &amp; Date</div>
                          </div>
                          <div style={{ border: '1px solid #000000', padding: '8px', borderRadius: '4px', background: '#F8FAFC' }}>
                            <div style={{ fontWeight: 800, color: '#000000', marginBottom: '20px' }}>3. Disbursed From Sterling Bank:</div>
                            <div style={{ borderBottom: '1px solid #000000', marginBottom: '3px' }}></div>
                            <div style={{ color: '#000000', fontWeight: 600 }}>Bank A/C, UTR &amp; Date</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ======================================================== */}
                {/* 3. UNIVERSITY COMMISSION CLAIM INVOICE CANVAS            */}
                {/* ======================================================== */}
                {mode === 'university_commission' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', position: 'relative' }}>
                    
                    {/* COMMISSION RECEIVED RUBBER STAMP SEAL */}
                    {universityInvoice.isReceived && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '35%',
                          right: '10%',
                          transform: 'rotate(-16deg)',
                          border: '4px dashed #059669',
                          color: '#059669',
                          padding: '10px 22px',
                          borderRadius: '8px',
                          fontSize: '18px',
                          fontWeight: 900,
                          letterSpacing: '1.5px',
                          pointerEvents: 'none',
                          opacity: 0.88,
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          zIndex: 10,
                          boxShadow: '0 0 0 2px rgba(5, 150, 105, 0.15)',
                        }}
                      >
                        ★ COMMISSION RECEIVED ★
                        <div style={{ fontSize: '10.5px', fontWeight: 800, marginTop: '2px', letterSpacing: '1px' }}>
                          SETTLED TO STERLING
                        </div>
                      </div>
                    )}

                    <div>
                      {/* Top Entity & Title (Hides duplicate company name when letterhead is active) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                        <div>
                          {!includeLetterheadBg ? (
                            <>
                              <div style={{ fontWeight: 900, fontSize: '16px', color: '#000000' }}>
                                Sterling Study Abroad &amp; Overseas Consultancy LLC
                              </div>
                              <div style={{ fontSize: '11px', color: '#000000', fontWeight: 700 }}>
                                Global University Partnerships &amp; Recruitment Division
                              </div>
                              <div style={{ fontSize: '10px', color: '#000000', marginTop: '2px' }}>
                                Etihad Airways Centre 5th Floor, Abu Dhabi, UAE &bull; Hi-Lite Business Park, Calicut
                              </div>
                            </>
                          ) : (
                            <div>
                              <div style={{ fontSize: '12px', color: '#000000', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Global University Partnerships &amp; Recruitment Division
                              </div>
                              <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600 }}>
                                International Admissions &amp; Enrolment Agency Desk
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#000000', letterSpacing: '0.5px' }}>
                            COMMISSION INVOICE
                          </h2>
                          <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 800, marginTop: '2px' }}>
                            AGENCY ENROLMENT CLAIM
                          </div>
                        </div>
                      </div>

                      {/* Header Meta Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', width: '55%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>
                                BILLED TO ({(universityInvoice.recipientType || 'Partner University').toUpperCase()}):
                              </div>
                              <div style={{ fontSize: '14.5px', fontWeight: 900, color: '#000000', marginTop: '2px' }}>
                                {universityInvoice.universityName || 'PARTNER UNIVERSITY / AGENCY'}
                              </div>
                              {universityInvoice.universityCampus && (
                                <div style={{ fontSize: '11px', color: '#000000', fontWeight: 600 }}>
                                  {universityInvoice.universityCampus}
                                </div>
                              )}
                              {universityInvoice.financeEmail && (
                                <div style={{ fontSize: '10.5px', color: '#000000', marginTop: '2px' }}>
                                  Attn: Finance / Accounts ({universityInvoice.financeEmail})
                                </div>
                              )}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px 12px', width: '45%', verticalAlign: 'top', background: '#ffffff', color: '#000000' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Invoice No:</span>
                                <span style={{ fontWeight: 900, color: '#000000', fontFamily: 'monospace' }}>{universityInvoice.invoiceNumber}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Invoice Date:</span>
                                <span style={{ fontWeight: 700, color: '#000000' }}>{universityInvoice.invoiceDate}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Payment Terms:</span>
                                <span style={{ fontWeight: 700, color: '#2563EB' }}>{universityInvoice.dueDate}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 800, color: '#000000' }}>Total Candidates:</span>
                                <span style={{ fontWeight: 800, color: '#000000' }}>{(universityInvoice.students || []).length} Student{(universityInvoice.students || []).length > 1 ? 's' : ''}</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Multi-Student Commission Schedule Table */}
                      {(() => {
                        const stuRows = universityInvoice.students && universityInvoice.students.length > 0
                          ? universityInvoice.students
                          : [{
                              studentName: universityInvoice.studentName,
                              studentId: universityInvoice.studentId,
                              country: '',
                              university: universityInvoice.universityName,
                              courseDetails: universityInvoice.courseDetails,
                              intake: universityInvoice.intake,
                              tuitionFeePaid: universityInvoice.tuitionFeePaid,
                              commissionPercent: universityInvoice.commissionPercent,
                              commissionAmount: universityInvoice.commissionAmount,
                            }];
                        const subTotal = stuRows.reduce((s, r) => s + (Number(r.commissionAmount) || 0), 0);
                        const gstAmt = universityInvoice.applyGst ? Math.round(subTotal * ((Number(universityInvoice.gstRate) || 18) / 100)) : 0;
                        const grandTotal = subTotal + gstAmt;

                        return (
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '11px' }}>
                            <thead>
                              <tr style={{ background: '#E2E8F0' }}>
                                <th style={{ border: '1.5px solid #000000', padding: '7px 6px', textAlign: 'center', width: '36px', fontWeight: 900, color: '#000000' }}>#</th>
                                <th style={{ border: '1.5px solid #000000', padding: '7px 8px', textAlign: 'left', width: '26%', fontWeight: 900, color: '#000000' }}>Student &amp; ID</th>
                                <th style={{ border: '1.5px solid #000000', padding: '7px 8px', textAlign: 'left', fontWeight: 900, color: '#000000' }}>Country / University / Course</th>
                                <th style={{ border: '1.5px solid #000000', padding: '7px 8px', textAlign: 'center', width: '105px', fontWeight: 900, color: '#000000' }}>Tuition / Rate</th>
                                <th style={{ border: '1.5px solid #000000', padding: '7px 8px', textAlign: 'right', width: '115px', fontWeight: 900, color: '#000000' }}>Claim Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stuRows.map((row, idx) => (
                                <tr key={row.id || idx}>
                                  <td style={{ border: '1.5px solid #000000', padding: '7px 6px', textAlign: 'center', fontWeight: 800, color: '#000000' }}>{idx + 1}</td>
                                  <td style={{ border: '1.5px solid #000000', padding: '7px 8px', color: '#000000', verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: 900, fontSize: '11.5px' }}>{row.studentName || 'STUDENT NAME'}</div>
                                    {row.studentId && (
                                      <div style={{ fontSize: '10px', color: '#334155', fontFamily: 'monospace' }}>ID: {row.studentId}</div>
                                    )}
                                  </td>
                                  <td style={{ border: '1.5px solid #000000', padding: '7px 8px', color: '#000000', verticalAlign: 'top', lineHeight: 1.35 }}>
                                    {row.country && (
                                      <div><strong>Country:</strong> {row.country}</div>
                                    )}
                                    {row.university && (
                                      <div><strong>University:</strong> {row.university}</div>
                                    )}
                                    {row.courseDetails && (
                                      <div><strong>Course:</strong> {row.courseDetails}{row.intake ? ` (${row.intake})` : ''}</div>
                                    )}
                                    {!row.country && !row.university && !row.courseDetails && (
                                      <span style={{ color: '#475569' }}>Student Recruitment &amp; Enrolment Commission{row.intake ? ` (${row.intake})` : ''}</span>
                                    )}
                                  </td>
                                  <td style={{ border: '1.5px solid #000000', padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: '#000000', verticalAlign: 'top' }}>
                                    {Number(row.tuitionFeePaid) > 0 ? (
                                      <>
                                        <div>{Number(row.tuitionFeePaid).toLocaleString()} {universityInvoice.currency}</div>
                                        {Number(row.commissionPercent) > 0 && (
                                          <div style={{ fontSize: '10px', color: '#334155' }}>@ {row.commissionPercent}%</div>
                                        )}
                                      </>
                                    ) : (
                                      <span>Agreed Fee</span>
                                    )}
                                  </td>
                                  <td style={{ border: '1.5px solid #000000', padding: '7px 8px', textAlign: 'right', fontWeight: 900, color: '#000000', verticalAlign: 'top' }}>
                                    {Number(row.commissionAmount || 0).toLocaleString()} {universityInvoice.currency}
                                  </td>
                                </tr>
                              ))}

                              {universityInvoice.applyGst && (
                                <>
                                  <tr>
                                    <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '7px 10px', fontWeight: 800, textAlign: 'right', color: '#000000' }}>
                                      Sub Total:
                                    </td>
                                    <td style={{ border: '1.5px solid #000000', padding: '7px 8px', textAlign: 'right', fontWeight: 800, color: '#000000' }}>
                                      {subTotal.toLocaleString()} {universityInvoice.currency}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '7px 10px', fontWeight: 800, textAlign: 'right', color: '#000000' }}>
                                      GST ({universityInvoice.gstRate || 18}%):
                                    </td>
                                    <td style={{ border: '1.5px solid #000000', padding: '7px 8px', textAlign: 'right', fontWeight: 800, color: '#000000' }}>
                                      +{gstAmt.toLocaleString()} {universityInvoice.currency}
                                    </td>
                                  </tr>
                                </>
                              )}

                              {/* Grand Total */}
                              <tr style={{ background: '#F1F5F9' }}>
                                <td colSpan={4} style={{ border: '1.5px solid #000000', padding: '9px 10px', fontWeight: 900, textAlign: 'right', color: '#000000' }}>
                                  TOTAL AGENCY COMMISSION PAYABLE ({stuRows.length} Candidate{stuRows.length > 1 ? 's' : ''}):
                                </td>
                                <td style={{ border: '1.5px solid #000000', padding: '9px 8px', textAlign: 'right', fontWeight: 900, fontSize: '14px', color: '#2563EB' }}>
                                  {grandTotal.toLocaleString()} {universityInvoice.currency}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        );
                      })()}

                      {/* Remittance Bank Information (Receiving Account) */}
                      <div style={{ border: '1.5px solid #000000', padding: '10px 12px', background: '#ffffff', borderRadius: '4px', marginBottom: '12px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#000000', textTransform: 'uppercase', marginBottom: '5px' }}>
                          🏦 Remittance Bank Details ({universityInvoice.bankDetails?.isDomestic ? 'Domestic Transfer to Sterling' : 'International Wire Payment to Sterling'}):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: '11px', color: '#000000' }}>
                          <div>Account Holder: <strong>{universityInvoice.bankDetails?.accountHolder}</strong></div>
                          <div>Bank Name: <strong style={{ color: '#047857' }}>{universityInvoice.bankDetails?.bankName}</strong></div>
                          <div>
                            {universityInvoice.bankDetails?.isDomestic ? 'Account No: ' : 'IBAN / A/C No: '}
                            <strong style={{ fontFamily: 'monospace' }}>
                              {universityInvoice.bankDetails?.isDomestic ? universityInvoice.bankDetails?.accountNumber : universityInvoice.bankDetails?.iban}
                            </strong>
                          </div>
                          <div>
                            {universityInvoice.bankDetails?.isDomestic ? 'IFSC Code: ' : 'SWIFT / BIC Code: '}
                            <strong style={{ fontFamily: 'monospace' }}>{universityInvoice.bankDetails?.swiftCode}</strong>
                          </div>
                          {universityInvoice.companyAddress && (
                            <div style={{ gridColumn: 'span 2' }}>Beneficiary Address: <strong>{universityInvoice.companyAddress}</strong></div>
                          )}
                          <div style={{ gridColumn: 'span 2' }}>Bank Branch Address: {universityInvoice.bankDetails?.address}</div>
                        </div>
                        <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#000000', marginTop: '4px', borderTop: '1px dashed #000000', paddingTop: '3px' }}>
                          Note: Please quote Invoice #{universityInvoice.invoiceNumber} on your bank transfer description.
                        </div>
                      </div>
                    </div>

                    {/* Authorized Signatory Block */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '18px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <div style={{ fontSize: '10px', color: '#000000', fontWeight: 600 }}>
                        Official agency commission invoice for international education consultancy &amp; student recruitment services.
                      </div>
                      <div style={{ textAlign: 'center', width: '220px' }}>
                        <div style={{ height: '36px', borderBottom: '1.5px solid #000000', marginBottom: '6px' }}></div>
                        <div style={{ fontWeight: 900, fontSize: '11px', color: '#000000' }}>
                          {universityInvoice.bankDetails?.accountHolder || 'Sterling Overseas Consultancy LLC'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#000000', fontWeight: 600 }}>Accounts Department / Authorised Signatory</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* INLINE SETTLEMENT / MARK AS PAID MODAL */}
        {showSettleInlineModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(11, 15, 28, 0.85)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
            }}
            onClick={() => setShowSettleInlineModal(false)}
          >
            <div
              style={{
                background: '#131B2E',
                border: '1px solid rgba(148, 163, 225, 0.3)',
                borderRadius: '12px',
                width: '480px',
                maxWidth: '92vw',
                padding: '24px',
                color: '#fff',
                boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💳</span>
                  <span>Record Payment &amp; Mark as Paid</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettleInlineModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Amount & Beneficiary Summary Card */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Net Disbursed Amount:
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#34D399', margin: '3px 0' }}>
                  ₹{Number(b2bReceipt.totalDisbursed).toLocaleString('en-IN')} {b2bReceipt.currency}
                </div>
                <div style={{ color: '#E2E8F0', fontSize: '12px' }}>
                  Beneficiary: <strong>{b2bReceipt.partnerName}</strong> ({b2bReceipt.studentNames || 'General'})
                </div>
              </div>

              <form onSubmit={handleConfirmInlineSettlement}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, color: '#CBD5E1' }}>
                      Paid From Sterling Bank (Our Bank) *
                    </label>
                    <select
                      value={inlineSettlementData.paying_bank_id}
                      onChange={(e) => setInlineSettlementData({ ...inlineSettlementData, paying_bank_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: '#0B0F1C',
                        border: '1px solid #2B3A5A',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {companyBanks.map((b) => (
                        <option key={b.id} value={b.id}>
                          🏦 {b.bank_name} &bull; {b.account_number} ({b.branch})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, color: '#CBD5E1' }}>
                      Bank UTR / Transaction Reference # *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UTR49201948201 or IMPS / NEFT Ref"
                      value={inlineSettlementData.utr_number}
                      onChange={(e) => setInlineSettlementData({ ...inlineSettlementData, utr_number: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: '#0B0F1C',
                        border: '1px solid #2B3A5A',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, color: '#CBD5E1' }}>
                        Payment Date
                      </label>
                      <input
                        type="date"
                        required
                        value={inlineSettlementData.settled_at}
                        onChange={(e) => setInlineSettlementData({ ...inlineSettlementData, settled_at: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          background: '#0B0F1C',
                          border: '1px solid #2B3A5A',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, color: '#CBD5E1' }}>
                        Transfer Mode
                      </label>
                      <select
                        value={inlineSettlementData.payment_mode}
                        onChange={(e) => setInlineSettlementData({ ...inlineSettlementData, payment_mode: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          background: '#0B0F1C',
                          border: '1px solid #2B3A5A',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      >
                        <option value="Bank Transfer (IMPS / NEFT)">Bank Transfer (IMPS / NEFT)</option>
                        <option value="UPI / GPay">UPI / GPay</option>
                        <option value="Forex Wire / Wise">Forex Wire / Wise</option>
                        <option value="Direct Transfer">Direct Transfer</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSettleInlineModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: '1px solid #475569',
                      color: '#94A3B8',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      background: '#10B981',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    ✓ Confirm &amp; Generate Paid Receipt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
