import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

/**
 * GoogleSheetImporterModal - 2026 Executive Importer
 * 
 * Specifically calibrated to parse the user's "Europe Sterling" Master Google Sheet:
 * - Student Full Name, Mobile, Email, Counselor, Team Lead, Lead Source
 * - Target Country, University, Course, Intake, Enroll Status
 * - All 5 Installment payment slots: (Account, Amount, Paid Date)
 * - Refund, Visa Charge / Total Committed Fee, B2B, Incentives, Commission, Profit
 */
export default function GoogleSheetImporterModal({ isOpen, onClose, onImportSuccess }) {
  const { user, profile, companyId } = useAuth();
  const fileInputRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file) => {
    setFileName(file.name);
    setAnalyzing(true);
    const toastId = toast.loading('Reading & analyzing spreadsheet...');

    try {
      const arrayBuf = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuf, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rows || rows.length < 2) {
        throw new Error('Spreadsheet appears to be empty or has no data rows.');
      }

      // Locate header row
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(8, rows.length); i++) {
        const rowStr = rows[i].map(c => String(c).toLowerCase()).join(' ');
        if (
          rowStr.includes('student') || 
          rowStr.includes('name') || 
          rowStr.includes('counselor') ||
          rowStr.includes('timestamp')
        ) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rows[headerRowIndex].map(h => String(h || '').trim());
      const dataRows = rows.slice(headerRowIndex + 1);

      // Helper to find column index by matching aliases
      const findCol = (aliases, fallbackIdx = -1) => {
        const lowerAliases = aliases.map(a => a.toLowerCase().trim());
        const found = headers.findIndex(h => {
          const lh = h.toLowerCase().trim();
          return lowerAliases.some(alias => lh === alias || lh.includes(alias));
        });
        return found !== -1 ? found : fallbackIdx;
      };

      // Header alias mapping matching Europe Sterling Google Sheet
      const colName = findCol(['student full name', 'full name', 'student name', 'student'], 2);
      const colEmail = findCol(['email address', 'email', 'e-mail'], 1);
      const colMobile = findCol(['phone number', 'mobile number', 'mobile', 'phone'], 3);
      const colCounselor = findCol(['counselor'], 4);
      const colTeamLead = findCol(['han team lead', 'team lead', 'team_lead', 'tl'], 5);
      const colLeadSource = findCol(['lead source', 'lead_source', 'source'], 6);
      const colUniversity = findCol(['university'], 7);
      const colCourse = findCol(['course', 'course name'], 8);
      const colCountry = findCol(['country'], 9);
      const colIntake = findCol(['intake'], 10);
      const colStage = findCol(['payment stage', 'stage', 'pay stage'], 11);

      // Installment slots 1 through 5
      const colBnk1 = findCol(['stk account', '1st acc', '1st bank', 'bnk1', 'bank 1'], 12);
      const colAmt1 = findCol(['amount', '1st amount', 'amt1', 'amount 1'], 13);
      const colDt1  = findCol(['paid date-1', 'paid date 1', 'dt1', 'date 1'], 14);

      const colBnk2 = findCol(['stk account', '2nd acc', '2nd bank', 'bnk2', 'bank 2'], 15);
      const colAmt2 = findCol(['second installment', '2nd installment', 'amt2', 'amount 2'], 16);
      const colDt2  = findCol(['paid date-2', 'paid date 2', 'dt2', 'date 2'], 17);

      const colBnk3 = findCol(['stk account', '3rd acc', '3rd bank', 'bnk3', 'bank 3'], 18);
      const colAmt3 = findCol(['3rd instalment', '3rd installment', 'amt3', 'amount 3'], 19);
      const colDt3  = findCol(['paid date-3', 'paid date 3', 'dt3', 'date 3'], 20);

      const colBnk4 = findCol(['stk account', '4th acc', '4th bank', 'bnk4', 'bank 4'], 21);
      const colAmt4 = findCol(['fourth instalment', 'fourth installment', 'amt4', 'amount 4'], 22);
      const colDt4  = findCol(['paid date-4', 'paid date 4', 'dt4', 'date 4'], 23);

      const colBnk5 = findCol(['stk account', '5th acc', '5th bank', 'bnk5', 'bank 5'], 24);
      const colAmt5 = findCol(['5th instalment', '5th installment', 'amt5', 'amount 5'], 25);
      const colDt5  = findCol(['paid date-5', 'paid date 5', 'dt5', 'date 5'], 26);

      const colRefund = findCol(['refund'], 27);
      const colCommitted = findCol(['visa charge', 'total service charge', 'committed', 'service charge', 'total committed'], 29);
      const colStatus = findCol(['active/dropped', 'active / dropped', 'enroll_status', 'status'], 31);
      const colB2B = findCol(['b2b charge', 'b2b'], 32);
      const colIncStudent = findCol(['incentive from st', 'incentive from student', 'anna incentive student'], 33);
      const colIncCompany = findCol(['incentive from co', 'incentive from sterling', 'anna incentive sterling'], 34);
      const colCommission = findCol(['commission'], 35);
      const colOtherExpense = findCol(['expense(other)', 'other expenses', 'other expense'], 36);

      const numVal = (v) => {
        if (!v) return 0;
        const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
        return isNaN(n) ? 0 : n;
      };

      const dateVal = (v) => {
        if (!v) return null;
        if (v instanceof Date && !isNaN(v)) return v.toISOString().split('T')[0];
        const parsed = new Date(v);
        if (!isNaN(parsed)) return parsed.toISOString().split('T')[0];
        return null;
      };

      const parseStatus = (v) => {
        const s = String(v || '').trim().toLowerCase();
        if (s.includes('drop')) return 'Dropped';
        if (s.includes('refund')) return 'Refund';
        if (s.includes('enroll')) return 'Enrolled';
        return 'Active';
      };

      const parsedList = [];

      dataRows.forEach((row, idx) => {
        const rawName = String(row[colName] || '').trim();
        if (!rawName || rawName.toLowerCase() === 'student full name') return;

        const email = String(row[colEmail] || '').trim();
        const mobile = String(row[colMobile] || '').trim();
        const counselor = String(row[colCounselor] || '').trim();
        const teamLead = String(row[colTeamLead] || '').trim();
        const leadSource = String(row[colLeadSource] || '').trim() || 'Digital Marketing';
        const university = String(row[colUniversity] || '').trim();
        const course = String(row[colCourse] || '').trim();
        const country = String(row[colCountry] || '').trim() || 'Germany';
        const intake = String(row[colIntake] || '').trim() || 'Sept 2025';
        const paymentStage = String(row[colStage] || '').trim() || 'Pending';
        const enrollStatus = parseStatus(row[colStatus]);

        const refund = numVal(row[colRefund]);
        const committedFee = numVal(row[colCommitted]) || 200000;
        const b2bCharge = numVal(row[colB2B]);
        const incentiveStudent = numVal(row[colIncStudent]);
        const incentiveCompany = numVal(row[colIncCompany]);
        const commission = numVal(row[colCommission]);
        const otherExpense = numVal(row[colOtherExpense]);

        // Installment items
        const rawPayments = [
          { slot: 1, bank: String(row[colBnk1] || '').trim(), amount: numVal(row[colAmt1]), date: dateVal(row[colDt1]) },
          { slot: 2, bank: String(row[colBnk2] || '').trim(), amount: numVal(row[colAmt2]), date: dateVal(row[colDt2]) },
          { slot: 3, bank: String(row[colBnk3] || '').trim(), amount: numVal(row[colAmt3]), date: dateVal(row[colDt3]) },
          { slot: 4, bank: String(row[colBnk4] || '').trim(), amount: numVal(row[colAmt4]), date: dateVal(row[colDt4]) },
          { slot: 5, bank: String(row[colBnk5] || '').trim(), amount: numVal(row[colAmt5]), date: dateVal(row[colDt5]) },
        ];

        const validPayments = rawPayments.filter(p => p.amount > 0);
        const collectedSum = validPayments.reduce((acc, p) => acc + p.amount, 0);

        parsedList.push({
          rowId: idx + 1,
          name: rawName,
          email,
          mobile,
          counselor_name: counselor,
          team_lead: teamLead,
          lead_source: leadSource,
          university,
          course,
          country,
          intake,
          payment_stage: paymentStage,
          enroll_status: enrollStatus,
          committed_fee: committedFee,
          collected: collectedSum,
          refund,
          b2b_charge: b2bCharge,
          partner_incentive_student: incentiveStudent,
          partner_incentive_company: incentiveCompany,
          commission,
          other_expense: otherExpense,
          payments: validPayments,
        });
      });

      setParsedRows(parsedList);
      toast.success(`Found ${parsedList.length} valid student rows in spreadsheet!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error parsing spreadsheet file', { id: toastId });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    setProgress({ current: 0, total: parsedRows.length });
    const toastId = toast.loading(`Importing ${parsedRows.length} student profiles into ERP...`);

    try {
      // 1. Resolve target company id
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        const { data: memberData } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (memberData?.company_id) {
          targetCompanyId = memberData.company_id;
        } else {
          const { data: firstCo } = await supabase.from('companies').select('id').limit(1).single();
          targetCompanyId = firstCo?.id;
        }
      }

      if (!targetCompanyId) {
        throw new Error('No company workspace found. Please make sure a company exists.');
      }

      let importedStudentsCount = 0;
      let importedPaymentsCount = 0;

      // Insert in chunks of 20 to prevent timeouts
      const CHUNK_SIZE = 20;
      for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
        const chunk = parsedRows.slice(i, i + CHUNK_SIZE);

        const studentsToInsert = chunk.map(s => ({
          company_id: targetCompanyId,
          name: s.name,
          email: s.email || null,
          mobile: s.mobile || null,
          counselor_name: s.counselor_name || null,
          team_lead: s.team_lead || null,
          lead_source: s.lead_source || 'Digital Marketing',
          university: s.university || null,
          course: s.course || null,
          country: s.country || 'Germany',
          intake: s.intake || 'Sept 2025',
          payment_stage: s.payment_stage || 'Pending',
          enroll_status: s.enroll_status || 'Active',
          committed_fee: s.committed_fee,
          refund: s.refund,
          b2b_charge: s.b2b_charge,
          partner_incentive_student: s.partner_incentive_student,
          partner_incentive_company: s.partner_incentive_company,
          commission: s.commission,
          other_expense: s.other_expense,
          created_by: user?.id || null,
          last_activity: new Date().toISOString(),
        }));

        const { data: insertedStudents, error: insertErr } = await supabase
          .from('students')
          .insert(studentsToInsert)
          .select('id, name');

        if (insertErr) throw insertErr;

        // Associate payments
        const paymentsToInsert = [];
        insertedStudents.forEach((st, sIdx) => {
          const original = chunk[sIdx];
          if (original && original.payments?.length > 0) {
            original.payments.forEach(p => {
              paymentsToInsert.push({
                company_id: targetCompanyId,
                student_id: st.id,
                installment_slot: p.slot,
                bank_name: p.bank || 'Primary Bank',
                amount: p.amount,
                paid_date: p.date || new Date().toISOString().split('T')[0],
                notes: `Imported from ${fileName || 'Master Sheet'}`,
                created_by: user?.id || null,
              });
            });
          }
        });

        if (paymentsToInsert.length > 0) {
          const { error: payErr } = await supabase.from('payments').insert(paymentsToInsert);
          if (payErr) console.warn('Payment insert warning:', payErr);
          else importedPaymentsCount += paymentsToInsert.length;
        }

        importedStudentsCount += chunk.length;
        setProgress({ current: importedStudentsCount, total: parsedRows.length });
      }

      toast.success(
        `🎉 Successfully imported ${importedStudentsCount} students and ${importedPaymentsCount} installments!`,
        { id: toastId, duration: 6000 }
      );

      // Trigger global refresh event
      window.dispatchEvent(new CustomEvent('sterling:refresh'));

      if (onImportSuccess) onImportSuccess();
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      toast.error(err.message || 'Failed to complete import', { id: toastId, duration: 7000 });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 6, 14, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          background: 'linear-gradient(135deg, rgba(22, 27, 46, 0.95) 0%, rgba(12, 16, 30, 0.98) 100%)',
          border: '1px solid var(--border-strong)',
          borderRadius: '24px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.7), 0 0 40px rgba(124, 111, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(124, 111, 255, 0.1) 0%, rgba(0, 229, 160, 0.05) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #7C6FFF 0%, #36D1DC 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 4px 18px rgba(124, 111, 255, 0.4)',
              }}
            >
              📥
            </div>
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Import Europe Sterling Master Sheet
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '3px 0 0' }}>
                Seamless 1-click import of students, counselors, universities, and all 5 installment payments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={importing}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* File Upload Zone */}
          {parsedRows.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border-strong)'}`,
                borderRadius: '18px',
                padding: '48px 24px',
                textAlign: 'center',
                background: dragOver ? 'rgba(124, 111, 255, 0.08)' : 'rgba(17, 22, 35, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />

              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'rgba(0, 229, 160, 0.12)',
                  color: 'var(--green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '30px',
                }}
              >
                📊
              </div>

              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Click to choose file or drag & drop your spreadsheet here
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>
                  Supports <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> downloaded from your Google Sheet
                </p>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  background: 'var(--bg3)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  color: 'var(--blue)',
                  fontWeight: 600,
                  marginTop: '8px',
                }}
              >
                <span>✓ Auto-detects all 5 Installments</span>
                <span>•</span>
                <span>✓ Auto-links Counselors</span>
                <span>•</span>
                <span>✓ Computes Net Profit</span>
              </div>
            </div>
          ) : (
            <div>
              {/* File details banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'rgba(0, 229, 160, 0.1)',
                  border: '1px solid rgba(0, 229, 160, 0.25)',
                  borderRadius: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📑</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{fileName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--green)' }}>
                      Ready to import <strong>{parsedRows.length}</strong> students
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setParsedRows([]);
                    setFileName('');
                  }}
                  disabled={importing}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Choose Different File
                </button>
              </div>

              {/* Preview Table */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg3)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 14px' }}>#</th>
                      <th style={{ padding: '10px 14px' }}>Student Name</th>
                      <th style={{ padding: '10px 14px' }}>Destination</th>
                      <th style={{ padding: '10px 14px' }}>Counselor</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Collected</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Payments</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 15).map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{s.country}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{s.counselor_name || 'Unassigned'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>
                          ₹{s.collected.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', color: 'var(--cyan)' }}>
                            {s.payments.length} slots
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: s.enroll_status === 'Active' ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 111, 142, 0.15)',
                              color: s.enroll_status === 'Active' ? 'var(--green)' : 'var(--red)',
                            }}
                          >
                            {s.enroll_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 15 && (
                <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '8px' }}>
                  + and {parsedRows.length - 15} more students ready to import
                </p>
              )}

              {/* Import Progress Bar */}
              {importing && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>Syncing with Database...</span>
                    <span style={{ color: 'var(--cyan)' }}>
                      {progress.current} of {progress.total} students ({Math.round((progress.current / progress.total) * 100)}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round((progress.current / progress.total) * 100)}%`,
                        background: 'linear-gradient(90deg, #7C6FFF 0%, #00E5A0 100%)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guidance note */}
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(124, 111, 255, 0.08)',
              border: '1px solid rgba(124, 111, 255, 0.2)',
              borderRadius: '12px',
              fontSize: '12px',
              color: 'var(--muted)',
              lineHeight: 1.6,
            }}
          >
            💡 <strong style={{ color: 'var(--text)' }}>Tip:</strong> To get this file from Google Sheets, open your sheet, click{' '}
            <strong style={{ color: 'var(--text)' }}>File &rarr; Download &rarr; Microsoft Excel (.xlsx)</strong> or{' '}
            <strong style={{ color: 'var(--text)' }}>Comma Separated Values (.csv)</strong>, then drop it into this box!
          </div>

        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '20px 28px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            disabled={importing}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          {parsedRows.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={importing}
              style={{
                padding: '10px 26px',
                background: 'linear-gradient(135deg, #00E5A0 0%, #00B37E 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#080A12',
                fontSize: '13px',
                fontWeight: 700,
                cursor: importing ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 229, 160, 0.35)',
                opacity: importing ? 0.7 : 1,
              }}
            >
              <span>{importing ? `Importing (${progress.current}/${progress.total})...` : `Confirm & Import ${parsedRows.length} Students`}</span>
              {!importing && <span>🚀</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
