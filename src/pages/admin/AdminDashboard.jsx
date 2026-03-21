import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Clock, CheckCircle, Truck, Star, XCircle,
         RefreshCw, ChevronDown, Search, User, Phone, MapPin, X,
         MessageCircle, MapPinned, Receipt, Info, Plus, Trash2, AlertTriangle,
         Bell } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabase';
import { formatDate, statusLabel } from '../../lib/utils';
import OrderChat from '../../components/OrderChat';
import AdminProducts from './AdminProducts';
import LogoIcon from '../../components/LogoIcon';

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
const STATUS_ORDER = ['pending', 'confirmed', 'in_production', 'out_for_delivery', 'delivered'];

const isStatusBlocked = (order, newStatus) => {
  // Delivered locks everything — no changes at all
  if (order.status === 'delivered') return true;
  // Cancelled is handled with auth separately — not blocked here
  if (newStatus === 'cancelled') return false;
  // Out for delivery: only cancellation is allowed (handled above)
  if (order.status === 'out_for_delivery') return true;
  const curIdx = STATUS_ORDER.indexOf(order.status);
  const newIdx = STATUS_ORDER.indexOf(newStatus);
  if (newIdx >= curIdx) return false; // forward always ok
  if (order.status === 'confirmed' && newStatus === 'pending') return false; // exception
  return !!order.assigned_rider_id; // block reversal if rider assigned
};

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
      .select('*, rider:rider_id(full_name, is_available)')
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
              {r.rider?.is_available && (
                <span style={{ fontSize:'0.68rem', fontWeight:700, color:'#27ae60', background:'rgba(39,174,96,0.1)', padding:'2px 8px', borderRadius:'20px', flexShrink:0 }}>Available</span>
              )}
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

  // Available riders (for manual assignment)
  const [availableRiders,    setAvailableRiders]    = useState([]);
  const [assigningRider,     setAssigningRider]     = useState(false);

  // Delivery proof
  const [deliveryProof,  setDeliveryProof]  = useState(null);

  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Notifications
  const [notifs,         setNotifs]         = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifChannelRef = useRef(null);

  // Delete
  const [adminEmail,     setAdminEmail]     = useState(null);  // auth email, stored at login
  const [deleteTarget,       setDeleteTarget]       = useState(null); // order to delete
  const [cancelTarget,       setCancelTarget]       = useState(null); // order pending cancellation
  const [deleteReportTarget, setDeleteReportTarget] = useState(null); // report to delete
  const [newLabel,     setNewLabel]     = useState('');
  const [newAmount,    setNewAmount]    = useState('');
  const [addingItem,   setAddingItem]   = useState(false);

  const riderChannelRef  = useRef(null);
  const ordersChannelRef = useRef(null);

  // Activity Log state
  const [activityLog,    setActivityLog]   = useState([]);
  const [loadingLog,     setLoadingLog]    = useState(false);

  // Users state
  const [users,          setUsers]         = useState([]);
  const [loadingUsers,   setLoadingUsers]  = useState(false);
  const [usersError,     setUsersError]    = useState('');
  const [selectedUser,   setSelectedUser]  = useState(null);

  // Sales History state
  const [view,           setView]          = useState('orders'); // 'orders' | 'history' | 'products' | 'activity' | 'users' | 'map'
  const [reports,        setReports]       = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [genYear,        setGenYear]       = useState(new Date().getFullYear());
  const [genMonth,       setGenMonth]      = useState(new Date().getMonth() + 1);
  const [generating,     setGenerating]    = useState(false);

  useEffect(() => {
    loadAll();

    // Realtime orders — silently refresh the list on any change
    ordersChannelRef.current = supabase
      .channel('admin_orders_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { data } = await supabase
          .from('orders')
          .select('*, product:product_id(name, image_url), assigned_sales:assigned_sales_id(full_name), assigned_rider:assigned_rider_id(full_name)')
          .order('created_at', { ascending: false });
        if (data) setOrders(data);
      })
      .subscribe();

    return () => {
      if (notifChannelRef.current)  supabase.removeChannel(notifChannelRef.current);
      if (ordersChannelRef.current) supabase.removeChannel(ordersChannelRef.current);
    };
  }, []);

  const loadNotifs = async (userId) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifs(data || []);
  };

  const markNotifRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllNotifsRead = async (userId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const loadActivityLog = async () => {
    setLoadingLog(true);
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setActivityLog(data || []);
    setLoadingLog(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('full_name');
    if (error) setUsersError(error.message);
    setUsers(data || []);
    setLoadingUsers(false);
  };

  const logAction = async (action, description, orderId = null, refCode = null) => {
    await supabase.from('activity_log').insert({
      actor_name:     adminUser?.full_name || 'Admin',
      actor_role:     'admin',
      action,
      description,
      order_id:       orderId,
      reference_code: refCode,
    });
  };

  // When selected order changes, reset drawer
  useEffect(() => {
    if (!selected) return;
    setDrawerTab('details');
    setSalesRepOverride(selected.sales_rep_commission_override != null ? String(selected.sales_rep_commission_override) : '');
    setRiderOverride(selected.rider_commission_override != null ? String(selected.rider_commission_override) : '');
    loadBreakdown(selected.id);
    loadRiderLoc(selected);
    loadDeliveryProof(selected.id);
  }, [selected?.id]);

  const loadDeliveryProof = async (orderId) => {
    setDeliveryProof(null);
    const { data } = await supabase
      .from('delivery_confirmations')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    setDeliveryProof(data || null);
  };

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
    if (profile) {
      setAdminUser(profile);
      setAdminEmail(user?.email);
      await loadNotifs(user.id);
      // Subscribe to realtime notifications for this admin
      if (!notifChannelRef.current) {
        notifChannelRef.current = supabase
          .channel(`admin_notifs_${user.id}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          }, () => loadNotifs(user.id))
          .subscribe();
      }
    }

    const { data } = await supabase
      .from('orders')
      .select('*, product:product_id(name, image_url), assigned_sales:assigned_sales_id(full_name), assigned_rider:assigned_rider_id(full_name)')
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/admin/login'); };

  // Notify all admins + the order's sales rep (if any). Riders are excluded.
  const notifyAdminsAndSales = async (order, title, body) => {
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin').eq('is_active', true);
    const inserts = (admins || []).map(a => ({ user_id: a.id, title, body, order_id: order?.id || null }));
    if (order?.assigned_sales_id)
      inserts.push({ user_id: order.assigned_sales_id, title, body, order_id: order?.id || null });
    if (inserts.length) await supabase.from('notifications').insert(inserts);
  };

  // ── Cancel with re-auth ───────────────────────────────────
  const handleCancelOrder = async (password) => {
    if (!cancelTarget) return 'No order selected.';
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (error) return 'Incorrect password.';

    const o = cancelTarget;
    await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', o.id);
    setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, status: 'cancelled' } : ord));
    if (selected?.id === o.id) setSelected(prev => ({ ...prev, status: 'cancelled' }));
    await notifyAdminsAndSales(o, 'Order Cancelled', `${o.reference_code} has been cancelled.`);
    await logAction('status_update', `Order ${o.reference_code} cancelled`, o.id, o.reference_code);
    setCancelTarget(null);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);

    // Delivery proof permanently locks the order
    const { data: proof } = await supabase
      .from('delivery_confirmations').select('id').eq('order_id', orderId).maybeSingle();
    if (proof) {
      alert('This order has verified delivery proof and is permanently locked.');
      return;
    }

    // Cancellation requires admin re-auth — open modal instead
    if (newStatus === 'cancelled') {
      if (order?.status === 'delivered') {
        alert('A delivered order cannot be cancelled.');
        return;
      }
      setCancelTarget(order);
      return;
    }

    if (order && isStatusBlocked(order, newStatus)) {
      alert(order.status === 'out_for_delivery'
        ? '⚠️ Order is out for delivery. Only cancellation is allowed.'
        : 'Cannot revert order status once a rider has been assigned.');
      return;
    }
    setUpdating(true);
    await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selected?.id === orderId) setSelected(prev => ({ ...prev, status: newStatus }));

    const label = statusLabel(newStatus).en;
    await notifyAdminsAndSales(order, 'Status Updated / Na-update ang Status',
      `${order?.reference_code || 'Order'} status → ${label}`);

    await logAction('status_update',
      `Status changed to "${label}" for ${order?.reference_code || orderId}`,
      orderId, order?.reference_code);

    setUpdating(false);
  };

  // ── Available riders for manual assignment ────────────────
  const loadAvailableRiders = async () => {
    const { data } = await supabase.from('users')
      .select('id, full_name, phone')
      .eq('role', 'rider')
      .eq('is_available', true);
    setAvailableRiders(data || []);
  };

  const assignRider = async (riderId, riderName) => {
    if (!selected) return;
    setAssigningRider(true);
    await supabase.from('orders').update({
      assigned_rider_id: riderId,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    setOrders(prev => prev.map(o => o.id === selected.id
      ? { ...o, assigned_rider_id: riderId, assigned_rider: { full_name: riderName } }
      : o));
    setSelected(prev => ({ ...prev, assigned_rider_id: riderId, assigned_rider: { full_name: riderName } }));
    await notifyAdminsAndSales(selected, '🚚 Rider Assigned / Na-assign ang Rider',
      `Rider "${riderName}" assigned to ${selected.reference_code}.`);
    await logAction('rider_assigned',
      `Rider "${riderName}" assigned to ${selected.reference_code}`,
      selected.id, selected.reference_code);
    setAssigningRider(false);
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

  const handleDeleteReport = async (password) => {
    const email = adminEmail;
    if (!email) return 'Session expired. Please refresh the page.';
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) return 'Incorrect password. Deletion cancelled.';
    const { error: delErr } = await supabase.from('sales_reports').delete().eq('id', deleteReportTarget.id);
    if (delErr) return delErr.message;
    await logAction('report_deleted',
      `Sales report for ${deleteReportTarget.month_year} deleted`,
      null, deleteReportTarget.month_year);
    setReports(prev => prev.filter(r => r.id !== deleteReportTarget.id));
    setDeleteReportTarget(null);
    return null;
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
    await logAction('financials_saved',
      `Commission overrides saved for ${selected.reference_code}`,
      selected.id, selected.reference_code);
    setSavingFinancials(false);
  };

  // ── Delete order ──────────────────────────────────────────
  const handleDeleteOrder = async (password) => {
    const email = adminEmail;
    if (!email) return 'Session expired. Please refresh the page.';

    // Re-authenticate
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) return 'Incorrect password. Deletion cancelled.';

    // Delete related notifications first (avoids FK constraint error)
    await supabase.from('notifications').delete().eq('order_id', deleteTarget.id);

    // Delete
    const { error: delErr } = await supabase.from('orders').delete().eq('id', deleteTarget.id);
    if (delErr) return delErr.message;

    await logAction('order_deleted',
      `Order ${deleteTarget.reference_code} (${deleteTarget.customer_name}) permanently deleted`,
      null, deleteTarget.reference_code);
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
          <LogoIcon size={32} />
          <div>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>Vendify</p>
            <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Admin Dashboard</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifPanel(p => !p); if (!showNotifPanel && adminUser) markAllNotifsRead(adminUser.id); }}
              style={{ position: 'relative', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.75)', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Bell size={15} />
              {notifs.filter(n => !n.is_read).length > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#e45b8f', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifs.filter(n => !n.is_read).length > 9 ? '9+' : notifs.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
            {/* Notification dropdown */}
            {showNotifPanel && (
              <div style={{ position: 'absolute', top: '46px', right: 0, width: '320px', background: 'var(--navy)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(166,113,228,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem' }}>Notifications</span>
                  <button onClick={() => setShowNotifPanel(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px' }}><X size={14} /></button>
                </div>
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>No notifications</div>
                  ) : notifs.map(n => (
                    <div key={n.id} onClick={() => markNotifRead(n.id)}
                      style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.is_read ? 'transparent' : 'rgba(166,113,228,0.08)', cursor: 'pointer', transition: 'background 0.15s' }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        {!n.is_read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a671e4', marginTop: '5px', flexShrink: 0 }} />}
                        <div style={{ flex: 1, paddingLeft: n.is_read ? '14px' : 0 }}>
                          <p style={{ color: 'white', fontSize: '0.82rem', fontWeight: n.is_read ? 500 : 700, marginBottom: '2px' }}>{n.title}</p>
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', lineHeight: 1.4 }}>{n.body}</p>
                          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', marginTop: '4px' }}>
                            {new Date(n.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setShowProfileModal(true)} title="Edit my profile"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '6px 12px 6px 6px', cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
          >
            {adminUser?.avatar_url ? (
              <img src={adminUser.avatar_url} alt={adminUser.full_name}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(166,113,228,0.6)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#a671e4,#fe78e3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: '0.75rem' }}>
                  {adminUser?.full_name?.split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase() || 'A'}
                </span>
              </div>
            )}
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600, margin: 0 }}>{adminUser?.full_name || 'Admin'}</p>
              <p style={{ fontSize: '0.60rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', margin: 0 }}>ADMINISTRATOR</p>
            </div>
          </button>
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
              {view === 'orders' ? 'Orders' : view === 'history' ? 'Sales History' : view === 'products' ? 'Products' : view === 'activity' ? 'Activity Log' : view === 'users' ? 'Users' : 'Rider Map'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>
              {view === 'orders' ? `${orders.length} total orders` : view === 'history' ? `${reports.length} report${reports.length !== 1 ? 's' : ''} generated` : view === 'products' ? 'Manage your product catalog' : view === 'activity' ? `${activityLog.length} recent actions` : view === 'users' ? `${users.length} staff member${users.length !== 1 ? 's' : ''}` : 'Live rider locations'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* View toggle */}
            {[{ id: 'orders', label: 'Orders' }, { id: 'history', label: 'Sales History' }, { id: 'products', label: 'Products' }, { id: 'users', label: '👥 Users' }, { id: 'map', label: '🗺 Rider Map' }, { id: 'activity', label: '📋 Activity Log' }].map(({ id, label }) => (
              <button key={id}
                onClick={() => { setView(id); if (id === 'history') loadReports(); if (id === 'activity') loadActivityLog(); if (id === 'users') loadUsers(); }}
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

        {/* Stats — current month only (hidden on Products/Map/Users view) */}
        {view !== 'products' && view !== 'map' && view !== 'users' && <>
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
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={() => downloadReport(r.month_year)}
                              style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600, background: 'rgba(166,113,228,0.08)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              ↓ CSV
                            </button>
                            <button onClick={() => setDeleteReportTarget(r)}
                              style={{ fontSize: '0.78rem', color: '#E74C3C', fontWeight: 600, background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              Delete
                            </button>
                          </div>
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

        {/* ── Activity Log view ── */}
        {view === 'activity' && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(166,113,228,0.12)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(166,113,228,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>All Admin Actions</p>
              <button onClick={loadActivityLog} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--navy)', background: 'white', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            {loadingLog ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading…</div>
            ) : activityLog.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</p>
                <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>No activity recorded yet. Actions like status changes, rider assignments, and order deletions will appear here.</p>
              </div>
            ) : (
              <div>
                {activityLog.map(log => {
                  const actionColors = { status_update: '#a671e4', rider_assigned: '#27ae60', order_deleted: '#e74c3c', financials_saved: '#e67e22' };
                  const color = actionColors[log.action] || 'var(--gray)';
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px 22px', borderBottom: '1px solid rgba(166,113,228,0.06)' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <span style={{ fontSize: '0.9rem' }}>
                          {log.action === 'status_update' ? '🔄' : log.action === 'rider_assigned' ? '🏍️' : log.action === 'order_deleted' ? '🗑️' : '💰'}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.86rem', color: 'var(--navy)', fontWeight: 600, marginBottom: '2px' }}>{log.description}</p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{log.actor_name}</span>
                          {log.reference_code && (
                            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: color, background: `${color}12`, padding: '1px 7px', borderRadius: '10px', fontFamily: 'monospace' }}>{log.reference_code}</span>
                          )}
                          <span style={{ fontSize: '0.70rem', color: 'var(--gray)', marginLeft: 'auto' }}>
                            {new Date(log.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Users view ── */}
        {view === 'users' && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(166,113,228,0.12)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(166,113,228,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Staff Members</p>
              <button onClick={loadUsers} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--navy)', background: 'white', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            {loadingUsers ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>Loading…</div>
            ) : usersError ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#e74c3c', fontSize: '0.86rem', marginBottom: '10px' }}>Failed to load users: {usersError}</p>
                <p style={{ color: 'var(--gray)', fontSize: '0.78rem' }}>Make sure the <code>users</code> table has an RLS policy allowing admins to read all rows.</p>
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</p>
                <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>No users found.</p>
              </div>
            ) : (
              <div>
                {users.map(u => {
                  const roleColors = { admin: '#fe78e3', sales: '#a671e4', rider: '#27ae60' };
                  const roleColor  = roleColors[u.role] || 'var(--gray)';
                  const initials   = u.full_name
                    ? u.full_name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
                    : '?';
                  return (
                    <div key={u.id} onClick={() => setSelectedUser(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 22px', borderBottom: '1px solid rgba(166,113,228,0.06)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(166,113,228,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {/* Avatar */}
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.full_name}
                          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${roleColor}40` }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${roleColor}18`, border: `2px solid ${roleColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: roleColor }}>{initials}</span>
                        </div>
                      )}
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.92rem', margin: 0 }}>{u.full_name}</p>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: roleColor, background: `${roleColor}12`, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.05em' }}>{u.role?.toUpperCase()}</span>
                          {!u.is_active && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#e74c3c', background: 'rgba(231,76,60,0.1)', padding: '2px 8px', borderRadius: '20px' }}>INACTIVE</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '14px', marginTop: '3px', flexWrap: 'wrap' }}>
                          {u.email && <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>✉ {u.email}</span>}
                          {u.phone && <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>📞 {u.phone}</span>}
                          {u.created_at && <span style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Joined {new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        </div>
                      </div>
                      {/* Active dot */}
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: u.is_active ? '#27ae60' : '#95a5a6', flexShrink: 0 }} title={u.is_active ? 'Active' : 'Inactive'} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                          {new Date(order.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}
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
                <button key={id} onClick={() => { setDrawerTab(id); if (id === 'rider') loadAvailableRiders(); }}
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

                  {/* Delivery Proof */}
                  {deliveryProof && (
                    <div>
                      <p style={sectionLabelStyle}>Delivery Proof</p>
                      <div style={{ marginTop: '10px', background: 'rgba(39,174,96,0.05)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <CheckCircle size={14} color="#27AE60" />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#27AE60' }}>Delivery Confirmed</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--gray)' }}>
                            ₱{Number(deliveryProof.amount_received).toLocaleString('en-PH', { minimumFractionDigits: 2 })} received
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <p style={{ fontSize: '0.68rem', color: 'var(--gray)', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rider + Customer Selfie</p>
                            <a href={deliveryProof.rider_selfie_url} target="_blank" rel="noreferrer">
                              <img src={deliveryProof.rider_selfie_url} alt="Rider selfie"
                                style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(39,174,96,0.2)', cursor: 'pointer' }} />
                            </a>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.68rem', color: 'var(--gray)', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signed Receipt</p>
                            <a href={deliveryProof.receipt_url} target="_blank" rel="noreferrer">
                              <img src={deliveryProof.receipt_url} alt="Receipt"
                                style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(39,174,96,0.2)', cursor: 'pointer' }} />
                            </a>
                          </div>
                        </div>
                        <p style={{ fontSize: '0.70rem', color: 'var(--gray)' }}>
                          {new Date(deliveryProof.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · Click photos to open full size
                        </p>
                      </div>
                    </div>
                  )}
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
                    salesId={selected.assigned_sales_id}
                    riderId={selected.assigned_rider_id}
                    referenceCode={selected.reference_code}
                  />
                </div>
              )}

              {/* ── Rider ── */}
              {drawerTab === 'rider' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
                  {!selected.assigned_rider_id ? (
                    // No rider yet — show available riders for manual assignment
                    <div style={{ padding: '16px' }}>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                        Assign a Rider
                      </p>
                      {availableRiders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                          <p style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🏍️</p>
                          <p style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '4px' }}>No available riders</p>
                          <p style={{ fontSize: '0.80rem', color: 'var(--gray)' }}>Riders appear here when they toggle themselves Available in the app</p>
                        </div>
                      ) : availableRiders.map(r => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(166,113,228,0.15)', marginBottom: '8px', background: 'rgba(166,113,228,0.03)' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#a671e4,#fe78e3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🏍️</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.88rem', marginBottom: '2px' }}>{r.full_name}</p>
                            {r.phone && <p style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{r.phone}</p>}
                          </div>
                          <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#27ae60', background: 'rgba(39,174,96,0.1)', padding: '3px 8px', borderRadius: '20px', marginRight: '8px' }}>Available</span>
                          <button
                            onClick={() => assignRider(r.id, r.full_name)}
                            disabled={assigningRider}
                            style={{ padding: '7px 14px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: assigningRider ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: assigningRider ? 0.6 : 1 }}
                          >
                            {assigningRider ? '…' : 'Assign'}
                          </button>
                        </div>
                      ))}
                    </div>
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
                    <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(166,113,228,0.1)', fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 600, flexShrink: 0 }}>
                      🏍️ {selected.assigned_rider.full_name}
                    </div>
                  )}
                </div>
              )}

              {/* ── Financials ── */}
              {drawerTab === 'financials' && (() => {
                const o = selected;
                const effectiveAmount = o.amount_received ?? deliveryProof?.amount_received ?? null;
                const commA     = o.commission_a       || 0;
                const commB     = effectiveAmount != null ? (effectiveAmount - (o.product_base_price || 0)) : 0;
                const feeA      = o.delivery_fee_a     || 0;
                const feeB      = o.delivery_area === 'outside_ncr' ? 700 : 500;
                const riderBase = feeA + feeB;
                const salesBase = commA + commB;
                const salesComp = o.delivery_fee_paid_by === 'employee' ? salesBase - riderBase : salesBase;
                const salesFinal = o.sales_rep_commission_override ?? salesComp;
                const riderFinal = o.rider_commission_override     ?? riderBase;
                const profit     = (effectiveAmount || 0) - salesFinal - riderFinal;

                const commRow = (label, value, highlight) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid rgba(166,113,228,0.07)' }}>
                    <span style={{ fontSize: '0.82rem', color: highlight ? 'var(--navy)' : 'var(--gray)' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: highlight ? 'var(--blue)' : 'var(--navy)' }}>₱{Number(value).toFixed(2)}</span>
                  </div>
                );

                return (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Order summary */}
                  {effectiveAmount != null && (
                    <div style={{ background: 'rgba(166,113,228,0.05)', border: '1px solid rgba(166,113,228,0.12)', borderRadius: '10px', overflow: 'hidden' }}>
                      {commRow('Amount Received', effectiveAmount)}
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

      {cancelTarget && (
        <CancelConfirmModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancelOrder}
        />
      )}

      {deleteReportTarget && (
        <DeleteReportModal
          report={deleteReportTarget}
          onClose={() => setDeleteReportTarget(null)}
          onConfirm={handleDeleteReport}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          user={adminUser}
          email={adminEmail}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updated) => {
            setAdminUser(prev => ({ ...prev, ...updated }));
            if (updated.email) setAdminEmail(updated.email);
          }}
        />
      )}

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
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

// ── Cancel confirmation modal ──────────────────────────────────
function CancelConfirmModal({ order, onClose, onConfirm }) {
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setError('Password is required.'); return; }
    setLoading(true);
    setError('');
    const err = await onConfirm(password);
    if (err) { setError(err); setLoading(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,7,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 400 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '440px', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(17,7,24,0.25)', zIndex: 401, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(231,76,60,0.12)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(231,76,60,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XCircle size={18} color="#E74C3C" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy)' }}>Cancel Order</p>
            <p style={{ fontSize: '0.74rem', color: 'var(--gray)' }}>{order.reference_code} · {order.customer_name}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.86rem', color: 'var(--gray)', lineHeight: 1.6 }}>
            You are about to <strong style={{ color: '#E74C3C' }}>cancel</strong> this order.
            Enter your admin password to confirm.
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.05em', marginBottom: '6px' }}>ADMIN PASSWORD</label>
            <input
              type="password" autoFocus value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter your password"
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${error ? '#E74C3C' : 'rgba(166,113,228,0.2)'}`, borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Inter,sans-serif', outline: 'none', color: 'var(--navy)', boxSizing: 'border-box' }}
            />
            {error && <p style={{ fontSize: '0.78rem', color: '#E74C3C', marginTop: '5px' }}>{error}</p>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={loading}
              style={{ flex: 1, padding: '11px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '9px', background: 'none', color: 'var(--gray)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              Back
            </button>
            <button type="submit" disabled={loading || !password.trim()}
              style={{ flex: 1.5, padding: '11px', border: 'none', borderRadius: '9px', background: loading || !password.trim() ? 'rgba(231,76,60,0.15)' : '#E74C3C', color: loading || !password.trim() ? 'rgba(231,76,60,0.4)' : 'white', fontWeight: 700, fontSize: '0.88rem', cursor: loading || !password.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif' }}>
              {loading ? 'Verifying…' : 'Cancel Order'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── User Detail Modal ────────────────────────────────────────────────────────
function UserDetailModal({ user: u, onClose }) {
  const roleColors = { admin: '#fe78e3', sales: '#a671e4', rider: '#27ae60' };
  const roleColor  = roleColors[u.role] || '#95a5a6';
  const initials   = u.full_name
    ? u.full_name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
    : '?';

  const row = (icon, text, color) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid rgba(166,113,228,0.07)' }}>
      <span style={{ fontSize: '0.9rem', color: color || 'var(--gray)', width: 18, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: '0.88rem', color: color || 'var(--gray)', flex: 1 }}>{text}</span>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,7,24,0.55)', backdropFilter: 'blur(4px)', zIndex: 400 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '360px', background: 'white', borderRadius: '18px', boxShadow: '0 20px 60px rgba(17,7,24,0.22)', zIndex: 401, overflow: 'hidden' }}>
        {/* Header bar */}
        <div style={{ background: `${roleColor}10`, padding: '22px 24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative', borderBottom: '1px solid rgba(166,113,228,0.1)' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'flex' }}><X size={18} /></button>
          {u.avatar_url ? (
            <img src={u.avatar_url} alt={u.full_name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${roleColor}60` }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${roleColor}20`, border: `3px solid ${roleColor}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1.5rem', color: roleColor }}>{initials}</span>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy)', margin: '0 0 6px' }}>{u.full_name}</p>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: roleColor, background: `${roleColor}15`, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.06em' }}>{u.role?.toUpperCase()}</span>
          </div>
        </div>
        {/* Detail rows */}
        <div style={{ padding: '8px 24px 20px' }}>
          {u.email     && row('✉', u.email)}
          {u.phone     && row('📞', u.phone)}
          {u.created_at && row('📅', 'Joined ' + new Date(u.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }))}
          {row(u.is_active ? '✅' : '🚫', u.is_active ? 'Active' : 'Inactive', u.is_active ? '#27ae60' : '#e74c3c')}
        </div>
      </div>
    </>
  );
}

