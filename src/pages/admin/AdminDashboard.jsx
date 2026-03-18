import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Clock, CheckCircle, Truck, Star, XCircle, RefreshCw, ChevronDown, Search, User, Phone, MapPin, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate, statusLabel, statusClass } from '../../lib/utils';

const STATUSES = ['pending', 'confirmed', 'in_production', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_ICONS = {
  pending:          Clock,
  confirmed:        CheckCircle,
  in_production:    Star,
  out_for_delivery: Truck,
  delivered:        CheckCircle,
  cancelled:        XCircle,
};

const STATUS_COLORS = {
  pending:          '#3498DB',
  confirmed:        '#2ECC71',
  in_production:    '#a671e4',
  out_for_delivery: '#fe78e3',
  delivered:        '#27AE60',
  cancelled:        '#95A5A6',
};

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [adminName,setAdminName]= useState('Admin');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile }  = await supabase.from('users').select('full_name').eq('id', user.id).single();
    if (profile) setAdminName(profile.full_name);

    const { data } = await supabase
      .from('orders')
      .select('*, product:product_id(name, image_url), assigned_sales:assigned_sales_id(full_name), assigned_rider:assigned_rider_id(full_name)')
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(true);
    await supabase.from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selected?.id === orderId) setSelected(prev => ({ ...prev, status: newStatus }));
    setUpdating(false);
  };

  // Stats
  const stats = STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  const filtered = orders.filter(o => {
    const matchFilter = filter === 'all' || o.status === filter;
    const matchSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.reference_code?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6fb', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: 'var(--navy)', borderBottom: '1px solid rgba(166,113,228,0.15)', padding: '0 24px', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--blue), var(--red))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: '0.9rem' }}>V</span>
          </div>
          <div>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>Vendify</p>
            <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Admin Dashboard</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{adminName}</p>
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>ADMINISTRATOR</p>
          </div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', padding: '7px 12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(254,120,227,0.12)'; e.currentTarget.style.borderColor = 'rgba(254,120,227,0.25)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '28px 24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '3px' }}>Orders</h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>{orders.length} total orders · Last updated just now</p>
          </div>
          <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.82rem', color: 'var(--navy)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(166,113,228,0.2)'; e.currentTarget.style.color = 'var(--navy)'; }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { key: 'all', label: 'Total', count: orders.length, color: 'var(--navy)' },
            ...STATUSES.map(s => ({ key: s, label: statusLabel(s).en, count: stats[s] || 0, color: STATUS_COLORS[s] })),
          ].map(({ key, label, count, color }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ background: filter === key ? 'var(--navy)' : 'white', border: `1px solid ${filter === key ? 'var(--navy)' : 'rgba(166,113,228,0.12)'}`, borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'Inter, sans-serif', boxShadow: filter === key ? '0 4px 16px rgba(17,7,24,0.15)' : 'none' }}
            >
              <p style={{ fontSize: '1.6rem', fontWeight: 900, color: filter === key ? 'white' : color, lineHeight: 1, marginBottom: '4px' }}>{count}</p>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: filter === key ? 'rgba(255,255,255,0.55)' : 'var(--gray)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
            </button>
          ))}
        </div>

        {/* Search + table */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(166,113,228,0.1)', overflow: 'hidden' }}>

          {/* Table header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(166,113,228,0.08)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} color="var(--gray)" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                placeholder="Search orders, customers, products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid rgba(166,113,228,0.15)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontFamily: 'Inter, sans-serif', color: 'var(--navy)', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.15)'}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray)', flexShrink: 0 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray)' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid rgba(166,113,228,0.2)', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
              Loading orders...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</p>
              <p style={{ fontWeight: 600, color: 'var(--navy)' }}>No orders found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(166,113,228,0.08)' }}>
                    {['Reference', 'Customer', 'Product', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.70rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => {
                    const Icon = STATUS_ICONS[order.status] || Package;
                    return (
                      <tr key={order.id}
                        style={{ borderBottom: '1px solid rgba(166,113,228,0.06)', transition: 'background 0.15s', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(166,113,228,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setSelected(order)}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {order.reference_code}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--navy)', fontWeight: 500 }}>
                          <p style={{ fontWeight: 600, marginBottom: '1px' }}>{order.customer_name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{order.contact_number}</p>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--navy)' }}>
                          <p>{order.product_name}</p>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--gray)', whiteSpace: 'nowrap', fontSize: '0.80rem' }}>
                          {new Date(order.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <select
                              value={order.status}
                              onChange={e => handleStatusUpdate(order.id, e.target.value)}
                              disabled={updating}
                              style={{ appearance: 'none', padding: '5px 26px 5px 10px', borderRadius: '20px', border: `1px solid ${STATUS_COLORS[order.status]}44`, background: `${STATUS_COLORS[order.status]}12`, color: STATUS_COLORS[order.status], fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none', letterSpacing: '0.04em' }}
                            >
                              {STATUSES.map(s => (
                                <option key={s} value={s}>{statusLabel(s).en}</option>
                              ))}
                            </select>
                            <ChevronDown size={11} color={STATUS_COLORS[order.status]} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelected(order)}
                            style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600, background: 'rgba(166,113,228,0.08)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(166,113,228,0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(166,113,228,0.08)'; }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order detail drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,7,24,0.5)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', background: 'white', zIndex: 201, boxShadow: '-8px 0 40px rgba(17,7,24,0.2)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s ease' }}>

            {/* Drawer header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(166,113,228,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>{selected.reference_code}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{formatDate(selected.created_at)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'flex', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Status update */}
              <div style={{ background: 'rgba(166,113,228,0.05)', border: '1px solid rgba(166,113,228,0.12)', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Update Status</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => handleStatusUpdate(selected.id, s)} disabled={updating}
                      style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${s === selected.status ? STATUS_COLORS[s] : 'rgba(166,113,228,0.15)'}`, background: s === selected.status ? `${STATUS_COLORS[s]}15` : 'transparent', color: s === selected.status ? STATUS_COLORS[s] : 'var(--gray)', fontSize: '0.75rem', fontWeight: s === selected.status ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
                    >
                      {statusLabel(s).en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer info */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Customer Info</p>
                {[
                  { icon: User,     label: 'Name',    value: selected.customer_name },
                  { icon: Phone,    label: 'Contact', value: selected.contact_number },
                  { icon: MapPin,   label: 'Address', value: selected.address },
                  { icon: MapPin,   label: 'Landmark',value: selected.landmark || 'Not specified' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(166,113,228,0.08)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color="var(--blue)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.68rem', color: 'var(--gray)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
                      <p style={{ fontSize: '0.86rem', color: 'var(--navy)', fontWeight: 500, lineHeight: 1.4 }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Product */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Product Ordered</p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(166,113,228,0.05)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(166,113,228,0.1)' }}>
                  <Package size={20} color="var(--blue)" />
                  <p style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.9rem' }}>{selected.product_name}</p>
                </div>
              </div>

              {/* Note */}
              {selected.note && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Note from Customer</p>
                  <div style={{ background: 'rgba(52,152,219,0.05)', borderLeft: '3px solid var(--blue)', borderRadius: '0 8px 8px 0', padding: '12px 14px' }}>
                    <p style={{ fontSize: '0.86rem', color: 'var(--navy)', lineHeight: 1.6, fontStyle: 'italic' }}>{selected.note}</p>
                  </div>
                </div>
              )}

              {/* Assignment */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Assignment</p>
                {[
                  { label: 'Sales Rep', value: selected.assigned_sales?.full_name || 'Unassigned' },
                  { label: 'Rider',     value: selected.assigned_rider?.full_name || 'Unassigned' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(166,113,228,0.04)', borderRadius: '7px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--gray)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--navy)', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}