import React, { useState, useEffect, useRef } from 'react';
import supabase from '../supabase';
import toast from 'react-hot-toast';
import { uploadPaymentProof, extractReceiptUrl, embedReceiptIntoNotes } from '../utils/paymentProofHelper';

/**
 * PaymentModal
 * Modal for adding or editing an installment payment for a student.
 * 
 * @param {Object} props
 * @param {Object} props.student - The student object
 * @param {number|null} props.slot - Slot number (1-5) or null for auto-detect
 * @param {Object|null} props.payment - Existing payment object to edit, or null
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onSave - Callback when payment is saved (passes payment or refreshed list)
 */
export default function PaymentModal({
  student,
  slot = null,
  payment = null,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(payment && payment.id);

  // Calculate used slots
  const studentPayments = student?.payments || [];
  const usedSlots = studentPayments.map((p) => Number(p.slot)).filter(Boolean);

  // Auto-calculate which slot to use for new payments
  const determineInitialSlot = () => {
    if (slot) return Number(slot);
    if (payment?.slot) return Number(payment.slot);

    // Find the first available slot from 1 to 5
    for (let s = 1; s <= 5; s++) {
      if (!usedSlots.includes(s)) {
        return s;
      }
    }
    return 1; // Default fallback if all are full
  };

  const [selectedSlot, setSelectedSlot] = useState(determineInitialSlot);
  const [bankName, setBankName] = useState(payment?.bank_name || '');
  const [amount, setAmount] = useState(payment?.amount ? String(payment.amount) : '');
  const [paymentDate, setPaymentDate] = useState(
    payment?.payment_date || new Date().toISOString().split('T')[0]
  );
  const [paymentType, setPaymentType] = useState(payment?.payment_type || 'Normal');
  const [referenceNo, setReferenceNo] = useState(payment?.reference_no || '');
  const [notes, setNotes] = useState(payment?.notes || '');
  const [receiptUrl, setReceiptUrl] = useState(payment ? (payment.receipt_url || extractReceiptUrl(payment)) : '');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (payment) {
      setSelectedSlot(payment.slot || 1);
      setBankName(payment.bank_name || '');
      setAmount(payment.amount ? String(payment.amount) : '');
      setPaymentDate(payment.payment_date || new Date().toISOString().split('T')[0]);
      setPaymentType(payment.payment_type || 'Normal');
      setReferenceNo(payment.reference_no || '');
      setNotes(payment.notes || '');
      setReceiptUrl(payment.receipt_url || extractReceiptUrl(payment) || '');
    } else if (slot) {
      setSelectedSlot(Number(slot));
      setReceiptUrl('');
    }
  }, [payment, slot]);

  // Handle file selection and compression for payment screenshot
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    const toastId = toast.loading('Processing payment screenshot...');

    try {
      const url = await uploadPaymentProof(file, {
        studentId: student?.id,
        slot: selectedSlot,
      });

      setReceiptUrl(url);
      toast.success('Screenshot attached successfully!', { id: toastId });
    } catch (err) {
      console.error('Screenshot upload error:', err);
      toast.error('Failed to attach screenshot: ' + (err.message || 'Unknown error'), { id: toastId });
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!student?.id) {
      toast.error('Student reference missing');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than ₹0');
      return;
    }

    if (!bankName.trim()) {
      toast.error('Please specify a bank or payment method account name');
      return;
    }

    if (!paymentDate) {
      toast.error('Please select a payment date');
      return;
    }

    // Check if slot is already occupied by a DIFFERENT payment
    if (!isEditing) {
      const alreadyOccupied = studentPayments.some(
        (p) => Number(p.slot) === Number(selectedSlot)
      );
      if (alreadyOccupied) {
        toast.error(`Slot ${selectedSlot} already has a recorded payment. Please pick another slot or edit that payment.`);
        return;
      }
    } else if (payment && Number(payment.slot) !== Number(selectedSlot)) {
      const alreadyOccupied = studentPayments.some(
        (p) => p.id !== payment.id && Number(p.slot) === Number(selectedSlot)
      );
      if (alreadyOccupied) {
        toast.error(`Slot ${selectedSlot} is already in use by another payment.`);
        return;
      }
    }

    setSaving(true);
    try {
      const companyId =
        student.company_id ||
        student.companyId ||
        'a1b2c3d4-0000-0000-0000-000000000001';

      const paymentPayload = {
        student_id: student.id,
        company_id: companyId,
        slot: Number(selectedSlot),
        bank_name: bankName.trim(),
        amount: numAmount,
        payment_date: paymentDate,
        payment_type: paymentType,
        reference_no: referenceNo.trim() || null,
        notes: embedReceiptIntoNotes(notes.trim(), receiptUrl) || null,
        receipt_url: receiptUrl || null,
      };

      let resultData = null;

      if (isEditing) {
        paymentPayload.id = payment.id;
        let { data, error } = await supabase
          .from('payments')
          .update(paymentPayload)
          .eq('id', payment.id)
          .select()
          .single();

        // If receipt_url column doesn't exist, retry without it (already embedded in notes)
        if (error && error.message && error.message.toLowerCase().includes('receipt_url')) {
          delete paymentPayload.receipt_url;
          const retry = await supabase
            .from('payments')
            .update(paymentPayload)
            .eq('id', payment.id)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        resultData = data;
        toast.success(`Payment Slot ${selectedSlot} updated successfully`);
      } else {
        let { data, error } = await supabase
          .from('payments')
          .insert([paymentPayload])
          .select()
          .single();

        if (error && error.message && error.message.toLowerCase().includes('receipt_url')) {
          delete paymentPayload.receipt_url;
          const retry = await supabase
            .from('payments')
            .insert([paymentPayload])
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          // Fallback to upsert if duplicate key constraint
          const { data: upsertData, error: upsertErr } = await supabase
            .from('payments')
            .upsert([paymentPayload], { onConflict: 'student_id,slot' })
            .select()
            .single();

          if (upsertErr) throw upsertErr;
          resultData = upsertData;
        } else {
          resultData = data;
        }
        toast.success(`Payment Slot ${selectedSlot} recorded successfully`);
      }

      if (onSave) {
        onSave(resultData);
      }
      onClose();
    } catch (err) {
      console.error('Error saving payment:', err);
      toast.error(err.message || 'Failed to save payment record');
    } finally {
      setSaving(false);
    }
  };

  // Pre-calculated stats for the student
  const collectedSoFar = (student?.payments || []).reduce(
    (sum, p) => (p.id !== payment?.id ? sum + Number(p.amount || 0) : sum),
    0
  );
  const committedAmount = Number(student?.committed || 0);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(8, 10, 18, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: 'var(--bg2solid)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(124, 111, 255, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(0, 229, 160, 0.15)',
                border: '1px solid rgba(0, 229, 160, 0.35)',
                color: 'var(--green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
              }}
            >
              ₹
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>
                {isEditing ? `Edit Installment #${selectedSlot}` : 'Add Payment Installment'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                Student: <strong style={{ color: 'var(--text)' }}>{student?.name || 'Unknown'}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '20px',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            &times;
          </button>
        </div>

        {/* Student Quick Financial Glance */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--bg4)',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '11px' }}>Committed</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '13px' }}>
              ₹{committedAmount.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '11px' }}>Other Collected</div>
            <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '13px' }}>
              ₹{collectedSoFar.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '11px' }}>Target Pending</div>
            <div style={{ fontWeight: 700, color: 'var(--amber)', fontSize: '13px' }}>
              ₹{Math.max(0, committedAmount - collectedSoFar).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Slot Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                Payment Slot / Installment Stage (1 to 5)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((s) => {
                  const existingForSlot = studentPayments.find((p) => Number(p.slot) === s);
                  const isCurrent = Number(selectedSlot) === s;
                  const isOccupiedByOther = existingForSlot && (!payment || existingForSlot.id !== payment.id);

                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: isCurrent ? 700 : 500,
                        border: isCurrent
                          ? '2px solid var(--blue)'
                          : isOccupiedByOther
                          ? '1px dashed rgba(255, 111, 142, 0.4)'
                          : '1px solid var(--border)',
                        background: isCurrent
                          ? 'rgba(124, 111, 255, 0.22)'
                          : isOccupiedByOther
                          ? 'rgba(255, 111, 142, 0.08)'
                          : 'var(--bg3)',
                        color: isCurrent
                          ? '#fff'
                          : isOccupiedByOther
                          ? 'var(--red)'
                          : 'var(--text)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'var(--transition)',
                      }}
                      title={
                        isOccupiedByOther
                          ? `Slot ${s} is recorded (₹${Number(existingForSlot.amount).toLocaleString('en-IN')})`
                          : `Slot ${s} available`
                      }
                    >
                      <div>Slot {s}</div>
                      <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.85 }}>
                        {isOccupiedByOther ? 'Filled' : isCurrent ? 'Active' : 'Empty'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount & Date in 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                  Amount (₹) <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--muted)',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 30px',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                  Payment Date <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Bank / Account Name with Datalist */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                Bank / Account Name <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="text"
                list="bank-options"
                required
                placeholder="Select or enter bank / account name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              <datalist id="bank-options">
                <option value="HDFC Bank Current A/C" />
                <option value="ICICI Bank Current A/C" />
                <option value="State Bank of India (SBI)" />
                <option value="Axis Bank" />
                <option value="Kotak Mahindra Bank" />
                <option value="Punjab National Bank" />
                <option value="Bank of Baroda" />
                <option value="Cash in Hand (Office)" />
                <option value="UPI / PhonePe / GPay" />
                <option value="International Wire Transfer (Forex)" />
                <option value="Razorpay Payment Gateway" />
                <option value="Stripe Payment Gateway" />
              </datalist>
            </div>

            {/* Payment Type */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                Payment Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['Normal', 'B2B', 'Direct to Counselor'].map((type) => {
                  const isSelected = paymentType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPaymentType(type)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: isSelected ? 600 : 500,
                        border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(54, 209, 220, 0.18)' : 'var(--bg3)',
                        color: isSelected ? 'var(--cyan)' : 'var(--text)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'var(--transition)',
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference Number / Transaction ID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                  Transaction / UTR Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR19827364528 or Cheque #98210"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional installment context or counselor remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--blue)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Payment Proof / Screenshot */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--amber)', marginBottom: '6px' }}>
                  <span>Payment Screenshot / Receipt Proof</span>
                  {receiptUrl && (
                    <span style={{ color: 'var(--green)', fontSize: '11px', fontWeight: 600 }}>
                      ✓ Screenshot Attached
                    </span>
                  )}
                </label>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  onChange={handleFileSelected}
                  style={{ display: 'none' }}
                />

                {receiptUrl ? (
                  <div
                    style={{
                      background: 'var(--bg3)',
                      border: '1px solid rgba(0, 229, 160, 0.4)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textDecoration: 'none',
                        color: 'inherit',
                        flex: 1,
                        minWidth: 0,
                      }}
                      title="Click to view full screenshot in new tab"
                    >
                      <img
                        src={receiptUrl}
                        alt="Payment screenshot"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Payment Screenshot Attached
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--blue)' }}>
                          Click to preview ↗
                        </div>
                      </div>
                    </a>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingReceipt}
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11px' }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptUrl('')}
                        disabled={isUploadingReceipt}
                        style={{
                          background: 'rgba(255, 111, 142, 0.15)',
                          border: '1px solid rgba(255, 111, 142, 0.35)',
                          color: 'var(--red)',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
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
                      border: '1px dashed var(--border-strong)',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      cursor: isUploadingReceipt ? 'wait' : 'pointer',
                      background: 'var(--bg3)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--green)';
                      e.currentTarget.style.background = 'rgba(0, 229, 160, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-strong)';
                      e.currentTarget.style.background = 'var(--bg3)';
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                      {isUploadingReceipt ? '⏳' : '📎'}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                      {isUploadingReceipt ? 'Compressing & uploading...' : 'Upload Payment Screenshot'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      Supports PNG, JPG, WebP, PDF (auto-optimized)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div
            style={{
              padding: '16px 24px',
              background: 'var(--bg3)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{
                padding: '8px 22px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {saving ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Record Payment'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
