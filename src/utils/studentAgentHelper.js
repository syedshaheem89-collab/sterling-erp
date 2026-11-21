/**
 * studentAgentHelper.js
 * Helpers for linking external B2B sub-agents, Apostille agencies,
 * and Insurance partners to student applications.
 */

export const KNOWN_B2B_PARTNERS = [
  'Consult Fox',
  'Future Factory',
  'Rashin Team',
  'Empire - Lithuania',
  'Abroad Angel Poland',
  'Medwizard',
  'EduGlobal Services',
];

export const KNOWN_APOSTILLE_AGENTS = [
  'Comfort Travel',
  'MEA Legalization Desk',
  'Apex Attestation Services',
  'Global Apostille Hub',
];

export const KNOWN_INSURANCE_AGENTS = [
  'VFS & Insurance',
  'Care Health Overseas Student',
  'Tata AIG Student Guard',
  'Star Health & Allied',
  'Bajaj Allianz Global Care',
];

const DEFAULT_META = {
  b2b_agent_name: '',
  b2b_committed: 0,
  b2b_paid: 0,
  apostille_agent: '',
  apostille_committed: 0,
  apostille_paid: 0,
  insurance_agent: '',
  insurance_committed: 0,
  insurance_paid: 0,
};

/**
 * Retrieve linked agent metadata for a student
 */
export function getStudentAgentMeta(student) {
  if (!student) return { ...DEFAULT_META };

  let meta = { ...DEFAULT_META };

  // 1. Try localStorage
  try {
    const saved = localStorage.getItem('sterling_student_agent_meta');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (student.id && parsed[student.id]) {
        meta = { ...meta, ...parsed[student.id] };
      } else if (student.name && parsed[student.name.trim().toLowerCase()]) {
        meta = { ...meta, ...parsed[student.name.trim().toLowerCase()] };
      }
    }
  } catch (e) {
    console.warn('Error reading student agent meta from localStorage', e);
  }

  // 2. Try embedded metadata in student notes
  if (student.notes && typeof student.notes === 'string') {
    const match = student.notes.match(/<!--AGENT_META:(\{.*?\})-->/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        meta = { ...meta, ...parsed };
      } catch (e) {}
    }
  }

  // Ensure numeric fields
  meta.b2b_committed = Number(meta.b2b_committed || 0);
  meta.b2b_paid = Number(meta.b2b_paid || 0);
  meta.apostille_committed = Number(meta.apostille_committed || 0);
  meta.apostille_paid = Number(meta.apostille_paid || 0);
  meta.insurance_committed = Number(meta.insurance_committed || 0);
  meta.insurance_paid = Number(meta.insurance_paid || 0);

  // Compute remaining dues
  meta.b2b_remaining = Math.max(0, meta.b2b_committed - meta.b2b_paid);
  meta.apostille_remaining = Math.max(0, meta.apostille_committed - meta.apostille_paid);
  meta.insurance_remaining = Math.max(0, meta.insurance_committed - meta.insurance_paid);
  meta.total_external_dues = meta.b2b_remaining + meta.apostille_remaining + meta.insurance_remaining;

  return meta;
}

/**
 * Save agent metadata for a student into localStorage and format updated notes
 */
