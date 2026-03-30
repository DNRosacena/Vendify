import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Parse warranty string like "1 Year Limited Warranty" → days
function parseWarrantyDays(warrantyStr) {
  if (!warrantyStr) return null;
  const match = warrantyStr.match(/(\d+)\s*(year|month|day)s?/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === 'year')  return num * 365;
  if (unit === 'month') return num * 30;
  return num;
}

function generateRepairRef() {
  const num = Math.floor(1000 + Math.random() * 9000);
  const letters = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  return `REP-${num}-${letters}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila'
  });
}

export default function Warranty() {
  const [refInput, setRefInput]     = useState('');
  const [searching, setSearching]   = useState(false);
  const [searchError, setSearchError] = useState('');

  // Warranty result state
  const [warrantyData, setWarrantyData] = useState(null);
  // warrantyData = { order, product, deliveryDate, expiryDate, isUnderWarranty, warrantyDays }

  // Out of warranty message
  const [oowMessage, setOowMessage] = useState('');

  // Form state
  const [issueDesc, setIssueDesc]     = useState('');
  const [useOrigAddr, setUseOrigAddr] = useState(true);
  const [altName, setAltName]         = useState('');
  const [altAddr, setAltAddr]         = useState('');
  const [altContact, setAltContact]   = useState('');
  const [serviceType, setServiceType] = useState('home_service');
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Success state
  const [successRef, setSuccessRef] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!refInput.trim()) return;
    setSearching(true);
    setSearchError('');
    setWarrantyData(null);
    setSuccessRef(null);

    // Normalize: strip spaces only, then handle VND codes missing their dash.
    // Non-VND formats (e.g. CVS-1069-CNCB) are left unchanged so dashes are preserved.
    let code = refInput.trim().toUpperCase().replace(/\s/g, '');
    const strippedCode = code.replace(/-/g, '');
    if (/^VND\d{10}$/.test(strippedCode)) {
      code = strippedCode.slice(0, 9) + '-' + strippedCode.slice(9);
    }

    // Fetch order
    const { data: order } = await supabase
      .from('orders')
      .select('*, product:product_id(id, name, warranty)')
      .eq('reference_code', code)
      .maybeSingle();

    if (!order) {
      setSearchError('No order found with this reference code.');
      setSearching(false);
      return;
    }
    if (order.status !== 'delivered') {
      setSearchError('This order has not been delivered yet — warranty coverage begins upon delivery.');
      setSearching(false);
      return;
    }

    // Fetch delivery confirmation for delivery date
    const { data: delivery } = await supabase
      .from('delivery_confirmations')
      .select('created_at')
      .eq('order_id', order.id)
      .maybeSingle();

    const deliveryDate = delivery?.created_at || order.delivered_at || order.updated_at;
    const product = order.product;
    const warrantyDays = parseWarrantyDays(product?.warranty);

    let expiryDate = null;
    let isUnderWarranty = false;

    if (warrantyDays !== null && deliveryDate) {
      const deliveryTime = new Date(deliveryDate).getTime();
      const expiryTime = deliveryTime + warrantyDays * 24 * 60 * 60 * 1000;
      expiryDate = new Date(expiryTime).toISOString();
      isUnderWarranty = Date.now() < expiryTime;
    }

    // Fetch out-of-warranty message
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'out_of_warranty_message')
      .maybeSingle();
    setOowMessage(setting?.value || 'Your product warranty has expired. You may still request a paid repair service.');

    setWarrantyData({ order, product, deliveryDate, expiryDate, isUnderWarranty, warrantyDays });
    // Reset form
    setIssueDesc('');
    setUseOrigAddr(true);
    setAltName(''); setAltAddr(''); setAltContact('');
    setServiceType('home_service');
    setSubmitError('');
    setSearching(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueDesc.trim()) { setSubmitError('Please describe the issue.'); return; }
    if (!useOrigAddr) {
      if (serviceType === 'walk_in') {
        // walk_in with no home service — address not required
      } else {
        if (!altName.trim() || !altAddr.trim() || !altContact.trim()) {
          setSubmitError('Please fill in all address fields.');
          return;
        }
      }
    }

    setSubmitting(true);
    setSubmitError('');

    const { order, product, isUnderWarranty } = warrantyData;
    const ref = generateRepairRef();

    const finalServiceType = isUnderWarranty ? 'warranty' : serviceType;
    const customerName  = useOrigAddr ? order.customer_name  : altName.trim();
    const address       = (finalServiceType === 'walk_in' && !useOrigAddr) ? altAddr.trim() : (useOrigAddr ? order.address : altAddr.trim());
    const contactNumber = useOrigAddr ? order.contact_number : altContact.trim();

    const { error } = await supabase.from('repair_tickets').insert({
      reference_code:         ref,
      original_order_id:      order.id,
      original_reference_code: order.reference_code,
      product_name:           product?.name || order.product_name || 'Unknown Product',
      customer_name:          customerName,
      address:                address,
      contact_number:         contactNumber,
      use_original_address:   useOrigAddr,
      issue_description:      issueDesc.trim(),
      is_under_warranty:      isUnderWarranty,
      service_type:           finalServiceType,
      status:                 'pending',
      created_at:             new Date().toISOString(),
      updated_at:             new Date().toISOString(),
    });

    if (error) {
      setSubmitError('Failed to submit: ' + error.message);
      setSubmitting(false);
      return;
    }

    // Notify all active admins about the new repair ticket
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (admins?.length > 0) {
      const productLabel = product?.name || order.product_name || 'a product';
      const warrantyLabel = isUnderWarranty ? 'Warranty' : 'Out-of-Warranty';
      await supabase.from('notifications').insert(
        admins.map(admin => ({
          user_id: admin.id,
          title:   '🔧 New Repair Ticket',
          body:    `${customerName} submitted a ${warrantyLabel} repair request for ${productLabel} (${ref})`,
        }))
      );
    }

    setSuccessRef(ref);
    setSubmitting(false);
  };

  const resetAll = () => {
    setRefInput('');
    setWarrantyData(null);
    setSuccessRef(null);
    setSearchError('');
    setIssueDesc('');
    setUseOrigAddr(true);
    setAltName(''); setAltAddr(''); setAltContact('');
    setServiceType('home_service');
    setSubmitError('');
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(166,113,228,0.25)',
    borderRadius: '10px', fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif', outline: 'none',
    color: 'white', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: 700,
    color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: '6px',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      paddingTop: '68px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(166,113,228,0.2), rgba(254,120,227,0.2))',
            border: '1px solid rgba(166,113,228,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '1.8rem',
          }}>🛡️</div>
          <h1 style={{
            fontSize: '2rem', fontWeight: 800, color: 'white',
            marginBottom: '10px', fontFamily: 'Playfair Display, serif',
          }}>Product Warranty Check</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.5 }}>
            Check if your Vendify product is still covered under warranty
          </p>
        </div>

        {/* Success screen */}
        {successRef && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(166,113,228,0.2)',
            borderRadius: '16px', padding: '48px 32px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(39,174,96,0.15)',
              border: '2px solid rgba(39,174,96,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: '2rem',
            }}>✅</div>
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px' }}>
              Repair Request Submitted!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>Your repair ticket reference:</p>
            <div style={{
              display: 'inline-block',
              fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800,
              color: 'var(--blue)', background: 'rgba(166,113,228,0.1)',
              border: '1px solid rgba(166,113,228,0.3)',
              borderRadius: '10px', padding: '12px 28px', marginBottom: '16px',
              letterSpacing: '0.05em',
            }}>{successRef}</div>
            {warrantyData && (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginBottom: '16px', fontFamily: 'monospace' }}>
                Order ref: {warrantyData.order.reference_code}
              </p>
            )}
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', marginBottom: '32px', lineHeight: 1.6 }}>
              Please save this reference number. Our team will contact you within 24 hours.
            </p>
            <button
              onClick={resetAll}
              style={{
                padding: '12px 28px', background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(166,113,228,0.3)',
                borderRadius: '10px', color: 'white', fontWeight: 600,
                fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Check Another Product
            </button>
          </div>
        )}

        {/* Search form */}
        {!successRef && (
        <form onSubmit={handleSearch} style={{ marginBottom: '32px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(166,113,228,0.15)',
            borderRadius: '16px', padding: '28px',
          }}>
            <label style={labelStyle}>Order Reference Code</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                value={refInput}
                onChange={e => { setRefInput(e.target.value); setSearchError(''); }}
                placeholder="e.g. VND260310-1234"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.25)'}
              />
              <button
                type="submit"
                disabled={searching || !refInput.trim()}
                style={{
                  padding: '11px 24px',
                  background: searching || !refInput.trim()
                    ? 'rgba(166,113,228,0.2)'
                    : 'linear-gradient(135deg, var(--blue), var(--red))',
                  border: 'none', borderRadius: '10px',
                  color: searching || !refInput.trim() ? 'rgba(255,255,255,0.3)' : 'white',
                  fontWeight: 700, fontSize: '0.9rem',
                  cursor: searching || !refInput.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {searchError && (
              <div style={{
                marginTop: '12px', padding: '12px 16px',
                background: 'rgba(231,76,60,0.1)',
                border: '1px solid rgba(231,76,60,0.25)',
                borderRadius: '8px', color: '#ff7675',
                fontSize: '0.88rem',
              }}>
                {searchError}
              </div>
            )}
          </div>
        </form>
        )}

        {/* Warranty status + form */}
        {!successRef && warrantyData && (() => {
          const { order, product, deliveryDate, expiryDate, isUnderWarranty, warrantyDays } = warrantyData;
          const hasWarranty = warrantyDays !== null;

          return (
            <>
              {/* Warranty Status Card */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(166,113,228,0.15)',
                borderRadius: '16px', padding: '28px', marginBottom: '24px',
              }}>
                {/* Product info row */}
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Product</p>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>{product?.name || order.product_name || 'Unknown'}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', fontFamily: 'monospace', marginTop: '2px' }}>{order.reference_code}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Delivery Date</p>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>{formatDateDisplay(deliveryDate)}</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Warranty Period</p>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>{product?.warranty || '—'}</p>
                  </div>
                  {expiryDate && (
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Expiry Date</p>
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>{formatDateDisplay(expiryDate)}</p>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                {!hasWarranty ? (
                  <div style={{
                    padding: '16px 20px', borderRadius: '12px',
                    background: 'rgba(138,122,149,0.15)',
                    border: '1px solid rgba(138,122,149,0.3)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.92rem' }}>
                      No warranty information found for this product.
                    </p>
                  </div>
                ) : isUnderWarranty ? (
                  <div style={{
                    padding: '16px 20px', borderRadius: '12px',
                    background: 'rgba(39,174,96,0.12)',
                    border: '1px solid rgba(39,174,96,0.35)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <span style={{ fontSize: '1.8rem' }}>🛡️</span>
                    <div>
                      <p style={{ color: '#2ecc71', fontWeight: 800, fontSize: '1rem' }}>Under Warranty</p>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginTop: '2px' }}>
                        Covered until {formatDateDisplay(expiryDate)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px 20px', borderRadius: '12px',
                    background: 'rgba(231,76,60,0.1)',
                    border: '1px solid rgba(231,76,60,0.3)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <span style={{ fontSize: '1.8rem' }}>🚫</span>
                    <div>
                      <p style={{ color: '#ff6b6b', fontWeight: 800, fontSize: '1rem' }}>Warranty Expired</p>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginTop: '2px' }}>
                        Expired on {formatDateDisplay(expiryDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Repair request form */}
              <form onSubmit={handleSubmit}>
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(166,113,228,0.15)',
                  borderRadius: '16px', padding: '28px',
                  display: 'flex', flexDirection: 'column', gap: '22px',
                }}>
                  <div>
                    <h3 style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem', marginBottom: '6px' }}>
                      Submit a Repair Request
                    </h3>
                    {isUnderWarranty ? (
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                        Good news! Your product is still under warranty. Submit a repair request and our team will handle it free of charge.
                      </p>
                    ) : (
                      <div style={{
                        padding: '14px 16px',
                        background: 'rgba(138,122,149,0.1)',
                        border: '1px solid rgba(138,122,149,0.2)',
                        borderRadius: '10px', marginBottom: '8px',
                      }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                          {oowMessage}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Service type selection — only for out-of-warranty */}
                  {!isUnderWarranty && (
                    <div>
                      <label style={labelStyle}>Service Type</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {[
                          {
                            value: 'home_service',
                            icon: '🏠',
                            title: 'Home Service',
                            desc: 'Our technician visits your location. Area fee: ₱500 (NCR) / ₱700 (Outside NCR) + parts cost',
                          },
                          {
                            value: 'walk_in',
                            icon: '🏭',
                            title: 'Bring to Warehouse',
                            desc: 'Drop off your unit at our warehouse. No area fee — pay only for parts if needed',
                          },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setServiceType(opt.value); if (opt.value === 'walk_in') setUseOrigAddr(true); }}
                            style={{
                              padding: '16px',
                              background: serviceType === opt.value
                                ? 'rgba(166,113,228,0.15)'
                                : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${serviceType === opt.value ? 'rgba(166,113,228,0.5)' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: '12px', cursor: 'pointer',
                              textAlign: 'left', fontFamily: 'Inter, sans-serif',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{opt.icon}</div>
                            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.92rem', marginBottom: '6px' }}>{opt.title}</p>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', lineHeight: 1.5 }}>{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issue description */}
                  <div>
                    <label style={labelStyle}>Issue Description</label>
                    <textarea
                      value={issueDesc}
                      onChange={e => { setIssueDesc(e.target.value); setSubmitError(''); }}
                      placeholder="Describe what's wrong with your product…"
                      rows={4}
                      required
                      style={{
                        ...inputStyle,
                        resize: 'vertical', lineHeight: 1.6,
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.25)'}
                    />
                  </div>

                  {/* Address choice — hidden for walk_in */}
                  {(isUnderWarranty || serviceType === 'home_service') && (
                    <div>
                      <label style={labelStyle}>Service Address</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          padding: '14px 16px',
                          background: useOrigAddr ? 'rgba(166,113,228,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${useOrigAddr ? 'rgba(166,113,228,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '10px', cursor: 'pointer',
                        }}>
                          <input
                            type="radio"
                            checked={useOrigAddr}
                            onChange={() => setUseOrigAddr(true)}
                            style={{ marginTop: '2px', accentColor: 'var(--blue)', flexShrink: 0 }}
                          />
                          <div>
                            <p style={{ color: 'white', fontWeight: 600, fontSize: '0.88rem', marginBottom: '3px' }}>
                              Use my original delivery address
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
                              {order.address}
                            </p>
                          </div>
                        </label>

                        <label style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '14px 16px',
                          background: !useOrigAddr ? 'rgba(166,113,228,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${!useOrigAddr ? 'rgba(166,113,228,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '10px', cursor: 'pointer',
                        }}>
                          <input
                            type="radio"
                            checked={!useOrigAddr}
                            onChange={() => setUseOrigAddr(false)}
                            style={{ accentColor: 'var(--blue)', flexShrink: 0 }}
                          />
                          <p style={{ color: 'white', fontWeight: 600, fontSize: '0.88rem' }}>
                            Use a different address
                          </p>
                        </label>

                        {!useOrigAddr && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '4px' }}>
                            <div>
                              <label style={labelStyle}>Full Name</label>
                              <input
                                value={altName} onChange={e => setAltName(e.target.value)}
                                placeholder="Customer name"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.25)'}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Address</label>
                              <input
                                value={altAddr} onChange={e => setAltAddr(e.target.value)}
                                placeholder="Full delivery address"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.25)'}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Contact Number</label>
                              <input
                                value={altContact} onChange={e => setAltContact(e.target.value)}
                                placeholder="e.g. 09XX XXX XXXX"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.25)'}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(231,76,60,0.1)',
                      border: '1px solid rgba(231,76,60,0.25)',
                      borderRadius: '8px', color: '#ff7675', fontSize: '0.88rem',
                    }}>
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '14px',
                      background: submitting
                        ? 'rgba(166,113,228,0.2)'
                        : isUnderWarranty
                          ? 'linear-gradient(135deg, #27ae60, #2ecc71)'
                          : 'linear-gradient(135deg, var(--blue), var(--red))',
                      border: 'none', borderRadius: '12px',
                      color: submitting ? 'rgba(255,255,255,0.3)' : 'white',
                      fontWeight: 700, fontSize: '1rem',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {submitting ? 'Submitting…' : 'Submit Repair Request'}
                  </button>
                </div>
              </form>
            </>
          );
        })()}

      </div>
    </div>
  );
}
