import { useState, useEffect, useRef } from 'react';
import { Search, Package, CheckCircle, Clock, Truck, Star, XCircle, ChevronRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import OrderChat from '../components/OrderChat';

// Fix leaflet default marker icons with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const riderIcon = L.divIcon({
  className: '',
  html: '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#a671e4,#fe78e3);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(166,113,228,0.5);">🏍️</div>',
  iconSize:   [38, 38],
  iconAnchor: [19, 19],
});

const destIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:28px;line-height:1;">📍</div>',
  iconSize:   [28, 36],
  iconAnchor: [14, 36],
});

const STATUS_STEPS = [
  { key: 'pending',          label: 'Order Received',    labelFil: 'Natanggap ang Order',      icon: Package,      desc: 'Your order has been submitted and is awaiting confirmation.' },
  { key: 'confirmed',        label: 'Confirmed',         labelFil: 'Nakumpirma',               icon: CheckCircle,  desc: 'Our sales team has confirmed your order.' },
  { key: 'in_production',    label: 'In Production',     labelFil: 'Ginagawa Na',              icon: Star,         desc: 'Our production team is building your machine.' },
  { key: 'out_for_delivery', label: 'Out for Delivery',  labelFil: 'Naipadala Na',             icon: Truck,        desc: 'Your machine is on its way to your location.' },
  { key: 'delivered',        label: 'Delivered',         labelFil: 'Naihatid Na',              icon: CheckCircle,  desc: 'Your machine has been delivered and demonstrated.' },
];

function getStepIndex(status) {
  return STATUS_STEPS.findIndex(s => s.key === status);
}

// Recenter map when position changes
function RiderMarker({ position }) {
  const map = useMap();
  useEffect(() => { map.setView(position, map.getZoom()); }, [position]);
  return <Marker position={position} icon={riderIcon}><Popup>Rider is here</Popup></Marker>;
}

