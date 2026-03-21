export function generateReferenceCode(productName = '') {
  const words  = productName.trim().split(/\s+/).filter(Boolean);
  const prefix = words.slice(0, 3).map(w => w[0].toUpperCase()).join('') || 'ORD';
  const num4   = String(Math.floor(Math.random() * 9000) + 1000);
  const alpha  = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  return `${prefix}-${num4}-${alpha}`;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
}

export function statusLabel(status) {
  const map = {
    pending:         { en: 'Pending',          fil: 'Naghihintay' },
    confirmed:       { en: 'Confirmed',         fil: 'Nakumpirma' },
    in_production:   { en: 'In Production',     fil: 'Ginagawa' },
    out_for_delivery:{ en: 'Out for Delivery',  fil: 'Naihatid Na' },
    delivered:       { en: 'Delivered',         fil: 'Naihatid' },
    cancelled:       { en: 'Cancelled',         fil: 'Kinansela' },
  };
  return map[status] || { en: status, fil: status };
}

export function statusClass(status) {
  const map = {
    pending:          'status-pending',
    confirmed:        'status-confirmed',
    in_production:    'status-production',
    out_for_delivery: 'status-delivery',
    delivered:        'status-delivered',
    cancelled:        'status-cancelled',
  };
  return map[status] || 'status-pending';
}