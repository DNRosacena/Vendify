import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WaybillCard, W, H, WARRANTY_DEFAULT, SUPPORT_EMAIL, WEBSITE } from './WaybillModal';

// Preview: show 2 waybills per row at 60% scale
const PREVIEW_SCALE = 0.60;
const CELL_W = Math.round(W * PREVIEW_SCALE); // 224 px
const CELL_H = Math.round(H * PREVIEW_SCALE); // 154 px

export default function BulkWaybillModal({ orders, onClose }) {
  const [products, setProducts] = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const ids = [...new Set(orders.map(o => o.product_id).filter(Boolean))];
    if (!ids.length) { setLoading(false); return; }
    supabase
      .from('products')
      .select('id, name, category, warranty, specs, features')
      .in('id', ids)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(p => { map[p.id] = p; });
        setProducts(map);
        setLoading(false);
      });
  }, []);

  const handlePrint = () => window.print();

  // Build per-order props once products are ready
  const slips = orders.map(order => {
    const product       = products[order.product_id] || null;
    const orderDate     = new Date(order.created_at).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
    });
    const warrantyPeriod = product?.warranty || product?.specs?.warranty || product?.specs?.Warranty || WARRANTY_DEFAULT;
    const warrantyNumber = `${order.reference_code}-WR`;
    const qrPayload      = JSON.stringify({
      ref:      order.reference_code,
      product:  order.product_name,
      mfg:      new Date(order.created_at).toISOString().slice(0, 10),
      warranty: warrantyPeriod,
      customer: order.customer_name,
      support:  SUPPORT_EMAIL,
      website:  WEBSITE,
    });
    return { order, product, orderDate, warrantyPeriod, warrantyNumber, qrPayload };
  });

  // Modal width = 2 cells + gap + padding
  const modalW = CELL_W * 2 + 12 + 48;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(17,7,24,0.72)',
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
              Bulk Print Preview
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '2px 0 0' }}>
              {orders.length} waybill{orders.length !== 1 ? 's' : ''} · 2 per row · A4 paper
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
              {loading ? 'Loading…' : `Print ${orders.length} Waybill${orders.length !== 1 ? 's' : ''}`}
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
            {slips.map(({ order, product, orderDate, warrantyPeriod, warrantyNumber, qrPayload }) => (
              <div
                key={order.id}
                style={{
                  width: CELL_W + 'px', height: CELL_H + 'px',
                  position: 'relative', overflow: 'hidden',
                  borderRadius: '4px',
                  outline: '2px solid rgba(166,113,228,0.35)',
                }}
              >
                <div style={{
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: 'top left',
                  position: 'absolute', top: 0, left: 0,
                }}>
                  <WaybillCard
                    order={order}
                    product={product}
                    orderDate={orderDate}
                    warrantyPeriod={warrantyPeriod}
                    warrantyNumber={warrantyNumber}
                    qrPayload={qrPayload}
                  />
                </div>
              </div>
            ))}
            {/* Filler cell if odd count, keeps grid aligned */}
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
          8 waybills per A4 sheet · Cut along dashed borders · Desktop: wired or wireless · Phone: AirPrint (iOS) or Mopria (Android)
        </p>
      </div>

      {/* ── Print portal ──
          Grid of all waybills at actual physical size.
          @media print hides everything else and renders this 2-column A4 layout. */}
      {createPortal(
        <div id="bulk-waybill-print-area">
          {slips.map(({ order, product, orderDate, warrantyPeriod, warrantyNumber, qrPayload }) => (
            <div key={order.id} className="bwp-cell">
              <WaybillCard
                order={order}
                product={product}
                orderDate={orderDate}
                warrantyPeriod={warrantyPeriod}
                warrantyNumber={warrantyNumber}
                qrPayload={qrPayload}
              />
            </div>
          ))}
        </div>,
        document.body
      )}

      <style>{`
        #bulk-waybill-print-area { display: none; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          body * { visibility: hidden; }

          #bulk-waybill-print-area,
          #bulk-waybill-print-area * { visibility: visible; }

          #bulk-waybill-print-area {
            display: grid !important;
            grid-template-columns: 99mm 99mm;
            gap: 4mm 2mm;
            width: 200mm;
            position: fixed;
            left: 0;
            top: 0;
          }

          .bwp-cell {
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
