import supabase from '../supabase';

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Keeps file size under ~120KB while maintaining crisp readability of text and amounts.
 * 
 * @param {File} file 
 * @param {number} maxDimension 
 * @param {number} quality 
 * @returns {Promise<{ blob: Blob, dataUrl: string }>}
 */
export function compressImage(file, maxDimension = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    // If not an image (e.g. PDF), read as Data URL directly
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ blob: file, dataUrl: reader.result });
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            resolve({ blob: blob || file, dataUrl });
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads payment proof screenshot.
 * Tries Supabase Storage bucket 'payment-receipts' first.
 * If bucket doesn't exist or permissions fail, falls back gracefully to compressed Data URL.
 * 
 * @param {File} file 
 * @param {{ studentId?: string, slot?: number }} metadata 
 * @returns {Promise<string>} The accessible URL or Data URL
 */
export async function uploadPaymentProof(file, metadata = {}) {
  const { studentId = 'student', slot = 1 } = metadata;

  // 1. Compress image
  const { blob, dataUrl } = await compressImage(file);

  // 2. Try Supabase Storage
  try {
    const cleanId = String(studentId).replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `${cleanId}_slot_${slot}_${Date.now()}.jpg`;
    const filePath = `receipts/${fileName}`;

    const { data, error } = await supabase.storage
      .from('payment-receipts')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (storageErr) {
    console.warn('Supabase storage upload skipped or bucket missing, using compressed Data URL fallback:', storageErr);
  }

  // 3. Fallback to compressed Data URL (always works without external bucket config)
  return dataUrl;
}

/**
 * Extracts receipt URL from payment object.
 * Checks payment.receipt_url, notes tag [RECEIPT_URL:...], or reference_no.
 * 
 * @param {Object} payment 
 * @returns {string|null}
 */
export function extractReceiptUrl(payment) {
  if (!payment) return null;

  if (payment.receipt_url && typeof payment.receipt_url === 'string' && payment.receipt_url.trim()) {
    return payment.receipt_url.trim();
  }

  if (payment.notes && typeof payment.notes === 'string') {
    const match = payment.notes.match(/\[RECEIPT_URL:\s*(.*?)\]/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  if (payment.reference_no && typeof payment.reference_no === 'string') {
    if (payment.reference_no.startsWith('http://') || 
        payment.reference_no.startsWith('https://') || 
        payment.reference_no.startsWith('data:image/')) {
      return payment.reference_no.trim();
    }
  }

  return null;
}

/**
 * Safely extracts payment type from payment record, checking notes [Type: ...] tag as fallback.
 * 
 * @param {Object} payment 
 * @returns {string}
 */
export function extractPaymentType(payment) {
  if (!payment) return 'Normal';
  if (payment.payment_type && payment.payment_type !== 'standard' && payment.payment_type !== 'Bank Transfer') {
    return payment.payment_type;
  }
  if (payment.notes && typeof payment.notes === 'string') {
    const match = payment.notes.match(/\[Type:\s*([^\]]+)\]/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return payment.payment_type || 'Normal';
}

/**
 * Embeds or removes [RECEIPT_URL:...] tag inside a notes string.
 * 
 * @param {string} notes 
 * @param {string|null} receiptUrl 
 * @returns {string}
 */
export function embedReceiptIntoNotes(notes = '', receiptUrl = null) {
  const clean = (notes || '').replace(/\[RECEIPT_URL:\s*.*?\]/g, '').trim();
  if (!receiptUrl) return clean;
  return clean ? `${clean}\n[RECEIPT_URL:${receiptUrl}]` : `[RECEIPT_URL:${receiptUrl}]`;
}