export function saveStudentAgentMeta(studentId, studentName, meta, existingNotes = '') {
  const cleanMeta = {
    b2b_agent_name: meta.b2b_agent_name?.trim() || '',
    b2b_committed: Number(meta.b2b_committed || 0),
    b2b_paid: Number(meta.b2b_paid || 0),
    apostille_agent: meta.apostille_agent?.trim() || '',
    apostille_committed: Number(meta.apostille_committed || 0),
    apostille_paid: Number(meta.apostille_paid || 0),
    insurance_agent: meta.insurance_agent?.trim() || '',
    insurance_committed: Number(meta.insurance_committed || 0),
    insurance_paid: Number(meta.insurance_paid || 0),
  };

  // 1. Save to localStorage
  try {
    const saved = localStorage.getItem('sterling_student_agent_meta') || '{}';
    const parsed = JSON.parse(saved);
    if (studentId) parsed[studentId] = cleanMeta;
    if (studentName) parsed[studentName.trim().toLowerCase()] = cleanMeta;
    localStorage.setItem('sterling_student_agent_meta', JSON.stringify(parsed));

    // Clear deleted suppression for this student on explicit user save
    const deletedKeys = JSON.parse(localStorage.getItem('sterling_b2b_deleted_keys') || '[]');
    const sId = studentId ? String(studentId).toLowerCase() : '';
    const sName = studentName ? studentName.trim().toLowerCase() : '';
    const filtered = deletedKeys.filter((k) => {
      const lower = k.toLowerCase();
      if (sId && lower.includes(sId)) return false;
      if (sName && lower.includes(sName)) return false;
      return true;
    });
    localStorage.setItem('sterling_b2b_deleted_keys', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save student agent meta to localStorage', e);
  }

  // 2. Automatically sync partner liabilities to B2B Payments (Pending)
  try {
    syncStudentPartnerToB2BPayments(studentId, studentName, cleanMeta);
  } catch (e) {
    console.error('Failed to sync to B2B payments in saveStudentAgentMeta', e);
  }

  // 3. Clean notes of old meta tag and append new meta tag
  const rawNotes = typeof existingNotes === 'string' ? existingNotes : '';
  const cleanNotes = rawNotes.replace(/<!--AGENT_META:\{.*?\}-->/g, '').trim();
  const metaTag = `<!--AGENT_META:${JSON.stringify(cleanMeta)}-->`;

  return cleanNotes ? `${cleanNotes}\n${metaTag}` : metaTag;
}

/**
 * Synchronize student partner dues (B2B Sub-Agent, Apostille, Insurance)
 * directly to the B2B Payments section under Pending.
 */
export function syncStudentPartnerToB2BPayments(studentId, studentName, meta) {
  if (!studentName && !studentId) return;

  try {
    let payments = [];
    const saved = localStorage.getItem('sterling_b2b_payments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) payments = parsed;
      } catch (e) {}
    }

    // Partner directory for auto-resolving transfer account
    let partnerAccounts = {};
    try {
      const savedAccounts = localStorage.getItem('sterling_b2b_partner_accounts');
      if (savedAccounts) {
        partnerAccounts = JSON.parse(savedAccounts) || {};
      }
    } catch (e) {}

    const getPartnerAccount = (partnerName) => {
      if (!partnerName) return { details: 'Not provided', id: '' };
      const clean = partnerName.trim().toLowerCase();
      const matchKey = Object.keys(partnerAccounts).find((k) => k.toLowerCase() === clean);
      const accList = matchKey ? partnerAccounts[matchKey] : [];
      if (accList && accList.length > 0) {
        const def = accList.find((a) => a.is_default) || accList[0];
        return {
          details: def.details_string || `${def.bank_name} A/C: ${def.account_number} | IFSC: ${def.ifsc || ''} | Beneficiary: ${def.beneficiary_name}`,
          id: def.id || '',
        };
      }
      return { details: 'Not provided (Configure in B2B)', id: '' };
    };

    const partnersToSync = [
      {
        type: 'b2b',
        partner: meta.b2b_agent_name?.trim(),
        committed: Number(meta.b2b_committed || 0),
        paid: Number(meta.b2b_paid || 0),
        category: 'Sub-Agent Commission',
      },
      {
        type: 'apostille',
        partner: meta.apostille_agent?.trim(),
        committed: Number(meta.apostille_committed || 0),
        paid: Number(meta.apostille_paid || 0),
        category: 'Apostille Charges',
      },
      {
        type: 'insurance',
        partner: meta.insurance_agent?.trim(),
        committed: Number(meta.insurance_committed || 0),
        paid: Number(meta.insurance_paid || 0),
        category: 'VFS & Insurance',
      },
    ];

    // Check if the user previously deleted/dismissed this payment
    let deletedKeys = [];
    try {
      deletedKeys = JSON.parse(localStorage.getItem('sterling_b2b_deleted_keys') || '[]');
    } catch (e) {}

    const isDeleted = (type, partner) => {
      const k1 = studentId ? `${studentId}_${type}`.toLowerCase() : null;
      const k2 = studentName ? `${studentName.trim().toLowerCase()}_${type}` : null;
      const k3 = studentName && partner ? `${studentName.trim().toLowerCase()}_${partner.toLowerCase()}` : null;
      return (
        (k1 && deletedKeys.includes(k1)) ||
        (k2 && deletedKeys.includes(k2)) ||
        (k3 && deletedKeys.includes(k3))
      );
    };

    let hasChanges = false;

    partnersToSync.forEach(({ type, partner, committed, paid, category }) => {
      if (!partner || committed <= 0) return;

      const remainingDue = Math.max(0, committed - paid);

      // Check if payment already exists for this student & partner type
      const existingIdx = payments.findIndex((p) => {
        const matchesStudent =
          (studentId && p.student_id === studentId) ||
          (p.student_names && p.student_names.toLowerCase().includes(studentName.toLowerCase()));

        const matchesPartner =
          p.partner_type === type ||
          (p.category === category && p.partner_name?.toLowerCase() === partner.toLowerCase()) ||
          p.partner_name?.toLowerCase() === partner.toLowerCase();

        return matchesStudent && matchesPartner;
      });

      const accInfo = getPartnerAccount(partner);

      if (existingIdx >= 0) {
        // Update existing record
        const cur = payments[existingIdx];
        const newStatus = remainingDue === 0 && paid >= committed ? 'completed' : 'pending';
        payments[existingIdx] = {
          ...cur,
          student_id: studentId || cur.student_id,
          student_names: cur.student_names || studentName,
          partner_name: partner,
          partner_type: type,
          amount: remainingDue > 0 ? remainingDue : (cur.amount || committed),
          category: category,
          status: newStatus,
          transfer_account: cur.transfer_account && cur.transfer_account !== 'Not provided' ? cur.transfer_account : accInfo.details,
          selected_account_id: cur.selected_account_id || accInfo.id,
          notes: cur.notes || `${category} for student ${studentName}`,
        };
        hasChanges = true;
      } else if (remainingDue > 0 && !isDeleted(type, partner)) {
        // Insert new pending payment voucher
        const newPayment = {
          id: `b2b-auto-${Date.now()}-${type}-${Math.random().toString(36).substring(2, 6)}`,
          student_id: studentId,
          student_names: studentName,
          partner_type: type,
          partner_name: partner,
          transfer_account: accInfo.details,
          selected_account_id: accInfo.id,
          amount: remainingDue,
          currency: 'INR',
          has_gst: false,
          category: category,
          due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          priority: false,
          status: 'pending',
          notes: `${category} committed for student ${studentName}`,
          created_at: new Date().toISOString(),
          settled_at: null,
          payment_mode: null,
          utr_number: null,
        };
        payments.unshift(newPayment);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      localStorage.setItem('sterling_b2b_payments', JSON.stringify(payments));
      window.dispatchEvent(new CustomEvent('sterling_b2b_payments_updated'));
    }
  } catch (err) {
    console.error('Failed to sync student partners to B2B payments', err);
  }
}

/**
 * Reconcile and synchronize all students in the database with B2B payments.
 * Deliberate no-op to prevent deleted items from being resurrected on mount.
 */
export function syncAllStudentsToB2BPayments() {
  // Sync occurs on explicit save of a student application
}

/**
 * Strip metadata tags from notes for clean human display
 */
export function getCleanNotes(notes) {
  if (!notes || typeof notes !== 'string') return '';
  return notes.replace(/<!--AGENT_META:\{.*?\}-->/g, '').trim();
}