export default function Track() {
  const [refCode,      setRefCode]      = useState('');
  const [order,        setOrder]        = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [searched,     setSearched]     = useState(false);
  const [riderLoc,     setRiderLoc]     = useState(null);
  const [chatOpen,     setChatOpen]     = useState(false);
  const channelRef      = useRef(null);
  const orderChannelRef = useRef(null);

  // Cleanup realtime channel on unmount / order change
  useEffect(() => {
    return () => {
      if (channelRef.current)      supabase.removeChannel(channelRef.current);
      if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current);
    };
  }, []);

  const handleSearch = async () => {
    if (!refCode.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setRiderLoc(null);
    setSearched(true);
    setChatOpen(false);

    // Remove old channels
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (orderChannelRef.current) {
      supabase.removeChannel(orderChannelRef.current);
      orderChannelRef.current = null;
    }

    // Normalize: strip spaces/dashes, uppercase, then re-insert dash
    // Format: VND{YYMMDD}-{4digits}  e.g. VND260310-1234
    let normalized = refCode.trim().toUpperCase().replace(/[\s\-]/g, '');
    if (/^VND\d{10}$/.test(normalized)) {
      normalized = normalized.slice(0, 9) + '-' + normalized.slice(9);
    }

    const { data, error: err } = await supabase
      .from('orders')
      .select('*, assigned_sales:assigned_sales_id(full_name)')
      .eq('reference_code', normalized)
      .single();

    if (err || !data) {
      setError('No order found with that reference code. Please check and try again.');
    } else {
      setOrder(data);

      // Subscribe to live order status changes
      orderChannelRef.current = supabase
        .channel(`order_status_${data.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'orders',
          filter: `id=eq.${data.id}`,
        }, async () => {
          const { data: updated } = await supabase
            .from('orders')
            .select('*, assigned_sales:assigned_sales_id(full_name)')
            .eq('id', data.id)
            .single();
          if (updated) setOrder(updated);
        })
        .subscribe();

      if (data.status === 'out_for_delivery' && data.assigned_rider_id && data.delivery_type !== 'lbc' && data.delivery_type !== 'jnt') {
        loadRiderLocation(data.assigned_rider_id);
      }
    }
    setLoading(false);
  };

  const loadRiderLocation = async (riderId) => {
    const { data } = await supabase
      .from('rider_locations')
      .select('latitude, longitude')
      .eq('rider_id', riderId)
      .maybeSingle();
    if (data) setRiderLoc([data.latitude, data.longitude]);

    // Subscribe to live updates
    channelRef.current = supabase
      .channel(`rider_track_${riderId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rider_locations',
        filter: `rider_id=eq.${riderId}`,
      }, async () => {
        const { data: updated } = await supabase
          .from('rider_locations')
          .select('latitude, longitude')
          .eq('rider_id', riderId)
          .maybeSingle();
        if (updated) setRiderLoc([updated.latitude, updated.longitude]);
        else setRiderLoc(null);
      })
      .subscribe();
  };

  const currentStep = order ? getStepIndex(order.status) : -1;
  const isCancelled = order?.status === 'cancelled';

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: '68px', minHeight: '100vh', background: 'var(--light)' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a0412 0%, var(--navy) 100%)', padding: '56px 24px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '200px', background: 'var(--blue)', borderRadius: '50%', opacity: 0.05, filter: 'blur(70px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <span className="tag" style={{ color: 'var(--blue)', background: 'rgba(166,113,228,0.12)', padding: '4px 14px', borderRadius: '20px', border: '1px solid rgba(166,113,228,0.2)' }}>
            Track Order / Subaybayan ang Order
          </span>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'white', margin: '12px 0 14px' }}>
            Order Tracking
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.55)', marginBottom: '32px', lineHeight: 1.7 }}>
            Enter your reference number to check the status of your order. / Ilagay ang iyong reference number para malaman ang status ng iyong order.
          </p>

          {/* Search box */}
          <form
            onSubmit={e => { e.preventDefault(); handleSearch(); }}
            style={{ display: 'flex', gap: '10px', maxWidth: '480px', margin: '0 auto' }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={refCode}
                onChange={e => setRefCode(e.target.value)}
                placeholder="e.g. VND260310-1234"
                autoCorrect="off"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                style={{ width: '100%', padding: '13px 16px 13px 42px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(166,113,228,0.25)', borderRadius: '10px', color: 'white', fontSize: '1rem', outline: 'none', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em' }}
                onFocus={e => e.target.style.borderColor = 'rgba(166,113,228,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.25)'}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !refCode.trim()}
              style={{ padding: '13px 24px', background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || !refCode.trim() ? 0.5 : 1, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(166,113,228,0.3)' }}
            >
              {loading ? '…' : 'Track'}
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Error */}
        {searched && error && !loading && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(231,76,60,0.15)' }}>
            <XCircle size={40} color="var(--red)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '8px' }}>Order Not Found</h3>
            <p style={{ color: 'var(--gray)', fontSize: '0.9rem', lineHeight: 1.6 }}>{error}</p>
          </div>
        )}

        {/* Order result */}
        {order && !loading && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>

            {/* Reference + product header */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '24px 28px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(166,113,228,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--gray)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '4px' }}>Reference Number</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '0.04em' }}>{order.reference_code}</p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: isCancelled ? 'rgba(149,165,166,0.12)' : 'rgba(166,113,228,0.10)', border: `1px solid ${isCancelled ? 'rgba(149,165,166,0.2)' : 'rgba(166,113,228,0.2)'}` }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: isCancelled ? 'var(--gray)' : 'var(--blue)', animation: !isCancelled && order.status !== 'delivered' ? 'pulse 2s infinite' : 'none' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isCancelled ? 'var(--gray)' : 'var(--blue)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {STATUS_STEPS.find(s => s.key === order.status)?.label || order.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Product',     value: order.product_name },
                  { label: 'Customer',    value: order.customer_name },
                  { label: 'Date Placed', value: formatDate(order.created_at) },
                  { label: 'Sales Rep',   value: order.assigned_sales?.full_name || 'Assigned' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'rgba(166,113,228,0.04)', borderRadius: '8px', padding: '10px 14px' }}>
                    <p style={{ fontSize: '0.68rem', color: 'var(--gray)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
                    <p style={{ fontSize: '0.88rem', color: 'var(--navy)', fontWeight: 600 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status timeline */}
            {!isCancelled ? (
              <div style={{ background: 'white', borderRadius: '14px', padding: '28px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(166,113,228,0.12)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', marginBottom: '24px' }}>Order Progress</h3>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '19px', top: '20px', bottom: '20px', width: '2px', background: 'rgba(166,113,228,0.12)', zIndex: 0 }} />
                  <div style={{ position: 'absolute', left: '19px', top: '20px', width: '2px', height: `${Math.max(0, currentStep) * (100 / (STATUS_STEPS.length - 1))}%`, background: 'linear-gradient(to bottom, var(--blue), var(--red))', zIndex: 1, transition: 'height 0.5s ease' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {STATUS_STEPS.map((step, i) => {
                      const done   = i < currentStep;
                      const active = i === currentStep;
                      const Icon   = step.icon;
                      return (
                        <div key={step.key} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', paddingBottom: i < STATUS_STEPS.length - 1 ? '24px' : '0', position: 'relative', zIndex: 2 }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'linear-gradient(135deg, var(--blue), var(--red))' : 'white', border: done ? 'none' : active ? '2.5px solid var(--blue)' : '2px solid rgba(166,113,228,0.15)', boxShadow: active ? '0 0 0 4px rgba(166,113,228,0.12)' : 'none' }}>
                            <Icon size={16} color={done ? 'white' : active ? 'var(--blue)' : 'rgba(166,113,228,0.3)'} />
                          </div>
                          <div style={{ paddingTop: '8px' }}>
                            <p style={{ fontWeight: active ? 700 : done ? 600 : 500, fontSize: '0.95rem', color: active || done ? 'var(--navy)' : 'var(--gray)', marginBottom: '2px' }}>
                              {step.label}
                              <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 500 }}>{step.labelFil}</span>
                            </p>
                            <p style={{ fontSize: '0.82rem', color: active ? 'var(--gray)' : 'rgba(149,165,166,0.7)', lineHeight: 1.55 }}>
                              {active ? step.desc : done ? '✓ Completed' : 'Upcoming'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '14px', padding: '28px', textAlign: 'center', marginBottom: '16px', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(149,165,166,0.15)' }}>
                <XCircle size={36} color="var(--gray)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>Order Cancelled</h3>
                <p style={{ color: 'var(--gray)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  This order has been cancelled. Please contact us if you have questions.
                </p>
                <button onClick={() => { setOrder(null); setRefCode(''); setSearched(false); }} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Track Another Order
                </button>
              </div>
            )}

            {/* ── Delivery tracking (out_for_delivery only) ── */}
            {order.status === 'out_for_delivery' && (
              order.delivery_type === 'lbc' ? (
                <div style={{ background: 'white', borderRadius: '14px', padding: '28px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(230,126,34,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <span style={{ fontSize: '2rem' }}>📦</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>Your order is on its way via LBC!</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '3px' }}>Naipadala na ang inyong order sa pamamagitan ng LBC.</p>
                    </div>
                  </div>
                  {order.lbc_tracking_number ? (
                    <>
                      <div style={{ background: 'rgba(230,126,34,0.06)', border: '1px solid rgba(230,126,34,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '14px' }}>
                        <p style={{ fontSize: '0.7rem', color: '#e67e22', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>LBC Tracking Number</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '0.08em', fontFamily: 'monospace', margin: 0 }}>{order.lbc_tracking_number}</p>
                      </div>
                      <a
                        href={`https://www.lbcexpress.com/track/?tracking_no=${order.lbc_tracking_number}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: '#e67e22', color: 'white', fontWeight: 700, fontSize: '0.88rem', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(230,126,34,0.3)' }}
                      >
                        📦 Track via LBC Express ↗
                      </a>
                      <p style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: '12px', lineHeight: 1.6 }}>
                        You may claim your order at the nearest LBC branch using the tracking number above. / Maaari mong kunin ang inyong order sa pinakamalapit na sangay ng LBC gamit ang tracking number sa itaas.
                      </p>
                    </>
                  ) : (
                    <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>Your order is being processed by LBC. The tracking number will appear here once available. / Pinoproseso ng LBC ang inyong order. Lilitaw ang tracking number kapag available na.</p>
                  )}
                </div>
              ) : order.delivery_type === 'jnt' ? (
                <div style={{ background: 'white', borderRadius: '14px', padding: '28px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(232,36,43,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <span style={{ fontSize: '2rem' }}>🚚</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>Your order is on its way via J&T Express!</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '3px' }}>Naipadala na ang inyong order sa pamamagitan ng J&T Express.</p>
                    </div>
                  </div>
                  {order.lbc_tracking_number ? (
                    <>
                      <div style={{ background: 'rgba(232,36,43,0.06)', border: '1px solid rgba(232,36,43,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '14px' }}>
                        <p style={{ fontSize: '0.7rem', color: '#e8242b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>J&T Tracking Number</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '0.08em', fontFamily: 'monospace', margin: 0 }}>{order.lbc_tracking_number}</p>
                      </div>
                      <a
                        href={`https://www.jtexpress.ph/index/query/gzquery.html?bills=${order.lbc_tracking_number}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: '#e8242b', color: 'white', fontWeight: 700, fontSize: '0.88rem', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(232,36,43,0.3)' }}
                      >
                        🚚 Track via J&T Express ↗
                      </a>
                      <p style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: '12px', lineHeight: 1.6 }}>
                        Track your package on the J&T Express website using the tracking number above. / I-track ang inyong pakete sa J&T Express website gamit ang tracking number sa itaas.
                      </p>
                    </>
                  ) : (
                    <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>Your order is being processed by J&T Express. The tracking number will appear here once available. / Pinoproseso ng J&T Express ang inyong order. Lilitaw ang tracking number kapag available na.</p>
                  )}
                </div>
              ) : (
                <div style={{ background: 'white', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(166,113,228,0.12)' }}>
                  <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(166,113,228,0.08)' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>
                      🏍️ Rider is on the way / Papunta na ang rider
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '4px' }}>
                      Live location updates every few seconds.
                    </p>
                  </div>
                  {riderLoc ? (
                    <MapContainer
                      center={riderLoc}
                      zoom={15}
                      style={{ height: '280px', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      />
                      <RiderMarker position={riderLoc} />
                      {order.landmark_lat && order.landmark_lng && (
                        <Marker
                          position={[order.landmark_lat, order.landmark_lng]}
                          icon={destIcon}
                        >
                          <Popup>Delivery destination</Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  ) : (
                    <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '1.5rem' }}>📡</p>
                      <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>Waiting for rider to share location…</p>
                    </div>
                  )}
                </div>
              )
            )}

            {/* ── Chat with us ── */}
            <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(166,113,228,0.12)' }}>
              <button
                onClick={() => setChatOpen(v => !v)}
                style={{ width: '100%', padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>💬</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)', margin: 0 }}>Chat with our team</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--gray)', margin: 0 }}>Makipag-usap sa aming team</p>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--gray)" style={{ transform: chatOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {chatOpen && (
                <div style={{ height: '420px', borderTop: '1px solid rgba(166,113,228,0.08)' }}>
                  <OrderChat
                    orderId={order.id}
                    senderName={order.customer_name}
                    senderType="customer"
                    senderId={null}
                    salesId={order.assigned_sales_id}
                    riderId={order.assigned_rider_id}
                    referenceCode={order.reference_code}
                  />
                </div>
              )}
            </div>

            {/* Track another */}
            {order.status === 'delivered' && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button onClick={() => { setOrder(null); setRefCode(''); setSearched(false); }} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  Track another order <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!searched && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: '3rem', marginBottom: '14px' }}>📦</p>
            <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '6px', fontSize: '1rem' }}>Enter your reference number above</p>
            <p style={{ color: 'var(--gray)', fontSize: '0.88rem', lineHeight: 1.65 }}>
              You'll find your reference number in the confirmation page after placing your order, or in any message from our sales team.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
