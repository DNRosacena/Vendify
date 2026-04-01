import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Same physical dimensions as WaybillCard — 1/8 A4 = 374 × 257 px
export const PRW = 374;
export const PRH = 257;
const SCALE = 1.72;

// Preview: 2 receipts per row at 60% scale
const PREVIEW_SCALE = 0.60;
const CELL_W = Math.round(PRW * PREVIEW_SCALE); // 224 px
const CELL_H = Math.round(PRH * PREVIEW_SCALE); // 154 px

/* ─────────────────────────────────────────────────────────────────
   ProductionReceiptCard — the physical slip design (374 × 257 px)
   Green-themed to visually distinguish from the purple waybill.
   ───────────────────────────────────────────────────────────────── */
export function ProductionReceiptCard({ order, product, orderDate, inclusions }) {
  const allInclusions = inclusions != null ? inclusions : (product?.inclusions || []);
  const isConfirmed   = order.status === 'confirmed';
  const statusLabel   = isConfirmed ? 'CONFIRMED' : 'IN PRODUCTION';
  const statusColor   = isConfirmed ? '#2ECC71'   : '#a671e4';

  return (
    <div style={{
      width: PRW + 'px', height: PRH + 'px',
      border: '1.5px solid #0a2218',
      borderRadius: '5px',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      background: 'white',
      color: '#0a1a0e',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    }}>

      {/* ── HEADER (68 px) ── */}
      <div style={{
        height: '68px',
        background: 'linear-gradient(135deg,#0a2218 0%,#0e3d28 55%,#1a6b45 100%)',
        padding: '9px 12px',
        display: 'flex', alignItems: 'center', gap: '10px',
        flexShrink: 0, boxSizing: 'border-box',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'linear-gradient(135deg,#22c97a,#06d6a0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '13px', color: 'white',
          }}>V</div>
          <div>
            <p style={{ color: 'white', fontWeight: 900, fontSize: '13px', lineHeight: 1.1, margin: 0 }}>VENDIFY</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '6px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Production Receipt</p>
          </div>
        </div>

        {/* Reference code */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '6px', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 3px' }}>Reference Code</p>
          <p style={{ color: 'white', fontWeight: 900, fontSize: '16px', fontFamily: 'monospace', letterSpacing: '0.04em', margin: 0 }}>
            {order.reference_code}
          </p>
        </div>

        {/* Date + status badge */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '6.5px', margin: '0 0 4px' }}>{orderDate}</p>
          <div style={{
            background: statusColor + '22',
            border: `1px solid ${statusColor}66`,
            borderRadius: '3px',
            padding: '2px 6px',
            display: 'inline-block',
          }}>
            <p style={{ color: statusColor, fontSize: '6px', fontWeight: 800, letterSpacing: '0.08em', margin: 0 }}>
              {statusLabel}
            </p>
          </div>
        </div>
      </div>

      {/* ── BODY (flex:1, 2 columns) ── */}
      <div style={{
        flex: 1,
        padding: '10px 14px',
        display: 'grid', gridTemplateColumns: '55% 45%',
        gap: '12px',
        overflow: 'hidden', boxSizing: 'border-box',
      }}>

        {/* Left — Product + Inclusions checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          <div>
            <p style={SL}>Product</p>
            <p style={{ ...BV, marginTop: '2px' }}>{order.product_name}</p>
          </div>
          <div>
            <p style={SL}>Inclusions</p>
            {allInclusions.length > 0 ? (
              <div style={{ marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2.5px' }}>
                {allInclusions.slice(0, 7).map((item, i) => {
                  const inc = typeof item === 'string' ? {name: item, price: 0} : item;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <span style={{ fontSize: '9px', color: '#0a2218', flexShrink: 0, lineHeight: 1.3 }}>□</span>
                      <span style={{ fontSize: '8px', color: '#0a1a0e', lineHeight: 1.3, flex: 1 }}>{inc.name}</span>
                      {inc.price > 0 && (
                        <span style={{ fontSize: '7px', color: '#1a6b45', fontWeight: 700, flexShrink: 0 }}>+₱{inc.price}</span>
                      )}
                    </div>
                  );
                })}
                {allInclusions.length > 7 && (
                  <p style={{ fontSize: '7px', color: '#888', fontStyle: 'italic', margin: '1px 0 0' }}>
                    +{allInclusions.length - 7} more items
                  </p>
                )}
              </div>
            ) : (
              <p style={{ ...SV, fontStyle: 'italic', color: '#999', marginTop: '3px' }}>No inclusions listed</p>
            )}
          </div>
        </div>

        {/* Right — Customer + Note */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          <div>
            <p style={SL}>Customer</p>
            <p style={{ ...BV, marginTop: '2px' }}>{order.customer_name}</p>
            <p style={{ ...MV, marginTop: '2px' }}>{order.contact_number}</p>
            <p style={{ ...SV, lineHeight: 1.4, marginTop: '2px' }}>{order.address}</p>
            {order.landmark && (
              <p style={{ ...SV, color: '#5a8a6a', marginTop: '1px' }}>📍 {order.landmark}</p>
            )}
          </div>
          {order.note && (
            <div>
              <p style={SL}>Note</p>
              <p style={{ fontSize: '8px', color: '#0a1a0e', lineHeight: 1.4, marginTop: '2px', fontStyle: 'italic' }}>
                "{order.note}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER (28 px) ── */}
      <div style={{
        height: '28px',
        borderTop: '1px solid rgba(34,201,122,0.2)',
        background: 'rgba(34,201,122,0.04)',
        padding: '0 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, boxSizing: 'border-box',
      }}>
        <p style={{ fontSize: '6px', color: '#5a7a6a', margin: 0 }}>
          Prepared by: _____________________ &nbsp;&nbsp; Checked by: __________________ &nbsp;&nbsp; Date: ___________
        </p>
        <p style={{ fontSize: '6.5px', color: '#22c97a', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', marginLeft: '8px' }}>
          vendify.ph
        </p>
      </div>
    </div>
  );
}

/* Shared text styles */
const SL = { fontSize: '7px',  fontWeight: 800, color: '#5a7a6a', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 };
const BV = { fontSize: '13px', fontWeight: 700, color: '#0a1a0e', margin: 0, lineHeight: 1.2 };
const MV = { fontSize: '10px', fontWeight: 500, color: '#0a1a0e', margin: 0, lineHeight: 1.2 };
const SV = { fontSize: '9px',  fontWeight: 500, color: '#0a1a0e', margin: 0, lineHeight: 1.2 };

/* ─────────────────────────────────────────────────────────────────
   ProductionReceiptModal — individual print, with add-inclusions UI
   ───────────────────────────────────────────────────────────────── */
export default function ProductionReceiptModal({ order, onClose }) {
  const [product,          setProduct]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [customInclusions, setCustomInclusions] = useState([]);
  const [newInclusion,     setNewInclusion]     = useState('');

  useEffect(() => {
    if (!order.product_id) { setLoading(false); return; }
    supabase
      .from('products')
      .select('name, category, inclusions, features')
      .eq('id', order.product_id)
      .maybeSingle()
      .then(({ data }) => { setProduct(data); setLoading(false); });
  }, [order.product_id]);

  const orderDate = new Date(order.created_at).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
  });

  // Product inclusions + any custom ones added in this session
  const inclusions = [...(product?.inclusions || []), ...customInclusions];

  const addInclusion = () => {
    const trimmed = newInclusion.trim();
    if (!trimmed) return;
    setCustomInclusions(prev => [...prev, trimmed]);
    setNewInclusion('');
  };

  const removeCustomInclusion = (i) => {
    setCustomInclusions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handlePrint = () => window.print();

  const previewW = Math.round(PRW * SCALE);
  const previewH = Math.round(PRH * SCALE);

  const card = (
    <ProductionReceiptCard
      order={order}
      product={product}
      orderDate={orderDate}
      inclusions={inclusions}
    />
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(7,17,12,0.78)',
          backdropFilter: 'blur(4px)',
          zIndex: 400,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 401,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '12px',
        maxHeight: '95vh',
        overflowY: 'auto',
      }}>

        {/* Action bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: previewW + 'px',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
              Production Receipt Preview
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '2px 0 0' }}>
              1/8 A4 · 99 × 68 mm · A4 paper · {order.reference_code}
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
                  ? 'rgba(34,201,122,0.25)'
                  : 'linear-gradient(135deg,#22c97a,#06d6a0)',
                border: 'none', borderRadius: '9px',
                color: loading ? 'rgba(255,255,255,0.4)' : 'white',
                fontWeight: 700, fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Printer size={15} />
              {loading ? 'Loading…' : 'Print Receipt'}
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

        {/* Scaled preview */}
        <div style={{ width: previewW + 'px', height: previewH + 'px', position: 'relative', flexShrink: 0 }}>
          <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
            {card}
          </div>
        </div>

        {/* Add inclusions section */}
        {!loading && (
          <div style={{
            width: previewW + 'px',
            background: 'rgba(34,201,122,0.06)',
            border: '1px solid rgba(34,201,122,0.2)',
            borderRadius: '10px',
            padding: '12px 16px',
            flexShrink: 0,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Add Inclusions
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: customInclusions.length > 0 ? '10px' : 0 }}>
              <input
                value={newInclusion}
                onChange={e => setNewInclusion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addInclusion()}
                placeholder="e.g. USB cable, power adapter…"
                style={{
                  flex: 1, padding: '8px 12px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(34,201,122,0.25)',
                  borderRadius: '7px', fontSize: '0.83rem',
                  color: 'white', fontFamily: 'Inter, sans-serif', outline: 'none',
                }}
              />
              <button
                onClick={addInclusion}
                disabled={!newInclusion.trim()}
                style={{
                  padding: '8px 14px',
                  background: newInclusion.trim()
                    ? 'linear-gradient(135deg,#22c97a,#06d6a0)'
                    : 'rgba(34,201,122,0.15)',
                  border: 'none', borderRadius: '7px',
                  color: newInclusion.trim() ? 'white' : 'rgba(34,201,122,0.4)',
                  fontWeight: 700, fontSize: '0.8rem',
                  cursor: newInclusion.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {customInclusions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {customInclusions.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'rgba(34,201,122,0.12)',
                    border: '1px solid rgba(34,201,122,0.25)',
                    borderRadius: '20px', padding: '3px 10px',
                  }}>
                    <span style={{ fontSize: '0.77rem', color: '#22c97a' }}>{item}</span>
                    <button
                      onClick={() => removeCustomInclusion(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(34,201,122,0.5)', display: 'flex', padding: 0, lineHeight: 0 }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hint */}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', margin: 0, paddingBottom: '4px', textAlign: 'center', flexShrink: 0 }}>
          8 receipts per A4 sheet · Cut along dashed border · Desktop: wired or wireless · Phone: AirPrint (iOS) or Mopria (Android)
        </p>
      </div>

      {/* ── Print portal ── */}
      {createPortal(
        <div id="receipt-print-area">{card}</div>,
        document.body
      )}

      <style>{`
        #receipt-print-area { display: none; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          body * { visibility: hidden; }

          #receipt-print-area,
          #receipt-print-area * { visibility: visible; }

          #receipt-print-area {
            display: block !important;
            position: fixed;
            left: 0;
            top: 0;
            width: 99mm;
            height: 68mm;
            overflow: hidden;
            border: 0.3mm dashed #bbb;
            box-sizing: border-box;
          }
        }
      `}</style>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BulkProductionReceiptModal — 2×4 A4 bulk layout (same as BulkWaybillModal)
   ───────────────────────────────────────────────────────────────── */
export function BulkProductionReceiptModal({ orders, onClose }) {
  const [products, setProducts] = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const ids = [...new Set(orders.map(o => o.product_id).filter(Boolean))];
    if (!ids.length) { setLoading(false); return; }
    supabase
      .from('products')
      .select('id, name, inclusions, features')
      .in('id', ids)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(p => { map[p.id] = p; });
        setProducts(map);
        setLoading(false);
      });
  }, []);

  const handlePrint = () => window.print();

  const slips = orders.map(order => {
    const product   = products[order.product_id] || null;
    const orderDate = new Date(order.created_at).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
    });
    return { order, product, orderDate };
  });

  const modalW = CELL_W * 2 + 12 + 48;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(7,17,12,0.78)',
          backdropFilter: 'blur(4px)',
          zIndex: 402,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 403,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '12px',
        maxHeight: '92vh',
      }}>

        {/* Action bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: modalW + 'px',
        }}>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
              Bulk Receipt Preview
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '2px 0 0' }}>
              {orders.length} receipt{orders.length !== 1 ? 's' : ''} · 2 per row · A4 paper
              {orders.length > 8 ? ` · ${Math.ceil(orders.length / 8)} pages` : ''}
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
                  ? 'rgba(34,201,122,0.25)'
                  : 'linear-gradient(135deg,#22c97a,#06d6a0)',
                border: 'none', borderRadius: '9px',
                color: loading ? 'rgba(255,255,255,0.4)' : 'white',
                fontWeight: 700, fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Printer size={15} />
              {loading ? 'Loading…' : `Print ${orders.length} Receipt${orders.length !== 1 ? 's' : ''}`}
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

        {/* Scrollable preview grid */}
        <div style={{
          overflowY: 'auto',
          maxHeight: 'calc(92vh - 130px)',
          padding: '4px 24px 4px',
          width: modalW + 'px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(2, ${CELL_W}px)`,
            gap: '12px',
          }}>
            {slips.map(({ order, product, orderDate }) => (
              <div
                key={order.id}
                style={{
                  width: CELL_W + 'px', height: CELL_H + 'px',
                  position: 'relative', overflow: 'hidden',
                  borderRadius: '4px',
                  outline: '2px solid rgba(34,201,122,0.35)',
                }}
              >
                <div style={{
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: 'top left',
                  position: 'absolute', top: 0, left: 0,
                }}>
                  <ProductionReceiptCard
                    order={order}
                    product={product}
                    orderDate={orderDate}
                  />
                </div>
              </div>
            ))}
            {/* Filler cell if odd count */}
            {orders.length % 2 !== 0 && (
              <div style={{
                width: CELL_W + 'px', height: CELL_H + 'px',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>empty slot</p>
              </div>
            )}
          </div>
        </div>

        {/* Hint */}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', margin: 0, paddingBottom: '4px', textAlign: 'center' }}>
          8 receipts per A4 sheet · Cut along dashed borders · Desktop: wired or wireless · Phone: AirPrint (iOS) or Mopria (Android)
        </p>
      </div>

      {/* ── Print portal ── */}
      {createPortal(
        <div id="bulk-receipt-print-area">
          {slips.map(({ order, product, orderDate }) => (
            <div key={order.id} className="brp-cell">
              <ProductionReceiptCard
                order={order}
                product={product}
                orderDate={orderDate}
              />
            </div>
          ))}
        </div>,
        document.body
      )}

      <style>{`
        #bulk-receipt-print-area { display: none; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          body * { visibility: hidden; }

          #bulk-receipt-print-area,
          #bulk-receipt-print-area * { visibility: visible; }

          #bulk-receipt-print-area {
            display: grid !important;
            grid-template-columns: 99mm 99mm;
            gap: 4mm 2mm;
            width: 200mm;
            position: fixed;
            left: 0;
            top: 0;
          }

          .brp-cell {
            width: 99mm;
            height: 68mm;
            overflow: hidden;
            border: 0.3mm dashed #bbb;
            box-sizing: border-box;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
