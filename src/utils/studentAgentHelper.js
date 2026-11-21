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

  // 3. Fallback heuristics for known students if not set
  const lowerName = (student.name || '').toLowerCase();
  if (!meta.b2b_agent_name) {
    if (lowerName.includes('thejus') || lowerName.includes('nivil')) {
      meta.b2b_agent_name = 'Consult Fox';
      meta.b2b_committed = meta.b2b_committed || 180000;
    } else if (lowerName.includes('abhijith')) {
      meta.b2b_agent_name = 'VFS & Insurance';
      meta.b2b_committed = meta.b2b_committed || 20780;
    } else if (lowerName.includes('liza')) {
      meta.b2b_agent_name = 'Rashin Team';
      meta.b2b_committed = meta.b2b_committed || 20000;
    } else if (lowerName.includes('vivek') || lowerName.includes('hanock')) {
      meta.b2b_agent_name = 'Future Factory';
      meta.b2b_committed = meta.b2b_committed || 42000; // ~500 USD
    } else if (lowerName.includes('annalise') || lowerName.includes('megha')) {
      meta.b2b_agent_name = 'Future Factory';
      meta.b2b_committed = meta.b2b_committed || 42000;
    } else if (lowerName.includes('annlin')) {
      meta.b2b_agent_name = 'Empire - Lithuania';
      meta.b2b_committed = meta.b2b_committed || 90000; // ~1000 EUR
    } else if (lowerName.includes('gayathri') || lowerName.includes('achsah') || lowerName.includes('anna biju')) {
      meta.b2b_agent_name = 'Abroad Angel Poland';
      meta.b2b_committed = meta.b2b_committed || 70800;
    } else if (lowerName.includes('esabella')) {
      meta.b2b_agent_name = 'Medwizard';
      meta.b2b_committed = meta.b2b_committed || 24000;
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
  } catch (e) {
    console.error('Failed to save student agent meta to localStorage', e);
  }

  // 2. Clean notes of old meta tag and append new meta tag
  const rawNotes = typeof existingNotes === 'string' ? existingNotes : '';
  const cleanNotes = rawNotes.replace(/<!--AGENT_META:\{.*?\}-->/g, '').trim();
  const metaTag = `<!--AGENT_META:${JSON.stringify(cleanMeta)}-->`;

  return cleanNotes ? `${cleanNotes}\n${metaTag}` : metaTag;
}

/**
 * Strip metadata tags from notes for clean human display
 */
export function getCleanNotes(notes) {
  if (!notes || typeof notes !== 'string') return '';
  return notes.replace(/<!--AGENT_META:\{.*?\}-->/g, '').trim();
}
