import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const SUPPORT_EMAIL    = 'support@vendify.ph';
export const WEBSITE          = 'vendify.ph';
export const WARRANTY_DEFAULT = '1 Year Limited Warranty';

// 1/8 A4 = A7 = 105 × 74 mm (landscape)
// With 3 mm margins → usable: 99 × 68 mm
// At 96 ppi: 1 mm = 3.7795 px → 99 mm ≈ 374 px, 68 mm ≈ 257 px
export const W     = 374;
export const H     = 257;
const SCALE = 1.72; // preview scale: renders at ~643 × 442 px in the modal

export default function WaybillModal({ order, onClose }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!order.product_id) { setLoading(false); return; }
    supabase
      .from('products')
      .select('name, category, warranty, specs, features')
      .eq('id', order.product_id)
      .maybeSingle()
      .then(({ data }) => { setProduct(data); setLoading(false); });
  }, [order.product_id]);

  const orderDate = new Date(order.created_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
  });

  const warrantyPeriod =
    product?.warranty ||
    product?.specs?.warranty ||
    product?.specs?.Warranty ||
    WARRANTY_DEFAULT;

  const warrantyNumber = `${order.reference_code}-WR`;

  const qrPayload = JSON.stringify({
    ref:      order.reference_code,
    product:  order.product_name,
    mfg:      new Date(order.created_at).toISOString().slice(0, 10),
    warranty: warrantyPeriod,
    customer: order.customer_name,
    support:  SUPPORT_EMAIL,
    website:  WEBSITE,
  });

  // window.print() works on desktop AND mobile (AirPrint / Mopria).
  // The portal + @media print CSS hides everything else during print.
  const handlePrint = () => window.print();

  const previewW = Math.round(W * SCALE);
  const previewH = Math.round(H * SCALE);

  const waybill = (
    <WaybillCard
      order={order}
      product={product}
      orderDate={orderDate}
      warrantyPeriod={warrantyPeriod}
      warrantyNumber={warrantyNumber}
      qrPayload={qrPayload}
    />
  );

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(17,7,24,0.72)',
          backdropFilter: 'blur(4px)',
          zIndex: 400,
        }}
      />

      {/* ── Modal ── */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 401,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '12px',
      }}>

        {/* Action bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: previewW + 'px',
        }}>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
              Waybill Preview
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '2px 0 0' }}>
              1/8 A4 (A7) · 105 × 74 mm · {order.reference_code}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrint}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 20px',
                background: loading
                  ? 'rgba(166,113,228,0.25)'
                  : 'linear-gradient(135deg,#a671e4,#fe78e3)',
                border: 'none', borderRadius: '9px',
                color: loading ? 'rgba(255,255,255,0.4)' : 'white',
                fontWeight: 700, fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Printer size={15} />
              {loading ? 'Loading…' : 'Print Waybill'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none',
                borderRadius: '9px', padding: '9px 10px',
                cursor: 'pointer', display: 'flex', color: 'white',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scaled preview — the transform enlarges the 374×257 px waybill for readability */}
        <div style={{ width: previewW + 'px', height: previewH + 'px', position: 'relative', flexShrink: 0 }}>
          <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
            {waybill}
          </div>
        </div>

        {/* Hint */}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', margin: 0, paddingBottom: '4px', textAlign: 'center' }}>
          Desktop: print wired or wirelessly via your OS print dialog · Phone: connect to same Wi-Fi → AirPrint (iOS) or Mopria (Android) · paper size: A7 / 105×74 mm
        </p>
      </div>

      {/* ── Print portal ──
          Invisible on screen. @media print makes it the only visible content.
          This approach works on desktop and mobile browsers (no popup required). */}
      {createPortal(
        <div id="waybill-print-area">{waybill}</div>,
        document.body
      )}

      <style>{`
        #waybill-print-area { display: none; }

        @media print {
          @page {
            size: 105mm 74mm;   /* A7 / 1/8 A4, landscape */
            margin: 3mm;
          }

          /* Hide everything on the page during print */
          body * { visibility: hidden; }

          /* Show only the waybill */
          #waybill-print-area,
          #waybill-print-area * { visibility: visible; }

          #waybill-print-area {
            display: block !important;
            position: fixed;
            left: 0;
            top: 0;
            width: 99mm;   /* page width minus margins */
            height: 68mm;  /* page height minus margins */
            overflow: hidden;
          }
        }
      `}</style>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   WaybillCard — the physical slip design (374 × 257 px = 99 × 68 mm)
   Fonts are intentionally large: this is a physical label that needs
   to be readable after cutting, sticking, and handling.
   ───────────────────────────────────────────────────────────────── */
