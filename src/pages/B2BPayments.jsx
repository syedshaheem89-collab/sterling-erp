import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import DocumentGeneratorModal, { STERLING_COMPANY_BANKS_DEFAULT } from '../components/DocumentGeneratorModal';
import B2BInvoiceViewerModal from '../components/B2BInvoiceViewerModal';
import { getStudentAgentMeta, syncAllStudentsToB2BPayments, updateStudentFromB2BSettlement } from '../utils/studentAgentHelper';

/**
 * INITIAL_PARTNER_ACCOUNTS
 * Stores multiple bank accounts per B2B partner/company.
 * A company can have 1, 2, or more bank accounts (e.g. HDFC, ICICI, Foreign Wire, UPI).
 */
export const INITIAL_PARTNER_ACCOUNTS = {
  'Consult Fox': [
    {
      id: 'acc-cf-1',
      label: 'HDFC Primary Current A/C',
      bank_name: 'HDFC Bank',
      account_number: '50200038291048',
      ifsc: 'HDFC0000240',
      branch: 'MG Road, Bangalore',
      beneficiary_name: 'Consult Fox Edutech Pvt Ltd',
      upi_id: 'consultfox@hdfcbank',
      details_string: 'HDFC Bank A/C: 50200038291048 | IFSC: HDFC0000240 | Beneficiary: Consult Fox Edutech Pvt Ltd',
      is_default: true,
    },
    {
      id: 'acc-cf-2',
      label: 'ICICI Secondary A/C',
      bank_name: 'ICICI Bank',
      account_number: '002905008291',
      ifsc: 'ICIC0000029',
      branch: 'Indiranagar',
      beneficiary_name: 'Consult Fox Edutech Pvt Ltd',
      upi_id: '',
      details_string: 'ICICI Bank A/C: 002905008291 | IFSC: ICIC0000029 | Beneficiary: Consult Fox Edutech',
      is_default: false,
    },
  ],
  'Future Factory': [
    {
      id: 'acc-ff-1',
      label: 'Citibank USD Wire (Delaware)',
      bank_name: 'Citibank N.A. New York',
      account_number: 'US58CITI10009284102',
      ifsc: 'CITIUS33',
      branch: 'New York, USA',
      beneficiary_name: 'Future Factory LLC, Delaware, USA',
      upi_id: '',
      details_string: 'Wire / Swift: US58CITI10009284102 | Swift: CITIUS33 | Future Factory LLC, Delaware, USA',
      is_default: true,
    },
    {
      id: 'acc-ff-2',
      label: 'Wise Multi-Currency USD/EUR',
      bank_name: 'Wise Payments Ltd',
      account_number: 'WISE849201948',
      ifsc: 'TRWIBEB1',
      branch: 'Brussels / UK',
      beneficiary_name: 'Future Factory Global',
      upi_id: '',
      details_string: 'Wise A/C: WISE849201948 | Swift: TRWIBEB1 | Future Factory Global',
      is_default: false,
    },
  ],
  'Rashin Team': [
    {
      id: 'acc-rt-1',
      label: 'Primary UPI / GPay',
      bank_name: 'Axis Bank / UPI',
      account_number: '',
      ifsc: '',
      branch: '',
      beneficiary_name: 'Rashin Team',
      upi_id: 'rashin.team@okaxis',
      details_string: 'UPI ID: rashin.team@okaxis | Beneficiary: Rashin Team',
      is_default: true,
    },
    {
      id: 'acc-rt-2',
      label: 'Canara Bank Current A/C',
      bank_name: 'Canara Bank',
      account_number: '0849101004928',
      ifsc: 'CNRB0000849',
      branch: 'Calicut Main',
      beneficiary_name: 'Rashin Team',
      upi_id: '',
      details_string: 'Canara Bank A/C: 0849101004928 | IFSC: CNRB0000849 | Rashin Team',
      is_default: false,
    },
  ],
  'Empire - Lithuania': [
    {
      id: 'acc-el-1',
      label: 'Swedbank Vilnius IBAN (EUR)',
      bank_name: 'Swedbank Vilnius',
      account_number: 'LT427044060001829482',
      ifsc: 'HABALT22',
      branch: 'Vilnius, Lithuania',
      beneficiary_name: 'Empire International Education UAB',
      upi_id: '',
      details_string: 'IBAN: LT427044060001829482 | Swedbank Vilnius | Empire Int. Edu',
      is_default: true,
    },
  ],
  'Abroad Angel Poland': [
    {
      id: 'acc-aa-1',
      label: 'SBI Current A/C',
      bank_name: 'State Bank of India',
      account_number: '38291049281',
      ifsc: 'SBIN0004829',
      branch: 'Kochi Branch',
      beneficiary_name: 'Abroad Angel Poland Edutech',
      upi_id: '',
      details_string: 'SBI Current A/C: 38291049281 | IFSC: SBIN0004829 | Kochi Branch',
      is_default: true,
    },
  ],
  'Comfort Travel': [
    {
      id: 'acc-ct-1',
      label: 'Federal Bank Current A/C',
      bank_name: 'Federal Bank',
      account_number: '14200200039281',
      ifsc: 'FDRL0001420',
      branch: 'Ernakulam Marine Drive',
      beneficiary_name: 'Comfort Travel & Apostille Services',
      upi_id: 'comforttravel@federal',
      details_string: 'Federal Bank A/C: 14200200039281 | IFSC: FDRL0001420 | Ernakulam',
      is_default: true,
    },
  ],
  'Medwizard': [
    {
      id: 'acc-mw-1',
      label: 'Axis Bank Current A/C',
      bank_name: 'Axis Bank',
      account_number: '921020048291028',
      ifsc: 'UTIB0000829',
      branch: 'Kottayam',
      beneficiary_name: 'Medwizard Overseas Admissions',
      upi_id: 'medwizard@axisbank',
      details_string: 'Axis Bank A/C: 921020048291028 | IFSC: UTIB0000829 | Beneficiary: Medwizard Overseas',
      is_default: true,
    },
  ],
  'VFS & Insurance': [
    {
      id: 'acc-vfs-1',
      label: 'VFS Global Portal Virtual CMS A/C',
      bank_name: 'ICICI Bank Virtual CMS',
      account_number: 'VFS9948201',
      ifsc: 'ICIC0000104',
      branch: 'Mumbai Central',
      beneficiary_name: 'VFS Global Services Pvt Ltd',
      upi_id: '',
      details_string: 'VFS Global Services / ICICI Portal Virtual A/C: VFS9948201',
      is_default: true,
    },
  ],
  'EduGlobal Services': [
    {
      id: 'acc-eg-1',
      label: 'ICICI Bank Current A/C',
      bank_name: 'ICICI Bank',
      account_number: '002905001829',
      ifsc: 'ICIC0000029',
      branch: 'Kochi',
      beneficiary_name: 'EduGlobal Services LLP',
      upi_id: '',
      details_string: 'ICICI Bank A/C: 002905001829 | IFSC: ICIC0000029',
      is_default: true,
    },
  ],
};

/**
 * INITIAL_B2B_PAYMENTS
 * Pre-populated with the user's 9 live entries from Microsoft To-Do,
 * linked to the partner accounts directory.
 */
export const INITIAL_B2B_PAYMENTS = [
  {
    id: 'b2b-001',
    partner_name: 'Consult Fox',
    transfer_account: 'HDFC Bank A/C: 50200038291048 | IFSC: HDFC0000240 | Beneficiary: Consult Fox Edutech Pvt Ltd',
    selected_account_id: 'acc-cf-1',
    student_names: 'Thejus & Nivil',
    amount: 180000,
    currency: 'INR',
    has_gst: true, // 18% GST applies
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0], // Tomorrow
    priority: true,
    status: 'pending',
    notes: 'Sub-agent commission for Thejus & Nivil enrollment',
    created_at: '2026-11-15T10:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'Consult_Fox_Tax_Invoice_89.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">CONSULT FOX EDUTECH PVT LTD</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: CF-2026-0089 | DATE: 15.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate Referrals: Thejus &amp; Nivil</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Higher Education Admission Commission</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Base Commission: INR 1,52,542</text><text x="50" y="285" font-family="sans-serif" font-size="12" fill="%23334155">Add 18% GST: INR 27,458</text><line x1="50" y1="310" x2="550" y2="310" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL AMOUNT PAYABLE: INR 1,80,000</text><text x="50" y="380" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: HDFC Bank | A/C: 50200038291048 | IFSC: HDFC0000240</text></svg>',
    invoice_uploaded_at: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'b2b-002',
    partner_name: 'VFS & Insurance',
    transfer_account: 'VFS Global Services / ICICI Portal Virtual A/C: VFS9948201',
    selected_account_id: 'acc-vfs-1',
    student_names: 'Abhijith Bulgaria (Agiya & Lekshmipriya)',
    amount: 20780,
    currency: 'INR',
    has_gst: false,
    category: 'VFS & Insurance',
    due_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], // Overdue by 1 day
    priority: false,
    status: 'pending',
    notes: 'Visa appointment & travel insurance fees',
    created_at: '2026-11-14T11:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'Consult_Fox_Tax_Invoice_89.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">CONSULT FOX EDUTECH PVT LTD</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: CF-2026-0089 | DATE: 15.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate Referrals: Thejus &amp; Nivil</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Higher Education Admission Commission</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Base Commission: INR 1,52,542</text><text x="50" y="285" font-family="sans-serif" font-size="12" fill="%23334155">Add 18% GST: INR 27,458</text><line x1="50" y1="310" x2="550" y2="310" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL AMOUNT PAYABLE: INR 1,80,000</text><text x="50" y="380" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: HDFC Bank | A/C: 50200038291048 | IFSC: HDFC0000240</text></svg>',
    invoice_uploaded_at: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'b2b-003',
    partner_name: 'Rashin Team',
    transfer_account: 'UPI ID: rashin.team@okaxis | Beneficiary: Rashin Team',
    selected_account_id: 'acc-rt-1',
    student_names: 'Liza',
    amount: 20000,
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Counselor commission to Rashin team for student Liza',
    created_at: '2026-11-16T09:15:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'Consult_Fox_Tax_Invoice_89.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">CONSULT FOX EDUTECH PVT LTD</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: CF-2026-0089 | DATE: 15.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate Referrals: Thejus &amp; Nivil</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Higher Education Admission Commission</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Base Commission: INR 1,52,542</text><text x="50" y="285" font-family="sans-serif" font-size="12" fill="%23334155">Add 18% GST: INR 27,458</text><line x1="50" y1="310" x2="550" y2="310" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL AMOUNT PAYABLE: INR 1,80,000</text><text x="50" y="380" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: HDFC Bank | A/C: 50200038291048 | IFSC: HDFC0000240</text></svg>',
    invoice_uploaded_at: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'b2b-004',
    partner_name: 'Future Factory',
    transfer_account: 'Wire / Swift: US58CITI10009284102 | Future Factory LLC, Delaware, USA',
    selected_account_id: 'acc-ff-1',
    student_names: 'Vivek & Hanock',
    amount: 500,
    currency: 'USD',
    has_gst: false, // Foreign payment: No GST
    category: 'B2B Sub-Agent',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    priority: true,
    status: 'pending',
    notes: 'Overseas partner commission for Vivek & Hanock',
    created_at: '2026-11-16T14:20:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'Consult_Fox_Tax_Invoice_89.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">CONSULT FOX EDUTECH PVT LTD</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: CF-2026-0089 | DATE: 15.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate Referrals: Thejus &amp; Nivil</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Higher Education Admission Commission</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Base Commission: INR 1,52,542</text><text x="50" y="285" font-family="sans-serif" font-size="12" fill="%23334155">Add 18% GST: INR 27,458</text><line x1="50" y1="310" x2="550" y2="310" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL AMOUNT PAYABLE: INR 1,80,000</text><text x="50" y="380" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: HDFC Bank | A/C: 50200038291048 | IFSC: HDFC0000240</text></svg>',
    invoice_uploaded_at: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'b2b-005',
    partner_name: 'Future Factory',
    transfer_account: 'Wire / Swift: US58CITI10009284102 | Future Factory LLC, Delaware, USA',
    selected_account_id: 'acc-ff-1',
    student_names: 'Annalise & Megha',
    amount: 500,
    currency: 'USD',
    has_gst: false, // Foreign payment: No GST
    category: 'B2B Sub-Agent',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Overseas partner commission for Annalise & Megha',
    created_at: '2026-11-17T11:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'Consult_Fox_Tax_Invoice_89.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">CONSULT FOX EDUTECH PVT LTD</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: CF-2026-0089 | DATE: 15.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate Referrals: Thejus &amp; Nivil</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Higher Education Admission Commission</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Base Commission: INR 1,52,542</text><text x="50" y="285" font-family="sans-serif" font-size="12" fill="%23334155">Add 18% GST: INR 27,458</text><line x1="50" y1="310" x2="550" y2="310" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL AMOUNT PAYABLE: INR 1,80,000</text><text x="50" y="380" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: HDFC Bank | A/C: 50200038291048 | IFSC: HDFC0000240</text></svg>',
    invoice_uploaded_at: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'b2b-006',
    partner_name: 'Empire - Lithuania',
    transfer_account: 'IBAN: LT427044060001829482 | Swedbank Vilnius | Empire Int. Edu',
    selected_account_id: 'acc-el-1',
    student_names: 'Annlin v Jose',
    amount: 1000,
    currency: 'EUR',
    has_gst: false, // Foreign payment: No GST
    category: 'Partner University / B2B',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Partner registration fee for Lithuania admission',
    created_at: '2026-11-17T15:45:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'Consult_Fox_Tax_Invoice_89.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">CONSULT FOX EDUTECH PVT LTD</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: CF-2026-0089 | DATE: 15.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate Referrals: Thejus &amp; Nivil</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Higher Education Admission Commission</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Base Commission: INR 1,52,542</text><text x="50" y="285" font-family="sans-serif" font-size="12" fill="%23334155">Add 18% GST: INR 27,458</text><line x1="50" y1="310" x2="550" y2="310" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL AMOUNT PAYABLE: INR 1,80,000</text><text x="50" y="380" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: HDFC Bank | A/C: 50200038291048 | IFSC: HDFC0000240</text></svg>',
    invoice_uploaded_at: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'b2b-007',
    partner_name: 'Abroad Angel Poland',
    transfer_account: 'SBI Current A/C: 38291049281 | IFSC: SBIN0004829 | Kochi Branch',
    selected_account_id: 'acc-aa-1',
    student_names: 'Gayathri, Achsah, Anna Biju',
    amount: 70800,
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    priority: true,
    status: 'pending',
    notes: 'Poland batch partner commission for 3 students',
    created_at: '2026-11-18T10:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'Consult_Fox_Tax_Invoice_89.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">CONSULT FOX EDUTECH PVT LTD</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: CF-2026-0089 | DATE: 15.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate Referrals: Thejus &amp; Nivil</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Higher Education Admission Commission</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Base Commission: INR 1,52,542</text><text x="50" y="285" font-family="sans-serif" font-size="12" fill="%23334155">Add 18% GST: INR 27,458</text><line x1="50" y1="310" x2="550" y2="310" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL AMOUNT PAYABLE: INR 1,80,000</text><text x="50" y="380" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: HDFC Bank | A/C: 50200038291048 | IFSC: HDFC0000240</text></svg>',
    invoice_uploaded_at: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'b2b-008',
    partner_name: 'Comfort Travel',
    transfer_account: 'Federal Bank A/C: 14200200039281 | IFSC: FDRL0001420 | Ernakulam',
    selected_account_id: 'acc-ct-1',
    student_names: '30 Students (Apostille Batch)',
    batch_count: 30,
    amount: 59550,
    currency: 'INR',
    has_gst: false,
    category: 'Apostille Charges',
    due_date: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'MEA document apostille for 30 students batch (₹1,985 per student)',
    created_at: '2026-11-18T12:00:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'STERLING KERALA1111.pdf',
    invoice_file_data: null,
    invoice_uploaded_at: '2026-11-18T12:15:00.000Z',
  },
  {
    id: 'b2b-009',
    partner_name: 'Medwizard',
    transfer_account: 'Axis Bank A/C: 921020048291028 | IFSC: UTIB0000829 | Beneficiary: Medwizard Overseas',
    selected_account_id: 'acc-mw-1',
    student_names: 'Esabella',
    amount: 24000,
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: false,
    status: 'pending',
    notes: 'Medical admission referral commission',
    created_at: '2026-11-19T08:30:00.000Z',
    settled_at: null,
    payment_mode: null,
    utr_number: null,
    invoice_file_name: 'Consult_Fox_Tax_Invoice_89.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">CONSULT FOX EDUTECH PVT LTD</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: CF-2026-0089 | DATE: 15.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate Referrals: Thejus &amp; Nivil</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Higher Education Admission Commission</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Base Commission: INR 1,52,542</text><text x="50" y="285" font-family="sans-serif" font-size="12" fill="%23334155">Add 18% GST: INR 27,458</text><line x1="50" y1="310" x2="550" y2="310" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="340" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL AMOUNT PAYABLE: INR 1,80,000</text><text x="50" y="380" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: HDFC Bank | A/C: 50200038291048 | IFSC: HDFC0000240</text></svg>',
    invoice_uploaded_at: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'b2b-010',
    partner_name: 'EduGlobal Services',
    transfer_account: 'ICICI Bank A/C: 002905001829 | IFSC: ICIC0000029',
    selected_account_id: 'acc-eg-1',
    student_names: 'Kiran Mathew',
    amount: 15000,
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: '2026-11-10',
    priority: false,
    status: 'completed',
    notes: 'Kiran Mathew intake commission settled',
    created_at: '2026-11-05T10:00:00.000Z',
    settled_at: '2026-11-10T16:20:00.000Z',
    payment_mode: 'UPI / GPay',
    paying_bank_id: 'comp-bank-fed-1',
    paying_bank_name: 'Federal Bank',
    debit_account: 'Federal Bank Current A/C: 14200200039281 (Valanchery Main)',
    utr_number: 'UPI/638291048291',
    invoice_file_name: 'EduGlobal_Commission_Invoice_512.svg',
    invoice_file_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="%23ffffff"/><rect x="30" y="30" width="540" height="690" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2" rx="10"/><text x="50" y="80" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">EDUGLOBAL OVERSEAS SERVICES</text><text x="50" y="105" font-family="sans-serif" font-size="12" fill="%2364748b">INVOICE NO: EG-2026-512 | DATE: 05.11.2026</text><line x1="50" y1="125" x2="550" y2="125" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="155" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">BILLED TO: Sterling Overseas Consultancy LLC</text><text x="50" y="175" font-family="sans-serif" font-size="12" fill="%23475569">Candidate: Kiran Mathew</text><text x="50" y="230" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">1. Student Onboarding &amp; Verification Fee</text><text x="50" y="260" font-family="sans-serif" font-size="12" fill="%23334155">Amount: INR 15,000</text><line x1="50" y1="290" x2="550" y2="290" stroke="%23cbd5e1" stroke-width="1.5"/><text x="50" y="325" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">TOTAL CLAIM: INR 15,000</text><text x="50" y="365" font-family="sans-serif" font-size="11" fill="%2364748b">Bank: ICICI Bank | A/C: 002905001829 | IFSC: ICIC0000029</text></svg>',
    invoice_uploaded_at: '2026-11-06T11:00:00.000Z',
  },
];