// ── Admin Profile Modal ──────────────────────────────────────────────────────
function ProfileModal({ user, email, onClose, onUpdate }) {
  const [tab,       setTab]       = useState('profile');
  const [name,      setName]      = useState(user?.full_name || '');
  const [phone,     setPhone]     = useState(user?.phone || '');
  const [newEmail,  setNewEmail]  = useState(email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [currPass,  setCurrPass]  = useState('');
  const [newPass,   setNewPass]   = useState('');
  const [confPass,  setConfPass]  = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwError,   setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const fileRef = useRef(null);

  const initials = (user?.full_name || 'A')
    .split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Max file size is 5 MB.'); return; }
    setUploading(true); setError('');
    const ext  = file.name.split('.').pop().toLowerCase();
    const path = `avatars/${user.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from('profile-pictures').upload(path, file, { upsert: true });
    if (upErr) { setError('Upload failed: ' + upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(path);
    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);
    setAvatarUrl(publicUrl);
    onUpdate({ avatar_url: publicUrl });
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim())    { setError('Name cannot be empty.'); return; }
    if (!newEmail.trim()) { setError('Email cannot be empty.'); return; }
    setSaving(true); setError(''); setSuccess('');

    // Update email in Supabase Auth if changed
    const emailChanged = newEmail.trim().toLowerCase() !== (email || '').toLowerCase();
    if (emailChanged) {
      const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (emailErr) { setError(emailErr.message); setSaving(false); return; }
    }

    // Update users table
    const { error: err } = await supabase.from('users').update({
      full_name: name.trim(),
      phone:     phone.trim() || null,
      email:     newEmail.trim(),
    }).eq('id', user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onUpdate({ full_name: name.trim(), phone: phone.trim() || null, email: newEmail.trim() });
    setSuccess(emailChanged
      ? 'Profile updated! Check your new email for a confirmation link.'
      : 'Profile updated!');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currPass || !newPass) { setPwError('All fields are required.'); return; }
    if (newPass.length < 6)   { setPwError('New password must be at least 6 characters.'); return; }
    if (newPass !== confPass)  { setPwError('Passwords do not match.'); return; }
    setPwSaving(true); setPwError(''); setPwSuccess('');
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: currPass });
    if (authErr) { setPwError('Incorrect current password.'); setPwSaving(false); return; }
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPass });
    setPwSaving(false);
    if (pwErr) { setPwError(pwErr.message); return; }
    setPwSuccess('Password changed successfully!');
    setCurrPass(''); setNewPass(''); setConfPass('');
  };

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid rgba(166,113,228,0.2)', borderRadius:'8px', fontSize:'0.88rem', fontFamily:'Inter,sans-serif', outline:'none', color:'var(--navy)', boxSizing:'border-box' };
  const lbl = { display:'block', fontSize:'0.70rem', fontWeight:700, color:'var(--gray)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'6px' };
  const btn = (primary, disabled) => ({ flex: primary ? 1.5 : 1, padding:'11px', border: primary ? 'none' : '1px solid rgba(166,113,228,0.2)', borderRadius:'9px', background: primary ? (disabled ? 'rgba(166,113,228,0.3)' : 'linear-gradient(135deg,#a671e4,#fe78e3)') : 'none', color: primary ? 'white' : 'var(--gray)', fontWeight: primary ? 700 : 600, fontSize:'0.88rem', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily:'Inter,sans-serif' });

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(17,7,24,0.6)', backdropFilter:'blur(4px)', zIndex:400 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'460px', background:'white', borderRadius:'16px', boxShadow:'0 20px 60px rgba(17,7,24,0.25)', zIndex:401, overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(166,113,228,0.1)', display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:38, height:38, borderRadius:'10px', background:'rgba(166,113,228,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <User size={18} color="#a671e4" />
          </div>
          <div>
            <p style={{ fontWeight:800, fontSize:'0.95rem', color:'var(--navy)', margin:0 }}>My Profile</p>
            <p style={{ fontSize:'0.74rem', color:'var(--gray)', margin:0 }}>Update your info and password</p>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--gray)', display:'flex' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid rgba(166,113,228,0.1)' }}>
          {[['profile','Profile'],['password','Change Password']].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setError(''); setSuccess(''); setPwError(''); setPwSuccess(''); }}
              style={{ flex:1, padding:'11px', border:'none', background:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:700, fontFamily:'Inter,sans-serif', color:tab===id?'#a671e4':'var(--gray)', borderBottom:tab===id?'2px solid #a671e4':'2px solid transparent', transition:'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding:'24px', overflowY:'auto', flex:1 }}>
          {tab === 'profile' && (
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {/* Avatar */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
                <div style={{ position:'relative', cursor:'pointer' }} onClick={() => fileRef.current?.click()}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={name} style={{ width:84, height:84, borderRadius:'50%', objectFit:'cover', border:'3px solid rgba(166,113,228,0.3)' }} />
                    : <div style={{ width:84, height:84, borderRadius:'50%', background:'linear-gradient(135deg,#a671e4,#fe78e3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ color:'white', fontWeight:800, fontSize:'1.6rem' }}>{initials}</span>
                      </div>
                  }
                  <div style={{ position:'absolute', bottom:0, right:0, width:26, height:26, borderRadius:'50%', background:'#a671e4', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {uploading
                      ? <div style={{ width:12, height:12, border:'2px solid white', borderTop:'2px solid transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                      : <Plus size={12} color="white" />}
                  </div>
                </div>
                <p style={{ fontSize:'0.72rem', color:'var(--gray)', margin:0 }}>Click photo to change · max 5 MB</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:'none' }} />
              </div>
              <div><label style={lbl}>Full Name</label>
                <input value={name} onChange={e => { setName(e.target.value); setError(''); setSuccess(''); }} style={inp} placeholder="Your full name" />
              </div>
              <div><label style={lbl}>Role</label>
                <input value="ADMIN" readOnly style={{ ...inp, background:'rgba(166,113,228,0.04)', color:'var(--gray)', cursor:'default' }} />
              </div>
              <div><label style={lbl}>Email</label>
                <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setError(''); setSuccess(''); }} style={inp} placeholder="your@email.com" />
                <p style={{ fontSize:'0.70rem', color:'var(--gray)', marginTop:'4px', marginBottom:0 }}>Changing email sends a confirmation link to the new address.</p>
              </div>
              <div><label style={lbl}>Phone</label>
                <input value={phone} onChange={e => { setPhone(e.target.value); setSuccess(''); }} style={inp} placeholder="e.g. 09XX XXX XXXX" />
              </div>
              {error   && <p style={{ fontSize:'0.82rem', color:'#e74c3c', margin:0 }}>{error}</p>}
              {success && <p style={{ fontSize:'0.82rem', color:'#27ae60', margin:0 }}>{success}</p>}
              <div style={{ display:'flex', gap:'10px' }}>
                <button type="button" onClick={onClose} style={btn(false, false)}>Cancel</button>
                <button type="submit" disabled={saving} style={btn(true, saving)}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handlePasswordChange} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div><label style={lbl}>Current Password</label>
                <input type="password" value={currPass} onChange={e => { setCurrPass(e.target.value); setPwError(''); setPwSuccess(''); }} style={inp} placeholder="Enter current password" autoFocus />
              </div>
              <div><label style={lbl}>New Password</label>
                <input type="password" value={newPass} onChange={e => { setNewPass(e.target.value); setPwError(''); setPwSuccess(''); }} style={inp} placeholder="At least 6 characters" />
              </div>
              <div><label style={lbl}>Confirm New Password</label>
                <input type="password" value={confPass} onChange={e => { setConfPass(e.target.value); setPwError(''); setPwSuccess(''); }} style={inp} placeholder="Re-enter new password" />
              </div>
              {pwError   && <p style={{ fontSize:'0.82rem', color:'#e74c3c', margin:0 }}>{pwError}</p>}
              {pwSuccess && <p style={{ fontSize:'0.82rem', color:'#27ae60', margin:0 }}>{pwSuccess}</p>}
              <div style={{ display:'flex', gap:'10px' }}>
                <button type="button" onClick={onClose} style={btn(false, false)}>Cancel</button>
                <button type="submit" disabled={pwSaving} style={btn(true, pwSaving)}>{pwSaving ? 'Changing…' : 'Change Password'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ── Delete confirmation modal ──────────────────────────────────
function DeleteReportModal({ report, onClose, onConfirm }) {
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [deleting, setDeleting] = useState(false);

  const monthLabel = new Date(report.month_year + '-01').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setError('Password is required.'); return; }
    setDeleting(true);
    setError('');
    const err = await onConfirm(password);
    if (err) { setError(err); setDeleting(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,7,24,0.6)', backdropFilter: 'blur(4px)', zIndex: 400 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '440px', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(17,7,24,0.25)', zIndex: 401, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(231,76,60,0.12)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(231,76,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} color="#E74C3C" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy)' }}>Delete Report</p>
            <p style={{ fontSize: '0.74rem', color: 'var(--gray)' }}>{monthLabel} · {report.order_count} orders</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--gray)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.86rem', color: 'var(--gray)', lineHeight: 1.6 }}>
            This will <strong style={{ color: '#E74C3C' }}>permanently delete</strong> the <strong>{monthLabel}</strong> report record.
            The underlying orders are not affected. Enter your admin password to confirm.
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.05em', marginBottom: '6px' }}>ADMIN PASSWORD</label>
            <input type="password" autoFocus value={password}
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
              {deleting ? 'Deleting…' : 'Delete Report'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

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

