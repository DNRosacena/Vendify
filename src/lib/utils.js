export function generateReferenceCode() {
  const prefix = 'VT';
  const date   = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
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