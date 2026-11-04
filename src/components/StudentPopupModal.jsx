import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { uploadPaymentProof, extractReceiptUrl, embedReceiptIntoNotes } from '../utils/paymentProofHelper';
import ReceiptViewerModal from './ReceiptViewerModal';

// Format Indian Currency for compact chips (e.g. ₹2.16 L, ₹87.4K, ₹0)
function formatCompactINR(amount) {
  const val = Number(amount || 0);
  if (val === 0) return '₹0';
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentPopupModal({
  isOpen,
  onClose,
  title = 'All Applications',
  students = [],
  onStudentUpdated,
}) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState(null); // { isNew, slot, bank, amount, date, receiptUrl }
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [viewerReceipt, setViewerReceipt] = useState(null); // For full-screen lightbox
  const fileInputRef = useRef(null);

  // If modal is closed, return null
  if (!isOpen) return null;

  // Filter students by search in List View
  const filteredList = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const country = (s.country || '').toLowerCase();
      const counselor = (s.counselor_name || '').toLowerCase();
      const univ = (s.university || '').toLowerCase();
      return name.includes(q) || country.includes(q) || counselor.includes(q) || univ.includes(q);
    });
  }, [students, search]);

  // Payment List: ONLY actual recorded payments, sorted by slot ascending
  const paymentList = useMemo(() => {
    if (!selectedStudent) return [];
    const existing = Array.isArray(selectedStudent.payments) ? selectedStudent.payments : [];
    return [...existing]
      .filter((p) => Number(p.amount) > 0 || p.bank_name || p.payment_date || p.paid_date)
      .map((p) => ({
        ...p,
        receipt_url: extractReceiptUrl(p),
      }))
      .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
  }, [selectedStudent]);

  // Export list to Excel
  const handleExport = () => {
    if (students.length === 0) return;
    const rows = students.map((s, idx) => ({
      '#': idx + 1,
      'Name': s.name,
      'Status': s.enroll_status || 'Active',
      'Country': s.country || '',
      'Counselor': s.counselor_name || '',
      'University': s.university || '',
      'Intake': s.intake || '',
      'Committed (₹)': s.committed || 0,
      'Collected (₹)': s.collected || 0,
      'Remaining (₹)': s.remaining || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `${title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  // Open Edit Modal for an existing Payment
  const handleOpenEditPayment = (item) => {
    setEditingPayment({
      isNew: false,
      slot: Number(item.slot || 1),
      bank: item.bank_name || 'STERLING STUDY ABROAD',
      amount: Number(item.amount || 0) > 0 ? String(item.amount) : '',
      date: item.payment_date || item.paid_date ? String(item.payment_date || item.paid_date).slice(0, 10) : new Date().toISOString().split('T')[0],
      receiptUrl: item.receipt_url || extractReceiptUrl(item) || null,
    });
  };

  // Open Modal to Add a New Installment (dynamically assigns next available slot)
  const handleOpenAddInstallment = () => {
    const existingSlots = paymentList.map((p) => Number(p.slot || 0));
    let nextSlot = 1;
    while (existingSlots.includes(nextSlot)) {
      nextSlot++;
    }
    setEditingPayment({
      isNew: true,
      slot: nextSlot,
      bank: 'STERLING STUDY ABROAD',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      receiptUrl: null,
    });
  };

  // Handle file selection and compression for payment screenshot
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    const toastId = toast.loading('Processing payment screenshot...');

    try {
      const url = await uploadPaymentProof(file, {
        studentId: selectedStudent?.id,
        slot: editingPayment?.slot,
      });

      setEditingPayment((prev) => ({
        ...prev,
        receiptUrl: url,
      }));

      toast.success('Screenshot attached successfully!', { id: toastId });
    } catch (err) {
      console.error('Screenshot upload error:', err);
      toast.error('Failed to attach screenshot: ' + (err.message || 'Unknown error'), { id: toastId });
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete an installment
  const handleDeletePayment = async (slotToDelete) => {
    if (!window.confirm(`Are you sure you want to delete Installment #${slotToDelete}? This cannot be undone.`)) return;
    setIsSavingPayment(true);
    const toastId = toast.loading(`Deleting Installment #${slotToDelete}...`);

    try {
      await supabase
        .from('payments')
        .delete()
        .eq('student_id', selectedStudent.id)
        .eq('slot', slotToDelete);

      // Re-fetch payments for this student
      const { data: updatedPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('slot', { ascending: true });

      const newPayments = updatedPayments || [];
      const newCollected = newPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const committed = Number(selectedStudent.committed || 0);
      const newRemaining = selectedStudent.enroll_status === 'Active' ? Math.max(0, committed - newCollected) : 0;

      await supabase
        .from('students')
        .update({
          collected: newCollected,
          remaining: newRemaining,
        })
        .eq('id', selectedStudent.id);

      setSelectedStudent((prev) => ({
        ...prev,
        payments: newPayments,
        collected: newCollected,
        remaining: newRemaining,
      }));

      toast.success(`Installment #${slotToDelete} deleted`, { id: toastId });
      setEditingPayment(null);
      if (onStudentUpdated) onStudentUpdated();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to delete payment', { id: toastId });
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Save Payment Slot
  const handleSavePayment = async () => {
    if (!editingPayment || !selectedStudent) return;
    setIsSavingPayment(true);
    const toastId = toast.loading('Saving payment installment...');

    try {
      const amt = parseFloat(editingPayment.amount) || 0;
      const slot = parseInt(editingPayment.slot, 10) || 1;
      const bnk = (editingPayment.bank || 'STERLING STUDY ABROAD').trim();
      const dt = editingPayment.date || new Date().toISOString().split('T')[0];
      const receiptUrl = editingPayment.receiptUrl || null;

      if (amt <= 0) {
        // Delete payment slot
        await supabase
          .from('payments')
          .delete()
          .eq('student_id', selectedStudent.id)
          .eq('slot', slot);
      } else {
        // 1. First attempt upsert with receipt_url column
        const paymentPayload = {
          student_id: selectedStudent.id,
          company_id: selectedStudent.company_id,
          slot,
          bank_name: bnk,
          amount: amt,
          payment_date: dt,
          receipt_url: receiptUrl,
        };

        let { error: upsertErr } = await supabase
          .from('payments')
          .upsert(paymentPayload, {
            onConflict: 'student_id,slot',
          });

        // 2. If database doesn't have receipt_url column yet, fallback to storing in notes!
        if (upsertErr && upsertErr.message && upsertErr.message.toLowerCase().includes('receipt_url')) {
          const existingPayment = (selectedStudent.payments || []).find((p) => Number(p.slot) === slot);
          const fallbackNotes = embedReceiptIntoNotes(existingPayment?.notes || '', receiptUrl);

          delete paymentPayload.receipt_url;
          paymentPayload.notes = fallbackNotes;

          const res2 = await supabase
            .from('payments')
            .upsert(paymentPayload, {
              onConflict: 'student_id,slot',
            });
          upsertErr = res2.error;
        }

        // 3. If payment_type check constraint fails, try valid fallback types
        if (upsertErr && upsertErr.message && upsertErr.message.toLowerCase().includes('payment_type')) {
          const fallbackTypes = ['standard', 'Normal', 'normal', 'Cash'];
          for (const ft of fallbackTypes) {
            paymentPayload.payment_type = ft;
            const resType = await supabase
              .from('payments')
              .upsert(paymentPayload, { onConflict: 'student_id,slot' });
            if (!resType.error) {
              upsertErr = null;
              break;
            }
          }
        }

        if (upsertErr) {
          if (upsertErr.message && upsertErr.message.toLowerCase().includes('payments_slot_check')) {
            throw new Error(`Database check constraint: If adding slot > 5, please execute: ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_slot_check; in Supabase SQL editor.`);
          }
          throw upsertErr;
        }
      }

      // Re-fetch payments for this student
      const { data: updatedPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('slot', { ascending: true });

      const newPayments = updatedPayments || [];
      const newCollected = newPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const committed = Number(selectedStudent.committed || 0);
      const newRemaining = selectedStudent.enroll_status === 'Active' ? Math.max(0, committed - newCollected) : 0;

      await supabase
        .from('students')
        .update({
          collected: newCollected,
          remaining: newRemaining,
        })
        .eq('id', selectedStudent.id);

      setSelectedStudent(prev => ({
        ...prev,
        payments: newPayments,
        collected: newCollected,
        remaining: newRemaining,
      }));

      toast.success(`Installment #${slot} saved successfully!`, { id: toastId });
      setEditingPayment(null);
      if (onStudentUpdated) onStudentUpdated();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save payment', { id: toastId });
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Delete student handler
  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete student "${studentName}"? This will also delete their payment records.`)) {
      return;
    }
    setIsDeleting(true);
    const toastId = toast.loading('Deleting student record...');
    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;
      toast.success(`Student "${studentName}" deleted successfully`, { id: toastId });
      setSelectedStudent(null);
      if (onStudentUpdated) onStudentUpdated();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to delete student', { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(4, 6, 14, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={() => {
        setEditingPayment(null);
        setSelectedStudent(null);
        onClose();
      }}
    >
      {/* Modal Card Window */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: selectedStudent ? '450px' : '410px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          background: '#0B0F1C',
          border: '1px solid rgba(148, 163, 225, 0.22)',
          borderRadius: '18px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 35px rgba(124, 111, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#EDEFFA',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          position: 'relative',
        }}
      >
        {/* =========================================================================
            SCREENSHOT 2: LIST VIEW
           ========================================================================= */}
        {!selectedStudent ? (
          <>
            {/* Header */}
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(148, 163, 225, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {title}
                </h3>
                <div style={{ fontSize: '11px', color: '#8E9BB5', marginTop: '2px' }}>
                  {students.length} students
                </div>
              </div>

              {/* Action Icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleExport}
                  title="Export to Excel"
                  style={{
                    background: 'rgba(54, 209, 220, 0.15)',
                    border: '1px solid rgba(54, 209, 220, 0.35)',
                    color: '#36D1DC',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                >
                  📥
                </button>

                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(148, 163, 225, 0.18)',
                    color: '#8E9BB5',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Search inside list */}
            {students.length > 8 && (
              <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(148, 163, 225, 0.08)' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name, country, counselor..."
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(148, 163, 225, 0.15)',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Students List Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {filteredList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#8E9BB5', fontSize: '13px' }}>
                  No students found
                </div>
              ) : (
                filteredList.map((s) => {
                  const isActive = s.enroll_status === 'Active' || s.enroll_status === 'Enrolled';
                  const collected = Number(s.collected || 0);
                  const committed = Number(s.committed || 0);

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      style={{
                        background: 'rgba(20, 26, 48, 0.65)',
                        border: '1px solid rgba(148, 163, 225, 0.12)',
                        borderRadius: '12px',
                        padding: '11px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(124, 111, 255, 0.4)';
                        e.currentTarget.style.background = 'rgba(26, 34, 62, 0.85)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.12)';
                        e.currentTarget.style.background = 'rgba(20, 26, 48, 0.65)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Top Line: Name + Status Pill */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                          {s.name}
                        </span>

                        <span
                          style={{
                            background: isActive ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 111, 142, 0.15)',
                            color: isActive ? '#00E5A0' : '#FF6F8E',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                          }}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Bottom Line: Country & Counselor (Left) + Collected / Committed (Right) */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                        <div style={{ color: '#8E9BB5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ color: '#36D1DC' }}>🏛️ {s.country || 'Global'}</span>
                          <span>&bull;</span>
                          <span style={{ color: '#A78BFA' }}>👤 {s.counselor_name || 'Unassigned'}</span>
                        </div>

                        <div style={{ color: '#A8B2C7', fontWeight: 600 }}>
                          {formatCompactINR(collected)} / {formatCompactINR(committed)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* =========================================================================
              SCREENSHOT 3: SINGLE STUDENT DETAIL VIEW
             ========================================================================= */
          <>
            {/* Header with Back Arrow */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(148, 163, 225, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: 0,
                }}
              >
                <span>&larr;</span>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {selectedStudent.name}
                </span>
              </button>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(148, 163, 225, 0.18)',
                  color: '#8E9BB5',
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Badges Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    background: 'rgba(0, 229, 160, 0.15)',
                    color: '#00E5A0',
                    padding: '3px 9px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.enroll_status || 'Active'}
                </span>

                <span
                  style={{
                    background: 'rgba(124, 111, 255, 0.2)',
                    color: '#A78BFA',
                    padding: '3px 9px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.pay_stage || selectedStudent.payment_stage || 'Pending'}
                </span>

                {selectedStudent.enroll_status === 'Enrolled' && (
                  <span
                    style={{
                      background: 'rgba(54, 209, 220, 0.2)',
                      color: '#36D1DC',
                      padding: '3px 9px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    📌 Enrolled
                  </span>
                )}

                <span
                  style={{
                    background: 'rgba(255, 176, 32, 0.18)',
                    color: '#FFB020',
                    padding: '3px 9px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {Array.isArray(selectedStudent.payments) ? selectedStudent.payments.length : 0} Installments
                </span>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    toast('To edit personal information, visit Students tab', { icon: '✏️' });
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #7C6FFF 0%, #6959f6 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>✏️</span>
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.name)}
                  disabled={isDeleting}
                  style={{
                    background: 'rgba(255, 111, 142, 0.12)',
                    color: '#FF6F8E',
                    border: '1px solid rgba(255, 111, 142, 0.35)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: isDeleting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🗑️</span>
                  <span>Delete Student</span>
                </button>
              </div>

              {/* General Info Card */}
              <div
                style={{
                  background: 'rgba(20, 26, 48, 0.55)',
                  border: '1px solid rgba(148, 163, 225, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8E9BB5' }}>Country</span>
                  <span style={{ fontWeight: 700, color: '#36D1DC' }}>🏛️ {selectedStudent.country || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8E9BB5' }}>Intake</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>🗓️ {selectedStudent.intake || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8E9BB5' }}>Counselor</span>
                  <span style={{ fontWeight: 700, color: '#A78BFA' }}>👤 {selectedStudent.counselor_name || 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8E9BB5' }}>Team Lead</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>👤 {selectedStudent.team_lead || 'Shaheem'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8E9BB5' }}>University</span>
                  <span style={{ fontWeight: 700, color: '#FFB020' }}>🏰 {selectedStudent.university || 'Pending selection'}</span>
                </div>
              </div>

              {/* Payment Summary Section */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                  Payment Summary
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
                  {/* COLLECTED */}
                  <div
                    style={{
                      background: 'rgba(0, 229, 160, 0.08)',
                      borderTop: '2px solid #00E5A0',
                      borderRadius: '8px',
                      padding: '10px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '9.5px', color: '#8E9BB5', textTransform: 'uppercase' }}>COLLECTED</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#00E5A0', marginTop: '2px' }}>
                      {formatCompactINR(selectedStudent.collected)}
                    </div>
                  </div>

                  {/* COMMITTED */}
                  <div
                    style={{
                      background: 'rgba(124, 111, 255, 0.08)',
                      borderTop: '2px solid #7C6FFF',
                      borderRadius: '8px',
                      padding: '10px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '9.5px', color: '#8E9BB5', textTransform: 'uppercase' }}>COMMITTED</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#A78BFA', marginTop: '2px' }}>
                      {formatCompactINR(selectedStudent.committed)}
                    </div>
                  </div>

                  {/* REMAINING */}
                  <div
                    style={{
                      background: 'rgba(255, 111, 142, 0.08)',
                      borderTop: '2px solid #FF6F8E',
                      borderRadius: '8px',
                      padding: '10px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '9.5px', color: '#8E9BB5', textTransform: 'uppercase' }}>REMAINING</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#FF6F8E', marginTop: '2px' }}>
                      {formatCompactINR(selectedStudent.remaining)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {(() => {
                  const pct = selectedStudent.committed > 0
                    ? Math.min(100, Math.round((selectedStudent.collected / selectedStudent.committed) * 100))
                    : 0;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '5px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #36D1DC, #7C6FFF)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#36D1DC' }}>{pct}%</span>
                    </div>
                  );
                })()}
              </div>

              {/* Profit Accounting Section */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                  Profit Accounting
                </div>

                <div
                  style={{
                    background: 'rgba(20, 26, 48, 0.55)',
                    border: '1px solid rgba(148, 163, 225, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    fontSize: '11.5px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>Total Collected</span>
                    <span style={{ fontWeight: 800, color: '#00E5A0' }}>{formatCompactINR(selectedStudent.collected)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>Refund</span>
                    <span style={{ color: '#FF6F8E' }}>- {formatCompactINR(selectedStudent.refund || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>B2B Charge</span>
                    <span style={{ color: '#FF6F8E' }}>- {formatCompactINR(selectedStudent.b2b_charge || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>Anna Incentive (Student Side)</span>
                    <span style={{ color: '#FF6F8E' }}>- {formatCompactINR(selectedStudent.incentive_student || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>Anna Incentive (Company Side)</span>
                    <span style={{ color: '#FF6F8E' }}>- {formatCompactINR(selectedStudent.incentive_company || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>General Expenses</span>
                    <span style={{ color: '#FF6F8E' }}>- {formatCompactINR(selectedStudent.other_expense || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>University Commission</span>
                    <span style={{ color: '#00E5A0' }}>+ {formatCompactINR(selectedStudent.commission || 0)}</span>
                  </div>

                  {/* Sterling Profit Highlight Box */}
                  {(() => {
                    const profit =
                      Number(selectedStudent.collected || 0) -
                      Number(selectedStudent.refund || 0) -
                      Number(selectedStudent.b2b_charge || 0) -
                      Number(selectedStudent.incentive_student || 0) -
                      Number(selectedStudent.incentive_company || 0) -
                      Number(selectedStudent.other_expense || 0) +
                      Number(selectedStudent.commission || 0);

                    return (
                      <div
                        style={{
                          marginTop: '6px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(148, 163, 225, 0.12)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '12px' }}>Sterling Profit</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: profit >= 0 ? '#A78BFA' : '#FF6F8E' }}>
                          {formatCompactINR(profit)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Anna Chechi Section */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                  Anna Chechi
                </div>

                <div
                  style={{
                    background: 'rgba(20, 26, 48, 0.55)',
                    border: '1px solid rgba(148, 163, 225, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    fontSize: '11.5px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>Committed</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>
                      {formatCompactINR((selectedStudent.incentive_student || 0) + (selectedStudent.incentive_company || 0))}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>Paid (bank + ledger)</span>
                    <span style={{ color: '#00E5A0', fontWeight: 600 }}>
                      {formatCompactINR(selectedStudent.incentive_student || 0)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8E9BB5' }}>Remaining to Give</span>
                    <span style={{ color: '#FFB020', fontWeight: 600 }}>
                      {formatCompactINR(selectedStudent.incentive_company || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History Section (Dynamic Installments & No Horizontal Overflow) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Payment History</span>
                    <span style={{ fontSize: '11px', color: '#8E9BB5', fontWeight: 600 }}>({paymentList.length})</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddInstallment}
                    style={{
                      background: 'rgba(0, 229, 160, 0.15)',
                      border: '1px solid rgba(0, 229, 160, 0.35)',
                      color: '#00E5A0',
                      padding: '4px 9px',
                      borderRadius: '7px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#00E5A0';
                      e.currentTarget.style.color = '#080A12';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 229, 160, 0.15)';
                      e.currentTarget.style.color = '#00E5A0';
                    }}
                  >
                    <span>+</span>
                    <span>Add Installment</span>
                  </button>
                </div>

                <div
                  style={{
                    background: 'rgba(20, 26, 48, 0.55)',
                    border: '1px solid rgba(148, 163, 225, 0.12)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {paymentList.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8E9BB5', fontSize: '11.5px' }}>
                      <div style={{ marginBottom: '8px', color: '#64748B' }}>No payment installments recorded yet</div>
                      <button
                        type="button"
                        onClick={handleOpenAddInstallment}
                        style={{
                          background: 'rgba(124, 111, 255, 0.15)',
                          border: '1px solid rgba(124, 111, 255, 0.35)',
                          color: '#A78BFA',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add 1st Installment
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Grid Table Header */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '22px 1fr 70px 74px 32px 30px',
                          gap: '6px',
                          alignItems: 'center',
                          padding: '9px 12px',
                          borderBottom: '1px solid rgba(148, 163, 225, 0.12)',
                          color: '#8E9BB5',
                          background: 'rgba(255, 255, 255, 0.02)',
                          fontSize: '11px',
                          fontWeight: 700,
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>#</div>
                        <div>BANK</div>
                        <div style={{ textAlign: 'right' }}>AMOUNT</div>
                        <div style={{ textAlign: 'right' }}>DATE</div>
                        <div style={{ textAlign: 'center' }}>PROOF</div>
                        <div style={{ textAlign: 'center' }}>EDIT</div>
                      </div>

                      {/* Grid Table Rows */}
                      <div>
                        {paymentList.map((item) => (
                          <div
                            key={item.id || item.slot}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '22px 1fr 70px 74px 32px 30px',
                              gap: '6px',
                              alignItems: 'center',
                              padding: '8px 12px',
                              borderBottom: '1px solid rgba(148, 163, 225, 0.06)',
                              fontSize: '11px',
                              boxSizing: 'border-box',
                            }}
                          >
                            {/* # (Slot) */}
                            <div style={{ textAlign: 'center', color: '#8E9BB5', fontWeight: 600 }}>
                              {item.slot}
                            </div>

                            {/* BANK: minWidth 0 prevents flex/grid item blowout and enables truncation */}
                            <div
                              title={item.bank_name || 'STERLING STUDY ABROAD'}
                              style={{
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: '#fff',
                                fontWeight: 600,
                              }}
                            >
                              {item.bank_name || 'STERLING STUDY ABROAD'}
                            </div>

                            {/* AMOUNT: bold green, guaranteed full visibility */}
                            <div
                              style={{
                                textAlign: 'right',
                                color: '#00E5A0',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatCompactINR(item.amount)}
                            </div>

                            {/* DATE: formatted readable date */}
                            <div
                              style={{
                                textAlign: 'right',
                                color: '#CBD5E1',
                                fontSize: '10px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatDate(item.payment_date || item.paid_date)}
                            </div>

                            {/* PROOF SCREENSHOT BUTTON */}
                            <div style={{ textAlign: 'center' }}>
                              {item.receipt_url ? (
                                <button
                                  type="button"
                                  onClick={() => setViewerReceipt({
                                    url: item.receipt_url,
                                    slot: item.slot,
                                    studentName: selectedStudent.name,
                                    amount: item.amount,
                                    date: formatDate(item.payment_date || item.paid_date),
                                    bank: item.bank_name,
                                  })}
                                  title="View Payment Screenshot / Receipt Proof"
                                  style={{
                                    background: 'rgba(54, 209, 220, 0.18)',
                                    border: '1px solid rgba(54, 209, 220, 0.45)',
                                    color: '#36D1DC',
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 0 10px rgba(54, 209, 220, 0.25)',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#36D1DC';
                                    e.currentTarget.style.color = '#080A12';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(54, 209, 220, 0.18)';
                                    e.currentTarget.style.color = '#36D1DC';
                                  }}
                                >
                                  🧾
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPayment(item)}
                                  title="Attach Screenshot"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px dashed rgba(148, 163, 225, 0.25)',
                                    color: '#64748B',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#00E5A0';
                                    e.currentTarget.style.color = '#00E5A0';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.25)';
                                    e.currentTarget.style.color = '#64748B';
                                  }}
                                >
                                  +
                                </button>
                              )}
                            </div>

                            {/* EDIT: orange pencil button */}
                            <div style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPayment(item)}
                                title={`Edit Installment #${item.slot} (Amount, Date, Bank)`}
                                style={{
                                  background: 'rgba(255, 111, 32, 0.16)',
                                  border: '1px solid rgba(255, 111, 32, 0.45)',
                                  color: '#FF8A00',
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#FF8A00';
                                  e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 111, 32, 0.16)';
                                  e.currentTarget.style.color = '#FF8A00';
                                }}
                              >
                                ✏️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {paymentList.length > 0 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: '10.5px',
                        color: '#8E9BB5',
                        borderTop: '1px solid rgba(148, 163, 225, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>{paymentList.length} installment{paymentList.length > 1 ? 's' : ''} recorded</span>
                      <span style={{ color: '#00E5A0', fontWeight: 700 }}>
                        Total: {formatCompactINR(paymentList.reduce((acc, p) => acc + Number(p.amount || 0), 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* =========================================================================
                INLINE EDIT / ADD PAYMENT MODAL (Amount, Date, Bank & Slot)
               ========================================================================= */}
            {editingPayment && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 10,
                  background: 'rgba(4, 6, 14, 0.88)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}
                onClick={() => setEditingPayment(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    maxWidth: '340px',
                    background: '#11162A',
                    border: '1px solid rgba(148, 163, 225, 0.25)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255, 138, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#FF8A00' }}>✏️</span>
                      <span>{editingPayment.isNew ? `Add Installment #${editingPayment.slot}` : `Edit Installment #${editingPayment.slot}`}</span>
                    </div>
                    <button
                      onClick={() => setEditingPayment(null)}
                      style={{ background: 'none', border: 'none', color: '#8E9BB5', fontSize: '16px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Slot Number */}
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#8E9BB5', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                      Installment Slot #
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={editingPayment.slot}
                      onChange={(e) => setEditingPayment((prev) => ({ ...prev, slot: parseInt(e.target.value, 10) || 1 }))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(148, 163, 225, 0.2)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 1. AMOUNT (₹) */}
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#00E5A0', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 50000"
                      value={editingPayment.amount}
                      onChange={(e) => setEditingPayment((prev) => ({ ...prev, amount: e.target.value }))}
                      autoFocus
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(0, 229, 160, 0.4)',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        color: '#00E5A0',
                        fontSize: '15px',
                        fontWeight: 800,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 2. PAYMENT DATE */}
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#36D1DC', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={editingPayment.date}
                      onChange={(e) => setEditingPayment((prev) => ({ ...prev, date: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(148, 163, 225, 0.2)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 3. BANK / ACCOUNT NAME */}
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                      Bank / Account
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. STERLING STUDY ABROAD, Federal Bank"
                      value={editingPayment.bank}
                      onChange={(e) => setEditingPayment((prev) => ({ ...prev, bank: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(148, 163, 225, 0.2)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 4. PAYMENT SCREENSHOT / RECEIPT PROOF */}
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#FFB020', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>Payment Screenshot / Proof</span>
                      {editingPayment.receiptUrl && (
                        <span style={{ color: '#00E5A0', fontSize: '10px', textTransform: 'none', fontWeight: 600 }}>
                          ✓ Attached
                        </span>
                      )}
                    </label>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,application/pdf"
                      onChange={handleFileSelected}
                      style={{ display: 'none' }}
                    />

                    {editingPayment.receiptUrl ? (
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(0, 229, 160, 0.35)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div
                          onClick={() => setViewerReceipt({
                            url: editingPayment.receiptUrl,
                            slot: editingPayment.slot,
                            studentName: selectedStudent.name,
                            amount: editingPayment.amount,
                            date: editingPayment.date,
                            bank: editingPayment.bank,
                          })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            flex: 1,
                            minWidth: 0,
                          }}
                          title="Click to view full preview"
                        >
                          <img
                            src={editingPayment.receiptUrl}
                            alt="Receipt preview"
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1px solid rgba(148, 163, 225, 0.3)',
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Screenshot Attached
                            </div>
                            <div style={{ fontSize: '9.5px', color: '#36D1DC' }}>Click to view full image ↗</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingReceipt}
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(148, 163, 225, 0.2)',
                              color: '#EDEFFA',
                              padding: '3px 7px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              cursor: 'pointer',
                            }}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPayment((prev) => ({ ...prev, receiptUrl: null }))}
                            disabled={isUploadingReceipt}
                            style={{
                              background: 'rgba(255, 111, 142, 0.15)',
                              border: '1px solid rgba(255, 111, 142, 0.35)',
                              color: '#FF6F8E',
                              padding: '3px 7px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '1px dashed rgba(148, 163, 225, 0.3)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          textAlign: 'center',
                          cursor: isUploadingReceipt ? 'wait' : 'pointer',
                          background: 'rgba(255, 255, 255, 0.02)',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#00E5A0';
                          e.currentTarget.style.background = 'rgba(0, 229, 160, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(148, 163, 225, 0.3)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        }}
                      >
                        <div style={{ fontSize: '15px', marginBottom: '2px' }}>
                          {isUploadingReceipt ? '⏳' : '📎'}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#EDEFFA' }}>
                          {isUploadingReceipt ? 'Compressing & uploading...' : 'Upload Payment Screenshot'}
                        </div>
                        <div style={{ fontSize: '9px', color: '#8E9BB5', marginTop: '2px' }}>
                          PNG, JPG, WebP, PDF (auto-compressed)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {!editingPayment.isNew && (
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(editingPayment.slot)}
                        disabled={isSavingPayment}
                        title="Delete this installment"
                        style={{
                          background: 'rgba(255, 111, 142, 0.15)',
                          border: '1px solid rgba(255, 111, 142, 0.35)',
                          color: '#FF6F8E',
                          borderRadius: '8px',
                          padding: '9px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingPayment(null)}
                      disabled={isSavingPayment}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid rgba(148, 163, 225, 0.25)',
                        color: '#8E9BB5',
                        borderRadius: '8px',
                        padding: '9px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePayment}
                      disabled={isSavingPayment || isUploadingReceipt}
                      style={{
                        flex: 2,
                        background: 'linear-gradient(135deg, #00E5A0 0%, #00B37E 100%)',
                        color: '#080A12',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: isSavingPayment || isUploadingReceipt ? 'wait' : 'pointer',
                        boxShadow: '0 4px 14px rgba(0, 229, 160, 0.4)',
                      }}
                    >
                      {isSavingPayment ? 'Saving...' : 'Save Payment'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal for Viewing Screenshots */}
      <ReceiptViewerModal
        isOpen={Boolean(viewerReceipt)}
        onClose={() => setViewerReceipt(null)}
        receiptUrl={viewerReceipt?.url}
        studentName={viewerReceipt?.studentName || selectedStudent?.name}
        installmentSlot={viewerReceipt?.slot || 1}
        amount={viewerReceipt?.amount || 0}
        date={viewerReceipt?.date || ''}
        bank={viewerReceipt?.bank || ''}
      />
    </div>
  );
}