const CATEGORIES = [
  'B2B Partner Fee',
  'Sub-Agent Commission',
  'University Processing Fee',
  'B2B Sub-Agent',
  'VFS & Embassy Fee',
  'Local Consultancy / Partner Processing Fee',
  'VFS & Insurance',
  'Apostille Charges',
  'Partner University / B2B',
  'University Fee',
  'Courier / Dispatch',
  'Special Student Direct Expense',
  'Other',
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export const EXPORT_COLUMNS_DEF = [
  { id: 'sl_no', label: 'Sl No', key: 'Sl No', default: true, wch: 6 },
  { id: 'partner_name', label: 'Partner / Beneficiary Name', key: 'Partner / Beneficiary', default: true, wch: 24 },
  { id: 'transfer_account', label: 'Transfer To (Account Details)', key: 'Transfer To (Account Details)', default: true, wch: 40 },
  { id: 'student_names', label: 'Linked Student(s)', key: 'Linked Student(s)', default: true, wch: 25 },
  { id: 'total_amount', label: 'Total Amount (With GST)', key: 'Total Amount With GST', default: true, wch: 20 },
  { id: 'base_amount', label: 'Base Amount (Without GST)', key: 'Amount Without GST', default: true, wch: 20 },
  { id: 'gst_amount', label: 'GST (18%) Amount', key: 'GST 18% Amount', default: true, wch: 16 },
  { id: 'gst_rate', label: 'GST Rate (%)', key: 'GST Rate (%)', default: false, wch: 12 },
  { id: 'currency', label: 'Currency', key: 'Currency', default: true, wch: 10 },
  { id: 'due_date', label: 'Due Date', key: 'Due Date', default: true, wch: 14 },
  { id: 'status', label: 'Payment Status', key: 'Status', default: true, wch: 16 },
  { id: 'category', label: 'Category', key: 'Category', default: false, wch: 20 },
  { id: 'settled_at', label: 'Settled Date', key: 'Settled Date', default: false, wch: 14 },
  { id: 'payment_mode', label: 'Payment Mode', key: 'Payment Mode', default: false, wch: 20 },
  { id: 'paying_bank', label: 'Paid From (Sterling Bank)', key: 'Paid From (Sterling Bank)', default: true, wch: 30 },
  { id: 'utr_number', label: 'Bank UTR / Ref #', key: 'Bank UTR / Reference', default: false, wch: 22 },
  { id: 'notes', label: 'Remarks / Notes', key: 'Remarks / Notes', default: false, wch: 30 },
];

export default function B2BPayments({ setCurrentPage }) {
  const { user } = useAuth();

  // Primary Payments State
  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem('sterling_b2b_payments');
      const deletedKeys = JSON.parse(localStorage.getItem('sterling_b2b_deleted_keys') || '[]');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p) => !deletedKeys.includes(p.id));
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved b2b payments', e);
    }
    return INITIAL_B2B_PAYMENTS;
  });

  // Partner Bank Accounts Directory (Multiple accounts per B2B Company)
  const [partnerAccounts, setPartnerAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('sterling_b2b_partner_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved partner accounts', e);
    }
    return INITIAL_PARTNER_ACCOUNTS;
  });

  // Sync Partner Accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sterling_b2b_partner_accounts', JSON.stringify(partnerAccounts));
    } catch (e) {
      console.error('Failed to save partner accounts to localStorage', e);
    }
  }, [partnerAccounts]);

  // ERP Students list for autocomplete
  const [erpStudents, setErpStudents] = useState([]);

  // Selection state for downloading selected items
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'urgent', 'completed', 'all', 'partner_ledger'
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [partnerFilter, setPartnerFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);

  // Quick Inline Input (Microsoft To-Do style)
  const [quickInput, setQuickInput] = useState('');

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [showBatchCalculator, setShowBatchCalculator] = useState(false);
  const [batchStudentCount, setBatchStudentCount] = useState(30);
  const [batchDescription, setBatchDescription] = useState('Apostille Batch (Malta / Europe)');

  const [formData, setFormData] = useState({
    partner_name: '',
    transfer_account: '',
    selected_account_id: '',
    student_names: '',
    batch_count: null,
    amount: '',
    currency: 'INR',
    has_gst: false,
    category: 'Sub-Agent Commission',
    due_date: '',
    priority: false,
    notes: '',
    invoice_file_name: '',
    invoice_file_data: '',
    invoice_uploaded_at: '',
    save_as_new_account: true,
  });

  // Document Generator Modal State (Student Dubai Invoice & B2B Remittance Receipt)
  const [showDocModal, setShowDocModal] = useState(false);
  const [docModalMode, setDocModalMode] = useState('b2b_receipt');
  const [docModalPayment, setDocModalPayment] = useState(null);

  // B2B Invoice Viewer Lightbox State
  const [viewingInvoicePayment, setViewingInvoicePayment] = useState(null);
  const fileInputRowRef = useRef(null);
  const [activeUploadPaymentId, setActiveUploadPaymentId] = useState(null);

  // Inline Account Add State inside Payment Modal
  const [isAddingInlineAccount, setIsAddingInlineAccount] = useState(false);
  const [inlineAccountData, setInlineAccountData] = useState({
    label: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    beneficiary_name: '',
    upi_id: '',
  });

  // Partner Bank Accounts Directory Manager Modal State
  const [showAccountsManagerModal, setShowAccountsManagerModal] = useState(false);
  const [selectedManagerCompany, setSelectedManagerCompany] = useState('Consult Fox');
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [newCompanyNameInput, setNewCompanyNameInput] = useState('');
  const [managerAccountForm, setManagerAccountForm] = useState({
    label: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    branch: '',
    beneficiary_name: '',
    upi_id: '',
  });

  // Sterling's Company Bank Accounts (Our 4+ House Banks - Disbursing Accounts)
  const [companyBanks, setCompanyBanks] = useState(() => {
    try {
      const saved = localStorage.getItem('sterling_company_banks');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return STERLING_COMPANY_BANKS_DEFAULT;
  });

  useEffect(() => {
    try {
      localStorage.setItem('sterling_company_banks', JSON.stringify(companyBanks));
    } catch (e) {
      console.error(e);
    }
  }, [companyBanks]);

  const [payingBankFilter, setPayingBankFilter] = useState('All');
  const [bankDirectoryTab, setBankDirectoryTab] = useState('company_banks'); // 'company_banks' | 'partner_banks'
  const [isAddingNewCompanyBank, setIsAddingNewCompanyBank] = useState(false);
  const [newCompanyBankForm, setNewCompanyBankForm] = useState({
    label: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    branch: '',
    currency: 'INR',
  });

  // Settlement Modal State
  const [settlingPayment, setSettlingPayment] = useState(null);
  const [settlementData, setSettlementData] = useState({
    settled_at: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer (IMPS / NEFT)',
    paying_bank_id: 'comp-bank-fed-1',
    paying_bank_name: 'Federal Bank',
    debit_account: 'Federal Bank Current A/C: 14200200039281 (Valanchery Main)',
    utr_number: '',
    notes: '',
  });

  // Student suggestions dropdown
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

  // Accounts Payment Disbursement Sheet Modal State (for Sterling Accounts Team)
  const [showAccountsSheetModal, setShowAccountsSheetModal] = useState(false);
  const [accountsSheetFilter, setAccountsSheetFilter] = useState('all'); // 'all' | 'inr' | 'forex'
  const [accountsSheetPartner, setAccountsSheetPartner] = useState('All'); // 'All' | partner_name

  // Dedicated Multi-Page Print Handler for Accounts Disbursement Sheet (supports 10, 50, 100+ rows cleanly)
  const handlePrintAccountsSheet = () => {
    const el = document.getElementById('accounts-disbursement-printable');
    if (!el) {
      window.print();
      return;
    }
    const printWin = window.open('', '_blank', 'width=1020,height=850');
    if (!printWin) {
      window.print();
      return;
    }
    // Replace relative letterhead path with absolute origin URL so it loads in print window
    const htmlContent = el.outerHTML.replace(
      /src="\/sterling-letterhead\.jpg"/g,
      `src="${window.location.origin}/sterling-letterhead.jpg"`
    );
    const sheetScope = accountsSheetPartner !== 'All'
      ? accountsSheetPartner.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
      : (accountsSheetFilter === 'inr' ? 'Domestic_INR' : accountsSheetFilter === 'forex' ? 'Forex_SWIFT' : 'All_Pending');
    const nowStamp = new Date();
    const dStr = nowStamp.toLocaleDateString('en-GB').replace(/\//g, '-');
    const tStr = nowStamp.toTimeString().slice(0, 5).replace(':', '');
    const sheetTitle = `Accounts_Disbursement_${sheetScope}_${dStr}_${tStr}`;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sheetTitle}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #accounts-disbursement-printable {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .print-letterhead-wrapper {
              width: 100% !important;
              height: 33mm !important;
              overflow: hidden !important;
              margin-bottom: 4mm !important;
            }
            img.print-letterhead {
              width: 100% !important;
              height: auto !important;
              display: block !important;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
            }
            thead {
              display: table-header-group !important;
            }
            tr {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            th {
              white-space: normal !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              font-size: 9.5px !important;
              line-height: 1.25 !important;
              padding: 6px 5px !important;
            }
            td {
              white-space: normal !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              padding: 6px 6px !important;
            }
            .accounts-verification-box {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Download / Export Customization Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState('all'); // 'selected' | 'filtered' | 'all'
  const [exportColIds, setExportColIds] = useState(() =>
    new Set(EXPORT_COLUMNS_DEF.filter((c) => c.default).map((c) => c.id))
  );
  const [includeBottomTotal, setIncludeBottomTotal] = useState(true);
  const [exportFormat, setExportFormat] = useState('xlsx'); // 'xlsx' | 'csv'

  // Persist payments to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sterling_b2b_payments', JSON.stringify(payments));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [payments]);

  // Fetch ERP students on mount for autocomplete & calculations
  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, name, country, intake, notes, b2b_charge, other_expense')
          .order('name');
        if (!error && data) {
          setErpStudents(data);
        }
      } catch (err) {
        console.warn('Student lookup not available:', err);
      }
    }
    fetchStudents();
  }, []);

  // Listen for real-time updates dispatched from student application edits
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('sterling_b2b_payments');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setPayments(parsed);
          }
        }
      } catch (e) {}
    };

    window.addEventListener('sterling_b2b_payments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sterling_b2b_payments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Helper: Retrieve saved accounts for a partner (case-insensitive lookup)
  const getAccountsForPartner = (partnerName) => {
    if (!partnerName || !partnerName.trim()) return [];
    const clean = partnerName.trim().toLowerCase();
    const matchKey = Object.keys(partnerAccounts).find(
      (k) => k.toLowerCase() === clean
    );
    return matchKey ? (partnerAccounts[matchKey] || []) : [];
  };

  // Helper: Calculate GST (18%) and Totals
  const calculateFinancials = (payment) => {
    const base = Number(payment.amount) || 0;
    const isForeign = payment.currency !== 'INR';
    // Rule: Foreign payment NO GST (0%)
    if (isForeign || !payment.has_gst) {
      return {
        baseAmount: base,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: base,
      };
    }
    // 18% GST on INR
    const gstAmount = Math.round(base * 0.18);
    const totalAmount = base + gstAmount;
    return {
      baseAmount: base,
      gstRate: 18,
      gstAmount: gstAmount,
      totalAmount: totalAmount,
    };
  };

  // Helper: Format Money
  const formatMoney = (amount, currency = 'INR') => {
    const num = Number(amount) || 0;
    if (currency === 'INR') return '₹' + num.toLocaleString('en-IN');
    if (currency === 'USD') return '$' + num.toLocaleString('en-US');
    if (currency === 'EUR') return '€' + num.toLocaleString('en-DE');
    if (currency === 'GBP') return '£' + num.toLocaleString('en-GB');
    return `${currency} ${num.toLocaleString()}`;
  };

  // Helper: Due Date Status
  const getDueStatus = (dueDateStr) => {
    if (!dueDateStr) return { text: 'No due date', urgent: false, color: 'var(--muted, #8B949E)' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dueDateStr.split('-').map(Number);
    const dueDate = new Date(y, m - 1, d);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `Overdue (${Math.abs(diffDays)}d)`, urgent: true, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.14)' };
    }
    if (diffDays === 0) {
      return { text: 'Due Today', urgent: true, color: '#F97316', bg: 'rgba(249, 115, 22, 0.16)' };
    }
    if (diffDays === 1) {
      return { text: 'Due Tomorrow', urgent: true, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.16)' };
    }
    if (diffDays <= 3) {
      return { text: `Due in ${diffDays}d`, urgent: true, color: '#EAB308', bg: 'rgba(234, 179, 8, 0.14)' };
    }
    const formatted = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { text: formatted, urgent: false, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
  };

  // Top Metric Cards Calculation
  const metrics = useMemo(() => {
    let pendingWithoutGstINR = 0;
    let pendingGstAmountINR = 0;
    let pendingWithGstINR = 0;

    let pendingUSD = 0;
    let pendingEUR = 0;
    let pendingGBP = 0;
    const forexPending = {}; // Dynamic map: { USD: 250, EUR: 1000, ... }
    let overdueCount = 0;
    let pendingCount = 0;

    payments.forEach((p) => {
      if (p.status !== 'completed') {
        pendingCount++;
        const fin = calculateFinancials(p);
        const curr = p.currency || 'INR';
        if (curr === 'INR') {
          pendingWithoutGstINR += fin.baseAmount;
          pendingGstAmountINR += fin.gstAmount;
          pendingWithGstINR += fin.totalAmount;
        } else {
          forexPending[curr] = (forexPending[curr] || 0) + fin.totalAmount;
          if (curr === 'USD') pendingUSD += fin.baseAmount;
          if (curr === 'EUR') pendingEUR += fin.baseAmount;
          if (curr === 'GBP') pendingGBP += fin.baseAmount;
        }

        const due = getDueStatus(p.due_date);
        if (due.urgent) overdueCount++;
      }
    });

    return {
      pendingWithoutGstINR,
      pendingGstAmountINR,
      pendingWithGstINR,
      pendingUSD,
      pendingEUR,
      pendingGBP,
      forexPending,
      overdueCount,
      pendingCount,
    };
  }, [payments]);

  // Partner Ledger Summary (Paid vs Remaining per B2B Partner)
  const partnerLedgerList = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      const partner = (p.partner_name || 'Unspecified Partner').trim();
      const fin = calculateFinancials(p);
      const curr = p.currency || 'INR';

      if (!map[partner]) {
        map[partner] = {
          partnerName: partner,
          currency: curr,
          totalCommitted: 0,
          totalBase: 0,
          totalGst: 0,
          totalPaid: 0,
          remainingDue: 0,
          pendingCount: 0,
          completedCount: 0,
          categories: new Set(),
          candidates: new Set(),
          transferAccounts: new Set(),
        };
      }

      map[partner].totalCommitted += fin.totalAmount;
      map[partner].totalBase += fin.baseAmount;
      map[partner].totalGst += fin.gstAmount;

      if (p.status === 'completed') {
        map[partner].totalPaid += fin.totalAmount;
        map[partner].completedCount += 1;
      } else {
        map[partner].remainingDue += fin.totalAmount;
        map[partner].pendingCount += 1;
      }

      if (p.category) map[partner].categories.add(p.category);
      if (p.student_names) map[partner].candidates.add(p.student_names);
      if (p.transfer_account) map[partner].transferAccounts.add(p.transfer_account);
    });

    return Object.values(map)
      .map((entry) => ({
        ...entry,
        categories: Array.from(entry.categories).join(', '),
        candidates: Array.from(entry.candidates).join(', '),
        transferAccount: Array.from(entry.transferAccounts)[0] || 'No account on file',
      }))
      .sort((a, b) => b.remainingDue - a.remainingDue);
  }, [payments]);

  // Unique partner names for filter
  const uniquePartnerNames = useMemo(() => {
    const names = new Set();
    payments.forEach((p) => {
      if (p.partner_name?.trim()) names.add(p.partner_name.trim());
    });
    return Array.from(names).sort();
  }, [payments]);

  const selectedPartnerLedger = useMemo(() => {
    if (partnerFilter === 'All') return null;
    return (
      partnerLedgerList.find(
        (p) => p.partnerName.toLowerCase() === partnerFilter.trim().toLowerCase()
      ) || null
    );
  }, [partnerFilter, partnerLedgerList]);

  // Selection Checkbox Logic
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (listToSelect) => {
    if (selectedIds.size === listToSelect.length && listToSelect.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(listToSelect.map((p) => p.id)));
    }
  };

  // Partner Name Input Change in Payment Modal (Auto-selects partner's bank account)
  const handlePartnerNameInput = (name) => {
    const accs = getAccountsForPartner(name);
    const def = accs.find((a) => a.is_default) || accs[0];
    setFormData((prev) => ({
      ...prev,
      partner_name: name,
      selected_account_id: def ? def.id : (accs.length > 0 ? '' : '__custom__'),
      transfer_account: def ? def.details_string : (accs.length === 0 ? prev.transfer_account : ''),
    }));
    setIsAddingInlineAccount(false);
  };

  // Dropdown Account Selection
  const handleAccountSelect = (accId) => {
    if (accId === '__new__') {
      setIsAddingInlineAccount(true);
      return;
    }
    if (accId === '__custom__') {
      setIsAddingInlineAccount(false);
      setFormData((prev) => ({
        ...prev,
        selected_account_id: '__custom__',
      }));
      return;
    }
    const accs = getAccountsForPartner(formData.partner_name);
    const found = accs.find((a) => a.id === accId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        selected_account_id: accId,
        transfer_account: found.details_string,
      }));
      setIsAddingInlineAccount(false);
    }
  };

  // Save Inline Account for a Partner
  const handleSaveInlineAccount = (e) => {
    e.preventDefault();
    if (!formData.partner_name.trim()) {
      toast.error('Please enter the partner name first');
      return;
    }
    if (!inlineAccountData.bank_name && !inlineAccountData.account_number && !inlineAccountData.upi_id) {
      toast.error('Please enter bank name, account number, or UPI ID');
      return;
    }

    const partnerKey = formData.partner_name.trim();
    const label = inlineAccountData.label.trim() || `${inlineAccountData.bank_name || 'Bank'} A/C`;

    // Construct formatted transfer string
    const parts = [];
    if (inlineAccountData.bank_name) parts.push(inlineAccountData.bank_name);
    if (inlineAccountData.account_number) parts.push(`A/C: ${inlineAccountData.account_number}`);
    if (inlineAccountData.ifsc) parts.push(`IFSC/Swift: ${inlineAccountData.ifsc}`);
    if (inlineAccountData.beneficiary_name) parts.push(`Beneficiary: ${inlineAccountData.beneficiary_name}`);
    if (inlineAccountData.upi_id) parts.push(`UPI: ${inlineAccountData.upi_id}`);
    const detailsStr = parts.join(' | ');

    const newAcc = {
      id: 'acc-' + Date.now(),
      label: label,
      bank_name: inlineAccountData.bank_name.trim(),
      account_number: inlineAccountData.account_number.trim(),
      ifsc: inlineAccountData.ifsc.trim(),
      beneficiary_name: inlineAccountData.beneficiary_name.trim(),
      upi_id: inlineAccountData.upi_id.trim(),
      details_string: detailsStr,
      is_default: false,
    };

    setPartnerAccounts((prev) => {
      const matchKey = Object.keys(prev).find((k) => k.toLowerCase() === partnerKey.toLowerCase()) || partnerKey;
      const currentList = prev[matchKey] || [];
      return {
        ...prev,
        [matchKey]: [...currentList, newAcc],
      };
    });

    setFormData((prev) => ({
      ...prev,
      selected_account_id: newAcc.id,
      transfer_account: detailsStr,
    }));

    setIsAddingInlineAccount(false);
    setInlineAccountData({
      label: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
      beneficiary_name: '',
      upi_id: '',
    });
    toast.success(`Saved new account "${label}" for ${partnerKey}!`);
  };

  // Compute pending partner dues from student applications (B2B, Apostille, Insurance)
  const studentsWithPendingPartnerDues = useMemo(() => {
    if (!erpStudents || !erpStudents.length) return [];
    const list = [];
    erpStudents.forEach((stu) => {
      const meta = getStudentAgentMeta(stu);
      const b2bDue = Math.max(0, Number(meta.b2b_committed || 0) - Number(meta.b2b_paid || 0));
      const apoDue = Math.max(0, Number(meta.apostille_committed || 0) - Number(meta.apostille_paid || 0));
      const insDue = Math.max(0, Number(meta.insurance_committed || 0) - Number(meta.insurance_paid || 0));

      if (meta.b2b_agent_name && (b2bDue > 0 || !meta.b2b_paid)) {
        list.push({ student: stu, type: 'b2b', partner: meta.b2b_agent_name, due: b2bDue || Number(meta.b2b_committed || 0), label: 'Sub-Agent' });
      }
      if (meta.apostille_agent && (apoDue > 0 || !meta.apostille_paid)) {
        list.push({ student: stu, type: 'apostille', partner: meta.apostille_agent, due: apoDue || Number(meta.apostille_committed || 0), label: 'Apostille' });
      }
      if (meta.insurance_agent && (insDue > 0 || !meta.insurance_paid)) {
        list.push({ student: stu, type: 'insurance', partner: meta.insurance_agent, due: insDue || Number(meta.insurance_committed || 0), label: 'Insurance' });
      }
    });
    return list;
  }, [erpStudents]);

  // 1-Click Autofill voucher from student partner application data
  const handleAutofillFromStudent = (student, partnerType) => {
    const meta = getStudentAgentMeta(student);
    let partnerName = '';
    let dueAmount = 0;
    let category = 'Sub-Agent Commission';

    if (partnerType === 'b2b') {
      partnerName = meta.b2b_agent_name;
      const comm = Number(meta.b2b_committed || 0);
      const paid = Number(meta.b2b_paid || 0);
      dueAmount = Math.max(0, comm - paid) || comm || 10000;
      category = 'Sub-Agent Commission';
    } else if (partnerType === 'apostille') {
      partnerName = meta.apostille_agent;
      const comm = Number(meta.apostille_committed || 0);
      const paid = Number(meta.apostille_paid || 0);
      dueAmount = Math.max(0, comm - paid) || comm || 3500;
      category = 'Apostille Charges';
    } else if (partnerType === 'insurance') {
      partnerName = meta.insurance_agent;
      const comm = Number(meta.insurance_committed || 0);
      const paid = Number(meta.insurance_paid || 0);
      dueAmount = Math.max(0, comm - paid) || comm || 2500;
      category = 'VFS & Insurance';
    }

    if (!partnerName) return;

    // Retrieve accounts for this partner
    const accounts = getAccountsForPartner(partnerName);
    const defAcc = accounts.find((a) => a.is_default) || accounts[0];
    const transferAcc = defAcc
      ? defAcc.details_string || `${defAcc.bank_name} A/C: ${defAcc.account_number} | IFSC: ${defAcc.ifsc || ''} | Beneficiary: ${defAcc.beneficiary_name}`
      : 'Not provided';

    setFormData((prev) => ({
      ...prev,
      partner_name: partnerName,
      selected_account_id: defAcc ? defAcc.id : '',
      transfer_account: transferAcc,
      student_names: student.name,
      amount: dueAmount,
      currency: 'INR',
      category: category,
      notes: (prev.notes ? `${prev.notes} | ` : '') + `${category} for student ${student.name}`,
    }));

    setShowStudentSuggestions(false);
    toast.success(`⚡ Autofilled ${partnerName} voucher for ${student.name} (₹${dueAmount.toLocaleString('en-IN')})`);
  };

  // Quick Add Parser (Microsoft To-Do style)
  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const raw = quickInput.trim();
    let detectedCurrency = 'INR';
    let detectedAmount = 0;
    let detectedPartner = '';
    let detectedStudent = '';
    let hasGst = false;

    if (/\$|usd/i.test(raw)) detectedCurrency = 'USD';
    else if (/€|eur/i.test(raw)) detectedCurrency = 'EUR';
    else if (/£|gbp/i.test(raw)) detectedCurrency = 'GBP';

    if (detectedCurrency === 'INR' && /gst/i.test(raw)) {
      hasGst = true; // 18% GST
    }

    const numMatch = raw.match(/(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+)/);
    if (numMatch) {
      detectedAmount = parseFloat(numMatch[1].replace(/,/g, ''));
    }

    const parts = raw.split(/[-–—:]+/).map((s) => s.trim());
    if (parts.length >= 2) {
      detectedPartner = parts[0];
      detectedStudent = parts.slice(1).join(' - ');
    } else {
      detectedPartner = raw;
    }

    detectedPartner = detectedPartner.replace(/\b(\d+[\d,.]*|\$|€|£|inr|usd|eur|gbp)\b/gi, '').trim();
    if (!detectedPartner) detectedPartner = 'Partner Payable';

    // Auto-link partner's default bank account if saved
    const accs = getAccountsForPartner(detectedPartner);
    const def = accs.find((a) => a.is_default) || accs[0];
    const transferAcc = def ? def.details_string : '';

    const defaultDue = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const newPayment = {
      id: 'b2b-' + Date.now(),
      partner_name: detectedPartner,
      transfer_account: transferAcc,
      selected_account_id: def ? def.id : '',
      student_names: detectedStudent || 'Linked Student',
      amount: detectedAmount || 10000,
      currency: detectedCurrency,
      has_gst: hasGst,
      category: 'Sub-Agent Commission',
      due_date: defaultDue,
      priority: false,
      status: 'pending',
      notes: raw,
      created_at: new Date().toISOString(),
      settled_at: null,
      payment_mode: null,
      utr_number: null,
    };

    setPayments((prev) => [newPayment, ...prev]);
    setQuickInput('');
    toast.success(`Added payment reminder for ${detectedPartner}!`);
  };

  // Open Settlement Modal
  const handleOpenSettle = (payment) => {
    if (payment.status === 'completed') {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: 'pending', settled_at: null, payment_mode: null, utr_number: null, paying_bank_id: null, paying_bank_name: null }
            : p
        )
      );
      toast.success(`Restored ${payment.partner_name} back to pending.`);
      return;
    }

    const defaultBank = companyBanks.find((b) => b.id === payment.paying_bank_id) || companyBanks[0];

    setSettlingPayment(payment);
    setSettlementData({
      settled_at: new Date().toISOString().split('T')[0],
      payment_mode: payment.currency !== 'INR' ? 'Forex Wire / Wise' : 'Bank Transfer (IMPS / NEFT)',
      paying_bank_id: defaultBank.id,
      paying_bank_name: defaultBank.bank_name,
      debit_account: `${defaultBank.bank_name} A/C: ${defaultBank.account_number} (${defaultBank.branch})`,
      utr_number: '',
      notes: payment.notes || '',
    });
  };

  // Confirm Settlement
  const handleConfirmSettlement = (e) => {
    e.preventDefault();
    if (!settlingPayment) return;

    const chosenBank = companyBanks.find((b) => b.id === settlementData.paying_bank_id) || companyBanks[0];

    setPayments((prev) =>
      prev.map((p) =>
        p.id === settlingPayment.id
          ? {
              ...p,
              status: 'completed',
              settled_at: settlementData.settled_at,
              payment_mode: settlementData.payment_mode,
              paying_bank_id: chosenBank.id,
              paying_bank_name: chosenBank.bank_name,
              debit_account: `${chosenBank.bank_name} A/C: ${chosenBank.account_number} (${chosenBank.branch})`,
              utr_number: settlementData.utr_number.trim(),
              notes: settlementData.notes,
            }
          : p
      )
    );

    const fin = calculateFinancials(settlingPayment);
    toast.success(`Settled ${formatMoney(fin.totalAmount, settlingPayment.currency)} from ${chosenBank.bank_name} to ${settlingPayment.partner_name}!`);

    // Synchronize settlement back to the student application (updates B2B Paid and recalculates net profit)
    updateStudentFromB2BSettlement(settlingPayment, settlementData.utr_number.trim(), chosenBank.bank_name);

    setSettlingPayment(null);
  };

  // Add a new House Bank for Sterling
  const handleAddNewCompanyBank = (e) => {
    e.preventDefault();
    if (!newCompanyBankForm.bank_name.trim() || !newCompanyBankForm.account_number.trim()) {
      toast.error('Bank Name and Account Number are required');
      return;
    }
    const newBank = {
      id: 'comp-bank-' + Date.now(),
      label: newCompanyBankForm.label.trim() || `${newCompanyBankForm.bank_name} Current A/C`,
      bank_name: newCompanyBankForm.bank_name.trim(),
      account_number: newCompanyBankForm.account_number.trim(),
      ifsc: newCompanyBankForm.ifsc.trim(),
      branch: newCompanyBankForm.branch.trim(),
      currency: newCompanyBankForm.currency,
    };
    setCompanyBanks((prev) => [...prev, newBank]);
    setNewCompanyBankForm({
      label: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
      branch: '',
      currency: 'INR',
    });
    setIsAddingNewCompanyBank(false);
    toast.success(`Added ${newBank.bank_name} to Sterling's Paying Banks!`);
  };

  const handleRemoveCompanyBank = (id) => {
    if (companyBanks.length <= 1) {
      toast.error('You must keep at least one company paying bank');
      return;
    }
    setCompanyBanks((prev) => prev.filter((b) => b.id !== id));
    toast.success('Removed company bank account');
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingPayment(null);
    setShowBatchCalculator(false);
    setBatchStudentCount(30);
    setBatchDescription('Apostille Batch (Malta / Europe)');
    setFormData({
      partner_name: '',
      transfer_account: '',
      selected_account_id: '',
      student_names: '',
      batch_count: null,
      amount: '',
      currency: 'INR',
      has_gst: false,
      category: 'Sub-Agent Commission',
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      priority: false,
      notes: '',
      invoice_file_name: '',
      invoice_file_data: '',
      invoice_uploaded_at: '',
      save_as_new_account: true,
    });
    setIsAddingInlineAccount(false);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (payment) => {
    setEditingPayment(payment);
    const partnerAccs = getAccountsForPartner(payment.partner_name);
    const matchedAcc = partnerAccs.find((a) => a.details_string === payment.transfer_account || a.id === payment.selected_account_id);
    const count = payment.batch_count || (payment.student_names?.includes('30') ? 30 : (payment.category === 'Apostille Charges' ? 30 : null));
    setBatchStudentCount(count || 30);
    setShowBatchCalculator(!!count || payment.category === 'Apostille Charges');

    setFormData({
      partner_name: payment.partner_name || '',
      transfer_account: payment.transfer_account || '',
      selected_account_id: matchedAcc ? matchedAcc.id : (partnerAccs.length > 0 ? '__custom__' : ''),
      student_names: payment.student_names || (payment.category === 'Apostille Charges' ? '30 Students (Apostille Batch)' : ''),
      batch_count: count,
      amount: payment.amount || '',
      currency: payment.currency || 'INR',
      has_gst: payment.has_gst || false,
      category: payment.category || 'Sub-Agent Commission',
      due_date: payment.due_date || '',
      priority: payment.priority || false,
      notes: payment.notes || '',
      invoice_file_name: payment.invoice_file_name || '',
      invoice_file_data: payment.invoice_file_data || '',
      invoice_uploaded_at: payment.invoice_uploaded_at || '',
      save_as_new_account: true,
    });
    setIsAddingInlineAccount(false);
    setShowModal(true);
  };

  // Upload Invoice file inside Add/Edit Modal
  const handleModalFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File exceeds 8MB limit');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        invoice_file_name: file.name,
        invoice_file_data: reader.result,
        invoice_uploaded_at: new Date().toISOString(),
      }));
      toast.success(`Attached B2B invoice: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Direct table-row invoice upload
  const handleTriggerRowUpload = (paymentId) => {
    setActiveUploadPaymentId(paymentId);
    if (fileInputRowRef.current) {
      fileInputRowRef.current.value = '';
      fileInputRowRef.current.click();
    }
  };

  const handleRowFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadPaymentId) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('File exceeds 8MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === activeUploadPaymentId
            ? {
                ...p,
                invoice_file_name: file.name,
                invoice_file_data: reader.result,
                invoice_uploaded_at: new Date().toISOString(),
              }
            : p
        )
      );
      toast.success(`Attached invoice: ${file.name}`);
      setActiveUploadPaymentId(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveInvoiceFromPayment = (paymentId) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? { ...p, invoice_file_name: null, invoice_file_data: null, invoice_uploaded_at: null }
          : p
      )
    );
    setViewingInvoicePayment(null);
    toast.success('Removed invoice attachment');
  };

  // Save Add/Edit Modal
  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formData.partner_name.trim()) {
      toast.error('Partner name is required');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Force foreign payment to no GST
    const isForeign = formData.currency !== 'INR';
    const finalHasGst = isForeign ? false : formData.has_gst;

    // Auto-save new account into directory if partner was not registered before
    const partnerKey = formData.partner_name.trim();
    if (formData.save_as_new_account && formData.transfer_account.trim()) {
      const existing = getAccountsForPartner(partnerKey);
      const isAlreadySaved = existing.some((a) => a.details_string === formData.transfer_account.trim());
      if (!isAlreadySaved) {
        const autoAcc = {
          id: 'acc-' + Date.now(),
          label: 'Primary Account',
          bank_name: '',
          account_number: '',
          ifsc: '',
          beneficiary_name: '',
          upi_id: '',
          details_string: formData.transfer_account.trim(),
          is_default: existing.length === 0,
        };
        setPartnerAccounts((prev) => {
          const matchKey = Object.keys(prev).find((k) => k.toLowerCase() === partnerKey.toLowerCase()) || partnerKey;
          return {
            ...prev,
            [matchKey]: [...(prev[matchKey] || []), autoAcc],
          };
        });
      }
    }

    let finalStudentNames = formData.student_names ? formData.student_names.trim() : '';
    let finalBatchCount = formData.batch_count;
    if (!finalStudentNames) {
      if (formData.category === 'Apostille Charges' || formData.partner_name?.toLowerCase().includes('comfort')) {
        finalStudentNames = '30 Students (Apostille Batch)';
        finalBatchCount = finalBatchCount || 30;
      } else {
        finalStudentNames = 'Batch / Agency Service';
      }
    } else {
      const match = finalStudentNames.match(/\b(\d+)\s*students?\b/i);
      if (match && !finalBatchCount) {
        finalBatchCount = parseInt(match[1]);
      }
    }

    if (editingPayment) {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === editingPayment.id
            ? {
                ...p,
                partner_name: formData.partner_name.trim(),
                transfer_account: formData.transfer_account.trim(),
                selected_account_id: formData.selected_account_id,
                student_names: finalStudentNames,
                batch_count: finalBatchCount,
                amount: amt,
                currency: formData.currency,
                has_gst: finalHasGst,
                category: formData.category,
                due_date: formData.due_date,
                priority: formData.priority,
                notes: formData.notes.trim(),
                invoice_file_name: formData.invoice_file_name || null,
                invoice_file_data: formData.invoice_file_data || null,
                invoice_uploaded_at: formData.invoice_uploaded_at || null,
              }
            : p
        )
      );
      toast.success('Payment updated');
    } else {
      const newRecord = {
        id: 'b2b-' + Date.now(),
        partner_name: formData.partner_name.trim(),
        transfer_account: formData.transfer_account.trim(),
        selected_account_id: formData.selected_account_id,
        student_names: finalStudentNames,
        batch_count: finalBatchCount,
        amount: amt,
        currency: formData.currency,
        has_gst: finalHasGst,
        category: formData.category,
        due_date: formData.due_date,
        priority: formData.priority,
        status: 'pending',
        notes: formData.notes.trim(),
        invoice_file_name: formData.invoice_file_name || null,
        invoice_file_data: formData.invoice_file_data || null,
        invoice_uploaded_at: formData.invoice_uploaded_at || null,
        created_at: new Date().toISOString(),
        settled_at: null,
        payment_mode: null,
        utr_number: null,
      };
      setPayments((prev) => [newRecord, ...prev]);
      toast.success('Payment added');
    }
    setShowModal(false);
  };

  // Delete Payment permanently
  const handleDelete = (id, partner) => {
    if (window.confirm(`Delete payment reminder for "${partner}"?`)) {
      const target = payments.find((p) => p.id === id);
      if (target) {
        try {
          const deletedKeys = JSON.parse(localStorage.getItem('sterling_b2b_deleted_keys') || '[]');
          const k1 = id;
          const k2 = target.student_id ? `${target.student_id}_${target.partner_type || target.category}`.toLowerCase() : null;
          const k3 = target.student_names ? `${target.student_names.trim().toLowerCase()}_${target.partner_type || target.category}`.toLowerCase() : null;
          const k4 = target.student_names && target.partner_name ? `${target.student_names.trim().toLowerCase()}_${target.partner_name.toLowerCase()}`.toLowerCase() : null;
          const updated = Array.from(new Set([...deletedKeys, k1, k2, k3, k4].filter(Boolean)));
          localStorage.setItem('sterling_b2b_deleted_keys', JSON.stringify(updated));
        } catch (e) {}
      }

      setPayments((prev) => {
        const next = prev.filter((p) => p.id !== id);
        try {
          localStorage.setItem('sterling_b2b_payments', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Payment deleted permanently');
    }
  };

  // Partner Bank Accounts Manager: Add Account to Selected Company
  const handleManagerAddAccount = (e) => {
    e.preventDefault();
    if (!selectedManagerCompany) return;
    if (!managerAccountForm.bank_name && !managerAccountForm.account_number && !managerAccountForm.upi_id) {
      toast.error('Please enter at least Bank Name, Account Number, or UPI ID');
      return;
    }

    const parts = [];
    if (managerAccountForm.bank_name) parts.push(managerAccountForm.bank_name);
    if (managerAccountForm.account_number) parts.push(`A/C: ${managerAccountForm.account_number}`);
    if (managerAccountForm.ifsc) parts.push(`IFSC/Swift: ${managerAccountForm.ifsc}`);
    if (managerAccountForm.beneficiary_name) parts.push(`Beneficiary: ${managerAccountForm.beneficiary_name}`);
    if (managerAccountForm.upi_id) parts.push(`UPI: ${managerAccountForm.upi_id}`);
    const detailsStr = parts.join(' | ');

    const newAcc = {
      id: 'acc-' + Date.now(),
      label: managerAccountForm.label.trim() || `${managerAccountForm.bank_name || 'Bank'} A/C`,
      bank_name: managerAccountForm.bank_name.trim(),
      account_number: managerAccountForm.account_number.trim(),
      ifsc: managerAccountForm.ifsc.trim(),
      branch: managerAccountForm.branch.trim(),
      beneficiary_name: managerAccountForm.beneficiary_name.trim(),
      upi_id: managerAccountForm.upi_id.trim(),
      details_string: detailsStr,
      is_default: false,
    };

    setPartnerAccounts((prev) => {
      const currentList = prev[selectedManagerCompany] || [];
      return {
        ...prev,
        [selectedManagerCompany]: [...currentList, newAcc],
      };
    });

    setManagerAccountForm({
      label: '',
      bank_name: '',
      account_number: '',
      ifsc: '',
      branch: '',
      beneficiary_name: '',
      upi_id: '',
    });

    toast.success(`Added new account for ${selectedManagerCompany}!`);
  };

  // Partner Bank Accounts Manager: Delete Account
  const handleManagerDeleteAccount = (companyName, accId) => {
    if (window.confirm('Delete this bank account from directory?')) {
      setPartnerAccounts((prev) => {
        const currentList = prev[companyName] || [];
        return {
          ...prev,
          [companyName]: currentList.filter((a) => a.id !== accId),
        };
      });
      toast.success('Account deleted');
    }
  };

  // Partner Bank Accounts Manager: Set Default Account
  const handleManagerSetDefault = (companyName, accId) => {
    setPartnerAccounts((prev) => {
      const currentList = prev[companyName] || [];
      return {
        ...prev,
        [companyName]: currentList.map((a) => ({
          ...a,
          is_default: a.id === accId,
        })),
      };
    });
    toast.success('Set as primary transfer account');
  };

  // Partner Bank Accounts Manager: Add New B2B Company
  const handleManagerAddCompany = (e) => {
    e.preventDefault();
    if (!newCompanyNameInput.trim()) return;
    const name = newCompanyNameInput.trim();
    if (partnerAccounts[name]) {
      toast.error('This company already exists in directory');
      return;
    }
    setPartnerAccounts((prev) => ({
      ...prev,
      [name]: [],
    }));
    setSelectedManagerCompany(name);
    setIsAddingNewCompany(false);
    setNewCompanyNameInput('');
    toast.success(`Created company profile for ${name}`);
  };

  // Open Export Customization Modal
  const openExportModal = (scope = 'all') => {
    if (scope === 'selected' && selectedIds.size === 0) {
      toast.error('Please select at least one payment row first');
      return;
    }
    setExportScope(scope);
    setShowExportModal(true);
  };

  // Toggle single column selection
  const handleToggleExportCol = (id) => {
    setExportColIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Apply Quick Column Presets
  const handleApplyExportPreset = (preset) => {
    if (preset === 'accounts_quick') {
      setExportColIds(new Set(['sl_no', 'partner_name', 'transfer_account', 'student_names', 'total_amount', 'currency']));
      toast.success('Applied "Accounts Quick Transfer" columns preset');
    } else if (preset === 'accounts_gst') {
      setExportColIds(new Set(['sl_no', 'partner_name', 'transfer_account', 'student_names', 'base_amount', 'gst_amount', 'total_amount', 'currency', 'due_date']));
      toast.success('Applied "Accounts with 18% GST" columns preset');
    } else if (preset === 'all') {
      setExportColIds(new Set(EXPORT_COLUMNS_DEF.map((c) => c.id)));
      toast.success('Selected all columns');
    } else if (preset === 'none') {
      setExportColIds(new Set());
    }
  };

  // Execute Excel / CSV Download with Chosen Columns & Scope
  const handleExecuteExport = () => {
    let dataset = payments;
    if (exportScope === 'selected') {
      if (selectedIds.size === 0) {
        toast.error('Please select at least one payment from the table');
        return;
      }
      dataset = payments.filter((p) => selectedIds.has(p.id));
    } else if (exportScope === 'filtered') {
      dataset = filteredList;
    }

    if (dataset.length === 0) {
      toast.error('No payments to export');
      return;
    }

    if (exportColIds.size === 0) {
      toast.error('Please select at least one column to include in the Excel file');
      return;
    }

    // Active chosen columns in defined order
    const activeCols = EXPORT_COLUMNS_DEF.filter((c) => exportColIds.has(c.id));

    // Map rows based ONLY on selected columns
    const rows = dataset.map((p, idx) => {
      const fin = calculateFinancials(p);
      const row = {};

      activeCols.forEach((col) => {
        switch (col.id) {
          case 'sl_no':
            row[col.key] = idx + 1;
            break;
          case 'partner_name':
            row[col.key] = p.partner_name || '';
            break;
          case 'transfer_account':
            row[col.key] = p.transfer_account || 'Not Specified';
            break;
          case 'student_names':
            row[col.key] = p.student_names || '';
            break;
          case 'total_amount':
            row[col.key] = fin.totalAmount;
            break;
          case 'base_amount':
            row[col.key] = fin.baseAmount;
            break;
          case 'gst_amount':
            row[col.key] = fin.gstAmount;
            break;
          case 'gst_rate':
            row[col.key] = fin.gstRate > 0 ? `${fin.gstRate}%` : '0% (Exempt)';
            break;
          case 'currency':
            row[col.key] = p.currency || 'INR';
            break;
          case 'due_date':
            row[col.key] = p.due_date || 'No Date';
            break;
          case 'status':
            row[col.key] = p.status === 'completed' ? 'PAID / SETTLED' : 'PENDING PAYMENT';
            break;
          case 'category':
            row[col.key] = p.category || '';
            break;
          case 'settled_at':
            row[col.key] = p.settled_at || '';
            break;
          case 'payment_mode':
            row[col.key] = p.payment_mode || '';
            break;
          case 'paying_bank':
            row[col.key] = p.paying_bank_name || (p.status === 'completed' ? 'Federal Bank (Valanchery)' : 'Pending Allocation');
            break;
          case 'utr_number':
            row[col.key] = p.utr_number || '';
            break;
          case 'notes':
            row[col.key] = p.notes || '';
            break;
          default:
            break;
        }
      });

      return row;
    });

    // Add Bottom Summary Row if requested
    if (includeBottomTotal) {
      let totalWithoutGstINR = 0;
      let totalGstINR = 0;
      let totalWithGstINR = 0;
      dataset.forEach((p) => {
        if (p.currency === 'INR') {
          const fin = calculateFinancials(p);
          totalWithoutGstINR += fin.baseAmount;
          totalGstINR += fin.gstAmount;
          totalWithGstINR += fin.totalAmount;
        }
      });

      const totalRow = {};
      activeCols.forEach((col) => {
        if (col.id === 'sl_no') totalRow[col.key] = '';
        else if (col.id === 'partner_name') totalRow[col.key] = 'TOTAL (INR Domestic)';
        else if (col.id === 'base_amount') totalRow[col.key] = totalWithoutGstINR;
        else if (col.id === 'gst_amount') totalRow[col.key] = totalGstINR;
        else if (col.id === 'total_amount') totalRow[col.key] = totalWithGstINR;
        else if (col.id === 'gst_rate') totalRow[col.key] = '18%';
        else if (col.id === 'currency') totalRow[col.key] = 'INR';
        else if (col.id === 'status') totalRow[col.key] = 'Calculated for Accounts';
        else totalRow[col.key] = '';
      });

      rows.push(totalRow);
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = activeCols.map((c) => ({ wch: c.wch }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'B2B Payables');

    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
    const partnerSlug = partnerFilter !== 'All' ? `_${partnerFilter.replace(/[^a-zA-Z0-9_-]+/g, '_')}` : '';
    const fileBase = `Sterling_Billing${partnerSlug}_${exportScope}_${dateStr}_${timeStr}`;

    if (exportFormat === 'csv') {
      XLSX.writeFile(workbook, `${fileBase}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, `${fileBase}.xlsx`);
    }

    setShowExportModal(false);
    toast.success(`Exported ${dataset.length} payment(s) with ${activeCols.length} chosen columns!`);
  };

  // Filtered Payments List
  const filteredList = useMemo(() => {
    let list = [...payments];

    // Status filter
    if (statusFilter === 'pending') {
      list = list.filter((p) => p.status === 'pending');
    } else if (statusFilter === 'urgent') {
      list = list.filter((p) => {
        if (p.status !== 'pending') return false;
        return getDueStatus(p.due_date).urgent;
      });
    } else if (statusFilter === 'completed') {
      list = list.filter((p) => p.status === 'completed');
    }

    // Currency filter
    if (currencyFilter !== 'All') {
      list = list.filter((p) => p.currency === currencyFilter);
    }

    // Partner filter
    if (partnerFilter !== 'All') {
      list = list.filter(
        (p) => (p.partner_name || '').trim().toLowerCase() === partnerFilter.trim().toLowerCase()
      );
    }

    // Paying bank filter (Our company bank account)
    if (payingBankFilter !== 'All') {
      list = list.filter((p) => p.paying_bank_id === payingBankFilter || (p.paying_bank_name || '').toLowerCase() === payingBankFilter.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.partner_name?.toLowerCase().includes(q) ||
          p.transfer_account?.toLowerCase().includes(q) ||
          p.student_names?.toLowerCase().includes(q) ||
          p.paying_bank_name?.toLowerCase().includes(q) ||
          p.debit_account?.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q) ||
          p.utr_number?.toLowerCase().includes(q)
      );
    }

    // Sort: Starred first, then earliest due date
    list.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

    return list;
  }, [payments, statusFilter, currencyFilter, searchQuery, payingBankFilter]);

  const allVisibleSelected =
    filteredList.length > 0 && filteredList.every((p) => selectedIds.has(p.id));

  // Current accounts of the partner being edited in Add/Edit payment modal
  const currentPartnerAccounts = useMemo(() => {
    return getAccountsForPartner(formData.partner_name);
  }, [formData.partner_name, partnerAccounts]);

  return (
    <div className="b2b-simple-container">
      <style>{`
        .b2b-simple-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: var(--text, #0E1326);
          font-family: inherit;
        }

        /* Top Simple Clean Header */
        .b2b-top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .header-title-box h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: var(--text, #EDEFFA);
          letter-spacing: -0.01em;
        }

        .header-title-box p {
          font-size: 13px;
          color: var(--muted, #8B949E);
          margin: 3px 0 0;
        }

        .header-action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-simple-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #4F46E5;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-simple-primary:hover {
          background: #4338CA;
        }

        .btn-simple-download {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg2, #ffffff);
          color: var(--text, #0E1326);
          border: 1px solid var(--border-strong, rgba(148, 163, 225, 0.3));
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-simple-download:hover {
          background: var(--bg3, #F4F6FC);
          border-color: #4F46E5;
        }

        .btn-simple-download.selected-active {
          background: #10B981;
          color: #ffffff;
          border-color: #10B981;
        }

        /* 4 Clean Minimal KPI Metric Cards */
        .simple-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 12px;
        }

        .simple-kpi-card {
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .simple-kpi-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--muted, #8B949E);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .simple-kpi-val {
          font-size: 20px;
          font-weight: 800;
          color: var(--text, #EDEFFA);
        }

        .simple-kpi-val.highlight {
          color: #10B981;
        }

        .simple-kpi-val.tax {
          color: #F59E0B;
        }

        .simple-kpi-sub {
          font-size: 11.5px;
          color: var(--muted, #8B949E);
        }

        /* Microsoft To-Do Minimal Input */
        .simple-quick-add {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.25));
          border-radius: 10px;
          padding: 8px 14px;
        }

        .simple-quick-add input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text, #EDEFFA);
          font-size: 13.5px;
          outline: none;
        }

        .simple-quick-add input::placeholder {
          color: var(--muted, #8B949E);
        }

        /* Simple Controls & Filters Row */
        .simple-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .simple-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .simple-tab-btn {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          background: var(--bg2, #ffffff);
          color: var(--muted, #8B949E);
          cursor: pointer;
          transition: all 0.15s;
        }

        .simple-tab-btn.active {
          background: #4F46E5;
          color: #ffffff;
          border-color: #4F46E5;
        }

        .simple-search-box {
          position: relative;
        }

        .simple-search-box input {
          padding: 6px 12px 6px 28px;
          border-radius: 6px;
          border: 1px solid var(--border, rgba(148, 163, 225, 0.25));
          background: var(--bg2, #ffffff);
          color: var(--text, #EDEFFA);
          font-size: 12.5px;
          outline: none;
        }

        .simple-search-box .icon {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: var(--muted, #8B949E);
        }

        /* Selection Floating / Action Bar */
        .selection-action-bar {
          background: rgba(79, 70, 229, 0.12);
          border: 1px solid rgba(79, 70, 229, 0.35);
          border-radius: 8px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        /* Clean Modern Financial Table */
        .simple-table-wrapper {
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .simple-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }

        .simple-table th {
          background: var(--bg3, #F4F6FC);
          padding: 10px 14px;
          font-weight: 700;
          font-size: 11.5px;
          color: var(--muted, #8B949E);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          white-space: nowrap;
        }

        .simple-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.12));
          vertical-align: middle;
          color: var(--text, #EDEFFA);
        }

        .simple-table tr:last-child td {
          border-bottom: none;
        }

        .simple-table tr:hover {
          background: var(--bg3, rgba(148, 163, 225, 0.06));
        }

        .simple-table tr.selected-row {
          background: rgba(79, 70, 229, 0.06);
        }

        .account-transfer-pill {
          display: block;
          font-size: 11.5px;
          color: var(--muted, #8B949E);
          margin-top: 3px;
          max-width: 420px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .badge-due {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .badge-tax-tag {
          font-size: 10.5px;
          font-weight: 700;
          color: #F59E0B;
        }

        .btn-table-action {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--muted, #8B949E);
          padding: 4px;
          font-size: 13px;
          border-radius: 4px;
        }

        .btn-table-action:hover {
          color: #4F46E5;
          background: rgba(79, 70, 229, 0.1);
        }

        .btn-settle-inline {
          padding: 4px 10px;
          background: #10B981;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-settle-inline:hover {
          background: #059669;
        }

        /* Modal Styles */
        .b2b-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .b2b-modal-card {
          background: var(--bg2, #ffffff);
          border: 1px solid var(--border-strong, rgba(148, 163, 225, 0.3));
          border-radius: 14px;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }

        .b2b-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .b2b-modal-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--text, #EDEFFA);
        }

        .b2b-modal-body {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-row {
          display: flex;
          gap: 12px;
        }

        .form-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
          position: relative;
        }

        .form-field label {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted, #8B949E);
        }

        .form-field input, .form-field select, .form-field textarea {
          padding: 8px 12px;
          background: var(--bg3, #F4F6FC);
          border: 1px solid var(--border, rgba(148, 163, 225, 0.25));
          border-radius: 6px;
          font-size: 13px;
          color: var(--text, #EDEFFA);
          outline: none;
          font-family: inherit;
        }

        .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
          border-color: #4F46E5;
        }

        .b2b-modal-footer {
          padding: 14px 20px;
          border-top: 1px solid var(--border, rgba(148, 163, 225, 0.15));
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--border, rgba(148, 163, 225, 0.25));
          color: var(--text, #EDEFFA);
          padding: 7px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .student-autocomplete-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg2solid, #11162a);
          border: 1px solid var(--border-strong, rgba(148, 163, 225, 0.3));
          border-radius: 8px;
          margin-top: 4px;
          max-height: 160px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
        }

        .student-autocomplete-row {
          padding: 6px 12px;
          font-size: 12.5px;
          cursor: pointer;
          border-bottom: 1px solid var(--border, rgba(148, 163, 225, 0.1));
        }

        .student-autocomplete-row:hover {
          background: #4F46E5;
          color: #ffffff;
        }

        /* Accounts Directory Manager Styles */
        .manager-layout {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 16px;
          min-height: 380px;
        }

        .manager-companies-list {
          border-right: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          padding-right: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          max-height: 480px;
        }

        .manager-company-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text, #EDEFFA);
          cursor: pointer;
          text-align: left;
        }

        .manager-company-btn:hover {
          background: var(--bg3, #F4F6FC);
        }

        .manager-company-btn.active {
          background: rgba(79, 70, 229, 0.12);
          color: #4F46E5;
          border-color: rgba(79, 70, 229, 0.3);
        }

        .acc-count-tag {
          font-size: 11px;
          padding: 1px 6px;
          border-radius: 10px;
          background: var(--bg3, #F4F6FC);
          color: var(--muted, #8B949E);
        }

        .manager-accounts-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          max-height: 480px;
          padding-right: 4px;
        }

        .account-card-box {
          border: 1px solid var(--border, rgba(148, 163, 225, 0.2));
          border-radius: 8px;
          padding: 12px 14px;
          background: var(--bg3, #F4F6FC);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        @media (max-width: 900px) {
          .simple-table {
            display: block;
            overflow-x: auto;
          }
          .manager-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* 1. CLEAN TOP HEADER */}
      <div className="b2b-top-header">
        <div className="header-title-box">
          <h1>Billing, Payouts &amp; Accounts Reminders</h1>
          <p>
            Track invoices, partner payouts, and disbursements across Sterling banks with multi-currency and GST tracking.
          </p>
        </div>

        <div className="header-action-buttons">
          {/* Download Selected for Accounts Team */}
          {selectedIds.size > 0 && (
            <button
              className="btn-simple-download selected-active"
              onClick={() => openExportModal('selected')}
              title="Download selected payments with custom fields"
            >
              <span>📥 Download Selected ({selectedIds.size})...</span>
            </button>
          )}

          {/* Sterling Accounts Payment Disbursement Sheet */}
          <button
            className="btn-simple-download"
            onClick={() => {
              setAccountsSheetPartner(partnerFilter || 'All');
              setShowAccountsSheetModal(true);
            }}
            title="Download / Print Accounts Payment Disbursement Sheet for Sterling Accounts Team"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              borderColor: 'rgba(16, 185, 129, 0.35)',
              color: '#10B981',
              fontWeight: 700,
            }}
          >
            <span>🏦 {partnerFilter !== 'All' ? `${partnerFilter} Payment Sheet` : 'Accounts Payment Sheet'} ({partnerFilter !== 'All' ? payments.filter(p => p.status !== 'completed' && p.partner_name === partnerFilter).length : metrics.pendingCount})</span>
          </button>

          {/* Download All / Custom Excel */}
          <button
            className="btn-simple-download"
            onClick={() => openExportModal(selectedIds.size > 0 ? 'selected' : 'all')}
            title="Choose columns and download custom Excel file"
          >
            <span>📥 Download Excel / Choose Fields...</span>
          </button>

          {/* Dubai Student Invoice & B2B Receipt Generator */}
          <button
            className="btn-simple-download"
            onClick={() => {
              setDocModalPayment(null);
              setDocModalMode('dubai_invoice');
              setShowDocModal(true);
            }}
            title="Generate Student Dubai Invoice or B2B Remittance Receipt on official Sterling letterhead"
            style={{
              background: 'rgba(79, 70, 229, 0.15)',
              borderColor: 'rgba(79, 70, 229, 0.35)',
              color: '#818CF8',
              fontWeight: 700,
            }}
          >
            <span>📄 Letterhead Invoices & Receipts</span>
          </button>

          {/* Manage B2B Bank Accounts Button */}
          <button
            className="btn-simple-download"
            onClick={() => {
              const firstCompany = Object.keys(partnerAccounts)[0] || 'Consult Fox';
              setSelectedManagerCompany(firstCompany);
              setShowAccountsManagerModal(true);
            }}
            title="View and add multiple bank accounts for each B2B company"
          >
            <span>🏦 Partner Bank Accounts</span>
          </button>

          {/* Add Payment Button */}
          <button className="btn-simple-primary" onClick={handleOpenAddModal}>
            <span>+</span>
            <span>Add Payment</span>
          </button>
        </div>
      </div>

      {/* 2. 4 SIMPLE, INFORMATIVE KPI CARDS */}
      <div className="simple-kpi-grid">
        {/* Without GST Net Total */}
        <div className="simple-kpi-card">
          <div className="simple-kpi-label">Base Amount (Without GST)</div>
          <div className="simple-kpi-val">{formatMoney(metrics.pendingWithoutGstINR, 'INR')}</div>
          <div className="simple-kpi-sub">Net payables before taxes (INR)</div>
        </div>

        {/* 18% GST Total */}
        <div className="simple-kpi-card">
          <div className="simple-kpi-label">GST 18% Total</div>
          <div className="simple-kpi-val tax">{formatMoney(metrics.pendingGstAmountINR, 'INR')}</div>
          <div className="simple-kpi-sub">18% tax on applicable Indian B2B payables</div>
        </div>

        {/* Total With GST (Final Amount to Pay) */}
        <div className="simple-kpi-card" style={{ borderLeft: '3px solid #10B981' }}>
          <div className="simple-kpi-label">Total Payable (With GST)</div>
          <div className="simple-kpi-val highlight">{formatMoney(metrics.pendingWithGstINR, 'INR')}</div>
          <div className="simple-kpi-sub">Final total payout for accounts transfer</div>
        </div>

        {/* Foreign Currencies (No GST) */}
        <div className="simple-kpi-card" style={{ borderLeft: '3px solid #3B82F6' }}>
          <div className="simple-kpi-label">Foreign Transfers (No GST)</div>
          <div className="simple-kpi-val" style={{ fontSize: '18px' }}>
            {Object.keys(metrics.forexPending || {}).length > 0
              ? Object.entries(metrics.forexPending).map(([curr, amt]) => formatMoney(amt, curr)).join(' + ')
              : '$0'}
          </div>
          <div className="simple-kpi-sub">0% GST (Foreign export exempt)</div>
        </div>
      </div>

      {/* 3. MICROSOFT TO-DO CLEAN QUICK ADD BAR */}
      <form className="simple-quick-add" onSubmit={handleQuickAddSubmit}>
        <span style={{ color: '#4F46E5', fontSize: '16px' }}>➕</span>
        <input
          type="text"
          placeholder='Quick Add: "Consult Fox - 1,80,000 - Thejus & Nivil + GST" or "Future Factory 500 usd"'
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
        />
        {quickInput.trim() && (
          <button type="submit" className="btn-simple-primary" style={{ padding: '5px 12px' }}>
            Add
          </button>
        )}
      </form>

      {/* 4. CONTROLS & FILTER ROW */}
      <div className="simple-controls-bar">
        {/* Status Tabs */}
        <div className="simple-tabs">
          <button
            className={`simple-tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({metrics.pendingCount})
          </button>
          <button
            className={`simple-tab-btn ${statusFilter === 'urgent' ? 'active' : ''}`}
            onClick={() => setStatusFilter('urgent')}
          >
            ⚠️ Due Soon / Overdue ({metrics.overdueCount})
          </button>
          <button
            className={`simple-tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            ✓ Settled ({payments.filter((p) => p.status === 'completed').length})
          </button>
          <button
            className={`simple-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Records ({payments.length})
          </button>
          <button
            className={`simple-tab-btn ${statusFilter === 'partner_ledger' ? 'active' : ''}`}
            onClick={() => setStatusFilter('partner_ledger')}
            style={{ fontWeight: 800 }}
          >
            👥 Partner Balances &amp; Ledger ({partnerLedgerList.length})
          </button>
        </div>

        {/* Currency, Partner Filter, Paying Bank & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Partner Dropdown Filter */}
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            title="Filter records by B2B Partner"
            style={{
              padding: '7px 11px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong, rgba(148, 163, 225, 0.22))',
              background: 'var(--bg2solid, #11162a)',
              color: 'var(--text, #EDEFFA)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="All">All Partners ({uniquePartnerNames.length})</option>
            {uniquePartnerNames.map((name) => (
              <option key={name} value={name}>
                🤝 {name}
              </option>
            ))}
          </select>

          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            style={{
              padding: '7px 11px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong, rgba(148, 163, 225, 0.22))',
              background: 'var(--bg2solid, #11162a)',
              color: 'var(--text, #EDEFFA)',
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Currencies</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>

          {/* Sterling Disbursing Bank Filter */}
          <select
            value={payingBankFilter}
            onChange={(e) => setPayingBankFilter(e.target.value)}
            title="Filter by which Sterling Bank account disbursed the funds"
            style={{
              padding: '7px 11px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong, rgba(148, 163, 225, 0.22))',
              background: 'var(--bg2solid, #11162a)',
              color: 'var(--text, #EDEFFA)',
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Paying Banks (Our Accounts)</option>
            {companyBanks.map((b) => (
              <option key={b.id} value={b.id}>
                🏦 {b.bank_name} ({b.account_number.slice(-4)})
              </option>
            ))}
          </select>

          <div className="simple-search-box">
            <span className="icon">🔍</span>
            <input
              type="text"
              placeholder="Search partner, account, student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 5. SELECTION BAR (When rows are checked) */}
      {selectedIds.size > 0 && (
        <div className="selection-action-bar">
          <div>
            <strong>{selectedIds.size}</strong> payment{selectedIds.size > 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-simple-primary"
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => openExportModal('selected')}
            >
              📥 Download Selected ({selectedIds.size}) for Accounts...
            </button>
            <button
              className="btn-cancel"
              style={{ padding: '4px 10px', fontSize: '12px' }}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* PARTNER LEDGER SUMMARY BANNER (WHEN FILTERED BY SPECIFIC PARTNER) */}
      {selectedPartnerLedger && statusFilter !== 'partner_ledger' && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1.5px solid rgba(59, 130, 246, 0.45)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
              B2B Partner Ledger Account
            </div>
            <div style={{ fontSize: '19px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤝 {selectedPartnerLedger.partnerName}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', fontWeight: 700 }}>
                {selectedPartnerLedger.categories || 'B2B Partner'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#CBD5E1', marginTop: '3px' }}>
              🏦 <strong>Account:</strong> {selectedPartnerLedger.transferAccount}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px 14px', borderRadius: '8px', textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>Total Committed</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>
                {formatMoney(selectedPartnerLedger.totalCommitted, selectedPartnerLedger.currency)}
              </div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '8px 14px', borderRadius: '8px', textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#34D399', fontWeight: 700 }}>✓ Total Paid (Done)</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#10B981' }}>
                {formatMoney(selectedPartnerLedger.totalPaid, selectedPartnerLedger.currency)}
              </div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '8px 14px', borderRadius: '8px', textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#FBBF24', fontWeight: 700 }}>⏳ Remaining Due</div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#F59E0B' }}>
                {formatMoney(selectedPartnerLedger.remainingDue, selectedPartnerLedger.currency)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const partnerPending = payments.filter((p) => p.partner_name === selectedPartnerLedger.partnerName && p.status !== 'completed');
                const itemsToUse = partnerPending.length > 0 ? partnerPending : payments.filter((p) => p.partner_name === selectedPartnerLedger.partnerName);
                const totalBase = itemsToUse.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const hasGst = itemsToUse.some((p) => p.has_gst || p.is_gst_applicable);
                const studentNamesList = itemsToUse.map((p) => p.student_names).filter(Boolean).join(', ') || `${itemsToUse.length} Students`;
                const combinedPayment = {
                  id: `BATCH-${selectedPartnerLedger.partnerName.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase()}`,
                  partner_name: selectedPartnerLedger.partnerName,
                  student_names: `${studentNamesList} (${itemsToUse.length} Students Referral)`,
                  category: selectedPartnerLedger.categories || 'Sub-Agent Commission',
                  amount: totalBase,
                  currency: selectedPartnerLedger.currency || 'INR',
                  has_gst: hasGst,
                  is_gst_applicable: hasGst,
                  transfer_account: selectedPartnerLedger.transferAccount,
                  status: 'pending',
                  payment_mode: 'Bank Transfer (IMPS / NEFT)',
                };
                setDocModalPayment(combinedPayment);
                setDocModalMode('b2b_receipt');
                setShowDocModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                border: '1px solid #818CF8',
                color: '#FFFFFF',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)',
              }}
              title={`Print official combined requisition voucher/invoice for ${selectedPartnerLedger.partnerName}`}
            >
              <span>📄</span>
              <span>Print {selectedPartnerLedger.partnerName} Invoice / Voucher</span>
            </button>

            <button
              type="button"
              onClick={() => setPartnerFilter('All')}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#CBD5E1',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✕ Show All Partners
            </button>
          </div>
        </div>
      )}

      {/* 6. PARTNER BALANCES VIEW (WHEN PARTNER LEDGER TAB IS ACTIVE) */}
      {statusFilter === 'partner_ledger' ? (
        <div className="simple-table-wrapper">
          <table className="simple-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th>B2B Partner &amp; Category</th>
                <th>Linked Candidate(s)</th>
                <th>Transfer Account on File</th>
                <th style={{ textAlign: 'right' }}>Total Committed</th>
                <th style={{ textAlign: 'right' }}>Total Paid (Done)</th>
                <th style={{ textAlign: 'right' }}>Remaining Due</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Settlement Rate</th>
                <th style={{ textAlign: 'center', width: '150px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {partnerLedgerList.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted, #8B949E)' }}>
                    No B2B partner records found.
                  </td>
                </tr>
              ) : (
                partnerLedgerList.map((partner, idx) => {
                  const percentPaid = partner.totalCommitted > 0
                    ? Math.round((partner.totalPaid / partner.totalCommitted) * 100)
                    : 100;
                  const isSettled = partner.remainingDue <= 0;

                  return (
                    <tr key={partner.partnerName}>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text, #EDEFFA)' }}>
                          🤝 {partner.partnerName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted, #8B949E)', marginTop: '2px' }}>
                          {partner.categories || 'Sub-Agent / Referral'}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text, #EDEFFA)', wordBreak: 'break-word', maxWidth: '200px' }}>
                        {partner.candidates || 'General'}
                      </td>
                      <td>
                        <span className="account-transfer-pill" title={partner.transferAccount}>
                          🏦 {partner.transferAccount}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '13.5px' }}>
                        {formatMoney(partner.totalCommitted, partner.currency)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '13.5px', color: '#10B981' }}>
                        {formatMoney(partner.totalPaid, partner.currency)}
                        <div style={{ fontSize: '10px', color: '#6EE7B7' }}>
                          ({partner.completedCount} paid)
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '14px', color: isSettled ? '#10B981' : '#F59E0B' }}>
                        {isSettled ? '✓ Cleared' : formatMoney(partner.remainingDue, partner.currency)}
                        {!isSettled && (
                          <div style={{ fontSize: '10px', color: '#FCD34D' }}>
                            ({partner.pendingCount} pending)
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: isSettled ? '#10B981' : '#60A5FA', marginBottom: '3px' }}>
                          {percentPaid}% Paid
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${percentPaid}%`,
                              height: '100%',
                              background: isSettled ? '#10B981' : 'linear-gradient(90deg, #3B82F6 0%, #10B981 100%)',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-simple-primary"
                          style={{ padding: '5px 12px', fontSize: '11px', background: '#3B82F6' }}
                          onClick={() => {
                            setPartnerFilter(partner.partnerName);
                            setStatusFilter('all');
                          }}
                          title={`Filter transactions for ${partner.partnerName}`}
                        >
                          📋 View Transactions
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
      /* 7. CLEAN, UNCLUTTERED FINANCIAL TABLE (FOR TRANSACTIONS) */
      <div className="simple-table-wrapper">
        <table className="simple-table">
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => handleSelectAll(filteredList)}
                  title="Select All Visible"
                />
              </th>
              <th>Partner / Beneficiary & Transfer Account</th>
              <th>Student(s)</th>
              <th>Due Date</th>
              <th style={{ textAlign: 'right' }}>Without GST</th>
              <th style={{ textAlign: 'right' }}>GST (18%)</th>
              <th style={{ textAlign: 'right' }}>Total to Pay</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center', width: '135px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted, #8B949E)' }}>
                  No payments found matching your filter.
                </td>
              </tr>
            ) : (
              filteredList.map((payment) => {
                const fin = calculateFinancials(payment);
                const due = getDueStatus(payment.due_date);
                const isSelected = selectedIds.has(payment.id);
                const isCompleted = payment.status === 'completed';

                return (
                  <tr key={payment.id} className={isSelected ? 'selected-row' : ''}>
                    {/* Checkbox for Select / Download */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(payment.id)}
                      />
                    </td>

                    {/* Partner & Which Account to Transfer */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>
                          {payment.partner_name}
                        </span>
                        {payment.priority && <span title="High Priority" style={{ color: '#F59E0B' }}>★</span>}
                      </div>
                      <span className="account-transfer-pill" title={payment.transfer_account || 'No account added'}>
                        🏦 <strong>Transfer to:</strong> {payment.transfer_account || 'Click edit to choose account'}
                      </span>

                      {/* B2B Partner Invoice Attachment Chip */}
                      <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {payment.invoice_file_name ? (
                          <button
                            type="button"
                            onClick={() => setViewingInvoicePayment(payment)}
                            title="Inspect attached B2B Partner Invoice / Bill"
                            style={{
                              background: 'rgba(59, 130, 246, 0.12)',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              color: '#60A5FA',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>📎</span>
                            <span>{payment.invoice_file_name.length > 20 ? payment.invoice_file_name.substring(0, 18) + '...' : payment.invoice_file_name}</span>
                            {isCompleted && (
                              <span style={{ color: '#10B981', fontSize: '10px', fontWeight: 800 }}>[PAID]</span>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTriggerRowUpload(payment.id)}
                            title="Attach B2B partner invoice file"
                            style={{
                              background: 'transparent',
                              border: '1px dashed rgba(148, 163, 225, 0.35)',
                              color: 'var(--muted, #8B949E)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>+</span>
                            <span>Attach Invoice</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Linked Student(s) */}
                    <td>
                      {(() => {
                        const isBatch = payment.batch_count || payment.student_names?.includes('30') || payment.student_names?.toLowerCase().includes('batch');
                        const stuCount = payment.batch_count || (payment.student_names?.match(/\b(\d+)\s*students?\b/i)?.[1] ? parseInt(payment.student_names.match(/\b(\d+)\s*students?\b/i)[1]) : (isBatch ? 30 : null));
                        const perStuCost = stuCount && payment.amount ? Math.round(payment.amount / stuCount) : null;

                        if (isBatch && stuCount) {
                          return (
                            <div>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(139, 92, 246, 0.15)',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                color: '#DDD6FE',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}>
                                👥 {stuCount} Students {perStuCost ? `(₹${perStuCost.toLocaleString('en-IN')}/stu)` : ''}
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--muted, #8B949E)', marginTop: '2px' }}>
                                {payment.category || 'Batch Processing'}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div>
                            <span style={{ fontWeight: 500 }}>{payment.student_names || 'General'}</span>
                            {payment.category && (
                              <div style={{ fontSize: '11px', color: 'var(--muted, #8B949E)' }}>
                                {payment.category}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Due Date */}
                    <td>
                      {isCompleted ? (
                        <div>
                          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>
                            ✓ Paid {payment.settled_at}
                          </span>
                          <div style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 600, marginTop: '2px' }} title={payment.debit_account || ''}>
                            🏦 Via: {payment.paying_bank_name || 'Federal Bank'}
                          </div>
                        </div>
                      ) : (
                        <span
                          className="badge-due"
                          style={{
                            color: due.color,
                            backgroundColor: due.bg || 'transparent',
                          }}
                        >
                          {due.text}
                        </span>
                      )}
                    </td>

                    {/* Amount Without GST */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatMoney(fin.baseAmount, payment.currency)}
                    </td>

                    {/* GST (18%) */}
                    <td style={{ textAlign: 'right' }}>
                      {payment.currency !== 'INR' ? (
                        <span style={{ fontSize: '11px', color: 'var(--muted, #8B949E)' }}>0% (Foreign)</span>
                      ) : fin.gstAmount > 0 ? (
                        <span className="badge-tax-tag">
                          +{formatMoney(fin.gstAmount, 'INR')} <span style={{ opacity: 0.8 }}>(18%)</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--muted, #8B949E)' }}>0%</span>
                      )}
                    </td>

                    {/* Total Amount With GST */}
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '14px' }}>
                      <span style={{ color: isCompleted ? 'var(--muted, #8B949E)' : 'var(--text, #EDEFFA)' }}>
                        {formatMoney(fin.totalAmount, payment.currency)}
                      </span>
                    </td>

                    {/* Status & Settle button */}
                    <td style={{ textAlign: 'center' }}>
                      {isCompleted ? (
                        <button
                          className="btn-table-action"
                          title="Click to restore to pending"
                          onClick={() => handleOpenSettle(payment)}
                          style={{ color: '#10B981', fontWeight: 600, fontSize: '12px' }}
                        >
                          ✓ Settled
                        </button>
                      ) : (
                        <button
                          className="btn-settle-inline"
                          onClick={() => handleOpenSettle(payment)}
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>

                    {/* Actions: Letterhead Remittance Receipt with PAID Seal, Edit & Delete */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          className="btn-table-action"
                          title={isCompleted ? "Download Official Payment Remittance Receipt (with PAID Seal)" : "Generate Payment Requisition Slip (for Accounts Clearance)"}
                          onClick={() => {
                            setDocModalPayment(payment);
                            setDocModalMode('b2b_receipt');
                            setShowDocModal(true);
                          }}
                          style={{
                            color: isCompleted ? '#10B981' : '#F59E0B',
                            background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span>{isCompleted ? '🧾' : '📄'}</span>
                          <span>{isCompleted ? 'Receipt (PAID)' : 'Voucher (Req)'}</span>
                        </button>

                        <button
                          className="btn-table-action"
                          title="Edit Details & Account"
                          onClick={() => handleOpenEditModal(payment)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-table-action"
                          title="Delete"
                          onClick={() => handleDelete(payment.id, payment.partner_name)}
                          style={{ color: '#EF4444' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    )}

      {/* 7. SETTLEMENT MODAL */}
      {settlingPayment && (
        <div className="b2b-modal-overlay" onClick={() => setSettlingPayment(null)}>
          <div className="b2b-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <h3>Confirm Payment to {settlingPayment.partner_name}</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--muted, #8B949E)' }}
                onClick={() => setSettlingPayment(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement}>
              <div className="b2b-modal-body">
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>Total Amount to Transfer</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
                      {formatMoney(calculateFinancials(settlingPayment).totalAmount, settlingPayment.currency)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', textAlign: 'right', color: 'var(--text, #EDEFFA)' }}>
                    <div>🎓 {settlingPayment.student_names}</div>
                  </div>
                </div>

                <div className="form-field">
                  <label>Beneficiary Account (Where money was sent)</label>
                  <input
                    type="text"
                    readOnly
                    value={settlingPayment.transfer_account || 'Not provided'}
                    style={{ background: 'var(--bg, #F4F6FC)', opacity: 0.9 }}
                  />
                </div>

                {/* SELECT FROM WHICH OF STERLING'S 4+ BANKS THE PAYMENT WAS MADE */}
                <div className="form-field" style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', color: '#60A5FA', fontWeight: 700, marginBottom: '4px' }}>
                    <span>Paid From Sterling Bank (Our Bank) *</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted, #8B949E)' }}>Select Disbursing Account</span>
                  </label>
                  <select
                    value={settlementData.paying_bank_id}
                    onChange={(e) => {
                      const bId = e.target.value;
                      const match = companyBanks.find((b) => b.id === bId) || companyBanks[0];
                      setSettlementData({
                        ...settlementData,
                        paying_bank_id: bId,
                        paying_bank_name: match.bank_name,
                        debit_account: `${match.bank_name} A/C: ${match.account_number} (${match.branch})`,
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg2, #ffffff)',
                      border: '1px solid var(--border, rgba(148, 163, 225, 0.35))',
                      color: 'var(--text, #EDEFFA)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    {companyBanks.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏦 {b.label} &bull; {b.account_number}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--muted, #8B949E)', marginTop: '4px' }}>
                    Debited A/C: <strong style={{ color: 'var(--text, #EDEFFA)' }}>{settlementData.debit_account}</strong>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      required
                      value={settlementData.settled_at}
                      onChange={(e) => setSettlementData({ ...settlementData, settled_at: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Payment Mode</label>
                    <select
                      value={settlementData.payment_mode}
                      onChange={(e) => setSettlementData({ ...settlementData, payment_mode: e.target.value })}
                    >
                      <option value="Bank Transfer (IMPS / NEFT)">Bank Transfer (IMPS / NEFT)</option>
                      <option value="UPI / GPay">UPI / GPay</option>
                      <option value="Forex Wire / Wise">Forex Wire / Wise</option>
                      <option value="Direct Transfer">Direct Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Bank UTR / Transaction Reference # (for Accounts)</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR59201948201 or IMPS Ref"
                    value={settlementData.utr_number}
                    onChange={(e) => setSettlementData({ ...settlementData, utr_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="b2b-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setSettlingPayment(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-simple-primary" style={{ background: '#10B981' }}>
                  ✓ Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. ADD / EDIT PAYMENT MODAL (With Bank Account Selection & Multi-Account Support) */}
      {showModal && (
        <div className="b2b-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="b2b-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <h3>{editingPayment ? 'Edit B2B Payment' : 'Add New B2B Payment'}</h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--muted, #8B949E)' }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="b2b-modal-body">
                {/* 1-Click Autofill from Student Applications with Pending Dues */}
                {studentsWithPendingPartnerDues.length > 0 && !editingPayment && (
                  <div
                    style={{
                      background: 'rgba(79, 70, 229, 0.08)',
                      border: '1px solid rgba(79, 70, 229, 0.25)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        ⚡ 1-Click Fill from Student Applications:
                      </span>
                      <span style={{ fontSize: '10px', color: '#8E9BB5' }}>
                        {studentsWithPendingPartnerDues.length} pending partner payable{studentsWithPendingPartnerDues.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '3px' }}>
                      {studentsWithPendingPartnerDues.slice(0, 8).map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAutofillFromStudent(item.student, item.type)}
                          title={`Click to fill voucher for ${item.partner} (${item.student.name})`}
                          style={{
                            background: 'var(--bg, #ffffff)',
                            border: '1px solid rgba(79, 70, 229, 0.35)',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: 'var(--text, #1E293B)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                        >
                          <span style={{ color: '#4F46E5', fontWeight: 700 }}>{item.partner}</span>
                          <span style={{ color: '#94A3B8' }}>({item.label})</span>
                          <span style={{ color: '#94A3B8' }}>•</span>
                          <span>{item.student.name}</span>
                          {item.due > 0 && (
                            <span style={{ color: '#10B981', fontWeight: 700, marginLeft: '2px' }}>
                              ₹{item.due.toLocaleString('en-IN')}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Partner Name with Datalist Suggestions */}
                <div className="form-field">
                  <label>Partner / Agency / Beneficiary Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Consult Fox, Future Factory, Medwizard..."
                    value={formData.partner_name}
                    onChange={(e) => handlePartnerNameInput(e.target.value)}
                    list="registered-partners-list"
                  />
                  <datalist id="registered-partners-list">
                    {Object.keys(partnerAccounts).map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                {/* WHICH ACCOUNT TO TRANSFER (SELECT FROM PARTNER'S SAVED ACCOUNTS) */}
                <div className="form-field">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <label>
                      Which Account to Transfer *{' '}
                      {currentPartnerAccounts.length > 0 && (
                        <span style={{ color: '#4F46E5', fontWeight: 600 }}>
                          ({currentPartnerAccounts.length} account{currentPartnerAccounts.length > 1 ? 's' : ''} available)
                        </span>
                      )}
                    </label>
                    {formData.partner_name.trim() && (
                      <button
                        type="button"
                        onClick={() => setIsAddingInlineAccount(!isAddingInlineAccount)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4F46E5',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isAddingInlineAccount ? '✕ Cancel' : `+ Add Another Account for ${formData.partner_name}`}
                      </button>
                    )}
                  </div>

                  {/* Dropdown to pick from partner's accounts */}
                  {currentPartnerAccounts.length > 0 && !isAddingInlineAccount && (
                    <select
                      value={formData.selected_account_id}
                      onChange={(e) => handleAccountSelect(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                    >
                      <option value="">-- Choose Account to Pay --</option>
                      {currentPartnerAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.label} {acc.bank_name ? `(${acc.bank_name} - ${acc.account_number || acc.upi_id})` : ''} {acc.is_default ? '★ Primary' : ''}
                        </option>
                      ))}
                      <option value="__custom__">✏️ Custom / Different Account</option>
                      <option value="__new__">+ Register New Account for this Company...</option>
                    </select>
                  )}

                  {/* Formatted Account Preview Pill */}
                  {!isAddingInlineAccount && formData.transfer_account && (
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: '#10B981',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        marginTop: '4px',
                      }}
                    >
                      🏦 <strong>Transfer details:</strong> {formData.transfer_account}
                    </div>
                  )}

                  {/* Manual / Custom account input if partner has no accounts or user picked custom */}
                  {(!currentPartnerAccounts.length || formData.selected_account_id === '__custom__') && !isAddingInlineAccount && (
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HDFC Bank A/C: 502000... | IFSC: HDFC0000240 | Beneficiary: ..."
                        value={formData.transfer_account}
                        onChange={(e) => setFormData({ ...formData, transfer_account: e.target.value })}
                        style={{ marginTop: '4px' }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.save_as_new_account}
                          onChange={(e) => setFormData({ ...formData, save_as_new_account: e.target.checked })}
                        />
                        <span>Save this bank account for <strong>{formData.partner_name || 'this company'}</strong> for future payments</span>
                      </label>
                    </div>
                  )}

                  {/* Inline New Account Creation for Partner */}
                  {isAddingInlineAccount && (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg3, #F4F6FC)',
                        borderRadius: '8px',
                        border: '1px solid rgba(79, 70, 229, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '4px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#4F46E5' }}>
                        Add Another Bank Account for {formData.partner_name}:
                      </div>
                      <div className="form-row">
                        <input
                          type="text"
                          placeholder="Account Label (e.g. Secondary Current, Wise, Wire)"
                          value={inlineAccountData.label}
                          onChange={(e) => setInlineAccountData({ ...inlineAccountData, label: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Bank Name (e.g. HDFC Bank, SBI, Citibank)"
                          value={inlineAccountData.bank_name}
                          onChange={(e) => setInlineAccountData({ ...inlineAccountData, bank_name: e.target.value })}
                        />
                      </div>
                      <div className="form-row">
                        <input
                          type="text"
                          placeholder="Account Number / IBAN"
                          value={inlineAccountData.account_number}
                          onChange={(e) => setInlineAccountData({ ...inlineAccountData, account_number: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="IFSC / Swift BIC Code"
                          value={inlineAccountData.ifsc}
                          onChange={(e) => setInlineAccountData({ ...inlineAccountData, ifsc: e.target.value })}
                        />
                      </div>
                      <div className="form-row">
                        <input
                          type="text"
                          placeholder="Beneficiary Name (Account Holder)"
                          value={inlineAccountData.beneficiary_name}
                          onChange={(e) => setInlineAccountData({ ...inlineAccountData, beneficiary_name: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="UPI ID (Optional, e.g. consult@okaxis)"
                          value={inlineAccountData.upi_id}
                          onChange={(e) => setInlineAccountData({ ...inlineAccountData, upi_id: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                        <button
                          type="button"
                          className="btn-cancel"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => setIsAddingInlineAccount(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-simple-primary"
                          style={{ padding: '4px 14px', fontSize: '12px' }}
                          onClick={handleSaveInlineAccount}
                        >
                          ✓ Save Account & Use
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Linked Student(s) Selection */}
                <div className="form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>Linked Student(s) or Candidates *</label>
                    <button
                      type="button"
                      style={{
                        background: showBatchCalculator ? 'rgba(99, 102, 241, 0.25)' : 'none',
                        color: showBatchCalculator ? '#818CF8' : '#94A3B8',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        textDecoration: showBatchCalculator ? 'none' : 'underline',
                      }}
                      onClick={() => setShowBatchCalculator(!showBatchCalculator)}
                    >
                      {showBatchCalculator ? '✕ Hide Split Calc' : '🧮 Split batch among multiple students?'}
                    </button>
                  </div>

                  {/* Expandable Batch Split Calculator */}
                  {showBatchCalculator && (
                    <div style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '8px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#C4B5FD', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🧮 Batch Cost Split Calculator
                        </span>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          Auto-computes per-student debit
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: '8px', alignItems: 'center' }}>
                        <div>
                          <label style={{ fontSize: '10.5px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>Total Students</label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={batchStudentCount}
                            onChange={(e) => setBatchStudentCount(parseInt(e.target.value) || 1)}
                            style={{ width: '100%', padding: '5px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '10.5px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>Batch Description</label>
                          <input
                            type="text"
                            value={batchDescription}
                            onChange={(e) => setBatchDescription(e.target.value)}
                            placeholder="e.g. 3 Bulgaria Students (VFS Fee)"
                            style={{ width: '100%', padding: '5px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #475569', background: '#0F172A', color: '#F8FAFC' }}
                          />
                        </div>

                        <div style={{ paddingTop: '16px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const count = batchStudentCount || 3;
                              const amt = parseFloat(formData.amount) || 0;
                              const perStudent = amt > 0 ? Math.round(amt / count) : 0;
                              const formattedPerStudent = perStudent.toLocaleString('en-IN');
                              setFormData({
                                ...formData,
                                student_names: `${count} Students (${batchDescription || 'Batch'})`,
                                batch_count: count,
                                notes: (formData.notes ? `${formData.notes} | ` : '') + `Total ${formData.currency || 'INR'} ${amt.toLocaleString('en-IN')} split for ${count} students (${formData.currency || 'INR'} ${formattedPerStudent}/student)`,
                              });
                              toast.success(`Applied: ${count} Students @ ${formData.currency || 'INR'} ${formattedPerStudent} per student`);
                            }}
                            style={{
                              background: '#10B981',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✓ Apply
                          </button>
                        </div>
                      </div>

                      {/* Live Calculation preview */}
                      <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '11.5px', color: '#E2E8F0' }}>
                          <strong>Cost Breakdown:</strong> {formData.currency || 'INR'} {parseFloat(formData.amount || 0).toLocaleString('en-IN')} ÷ {batchStudentCount || 1} Students
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#34D399' }}>
                          = {formData.currency || 'INR'} {Math.round(parseFloat(formData.amount || 0) / (batchStudentCount || 1)).toLocaleString('en-IN')} / student
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    required
                    placeholder="Type student name(s), e.g. Achsah Treasa Mathew, or 3 Bulgaria Students"
                    value={formData.student_names}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, student_names: val });
                      if (val.trim().length >= 2 && erpStudents.length > 0) {
                        const matches = erpStudents.filter((s) =>
                          s.name?.toLowerCase().includes(val.toLowerCase())
                        ).slice(0, 4);
                        setStudentSuggestions(matches);
                        setShowStudentSuggestions(matches.length > 0);
                      } else {
                        setShowStudentSuggestions(false);
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 200)}
                  />

                  {showStudentSuggestions && (
                    <div className="student-autocomplete-menu" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {studentSuggestions.map((stu) => {
                        const meta = getStudentAgentMeta(stu);
                        return (
                          <div
                            key={stu.id}
                            style={{
                              padding: '8px 10px',
                              borderBottom: '1px solid rgba(148, 163, 225, 0.1)',
                            }}
                          >
                            <div
                              className="student-autocomplete-row"
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                              onMouseDown={() => {
                                setFormData({
                                  ...formData,
                                  student_names: formData.student_names
                                    ? `${formData.student_names}, ${stu.name}`
                                    : stu.name,
                                });
                                setShowStudentSuggestions(false);
                              }}
                            >
                              <div>
                                <strong>{stu.name}</strong>{' '}
                                <span style={{ color: '#8E9BB5', fontSize: '11px' }}>({stu.country || 'Global'})</span>
                              </div>
                              <span style={{ fontSize: '11px', color: '#4F46E5', fontWeight: 600 }}>+ Select Name</span>
                            </div>

                            {/* Linked Partners for this Student */}
                            {(meta.b2b_agent_name || meta.apostille_agent || meta.insurance_agent) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                                {meta.b2b_agent_name && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAutofillFromStudent(stu, 'b2b');
                                    }}
                                    style={{
                                      background: 'rgba(124, 58, 237, 0.12)',
                                      border: '1px solid rgba(124, 58, 237, 0.35)',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      color: '#C4B5FD',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ⚡ B2B: {meta.b2b_agent_name}
                                    {Number(meta.b2b_committed || 0) > 0 && ` (₹${(Number(meta.b2b_committed || 0) - Number(meta.b2b_paid || 0) || Number(meta.b2b_committed)).toLocaleString('en-IN')})`}
                                  </button>
                                )}
                                {meta.apostille_agent && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAutofillFromStudent(stu, 'apostille');
                                    }}
                                    style={{
                                      background: 'rgba(59, 130, 246, 0.12)',
                                      border: '1px solid rgba(59, 130, 246, 0.35)',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      color: '#93C5FD',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ⚡ Apostille: {meta.apostille_agent}
                                    {Number(meta.apostille_committed || 0) > 0 && ` (₹${(Number(meta.apostille_committed || 0) - Number(meta.apostille_paid || 0) || Number(meta.apostille_committed)).toLocaleString('en-IN')})`}
                                  </button>
                                )}
                                {meta.insurance_agent && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAutofillFromStudent(stu, 'insurance');
                                    }}
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      color: '#6EE7B7',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ⚡ Insurance: {meta.insurance_agent}
                                    {Number(meta.insurance_committed || 0) > 0 && ` (₹${(Number(meta.insurance_committed || 0) - Number(meta.insurance_paid || 0) || Number(meta.insurance_committed)).toLocaleString('en-IN')})`}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Amount & Currency */}
                <div className="form-row">
                  <div className="form-field">
                    <label>Base Amount (Without GST) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="e.g. 180000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 18% GST Toggle (Disabled for Foreign Payments) */}
                <div style={{ padding: '8px 12px', background: 'var(--bg3, #F4F6FC)', borderRadius: '8px' }}>
                  {formData.currency !== 'INR' ? (
                    <div style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>
                      🌐 <strong>Foreign Transfer ({formData.currency}):</strong> No GST applicable (0% Tax Exempt).
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={formData.has_gst}
                          onChange={(e) => setFormData({ ...formData, has_gst: e.target.checked })}
                        />
                        <span>Apply 18% GST (+18%)</span>
                      </label>
                      {formData.has_gst && formData.amount > 0 && (
                        <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '4px' }}>
                          Base: ₹{Number(formData.amount).toLocaleString('en-IN')} &bull; GST (18%): +₹{Math.round(formData.amount * 0.18).toLocaleString('en-IN')} &bull; <strong>Total with GST: ₹{(Number(formData.amount) + Math.round(formData.amount * 0.18)).toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Due Date & Category */}
                <div className="form-row">
                  <div className="form-field">
                    <label>Due Date (When to Pay)</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* High Priority Star */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.checked })}
                  />
                  <span>⭐ Mark High Priority (Float to top)</span>
                </label>

                {/* Notes */}
                <div className="form-field">
                  <label>Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Pay after student visa stamped or invoice reference"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Upload B2B Partner Invoice / Bill */}
                <div className="form-field" style={{ marginTop: '6px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📎 Upload B2B Partner's Invoice / Bill</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted, #8B949E)' }}>PDF, PNG, JPG (Max 8MB)</span>
                  </label>
                  <div
                    style={{
                      border: '1px dashed var(--border, rgba(148, 163, 225, 0.35))',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      background: 'var(--bg3, #F4F6FC)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    {formData.invoice_file_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '20px' }}>📄</span>
                        <div style={{ overflow: 'hidden' }}>
                          <div
                            style={{
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: 'var(--text, #EDEFFA)',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formData.invoice_file_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>✓ Attached successfully</div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>
                        No invoice attached yet. Browse file to upload vendor bill.
                      </span>
                    )}

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <label
                        style={{
                          background: 'rgba(79, 70, 229, 0.15)',
                          border: '1px solid rgba(79, 70, 229, 0.35)',
                          color: '#818CF8',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{formData.invoice_file_name ? 'Replace File' : 'Browse File'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          style={{ display: 'none' }}
                          onChange={handleModalFileUpload}
                        />
                      </label>
                      {formData.invoice_file_name && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              invoice_file_name: '',
                              invoice_file_data: '',
                              invoice_uploaded_at: '',
                            })
                          }
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="b2b-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-simple-primary">
                  {editingPayment ? 'Save Changes' : '+ Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. BANK ACCOUNTS MANAGER MODAL (Manage Sterling House Banks & B2B Partner Accounts) */}
      {showAccountsManagerModal && (
        <div className="b2b-modal-overlay" onClick={() => setShowAccountsManagerModal(false)}>
          <div className="b2b-modal-card" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏦</span>
                  <span>Bank Accounts & Disbursing Setup (SAP / ERP Style)</span>
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>
                  Manage Sterling's company disbursing accounts (our 4+ banks) and B2B partner beneficiary accounts.
                </span>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--muted, #8B949E)' }}
                onClick={() => setShowAccountsManagerModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="b2b-modal-body" style={{ gap: '14px' }}>
              {/* Dual Tab Switcher */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border, rgba(148, 163, 225, 0.25))', paddingBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => setBankDirectoryTab('company_banks')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: bankDirectoryTab === 'company_banks' ? '#4F46E5' : 'var(--bg3, #F4F6FC)',
                    color: bankDirectoryTab === 'company_banks' ? '#ffffff' : 'var(--text, #EDEFFA)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>🏢 Sterling Paying Banks (Our Accounts - {companyBanks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBankDirectoryTab('partner_banks')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: bankDirectoryTab === 'partner_banks' ? '#4F46E5' : 'var(--bg3, #F4F6FC)',
                    color: bankDirectoryTab === 'partner_banks' ? '#ffffff' : 'var(--text, #EDEFFA)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>🤝 B2B Partner Beneficiary Accounts ({Object.keys(partnerAccounts).length} Companies)</span>
                </button>
              </div>

              {/* TAB 1: STERLING COMPANY PAYING BANKS */}
              {bankDirectoryTab === 'company_banks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text, #EDEFFA)' }}>
                        Sterling's Disbursing Bank Accounts
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted, #8B949E)' }}>
                        Accounts managers select from these accounts when recording payments to B2B vendors and printing remittance vouchers.
                      </div>
                    </div>
                    {!isAddingNewCompanyBank && (
                      <button
                        type="button"
                        className="btn-simple-primary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => setIsAddingNewCompanyBank(true)}
                      >
                        + Add Company Bank
                      </button>
                    )}
                  </div>

                  {/* List of Sterling's Paying Banks */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '10px' }}>
                    {companyBanks.map((b) => (
                      <div
                        key={b.id}
                        className="account-card-box"
                        style={{
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          background: 'var(--bg2, #ffffff)',
                          border: '1px solid var(--border, rgba(148, 163, 225, 0.25))',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text, #EDEFFA)' }}>
                            🏦 {b.label}
                          </strong>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: b.currency === 'INR' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: b.currency === 'INR' ? '#10B981' : '#3B82F6',
                            }}
                          >
                            {b.currency}
                          </span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text, #EDEFFA)' }}>
                          <strong>{b.bank_name}</strong> &bull; A/C: <code>{b.account_number}</code>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--muted, #8B949E)', display: 'flex', gap: '12px' }}>
                          <span>IFSC / SWIFT: <strong>{b.ifsc || 'N/A'}</strong></span>
                          <span>Branch: <strong>{b.branch || 'Main'}</strong></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                          {companyBanks.length > 1 && (
                            <button
                              type="button"
                              className="btn-table-action"
                              style={{ color: '#EF4444', fontSize: '11.5px', padding: '2px 6px' }}
                              onClick={() => handleRemoveCompanyBank(b.id)}
                            >
                              🗑️ Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Company Bank Form */}
                  {isAddingNewCompanyBank && (
                    <div style={{ marginTop: '6px', padding: '14px', background: 'var(--bg3, #F4F6FC)', borderRadius: '8px', border: '1px solid #4F46E5' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5', marginBottom: '8px' }}>
                        + Add New Sterling Disbursing Bank Account
                      </div>
                      <form onSubmit={handleAddNewCompanyBank} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="form-row">
                          <div className="form-field">
                            <label>Account Label *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Axis Bank Operations A/C"
                              value={newCompanyBankForm.label}
                              onChange={(e) => setNewCompanyBankForm({ ...newCompanyBankForm, label: e.target.value })}
                            />
                          </div>
                          <div className="form-field">
                            <label>Bank Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Axis Bank, State Bank of India"
                              value={newCompanyBankForm.bank_name}
                              onChange={(e) => setNewCompanyBankForm({ ...newCompanyBankForm, bank_name: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-field">
                            <label>Account Number *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 921020019283719"
                              value={newCompanyBankForm.account_number}
                              onChange={(e) => setNewCompanyBankForm({ ...newCompanyBankForm, account_number: e.target.value })}
                            />
                          </div>
                          <div className="form-field">
                            <label>IFSC / SWIFT BIC *</label>
                            <input
                              type="text"
                              placeholder="e.g. UTIB0000123 or SWIFT"
                              value={newCompanyBankForm.ifsc}
                              onChange={(e) => setNewCompanyBankForm({ ...newCompanyBankForm, ifsc: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-field">
                            <label>Branch / Location</label>
                            <input
                              type="text"
                              placeholder="e.g. Valanchery Main / Calicut Bypass"
                              value={newCompanyBankForm.branch}
                              onChange={(e) => setNewCompanyBankForm({ ...newCompanyBankForm, branch: e.target.value })}
                            />
                          </div>
                          <div className="form-field">
                            <label>Currency</label>
                            <select
                              value={newCompanyBankForm.currency}
                              onChange={(e) => setNewCompanyBankForm({ ...newCompanyBankForm, currency: e.target.value })}
                            >
                              <option value="INR">INR (₹)</option>
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                              <option value="AED">AED (د.إ)</option>
                              <option value="GBP">GBP (£)</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => setIsAddingNewCompanyBank(false)}
                          >
                            Cancel
                          </button>
                          <button type="submit" className="btn-simple-primary" style={{ background: '#10B981' }}>
                            ✓ Save Company Bank
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: B2B PARTNER BENEFICIARY BANK ACCOUNTS */}
              {bankDirectoryTab === 'partner_banks' && (
                <div className="manager-layout">
                {/* Left: Companies List */}
                <div className="manager-companies-list">
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--muted, #8B949E)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    B2B Companies ({Object.keys(partnerAccounts).length})
                  </div>
                  {Object.keys(partnerAccounts).map((compName) => {
                    const accCount = (partnerAccounts[compName] || []).length;
                    const isActive = selectedManagerCompany.toLowerCase() === compName.toLowerCase();
                    return (
                      <button
                        key={compName}
                        type="button"
                        className={`manager-company-btn ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedManagerCompany(compName);
                          setIsAddingNewCompany(false);
                        }}
                      >
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{compName}</span>
                        <span className="acc-count-tag">{accCount}</span>
                      </button>
                    );
                  })}

                  {/* Add New Company Button */}
                  {!isAddingNewCompany ? (
                    <button
                      type="button"
                      className="manager-company-btn"
                      style={{ color: '#4F46E5', border: '1px dashed #4F46E5', marginTop: '6px' }}
                      onClick={() => setIsAddingNewCompany(true)}
                    >
                      + Add New Company
                    </button>
                  ) : (
                    <form onSubmit={handleManagerAddCompany} style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Company Name"
                        value={newCompanyNameInput}
                        onChange={(e) => setNewCompanyNameInput(e.target.value)}
                        style={{
                          padding: '7px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #7C6FFF',
                          background: 'var(--bg3, #161b2e)',
                          color: 'var(--text, #EDEFFA)',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="submit" className="btn-simple-primary" style={{ padding: '3px 8px', fontSize: '11px', flex: 1 }}>
                          Create
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => setIsAddingNewCompany(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Right: Accounts for Selected Company */}
                <div className="manager-accounts-area">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border, rgba(148, 163, 225, 0.2))', paddingBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text, #EDEFFA)' }}>
                        Accounts for: <strong>{selectedManagerCompany}</strong>
                      </h4>
                      <span style={{ fontSize: '11.5px', color: 'var(--muted, #8B949E)' }}>
                        {(partnerAccounts[selectedManagerCompany] || []).length} registered bank account(s)
                      </span>
                    </div>
                  </div>

                  {/* List of existing accounts for this company */}
                  {(partnerAccounts[selectedManagerCompany] || []).length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted, #8B949E)', fontSize: '13px' }}>
                      No bank accounts added for <strong>{selectedManagerCompany}</strong> yet. Use the form below to add one.
                    </div>
                  ) : (
                    (partnerAccounts[selectedManagerCompany] || []).map((acc) => (
                      <div key={acc.id} className="account-card-box">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13.5px', color: 'var(--text, #EDEFFA)' }}>{acc.label}</strong>
                            {acc.is_default && (
                              <span style={{ fontSize: '10.5px', background: '#10B981', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                Primary / Default
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text, #EDEFFA)', opacity: 0.85 }}>
                            🏦 {acc.bank_name || 'Bank'} &bull; A/C: <strong>{acc.account_number || 'N/A'}</strong> {acc.ifsc && `(IFSC: ${acc.ifsc})`}
                          </div>
                          {acc.beneficiary_name && (
                            <div style={{ fontSize: '11.5px', color: 'var(--muted, #8B949E)' }}>
                              Beneficiary: {acc.beneficiary_name} {acc.branch && `• Branch: ${acc.branch}`}
                            </div>
                          )}
                          {acc.upi_id && (
                            <div style={{ fontSize: '11.5px', color: '#4F46E5' }}>
                              UPI: <strong>{acc.upi_id}</strong>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                          {!acc.is_default && (
                            <button
                              type="button"
                              className="btn-cancel"
                              style={{ padding: '3px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              onClick={() => handleManagerSetDefault(selectedManagerCompany, acc.id)}
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-table-action"
                            style={{ color: '#EF4444', fontSize: '12px' }}
                            onClick={() => handleManagerDeleteAccount(selectedManagerCompany, acc.id)}
                            title="Delete this account"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add New Account Form for this Selected Company */}
                  <div style={{ marginTop: '10px', padding: '14px', background: 'var(--bg2, #ffffff)', border: '1px solid var(--border, rgba(148, 163, 225, 0.25))', borderRadius: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5', marginBottom: '10px' }}>
                      + Add New Bank Account for {selectedManagerCompany}
                    </div>

                    <form onSubmit={handleManagerAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-row">
                        <div className="form-field">
                          <label>Account Label *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. HDFC Current A/C, ICICI Secondary, Foreign Wire"
                            value={managerAccountForm.label}
                            onChange={(e) => setManagerAccountForm({ ...managerAccountForm, label: e.target.value })}
                          />
                        </div>
                        <div className="form-field">
                          <label>Bank Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. HDFC Bank, SBI, Citibank"
                            value={managerAccountForm.bank_name}
                            onChange={(e) => setManagerAccountForm({ ...managerAccountForm, bank_name: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-field">
                          <label>Account Number / IBAN *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 50200038291048 or IBAN"
                            value={managerAccountForm.account_number}
                            onChange={(e) => setManagerAccountForm({ ...managerAccountForm, account_number: e.target.value })}
                          />
                        </div>
                        <div className="form-field">
                          <label>IFSC / Swift BIC Code *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. HDFC0000240 or Swift Code"
                            value={managerAccountForm.ifsc}
                            onChange={(e) => setManagerAccountForm({ ...managerAccountForm, ifsc: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-field">
                          <label>Beneficiary Name (Account Holder Name)</label>
                          <input
                            type="text"
                            placeholder="e.g. Consult Fox Edutech Pvt Ltd"
                            value={managerAccountForm.beneficiary_name}
                            onChange={(e) => setManagerAccountForm({ ...managerAccountForm, beneficiary_name: e.target.value })}
                          />
                        </div>
                        <div className="form-field">
                          <label>UPI ID (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. partner@okhdfcbank"
                            value={managerAccountForm.upi_id}
                            onChange={(e) => setManagerAccountForm({ ...managerAccountForm, upi_id: e.target.value })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button type="submit" className="btn-simple-primary" style={{ padding: '7px 18px' }}>
                          ✓ Save Bank Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              )}
            </div>

            <div className="b2b-modal-footer">
              <button type="button" className="btn-simple-primary" onClick={() => setShowAccountsManagerModal(false)}>
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. DOWNLOAD EXCEL CUSTOMIZATION MODAL (Select what to include in Excel) */}
      {showExportModal && (
        <div className="b2b-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="b2b-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📥</span>
                  <span>Select What to Include in Excel</span>
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>
                  Choose which payments and columns to export for the accounts team.
                </span>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--muted, #8B949E)' }}
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="b2b-modal-body" style={{ gap: '16px' }}>
              {/* Step 1: Which Rows */}
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text, #EDEFFA)', marginBottom: '8px' }}>
                  1. Which Payments to Export?
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="selected"
                      checked={exportScope === 'selected'}
                      disabled={selectedIds.size === 0}
                      onChange={(e) => setExportScope(e.target.value)}
                    />
                    <span style={{ opacity: selectedIds.size === 0 ? 0.45 : 1 }}>
                      <strong>Selected Payments</strong> ({selectedIds.size} checked)
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="filtered"
                      checked={exportScope === 'filtered'}
                      onChange={(e) => setExportScope(e.target.value)}
                    />
                    <span>
                      <strong>Filtered / Current View</strong> ({filteredList.length} items)
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="all"
                      checked={exportScope === 'all'}
                      onChange={(e) => setExportScope(e.target.value)}
                    />
                    <span>
                      <strong>All Payments</strong> ({payments.length} items)
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 2: Which Columns */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text, #EDEFFA)' }}>
                    2. Select Columns for Excel ({exportColIds.size} selected)
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', borderColor: '#4F46E5' }}
                      onClick={() => handleApplyExportPreset('accounts_quick')}
                      title="Only Partner, Transfer Account, Student, Total to Pay"
                    >
                      🏦 Accounts Transfer
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', borderColor: '#F59E0B' }}
                      onClick={() => handleApplyExportPreset('accounts_gst')}
                      title="Includes Base + 18% GST + Total with GST"
                    >
                      🧾 With 18% GST
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => handleApplyExportPreset('all')}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => handleApplyExportPreset('none')}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '8px 12px',
                    padding: '12px 14px',
                    background: 'var(--bg3, #F4F6FC)',
                    borderRadius: '8px',
                    border: '1px solid var(--border, rgba(148, 163, 225, 0.2))',
                    maxHeight: '210px',
                    overflowY: 'auto',
                  }}
                >
                  {EXPORT_COLUMNS_DEF.map((col) => {
                    const isChecked = exportColIds.has(col.id);
                    return (
                      <label
                        key={col.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          color: isChecked ? 'var(--text, #EDEFFA)' : 'var(--muted, #8B949E)',
                          fontWeight: isChecked ? 600 : 400,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleExportCol(col.id)}
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Total Row & Format */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
                  <input
                    type="checkbox"
                    checked={includeBottomTotal}
                    onChange={(e) => setIncludeBottomTotal(e.target.checked)}
                  />
                  <span>
                    <strong>Include Summary Total Row</strong> (Calculates Base + GST + Total)
                  </span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted, #8B949E)' }}>Format:</span>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg2, #ffffff)',
                      border: '1px solid var(--border, rgba(148, 163, 225, 0.3))',
                      color: 'var(--text, #EDEFFA)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                    <option value="csv">Comma-Separated (.csv)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="b2b-modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-simple-primary"
                style={{ background: '#10B981', padding: '8px 18px' }}
                onClick={handleExecuteExport}
              >
                📥 Download Excel ({exportColIds.size} Columns)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. STERLING ACCOUNTS PAYMENT DISBURSEMENT SHEET MODAL (FOR ACCOUNTS TEAM) */}
      {showAccountsSheetModal && (
        <div className="b2b-modal-overlay" onClick={() => setShowAccountsSheetModal(false)}>
          <div className="b2b-modal-card" style={{ maxWidth: '980px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border, rgba(148, 163, 225, 0.2))' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏦</span>
                  <span>Sterling Accounts Payment Disbursement Sheet</span>
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--muted, #8B949E)' }}>
                  Internal accounts payment order and fund transfer tracking for Sterling Accounts Department.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Partner Filter Dropdown */}
                <select
                  value={accountsSheetPartner}
                  onChange={(e) => setAccountsSheetPartner(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong, rgba(148, 163, 225, 0.25))',
                    background: 'var(--bg2solid, #11162a)',
                    color: 'var(--text, #EDEFFA)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Filter accounts sheet by specific partner"
                >
                  <option value="All">All Partners ({uniquePartnerNames.length})</option>
                  {uniquePartnerNames.map((name) => (
                    <option key={name} value={name}>
                      🤝 {name}
                    </option>
                  ))}
                </select>

                {/* 3 Quick View / Print Filters */}
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px', marginRight: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setAccountsSheetFilter('all')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: accountsSheetFilter === 'all' ? '#4F46E5' : 'transparent',
                      color: accountsSheetFilter === 'all' ? '#fff' : '#94A3B8',
                    }}
                  >
                    All Pending ({metrics.pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountsSheetFilter('inr')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: accountsSheetFilter === 'inr' ? '#10B981' : 'transparent',
                      color: accountsSheetFilter === 'inr' ? '#fff' : '#94A3B8',
                    }}
                  >
                    🇮🇳 Domestic INR ({payments.filter(p => p.status !== 'completed' && (!p.currency || p.currency === 'INR')).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountsSheetFilter('forex')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: accountsSheetFilter === 'forex' ? '#2563EB' : 'transparent',
                      color: accountsSheetFilter === 'forex' ? '#fff' : '#94A3B8',
                    }}
                  >
                    🌍 Forex SWIFT ({payments.filter(p => p.status !== 'completed' && p.currency && p.currency !== 'INR').length})
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-simple-primary"
                  style={{ background: '#10B981', padding: '6px 14px', fontSize: '12px' }}
                  onClick={handlePrintAccountsSheet}
                >
                  🖨️ Print / Save as PDF
                </button>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--muted, #8B949E)' }}
                  onClick={() => setShowAccountsSheetModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scoped Styles for Screen and Print (Overrides global nowrap on th/td) */}
            <style>{`
              #accounts-disbursement-printable table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
              }
              #accounts-disbursement-printable th {
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: normal !important;
                letter-spacing: 0px !important;
                text-transform: uppercase !important;
                font-size: 10px !important;
                line-height: 1.25 !important;
                padding: 6px 5px !important;
                box-sizing: border-box !important;
              }
              #accounts-disbursement-printable td {
                white-space: normal !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                padding: 6px 6px !important;
                box-sizing: border-box !important;
              }
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #accounts-disbursement-printable,
                #accounts-disbursement-printable * {
                  visibility: visible !important;
                }
                #accounts-disbursement-printable {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 8mm 10mm !important;
                  box-shadow: none !important;
                  border: none !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                #accounts-disbursement-printable .print-letterhead-wrapper {
                  width: 100% !important;
                  height: 33mm !important;
                  overflow: hidden !important;
                  margin-bottom: 4mm !important;
                  display: block !important;
                }
                #accounts-disbursement-printable img.print-letterhead {
                  width: 100% !important;
                  height: auto !important;
                  display: block !important;
                  visibility: visible !important;
                }
              }
            `}</style>

            {/* Print-ready A4 Canvas Container */}
            {(() => {
              const displayedDisbursements = payments.filter((p) => {
                if (p.status === 'completed') return false;
                if (accountsSheetPartner !== 'All' && p.partner_name !== accountsSheetPartner) return false;
                const isForex = p.currency && p.currency !== 'INR';
                if (accountsSheetFilter === 'inr') return !isForex;
                if (accountsSheetFilter === 'forex') return isForex;
                return true;
              });

              let inrBase = 0;
              let inrGst = 0;
              let inrTotal = 0;
              const forexMap = {};

              displayedDisbursements.forEach((p) => {
                const fin = calculateFinancials(p);
                const curr = p.currency || 'INR';
                if (curr === 'INR') {
                  inrBase += fin.baseAmount;
                  inrGst += fin.gstAmount;
                  inrTotal += fin.totalAmount;
                } else {
                  forexMap[curr] = (forexMap[curr] || 0) + fin.totalAmount;
                }
              });

              const hasForex = Object.keys(forexMap).length > 0;
              const hasInr = inrTotal > 0 || accountsSheetFilter === 'inr';

              return (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--bg3, #F4F6FC)' }}>
                  <div
                    id="accounts-disbursement-printable"
                    style={{
                      maxWidth: '920px',
                      margin: '0 auto',
                      background: '#ffffff',
                      color: '#000000',
                      padding: '20px 26px 30px 26px',
                      borderRadius: '6px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }}
                  >
                    {/* Physical letterhead top header banner: 100% PDF/print capture with zero extra vertical gap */}
                    <div
                      className="print-letterhead-wrapper"
                      style={{
                        width: '100%',
                        height: '140px',
                        overflow: 'hidden',
                        marginBottom: '16px',
                        borderRadius: '4px',
                      }}
                    >
                      <img
                        src="/sterling-letterhead.jpg"
                        alt="Sterling Study Abroad"
                        className="print-letterhead"
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                    </div>

                    {/* Header (Company name removed as it is already on the letterhead banner) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '10px', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Central Accounts &amp; Finance Division
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                          {accountsSheetPartner !== 'All'
                            ? `Pending Remittances & Payables for ${accountsSheetPartner} • Bank Net Banking Clearance Batch`
                            : accountsSheetFilter === 'inr'
                            ? 'Indian B2B Sub-Agent Payables • Net Banking / NEFT Clearance Batch'
                            : accountsSheetFilter === 'forex'
                            ? 'Overseas Sub-Agent & University Remittances • SWIFT Wire Clearance Batch'
                            : 'B2B Partner Disbursements • Central Bank Net Banking Clearance Batch'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: accountsSheetFilter === 'forex' ? '#2563EB' : '#047857', letterSpacing: '0.4px' }}>
                          {accountsSheetPartner !== 'All'
                            ? `ACCOUNTS DISBURSEMENT SHEET - ${accountsSheetPartner.toUpperCase()}`
                            : accountsSheetFilter === 'inr'
                            ? 'ACCOUNTS DISBURSEMENT SHEET (DOMESTIC INR)'
                            : accountsSheetFilter === 'forex'
                            ? 'ACCOUNTS DISBURSEMENT SHEET (FOREX SWIFT WIRE)'
                            : 'ACCOUNTS DISBURSEMENT SHEET'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#000000', fontWeight: 700 }}>
                          Date: {new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>
                          Ref: STERLING-ACCOUNTS-PAY-{new Date().getFullYear()}
                        </div>
                      </div>
                    </div>

                    {/* Executive Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: hasForex && hasInr ? 'repeat(5, 1fr)' : hasForex ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ border: '1.5px solid #000000', padding: '8px 10px', borderRadius: '4px', background: '#F8FAFC' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Pending Transfers</div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#000000' }}>{displayedDisbursements.length} Items</div>
                      </div>
                      {hasInr && (
                        <>
                          <div style={{ border: '1.5px solid #000000', padding: '8px 10px', borderRadius: '4px', background: '#F8FAFC' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Base Net (INR)</div>
                            <div style={{ fontSize: '14.5px', fontWeight: 900, color: '#000000' }}>{formatMoney(inrBase, 'INR')}</div>
                          </div>
                          <div style={{ border: '1.5px solid #000000', padding: '8px 10px', borderRadius: '4px', background: '#F8FAFC' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>GST 18% Total</div>
                            <div style={{ fontSize: '14.5px', fontWeight: 900, color: '#D97706' }}>{formatMoney(inrGst, 'INR')}</div>
                          </div>
                          <div style={{ border: '1.5px solid #047857', padding: '8px 10px', borderRadius: '4px', background: '#F0FDF4' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Total Domestic (INR)</div>
                            <div style={{ fontSize: '15.5px', fontWeight: 900, color: '#047857' }}>{formatMoney(inrTotal, 'INR')}</div>
                          </div>
                        </>
                      )}
                      {hasForex && (
                        <div style={{ border: '1.5px solid #2563EB', padding: '8px 10px', borderRadius: '4px', background: '#EFF6FF' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>Foreign Outflow (0% GST)</div>
                          <div style={{ fontSize: '14px', fontWeight: 900, color: '#1E40AF' }}>
                            {Object.entries(forexMap).map(([curr, amt]) => formatMoney(amt, curr)).join(' + ')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pending Payments Table with separate B2B Partner, Category, Purpose, Account, Base, GST, Total Amount */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '3.5%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '8.5%' }} />
                        <col style={{ width: '12%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: '#E2E8F0' }}>
                          <th style={{ border: '1.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 900, color: '#000000', fontSize: '9.5px' }}>#</th>
                          <th style={{ border: '1.5px solid #000000', padding: '6px 6px', textAlign: 'left', fontWeight: 900, color: '#000000', fontSize: '9.5px' }}>B2B Partner</th>
                          <th style={{ border: '1.5px solid #000000', padding: '6px 6px', textAlign: 'left', fontWeight: 900, color: '#000000', fontSize: '9.5px' }}>Category</th>
                          <th style={{ border: '1.5px solid #000000', padding: '6px 6px', textAlign: 'left', fontWeight: 900, color: '#000000', fontSize: '9.5px' }}>Purpose / Candidate(s)</th>
                          <th style={{ border: '1.5px solid #000000', padding: '6px 6px', textAlign: 'left', fontWeight: 900, color: '#000000', fontSize: '9.5px' }}>Transfer Account (Credit To)</th>
                          <th style={{ border: '1.5px solid #000000', padding: '6px 6px', textAlign: 'right', fontWeight: 900, color: '#000000', fontSize: '9.5px' }}>Base Amount</th>
                          <th style={{ border: '1.5px solid #000000', padding: '6px 6px', textAlign: 'center', fontWeight: 900, color: '#000000', fontSize: '9.5px' }}>GST Section</th>
                          <th style={{ border: '1.5px solid #000000', padding: '6px 6px', textAlign: 'right', fontWeight: 900, color: '#000000', fontSize: '9.5px' }}>Net Payable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedDisbursements.map((p, idx) => {
                          const fin = calculateFinancials(p);
                          return (
                            <tr key={p.id}>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 4px', textAlign: 'center', fontWeight: 800, color: '#000000', fontSize: '10px' }}>
                                {idx + 1}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 8px', color: '#000000', wordBreak: 'break-word' }}>
                                <strong style={{ fontSize: '11px' }}>{p.partner_name}</strong>
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 8px', color: '#000000', fontSize: '10px', wordBreak: 'break-word' }}>
                                <span style={{ fontWeight: 700, color: '#1E293B' }}>{p.category || 'Commission'}</span>
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 8px', color: '#000000', fontSize: '10px', wordBreak: 'break-word' }}>
                                <div style={{ fontWeight: 600 }}>{p.student_names || 'General Referrals'}</div>
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 8px', color: '#000000', fontSize: '9.5px', lineHeight: '1.35', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                                {p.transfer_account || 'Account details pending'}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#000000', fontSize: '10.5px' }}>
                                {formatMoney(fin.baseAmount, p.currency)}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 6px', textAlign: 'center', color: '#000000', fontSize: '9.5px' }}>
                                {fin.gstAmount > 0 ? (
                                  <div>
                                    <span style={{ fontWeight: 800, color: '#D97706' }}>+18% GST</span>
                                    <div style={{ fontSize: '9px', color: '#475569' }}>+{formatMoney(fin.gstAmount, p.currency)}</div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#64748B' }}>0% (Exempt)</span>
                                )}
                              </td>
                              <td style={{ border: '1.5px solid #000000', padding: '6px 8px', textAlign: 'right', fontWeight: 900, color: '#0F172A', fontSize: '11.5px' }}>
                                {formatMoney(fin.totalAmount, p.currency)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Domestic INR Grand Total Row */}
                        {hasInr && (
                          <tr style={{ background: '#F8FAFC' }}>
                            <td colSpan={5} style={{ border: '1.5px solid #000000', padding: '8px 10px', fontWeight: 900, fontSize: '10.5px', color: '#000000', textAlign: 'right' }}>
                              TOTAL DOMESTIC DISBURSEMENTS (INR, INCL. 18% GST):
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px', textAlign: 'right', fontWeight: 900, fontSize: '10.5px', color: '#000000' }}>
                              {formatMoney(inrBase, 'INR')}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px', textAlign: 'center', fontWeight: 900, fontSize: '10px', color: '#D97706' }}>
                              +{formatMoney(inrGst, 'INR')}
                            </td>
                            <td style={{ border: '1.5px solid #000000', padding: '8px', textAlign: 'right', fontWeight: 900, fontSize: '12px', color: '#047857' }}>
                              {formatMoney(inrTotal, 'INR')}
                            </td>
                          </tr>
                        )}

                        {/* Foreign Outflow Grand Total Rows (0% GST - Export Remittance) */}
                        {hasForex && Object.entries(forexMap).map(([curr, amt]) => (
                          <tr key={curr} style={{ background: '#EFF6FF' }}>
                            <td colSpan={5} style={{ border: '1.5px solid #2563EB', padding: '7px 10px', fontWeight: 900, fontSize: '10px', color: '#1D4ED8', textAlign: 'right' }}>
                              TOTAL FOREIGN OUTFLOW ({curr} - INTERNATIONAL WIRE / SWIFT):
                            </td>
                            <td style={{ border: '1.5px solid #2563EB', padding: '7px 8px', textAlign: 'right', fontWeight: 900, fontSize: '10.5px', color: '#1E40AF' }}>
                              {formatMoney(amt, curr)}
                            </td>
                            <td style={{ border: '1.5px solid #2563EB', padding: '7px 8px', textAlign: 'center', fontWeight: 800, fontSize: '9.5px', color: '#2563EB' }}>
                              0% (Exempt)
                            </td>
                            <td style={{ border: '1.5px solid #2563EB', padding: '7px 8px', textAlign: 'right', fontWeight: 900, fontSize: '12px', color: '#1D4ED8' }}>
                              {formatMoney(amt, curr)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Accounts Routing Notice */}
                    <div style={{ fontSize: '9.5px', color: '#64748B', marginTop: '-10px', marginBottom: '14px', lineHeight: '1.4' }}>
                      * <strong>Accounts Transfer Routing Notice:</strong> Domestic INR disbursements are payable through Indian Corporate Net Banking (IMPS / NEFT). Foreign currency disbursements ({hasForex ? Object.keys(forexMap).join(', ') : 'USD, EUR, GBP'}) are processed as International Outward Remittances (SWIFT / Form A2 - 0% GST Export Exempt under Foreign Exchange regulations).
                    </div>

                    {/* Sign-off & Audit Trail (For Sterling Accounts Team) */}
                    <div className="accounts-verification-box" style={{ border: '1.5px solid #000000', padding: '12px 14px', borderRadius: '4px', background: '#F8FAFC' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#000000', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Sterling Accounts Team Verification &amp; Bank Clearance Workflow:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '10px' }}>
                        <div style={{ border: '1px solid #000000', padding: '8px', borderRadius: '4px', background: '#ffffff' }}>
                          <div style={{ fontWeight: 800, color: '#000000', marginBottom: '22px' }}>1. Prepared &amp; Reconciled By:</div>
                          <div style={{ borderBottom: '1px solid #000000', marginBottom: '4px' }}></div>
                          <div style={{ color: '#000000', fontWeight: 600 }}>Accounts Desk / Staff Sign &amp; Date</div>
                        </div>
                        <div style={{ border: '1.5px solid #047857', padding: '8px', borderRadius: '4px', background: '#F0FDF4' }}>
                          <div style={{ fontWeight: 900, color: '#047857', marginBottom: '22px' }}>2. Authorized for Payment:</div>
                          <div style={{ borderBottom: '1px solid #047857', marginBottom: '4px' }}></div>
                          <div style={{ color: '#047857', fontWeight: 700 }}>Accounts Manager Clearance &amp; Date</div>
                        </div>
                        <div style={{ border: '1px solid #000000', padding: '8px', borderRadius: '4px', background: '#ffffff' }}>
                          <div style={{ fontWeight: 800, color: '#000000', marginBottom: '22px' }}>3. Disbursed From Sterling Bank:</div>
                          <div style={{ borderBottom: '1px solid #000000', marginBottom: '4px' }}></div>
                          <div style={{ color: '#000000', fontWeight: 600 }}>Debited Bank, Bank UTR &amp; Date</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="b2b-modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowAccountsSheetModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Direct Table-Row Invoice Upload */}
      <input
        type="file"
        ref={fileInputRowRef}
        accept=".pdf,image/*"
        style={{ display: 'none' }}
        onChange={handleRowFileSelected}
      />

      {/* B2B Vendor Invoice Lightbox Viewer Modal (with PAID Seal when settled) */}
      <B2BInvoiceViewerModal
        isOpen={!!viewingInvoicePayment}
        onClose={() => setViewingInvoicePayment(null)}
        payment={viewingInvoicePayment}
        onRemoveInvoice={handleRemoveInvoiceFromPayment}
      />

      {/* Official Dubai Invoice & B2B Remittance Receipt Generator (Letterhead + PAID Seal) */}
      <DocumentGeneratorModal
        isOpen={showDocModal}
        onClose={() => {
          setShowDocModal(false);
          setDocModalPayment(null);
        }}
        initialMode={docModalMode}
        b2bPaymentData={docModalPayment}
        companyBanks={companyBanks}
        onPaymentSettled={(settledPayment) => {
          setPayments((prev) =>
            prev.map((p) => (p.id === settledPayment.id ? { ...p, ...settledPayment } : p))
          );
        }}
      />
    </div>
  );
}