export function WaybillCard({ order, product, orderDate, warrantyPeriod, warrantyNumber, qrPayload }) {
  return (
    <div style={{
      width: W + 'px', height: H + 'px',
      border: '1.5px solid #1e0a2e',
      borderRadius: '5px',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      background: 'white',
      color: '#110718',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    }}>

      {/* ── HEADER (68 px) ── */}
      <div style={{
        height: '68px',
        background: 'linear-gradient(135deg,#110718 0%,#1e0a2e 55%,#2d0a44 100%)',
        padding: '9px 12px',
        display: 'flex', alignItems: 'center', gap: '10px',
        flexShrink: 0, boxSizing: 'border-box',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'linear-gradient(135deg,#a671e4,#fe78e3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '13px', color: 'white',
          }}>V</div>
          <div>
            <p style={{ color: 'white', fontWeight: 900, fontSize: '13px', lineHeight: 1.1, margin: 0 }}>VENDIFY</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '6px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Product Waybill</p>
          </div>
        </div>

        {/* Reference code */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '6px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 3px' }}>Reference Code</p>
          <p style={{ color: 'white', fontWeight: 900, fontSize: '16px', fontFamily: 'monospace', letterSpacing: '0.04em', margin: 0 }}>
            {order.reference_code}
          </p>
        </div>

        {/* QR code */}
        <div style={{ background: 'white', borderRadius: '4px', padding: '4px', flexShrink: 0 }}>
          <QRCodeSVG value={qrPayload} size={50} level="M" includeMargin={false} fgColor="#110718" />
        </div>
      </div>

      {/* ── BODY (flex:1, 2 columns) ── */}
      <div style={{
        flex: 1,
        padding: '11px 14px',
        display: 'grid', gridTemplateColumns: '55% 45%',
        gap: '14px',
        overflow: 'hidden', boxSizing: 'border-box',
      }}>

        {/* Left — Product + Customer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
          <div>
            <p style={SL}>Product</p>
            <p style={{ ...BV, marginTop: '3px' }}>{order.product_name}</p>
            <p style={{ ...SV, fontStyle: 'italic', marginTop: '2px' }}>{warrantyPeriod}</p>
          </div>
          <div>
            <p style={SL}>Customer</p>
            <p style={{ ...BV, marginTop: '3px' }}>{order.customer_name}</p>
            <p style={{ ...MV, marginTop: '2px' }}>{order.contact_number}</p>
            <p style={{ ...SV, lineHeight: 1.4, marginTop: '2px' }}>{order.address}</p>
            {order.landmark && <p style={{ ...SV, color: '#8a7a95', marginTop: '1px' }}>📍 {order.landmark}</p>}
          </div>
        </div>

        {/* Right — Warranty + Date + Support */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
          <div>
            <p style={SL}>Warranty No.</p>
            <p style={{ ...MV, fontFamily: 'monospace', fontSize: '8px', marginTop: '3px' }}>{warrantyNumber}</p>
          </div>
          <div>
            <p style={SL}>Order Date</p>
            <p style={{ ...SV, marginTop: '3px' }}>{orderDate}</p>
          </div>
          <div>
            <p style={SL}>Support</p>
            <p style={{ ...SV, marginTop: '3px' }}>{SUPPORT_EMAIL}</p>
            <p style={{ ...SV, color: '#a671e4', fontWeight: 700, marginTop: '2px' }}>{WEBSITE}</p>
          </div>
        </div>
      </div>

      {/* ── FOOTER (28 px) ── */}
      <div style={{
        height: '28px',
        borderTop: '1px solid rgba(166,113,228,0.18)',
        background: 'rgba(166,113,228,0.04)',
        padding: '0 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, boxSizing: 'border-box',
      }}>
        <p style={{ fontSize: '6px', color: '#8a7a95', margin: 0 }}>
          Scan QR code to verify authenticity · Warranty requires this slip as proof of purchase
        </p>
        <p style={{ fontSize: '6.5px', color: '#a671e4', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', marginLeft: '8px' }}>
          {WEBSITE}
        </p>
      </div>
    </div>
  );
}

/* Shared text styles — sized for physical readability at 99 × 68 mm */
const SL = { fontSize: '7px',  fontWeight: 800, color: '#8a7a95', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 };
const BV = { fontSize: '13px', fontWeight: 700, color: '#110718', margin: 0, lineHeight: 1.2 };  /* bold value */
const MV = { fontSize: '10px', fontWeight: 500, color: '#110718', margin: 0, lineHeight: 1.2 };  /* medium value */
const SV = { fontSize: '9px',  fontWeight: 500, color: '#110718', margin: 0, lineHeight: 1.2 };  /* small value */
