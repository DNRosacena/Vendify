import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Clock, CheckCircle, Truck, Star, XCircle,
         RefreshCw, ChevronDown, Search, User, Phone, MapPin, X,
         MessageCircle, MapPinned, Receipt, Info, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabase';
import { formatDate, statusLabel } from '../../lib/utils';
import OrderChat from '../../components/OrderChat';
import AdminProducts from './AdminProducts';

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const riderIcon = L.divIcon({
  className: '',
  html: '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#a671e4,#fe78e3);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(166,113,228,0.5);">🏍️</div>',
  iconSize:   [36, 36],
  iconAnchor: [18, 18],
});

const STATUSES = ['pending', 'confirmed', 'in_production', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_COLORS = {
  pending: '#3498DB', confirmed: '#2ECC71', in_production: '#a671e4',
  out_for_delivery: '#fe78e3', delivered: '#27AE60', cancelled: '#95A5A6',
};

const STATUS_ICONS = { pending: Clock, confirmed: CheckCircle, in_production: Star, out_for_delivery: Truck, delivered: CheckCircle, cancelled: XCircle };

const DRAWER_TABS = [
  { id: 'details',    label: 'Details',    Icon: Info        },
  { id: 'chat',       label: 'Chat',       Icon: MessageCircle },
  { id: 'rider',      label: 'Rider',      Icon: MapPinned   },
  { id: 'financials', label: 'Financials', Icon: Receipt     },
];

// Recenter map when rider position changes
function LiveRiderMarker({ position }) {
  const map = useMap();
  useEffect(() => { map.setView(position, map.getZoom()); }, [position]);
  return <Marker position={position} icon={riderIcon}><Popup>Rider</Popup></Marker>;
}

// All-riders map component
function AllRidersMap() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const loadRiders = async () => {
    const { data } = await supabase
      .from('rider_locations')
      .select('*, rider:rider_id(full_name)')
      .order('updated_at', { ascending: false });
    setRiders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRiders();
    channelRef.current = supabase
      .channel('all_rider_locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_locations' }, loadRiders)
      .subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  function lastSeen(updatedAt) {
    if (!updatedAt) return '';
    const diff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'500px', color:'var(--gray)', fontSize:'0.9rem' }}>Loading rider locations…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Badge */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <div style={{ background:'var(--navy)', color:'white', borderRadius:'20px', padding:'4px 14px', fontSize:'0.78rem', fontWeight:700, display:'flex', alignItems:'center', gap:'6px' }}>
          🏍️ {riders.length} active rider{riders.length !== 1 ? 's' : ''}
        </div>
        <button onClick={loadRiders} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 12px', border:'1px solid rgba(166,113,228,0.2)', borderRadius:'8px', fontSize:'0.78rem', fontWeight:600, color:'var(--navy)', background:'white', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Map */}
      <div style={{ borderRadius:'12px', overflow:'hidden', border:'1px solid rgba(166,113,228,0.12)', height:'500px' }}>
        {riders.length === 0 ? (
          <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', background:'#f9f9ff' }}>
            <span style={{ fontSize:'2.5rem' }}>📍</span>
            <p style={{ fontWeight:700, color:'var(--navy)' }}>No active riders</p>
            <p style={{ fontSize:'0.82rem', color:'var(--gray)' }}>Riders appear here when location sharing is ON</p>
          </div>
        ) : (
          <MapContainer
            center={[riders[0].latitude, riders[0].longitude]}
            zoom={12}
            style={{ height:'100%', width:'100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
              subdomains="abcd"
            />
            {riders.map(r => (
              <Marker key={r.rider_id} position={[r.latitude, r.longitude]} icon={riderIcon}>
                <Popup>
                  <div style={{ fontFamily:'Inter,sans-serif', minWidth:'140px' }}>
                    <p style={{ fontWeight:700, color:'var(--navy)', marginBottom:'4px' }}>🏍️ {r.rider?.full_name || 'Rider'}</p>
                    <p style={{ fontSize:'0.75rem', color:'var(--gray)', marginBottom:'2px' }}>{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</p>
                    {r.updated_at && <p style={{ fontSize:'0.72rem', color:'var(--gray)' }}>Updated {lastSeen(r.updated_at)}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Rider list */}
      {riders.length > 0 && (
        <div style={{ background:'white', borderRadius:'12px', border:'1px solid rgba(166,113,228,0.12)', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(166,113,228,0.08)' }}>
            <p style={{ fontSize:'0.70rem', fontWeight:700, color:'var(--gray)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Active Riders</p>
          </div>
          {riders.map(r => (
            <div key={r.rider_id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 20px', borderBottom:'1px solid rgba(166,113,228,0.06)' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#a671e4,#fe78e3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🏍️</div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, color:'var(--navy)', fontSize:'0.88rem' }}>{r.rider?.full_name || 'Rider'}</p>
                <p style={{ fontSize:'0.75rem', color:'var(--gray)' }}>{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</p>
              </div>
              {r.updated_at && <span style={{ fontSize:'0.72rem', color:'var(--gray)', flexShrink:0 }}>Updated {lastSeen(r.updated_at)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate   = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [adminUser,setAdminUser]= useState(null);

  // Drawer state
  const [drawerTab,    setDrawerTab]    = useState('details');
  const [riderLoc,     setRiderLoc]     = useState(null);
  const [breakdown,    setBreakdown]    = useState([]);
  const [loadingBD,    setLoadingBD]    = useState(false);
  const [salesRepOverride, setSalesRepOverride] = useState('');
  const [riderOverride,    setRiderOverride]    = useState('');
  const [savingFinancials, setSavingFinancials] = useState(false);

  // Delete
  const [deleteTarget,   setDeleteTarget]   = useState(null); // order to delete
  const [newLabel,     setNewLabel]     = useState('');
  const [newAmount,    setNewAmount]    = useState('');
  const [addingItem,   setAddingItem]   = useState(false);

  const riderChannelRef = useRef(null);

  // Sales History state
  const [view,           setView]          = useState('orders'); // 'orders' | 'history' | 'products'
  const [reports,        setReports]       = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [genYear,        setGenYear]       = useState(new Date().getFullYear());
  const [genMonth,       setGenMonth]      = useState(new Date().getMonth() + 1);
  const [generating,     setGenerating]    = useState(false);

  useEffect(() => { loadAll(); }, []);

  // When selected order changes, reset drawer
  useEffect(() => {
    if (!selected) return;
    setDrawerTab('details');
    setSalesRepOverride(selected.sales_rep_commission_override != null ? String(selected.sales_rep_commission_override) : '');
    setRiderOverride(selected.rider_commission_override != null ? String(selected.rider_commission_override) : '');
    loadBreakdown(selected.id);
    loadRiderLoc(selected);
  }, [selected?.id]);

  // Cleanup rider channel on close
  useEffect(() => {
    if (!selected && riderChannelRef.current) {
      supabase.removeChannel(riderChannelRef.current);
      riderChannelRef.current = null;
    }
  }, [selected]);

  const loadAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile  } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (profile) setAdminUser(profile);

    const { data } = await supabase
      .from('orders')
      .select('*, product:product_id(name, image_url), assigned_sales:assigned_sales_id(full_name), assigned_rider:assigned_rider_id(full_name)')
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/admin/login'); };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(true);
    await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selected?.id === orderId) setSelected(prev => ({ ...prev, status: newStatus }));
    setUpdating(false);
  };

  // ── Rider location ────────────────────────────────────────
  const loadRiderLoc = async (order) => {
    setRiderLoc(null);
    if (!order.assigned_rider_id) return;

    if (riderChannelRef.current) {
      supabase.removeChannel(riderChannelRef.current);
      riderChannelRef.current = null;
    }

    const { data } = await supabase.from('rider_locations').select('latitude, longitude')
      .eq('rider_id', order.assigned_rider_id).maybeSingle();
    if (data) setRiderLoc([data.latitude, data.longitude]);

    riderChannelRef.current = supabase
      .channel(`admin_rider_${order.assigned_rider_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_locations', filter: `rider_id=eq.${order.assigned_rider_id}` }, async () => {
        const { data: u } = await supabase.from('rider_locations').select('latitude, longitude')
          .eq('rider_id', order.assigned_rider_id).maybeSingle();
        if (u) setRiderLoc([u.latitude, u.longitude]);
      })
      .subscribe();
  };

  // ── Breakdown ─────────────────────────────────────────────
  const loadBreakdown = async (orderId) => {
    setLoadingBD(true);
    const { data } = await supabase.from('order_breakdown').select('*').eq('order_id', orderId).order('sort');
    setBreakdown(data || []);
    setLoadingBD(false);
  };

  const addBreakdownItem = async () => {
    if (!newLabel.trim() || !parseFloat(newAmount)) return;
    setAddingItem(true);
    await supabase.from('order_breakdown').insert({
      order_id: selected.id,
      label:    newLabel.trim(),
      amount:   parseFloat(newAmount),
      sort:     breakdown.length,
    });
    setNewLabel(''); setNewAmount('');
    await loadBreakdown(selected.id);
    setAddingItem(false);
  };

  const deleteBreakdownItem = async (itemId) => {
    await supabase.from('order_breakdown').delete().eq('id', itemId);
    await loadBreakdown(selected.id);
  };

  // ── Sales History ─────────────────────────────────────────
  const loadReports = async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('sales_reports')
      .select('*')
      .order('month_year', { ascending: false });
    setReports(data || []);
    setLoadingReports(false);
  };

  // Compute final commissions (mirrors OrderModel Dart logic)
  const _computeFinancials = (o) => {
    const commA      = o.commission_a       || 0;
    const commB      = o.amount_received != null ? (o.amount_received - (o.product_base_price || 0)) : 0;
    const feeA       = o.delivery_fee_a     || 0;
    const feeB       = o.delivery_area === 'outside_ncr' ? 700 : 500;
    const riderBase  = feeA + feeB;
    const salesBase  = commA + commB;
    const salesComp  = o.delivery_fee_paid_by === 'employee' ? salesBase - riderBase : salesBase;
    const salesFinal = o.sales_rep_commission_override ?? salesComp;
    const riderFinal = o.rider_commission_override     ?? riderBase;
    const profit     = (o.amount_received || 0) - salesFinal - riderFinal;
    return { salesFinal, riderFinal, profit };
  };

  const _buildCSV = (rows) => {
    const header = [
      'Reference', 'Customer Name', 'Contact Number', 'Address', 'Landmark',
      'Product', 'Sales Rep', 'Rider', 'Status', 'Order Date',
      'Amount Received (₱)', 'Delivery Area', 'Delivery Paid By',
      'Employee Commission (₱)', 'Rider Commission (₱)', 'Company Profit (₱)',
    ];
    const body = rows.map(o => {
      const { salesFinal, riderFinal, profit } = _computeFinancials(o);
      return [
      o.reference_code,
      o.customer_name,
      o.contact_number,
      o.address,
      o.landmark || '',
      o.product_name,
      o.assigned_sales?.full_name || '—',
      o.assigned_rider?.full_name || '—',
      statusLabel(o.status).en,
      new Date(o.created_at).toLocaleDateString('en-PH'),
      o.amount_received ?? '',
      o.delivery_area === 'outside_ncr' ? 'Outside NCR' : 'NCR',
      o.delivery_fee_paid_by === 'employee' ? 'Employee' : 'Customer',
      salesFinal.toFixed(2),
      riderFinal.toFixed(2),
      profit.toFixed(2),
    ];});
    return [header, ...body]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
  };

  const _triggerDownload = (csv, filename) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const _fetchMonthOrders = async (year, month) => {
    const mm    = String(month).padStart(2, '0');
    const start = `${year}-${mm}-01T00:00:00`;
    const end   = new Date(year, month, 1).toISOString();
    const { data } = await supabase
      .from('orders')
      .select('*, assigned_sales:assigned_sales_id(full_name), assigned_rider:assigned_rider_id(full_name)')
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at');
    return data || [];
  };

  const generateReport = async () => {
    setGenerating(true);
    const mm        = String(genMonth).padStart(2, '0');
    const monthYear = `${genYear}-${mm}`;
    const rows      = await _fetchMonthOrders(genYear, genMonth);
    const csv       = _buildCSV(rows);
    _triggerDownload(csv, `vendify-sales-${monthYear}.csv`);

    const totalCommission = rows.reduce((s, o) => s + _computeFinancials(o).salesFinal, 0);
    await supabase.from('sales_reports').upsert({
      month_year:       monthYear,
      generated_at:     new Date().toISOString(),
      generated_by:     adminUser?.full_name || 'Admin',
      order_count:      rows.length,
      total_commission: totalCommission,
    }, { onConflict: 'month_year' });

    await loadReports();
    setGenerating(false);
  };

  const downloadReport = async (monthYear) => {
    const [y, m] = monthYear.split('-').map(Number);
    const rows   = await _fetchMonthOrders(y, m);
    _triggerDownload(_buildCSV(rows), `vendify-sales-${monthYear}.csv`);
  };

  const saveFinancials = async () => {
    setSavingFinancials(true);
    const fields = {
      sales_rep_commission_override: salesRepOverride.trim() !== '' ? parseFloat(salesRepOverride) : null,
      rider_commission_override:     riderOverride.trim()    !== '' ? parseFloat(riderOverride)    : null,
      updated_at: new Date().toISOString(),
    };
    await supabase.from('orders').update(fields).eq('id', selected.id);
    setOrders(prev => prev.map(o => o.id === selected.id ? { ...o, ...fields } : o));
    setSelected(prev => ({ ...prev, ...fields }));
    setSavingFinancials(false);
  };

  // ── Delete order ──────────────────────────────────────────
  const handleDeleteOrder = async (password) => {
    const email = adminUser?.email;
    if (!email) return 'Admin email not found.';

    // Re-authenticate
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) return 'Incorrect password. Deletion cancelled.';

    // Delete
    const { error: delErr } = await supabase.from('orders').delete().eq('id', deleteTarget.id);
    if (delErr) return delErr.message;

    setOrders(prev => prev.filter(o => o.id !== deleteTarget.id));
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    return null; // success
  };

  // ── Stats (current month only) ─────────────────────────────
  const _now        = new Date();
  const _monthStart = new Date(_now.getFullYear(), _now.getMonth(), 1).toISOString();
  const _monthLabel = _now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const monthOrders = orders.filter(o => o.created_at >= _monthStart);
  const stats = STATUSES.reduce((acc, s) => {
    acc[s] = monthOrders.filter(o => o.status === s).length;
    return acc;
  }, {});

  // Past 24 months for the report generator
  const pastMonths = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(_now.getFullYear(), _now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const filtered = orders.filter(o => {
    const matchFilter = filter === 'all' || o.status === filter;
    const matchSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.reference_code?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const bdTotal = breakdown.reduce((s, i) => s + Number(i.amount), 0);

  // ── Render ────────────────────────────────────────────────
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
            <p style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{adminUser?.full_name || 'Admin'}</p>
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>ADMINISTRATOR</p>
          </div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', padding: '7px 12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '28px 24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '3px' }}>
              {view === 'orders' ? 'Orders' : view === 'history' ? 'Sales History' : view === 'products' ? 'Products' : 'Rider Map'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>
              {view === 'orders' ? `${orders.length} total orders` : view === 'history' ? `${reports.length} report${reports.length !== 1 ? 's' : ''} generated` : view === 'products' ? 'Manage your product catalog' : 'Live rider locations'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* View toggle */}
            {[{ id: 'orders', label: 'Orders' }, { id: 'history', label: 'Sales History' }, { id: 'products', label: 'Products' }, { id: 'map', label: '🗺 Rider Map' }].map(({ id, label }) => (
              <button key={id}
                onClick={() => { setView(id); if (id === 'history') loadReports(); }}
                style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: view === id ? '1px solid var(--blue)' : '1px solid rgba(166,113,228,0.2)', background: view === id ? 'var(--navy)' : 'white', color: view === id ? 'white' : 'var(--navy)', transition: 'all 0.15s' }}
              >{label}</button>
            ))}
            {view === 'orders' && (
              <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.82rem', color: 'var(--navy)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                <RefreshCw size={13} /> Refresh
              </button>
            )}
          </div>
        </div>

        {/* Stats — current month only (hidden on Products/Map view) */}
        {view !== 'products' && view !== 'map' && <>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{_monthLabel} Stats</p>
            <div style={{ height: '1px', flex: 1, background: 'rgba(166,113,228,0.12)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {[
              { key: 'all', label: 'This Month', count: monthOrders.length, color: 'var(--navy)' },
              ...STATUSES.map(s => ({ key: s, label: statusLabel(s).en, count: stats[s] || 0, color: STATUS_COLORS[s] })),
            ].map(({ key, label, count, color }) => (
              <button key={key} onClick={() => { setView('orders'); setFilter(key); }}
                style={{ background: filter === key && view === 'orders' ? 'var(--navy)' : 'white', border: `1px solid ${filter === key && view === 'orders' ? 'var(--navy)' : 'rgba(166,113,228,0.12)'}`, borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                <p style={{ fontSize: '1.6rem', fontWeight: 900, color: filter === key && view === 'orders' ? 'white' : color, lineHeight: 1, marginBottom: '4px' }}>{count}</p>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: filter === key && view === 'orders' ? 'rgba(255,255,255,0.55)' : 'var(--gray)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
              </button>
            ))}
          </div>
        </>}

        {/* ── Sales History view ── */}
        {view === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Generate card */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(166,113,228,0.12)', padding: '22px 24px' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>Generate Monthly Report</p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={`${genYear}-${String(genMonth).padStart(2,'0')}`}
                  onChange={e => { const [y,m] = e.target.value.split('-'); setGenYear(+y); setGenMonth(+m); }}
                  style={{ padding: '9px 12px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', fontSize: '0.88rem', fontFamily: 'Inter, sans-serif', color: 'var(--navy)', outline: 'none', cursor: 'pointer' }}
                >
                  {pastMonths.map(({ year, month }) => {
                    const val = `${year}-${String(month).padStart(2,'0')}`;
                    const lbl = new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
                    return <option key={val} value={val}>{lbl}</option>;
                  })}
                </select>
                <button onClick={generateReport} disabled={generating}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', background: generating ? 'rgba(166,113,228,0.1)' : 'linear-gradient(135deg, var(--blue), var(--red))', color: generating ? 'var(--gray)' : 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {generating ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating…</> : <><Package size={14} /> Generate & Download</>}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: '10px' }}>
                Generates a CSV with all orders for the selected month. Re-generating an existing month updates its record.
              </p>
            </div>

            {/* Reports list */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(166,113,228,0.12)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(166,113,228,0.08)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Report History</p>
              </div>
              {loadingReports ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading…</div>
              ) : reports.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <p style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</p>
                  <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>No reports generated yet. Generate your first report above.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(166,113,228,0.08)' }}>
                      {['Month', 'Orders', 'Total Commission', 'Generated By', 'Generated On', ''].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.70rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(166,113,228,0.06)' }}>
                        <td style={{ padding: '13px 16px', fontWeight: 700, color: 'var(--navy)' }}>
                          {new Date(r.month_year + '-01').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '13px 16px', color: 'var(--navy)' }}>{r.order_count}</td>
                        <td style={{ padding: '13px 16px', color: 'var(--navy)', fontWeight: 600 }}>
                          ₱{Number(r.total_commission || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '13px 16px', color: 'var(--gray)' }}>{r.generated_by}</td>
                        <td style={{ padding: '13px 16px', color: 'var(--gray)', fontSize: '0.80rem', whiteSpace: 'nowrap' }}>
                          {new Date(r.generated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <button onClick={() => downloadReport(r.month_year)}
                            style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600, background: 'rgba(166,113,228,0.08)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            ↓ CSV
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Products view ── */}
        {view === 'products' && <AdminProducts />}

        {/* ── Rider Map view ── */}
        {view === 'map' && <AllRidersMap />}

        {/* Table — orders view only */}
        {view === 'orders' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(166,113,228,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(166,113,228,0.08)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} color="var(--gray)" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                placeholder="Search orders, customers, products…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid rgba(166,113,228,0.15)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontFamily: 'Inter, sans-serif', color: 'var(--navy)' }}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.15)'}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray)', flexShrink: 0 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray)' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid rgba(166,113,228,0.2)', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
              Loading orders…
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
                  {filtered.map(order => {
                    const Icon = STATUS_ICONS[order.status] || Package;
                    return (
                      <tr key={order.id}
                        style={{ borderBottom: '1px solid rgba(166,113,228,0.06)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(166,113,228,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setSelected(order)}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.82rem' }}>{order.reference_code}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '1px' }}>{order.customer_name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{order.contact_number}</p>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--navy)' }}>{order.product_name}</td>
                        <td style={{ padding: '14px 16px', color: 'var(--gray)', whiteSpace: 'nowrap', fontSize: '0.80rem' }}>
                          {new Date(order.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <select value={order.status} onChange={e => handleStatusUpdate(order.id, e.target.value)} disabled={updating}
                              style={{ appearance: 'none', padding: '5px 26px 5px 10px', borderRadius: '20px', border: `1px solid ${STATUS_COLORS[order.status]}44`, background: `${STATUS_COLORS[order.status]}12`, color: STATUS_COLORS[order.status], fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                              {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s).en}</option>)}
                            </select>
                            <ChevronDown size={11} color={STATUS_COLORS[order.status]} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setSelected(order)}
                              style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600, background: 'rgba(166,113,228,0.08)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              View
                            </button>
                            <button onClick={() => setDeleteTarget(order)}
                              style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '6px', cursor: 'pointer' }}
                              title="Delete order">
                              <Trash2 size={13} color="#E74C3C" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── Order detail drawer ── */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,7,24,0.5)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', background: 'white', zIndex: 201, boxShadow: '-8px 0 40px rgba(17,7,24,0.2)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s ease' }}>

            {/* Drawer header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(166,113,228,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>{selected.reference_code}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{formatDate(selected.created_at)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'flex', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(166,113,228,0.1)', flexShrink: 0 }}>
              {DRAWER_TABS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setDrawerTab(id)}
                  style={{ flex: 1, padding: '12px 4px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', borderBottom: drawerTab === id ? '2px solid var(--blue)' : '2px solid transparent', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                  <Icon size={16} color={drawerTab === id ? 'var(--blue)' : 'var(--gray)'} />
                  <span style={{ fontSize: '0.68rem', fontWeight: drawerTab === id ? 700 : 500, color: drawerTab === id ? 'var(--blue)' : 'var(--gray)', letterSpacing: '0.04em' }}>{label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

              {/* ── Details ── */}
              {drawerTab === 'details' && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Status update */}
                  <div style={{ background: 'rgba(166,113,228,0.05)', border: '1px solid rgba(166,113,228,0.12)', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Update Status</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {STATUSES.map(s => (
                        <button key={s} onClick={() => handleStatusUpdate(selected.id, s)} disabled={updating}
                          style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${s === selected.status ? STATUS_COLORS[s] : 'rgba(166,113,228,0.15)'}`, background: s === selected.status ? `${STATUS_COLORS[s]}15` : 'transparent', color: s === selected.status ? STATUS_COLORS[s] : 'var(--gray)', fontSize: '0.75rem', fontWeight: s === selected.status ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          {statusLabel(s).en}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Customer info */}
                  <InfoSection title="Customer Info" rows={[
                    { Icon: User,   label: 'Name',    value: selected.customer_name },
                    { Icon: Phone,  label: 'Contact', value: selected.contact_number },
                    { Icon: MapPin, label: 'Address', value: selected.address },
                    { Icon: MapPin, label: 'Landmark',value: selected.landmark || '—' },
                  ]} />

                  {/* Product */}
                  <InfoSection title="Product" rows={[
                    { Icon: Package, label: 'Product', value: selected.product_name },
                  ]} />

                  {/* Note */}
                  {selected.note && (
                    <div>
                      <p style={sectionLabelStyle}>Note from Customer</p>
                      <div style={{ background: 'rgba(52,152,219,0.05)', borderLeft: '3px solid var(--blue)', borderRadius: '0 8px 8px 0', padding: '12px 14px', marginTop: '8px' }}>
                        <p style={{ fontSize: '0.86rem', color: 'var(--navy)', lineHeight: 1.6, fontStyle: 'italic' }}>{selected.note}</p>
                      </div>
                    </div>
                  )}

                  {/* Assignment */}
                  <InfoSection title="Assignment" rows={[
                    { Icon: User, label: 'Sales Rep', value: selected.assigned_sales?.full_name || 'Set by customer' },
                    { Icon: Truck,label: 'Rider',     value: selected.assigned_rider?.full_name || 'Unassigned' },
                  ]} />
                </div>
              )}

              {/* ── Chat ── */}
              {drawerTab === 'chat' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <OrderChat
                    orderId={selected.id}
                    senderName={adminUser?.full_name || 'Admin'}
                    senderType="user"
                    senderId={adminUser?.id || null}
                  />
                </div>
              )}

              {/* ── Rider ── */}
              {drawerTab === 'rider' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {!selected.assigned_rider_id ? (
                    <EmptyState icon="🏍️" text="No rider assigned yet" />
                  ) : riderLoc ? (
                    <MapContainer center={riderLoc} zoom={15} style={{ flex: 1, minHeight: '300px' }} scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                      <LiveRiderMarker position={riderLoc} />
                      {selected.landmark_lat && selected.landmark_lng && (
                        <Marker position={[selected.landmark_lat, selected.landmark_lng]}>
                          <Popup>Delivery destination</Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  ) : (
                    <EmptyState icon="📡" text="Rider hasn't shared location yet" />
                  )}
                  {selected.assigned_rider?.full_name && (
                    <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(166,113,228,0.1)', fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 600 }}>
                      🏍️ {selected.assigned_rider.full_name}
                    </div>
                  )}
                </div>
              )}

              {/* ── Financials ── */}
              {drawerTab === 'financials' && (() => {
                const o = selected;
                const commA     = o.commission_a       || 0;
                const commB     = o.amount_received != null ? (o.amount_received - (o.product_base_price || 0)) : 0;
                const feeA      = o.delivery_fee_a     || 0;
                const feeB      = o.delivery_area === 'outside_ncr' ? 700 : 500;
                const riderBase = feeA + feeB;
                const salesBase = commA + commB;
                const salesComp = o.delivery_fee_paid_by === 'employee' ? salesBase - riderBase : salesBase;
                const salesFinal = o.sales_rep_commission_override ?? salesComp;
                const riderFinal = o.rider_commission_override     ?? riderBase;
                const profit     = (o.amount_received || 0) - salesFinal - riderFinal;

                const commRow = (label, value, highlight) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid rgba(166,113,228,0.07)' }}>
                    <span style={{ fontSize: '0.82rem', color: highlight ? 'var(--navy)' : 'var(--gray)' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: highlight ? 'var(--blue)' : 'var(--navy)' }}>₱{Number(value).toFixed(2)}</span>
                  </div>
                );

                return (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Order summary */}
                  {o.amount_received != null && (
                    <div style={{ background: 'rgba(166,113,228,0.05)', border: '1px solid rgba(166,113,228,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
                      {commRow('Amount Received', o.amount_received)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid rgba(166,113,228,0.07)' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>Delivery Paid By</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: o.delivery_fee_paid_by === 'employee' ? '#E67E22' : 'var(--navy)' }}>
                          {o.delivery_fee_paid_by === 'employee' ? 'Employee' : 'Customer'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>Delivery Area</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)' }}>
                          {o.delivery_area === 'outside_ncr' ? 'Outside NCR  ₱700' : 'NCR  ₱500'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Employee commission */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <p style={sectionLabelStyle}>Employee Commission</p>
                      {o.sales_rep_commission_override != null && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--blue)', background: 'rgba(166,113,228,0.12)', padding: '2px 7px', borderRadius: '10px', letterSpacing: '0.05em' }}>OVERRIDE</span>
                      )}
                    </div>
                    <div style={{ border: '1px solid rgba(166,113,228,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
                      {commRow('A  (Product commission)', commA)}
                      {commRow('B  (Overtop tip)', commB)}
                      {o.delivery_fee_paid_by === 'employee' && commRow('− Rider fee (employee shoulders)', -riderBase)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', background: 'rgba(166,113,228,0.06)', borderTop: '2px solid rgba(166,113,228,0.12)' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)' }}>{o.sales_rep_commission_override != null ? 'Final (override)' : 'Total'}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--blue)' }}>₱{salesFinal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rider commission */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <p style={sectionLabelStyle}>Rider Commission</p>
                      {o.rider_commission_override != null && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--blue)', background: 'rgba(166,113,228,0.12)', padding: '2px 7px', borderRadius: '10px', letterSpacing: '0.05em' }}>OVERRIDE</span>
                      )}
                    </div>
                    <div style={{ border: '1px solid rgba(166,113,228,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
                      {commRow('A  (Product delivery fee)', feeA)}
                      {commRow('B  (Area fee)', feeB)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', background: 'rgba(166,113,228,0.06)', borderTop: '2px solid rgba(166,113,228,0.12)' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)' }}>{o.rider_commission_override != null ? 'Final (override)' : 'Total'}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--blue)' }}>₱{riderFinal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(166,113,228,0.07)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Company Profit</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--blue)' }}>₱{profit.toFixed(2)}</span>
                  </div>

                  {/* Admin overrides */}
                  <div>
                    <p style={{ ...sectionLabelStyle, marginBottom: '8px' }}>Commission Overrides <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '0.72rem' }}>(leave blank to use computed)</span></p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--gray)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sales Rep Override</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)', fontSize: '0.85rem' }}>₱</span>
                          <input type="number" min="0" step="0.01" value={salesRepOverride} onChange={e => setSalesRepOverride(e.target.value)} placeholder="0.00"
                            style={{ width: '100%', padding: '8px 10px 8px 26px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', fontSize: '0.86rem', fontFamily: 'Inter,sans-serif', outline: 'none', color: 'var(--navy)', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--gray)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Rider Override</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)', fontSize: '0.85rem' }}>₱</span>
                          <input type="number" min="0" step="0.01" value={riderOverride} onChange={e => setRiderOverride(e.target.value)} placeholder="0.00"
                            style={{ width: '100%', padding: '8px 10px 8px 26px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', fontSize: '0.86rem', fontFamily: 'Inter,sans-serif', outline: 'none', color: 'var(--navy)', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    </div>
                    <button onClick={saveFinancials} disabled={savingFinancials}
                      style={{ width: '100%', padding: '10px', background: savingFinancials ? 'rgba(166,113,228,0.1)' : 'linear-gradient(135deg,var(--blue),var(--red))', color: savingFinancials ? 'var(--gray)' : 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.86rem', cursor: savingFinancials ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif' }}>
                      {savingFinancials ? 'Saving…' : 'Save Overrides'}
                    </button>
                  </div>

                  {/* Breakdown */}
                  <div>
                    <p style={sectionLabelStyle}>Order Breakdown</p>

                    {/* Add item row */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', marginBottom: '12px' }}>
                      <input
                        value={newLabel} onChange={e => setNewLabel(e.target.value)}
                        placeholder="Item label…"
                        style={{ flex: 2, padding: '8px 12px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '7px', fontSize: '0.84rem', fontFamily: 'Inter, sans-serif', outline: 'none', color: 'var(--navy)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.2)'}
                      />
                      <input
                        type="number" min="0" step="0.01"
                        value={newAmount} onChange={e => setNewAmount(e.target.value)}
                        placeholder="Amount"
                        style={{ flex: 1.2, padding: '8px 12px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '7px', fontSize: '0.84rem', fontFamily: 'Inter, sans-serif', outline: 'none', color: 'var(--navy)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.2)'}
                        onKeyDown={e => e.key === 'Enter' && addBreakdownItem()}
                      />
                      <button onClick={addBreakdownItem} disabled={addingItem || !newLabel.trim() || !parseFloat(newAmount)}
                        style={{ padding: '8px 12px', background: 'rgba(166,113,228,0.1)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Plus size={16} color="var(--blue)" />
                      </button>
                    </div>

                    {/* Items list */}
                    {loadingBD ? (
                      <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Loading…</p>
                    ) : breakdown.length === 0 ? (
                      <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>No items yet.</p>
                    ) : (
                      <div style={{ border: '1px solid rgba(166,113,228,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
                        {breakdown.map((item, i) => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderBottom: i < breakdown.length - 1 ? '1px solid rgba(166,113,228,0.08)' : 'none' }}>
                            <span style={{ flex: 1, fontSize: '0.86rem', color: 'var(--navy)' }}>{item.label}</span>
                            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--navy)', marginRight: '10px' }}>₱{Number(item.amount).toFixed(2)}</span>
                            <button onClick={() => deleteBreakdownItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                              <Trash2 size={14} color="var(--gray)" />
                            </button>
                          </div>
                        ))}
                        {/* Total */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'rgba(166,113,228,0.04)', borderTop: '2px solid rgba(166,113,228,0.1)' }}>
                          <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total</span>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--blue)' }}>₱{bdTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          order={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteOrder}
        />
      )}

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────
const sectionLabelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 0,
};

function InfoSection({ title, rows }) {
  return (
    <div>
      <p style={sectionLabelStyle}>{title}</p>
      <div style={{ marginTop: '8px', border: '1px solid rgba(166,113,228,0.1)', borderRadius: '9px', overflow: 'hidden' }}>
        {rows.map(({ Icon, label, value }) => (
          <div key={label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 14px', borderBottom: '1px solid rgba(166,113,228,0.06)' }}>
            <div style={{ width: '28px', height: '28px', background: 'rgba(166,113,228,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={13} color="var(--blue)" />
            </div>
            <div>
              <p style={{ fontSize: '0.66rem', color: 'var(--gray)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
              <p style={{ fontSize: '0.86rem', color: 'var(--navy)', fontWeight: 500, lineHeight: 1.4 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', padding: '40px', color: 'var(--gray)', fontSize: '0.9rem' }}>
      <span style={{ fontSize: '2.5rem' }}>{icon}</span>
      <p>{text}</p>
    </div>
  );
}

// ── Delete confirmation modal ──────────────────────────────────
function DeleteConfirmModal({ order, onClose, onConfirm }) {
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [deleting,  setDeleting]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setError('Password is required.'); return; }
    setDeleting(true);
    setError('');
    const err = await onConfirm(password);
    if (err) { setError(err); setDeleting(false); }
    // on success onConfirm sets deleteTarget to null, unmounting this modal
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,7,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 400 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '440px', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(17,7,24,0.25)', zIndex: 401, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(231,76,60,0.12)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(231,76,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} color="#E74C3C" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy)' }}>Delete Order</p>
            <p style={{ fontSize: '0.74rem', color: 'var(--gray)' }}>{order.reference_code} · {order.customer_name}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--gray)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.86rem', color: 'var(--gray)', lineHeight: 1.6 }}>
            This will <strong style={{ color: '#E74C3C' }}>permanently delete</strong> this order and cannot be undone.
            Enter your admin password to confirm.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.05em', marginBottom: '6px' }}>ADMIN PASSWORD</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter your password"
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${error ? '#E74C3C' : 'rgba(166,113,228,0.2)'}`, borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Inter,sans-serif', outline: 'none', color: 'var(--navy)', boxSizing: 'border-box' }}
            />
            {error && <p style={{ fontSize: '0.78rem', color: '#E74C3C', marginTop: '5px' }}>{error}</p>}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={deleting}
              style={{ flex: 1, padding: '11px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '9px', background: 'none', color: 'var(--gray)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              Cancel
            </button>
            <button type="submit" disabled={deleting || !password.trim()}
              style={{ flex: 1.5, padding: '11px', border: 'none', borderRadius: '9px', background: deleting || !password.trim() ? 'rgba(231,76,60,0.15)' : '#E74C3C', color: deleting || !password.trim() ? 'rgba(231,76,60,0.4)' : 'white', fontWeight: 700, fontSize: '0.88rem', cursor: deleting || !password.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif' }}>
              {deleting ? 'Verifying…' : 'Delete Order'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
