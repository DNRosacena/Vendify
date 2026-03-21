import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Phone, Package, FileText, ChevronDown, Loader, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateReferenceCode } from '../lib/utils';
import LandmarkSearch from './LandmarkSearch';

export default function OrderForm() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const preSelect = location.state?.productId || '';
  const preName   = location.state?.productName || '';

  const [products,  setProducts]  = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [form, setForm]           = useState({
    customer_name:   '',
    address:         '',
    landmark:        '',
    landmark_lat:    null,
    landmark_lng:    null,
    contact_number:  '',
    sales_rep_id:    '',
    product_id:      preSelect,
    product_name:    preName,
    note:            '',
  });
  const [hasSalesRep, setHasSalesRep] = useState(null); // null = not answered yet
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true)
      .then(({ data }) => setProducts(data || []));
    supabase.from('users').select('id, full_name').eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setSalesReps(data || []));
  }, []);

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim())  e.customer_name  = 'Full name is required / Pangalan ay kinakailangan';
    if (!form.address.trim())        e.address        = 'Address is required / Address ay kinakailangan';
    if (!form.contact_number.trim()) e.contact_number = 'Contact number is required / Numero ay kinakailangan';
    if (hasSalesRep && !form.sales_rep_id) e.sales_rep_id = 'Please select your sales rep / Pumili ng inyong sales rep';
    if (!form.product_id)            e.product_id     = 'Please select a product / Pumili ng produkto';
    if (form.contact_number && !/^(09|\+639)\d{9}$/.test(form.contact_number.replace(/\s/g, '')))
      e.contact_number = 'Enter a valid PH mobile number (e.g. 09XXXXXXXXX)';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);

    const selectedProduct = products.find(p => p.id === form.product_id);
    const ref = generateReferenceCode(selectedProduct?.name || form.product_name);

    const { error } = await supabase.from('orders').insert({
      reference_code:    ref,
      customer_name:     form.customer_name.trim(),
      address:           form.address.trim(),
      landmark:          form.landmark.trim(),
      landmark_lat:      form.landmark_lat,
      landmark_lng:      form.landmark_lng,
      contact_number:    form.contact_number.trim(),
      assigned_sales_id: form.sales_rep_id || null,
      product_id:        form.product_id,
      product_name:      selectedProduct?.name || form.product_name,
      note:              form.note.trim(),
      status:            'pending',
    });

    if (error) {
      console.error(error);
      setSubmitting(false);
      return;
    }

    // Notify admins + assigned sales rep (if any)
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin').eq('is_active', true);
    const inserts = (admins || []).map(a => ({
      user_id: a.id,
      title: '📦 New Order! / Bagong Order!',
      body: `${form.customer_name.trim()} ordered ${selectedProduct?.name || form.product_name}.`,
    }));
    if (form.sales_rep_id)
      inserts.push({ user_id: form.sales_rep_id, title: '📦 New Order! / Bagong Order!', body: `${form.customer_name.trim()} ordered ${selectedProduct?.name || form.product_name}.` });
    if (inserts.length) await supabase.from('notifications').insert(inserts);

    navigate('/order/confirmation', { state: { ref, productName: selectedProduct?.name } });
  };

  const field = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Full Name */}
        <div>
          <label className="label required">Full Name / Buong Pangalan</label>
          <div style={{ position: 'relative' }}>
            <User size={16} color="var(--gray)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="input-field"
              style={{ paddingLeft: '40px', borderColor: errors.customer_name ? 'var(--red)' : '' }}
              placeholder="Juan dela Cruz"
              value={form.customer_name}
              onChange={e => field('customer_name', e.target.value)}
            />
          </div>
          {errors.customer_name && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.customer_name}</p>}
        </div>

        {/* Address */}
        <div>
          <label className="label required">Delivery Address / Address ng Pagpapadala</label>
          <textarea
            className="input-field"
            style={{ resize: 'vertical', minHeight: '80px', borderColor: errors.address ? 'var(--red)' : '' }}
            placeholder="House/Unit No., Street, Barangay, City, Province"
            value={form.address}
            onChange={e => field('address', e.target.value)}
          />
          {errors.address && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.address}</p>}
        </div>

        {/* Landmark */}
        <div>
          <label className="label">Landmark <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(Optional / Opsyonal)</span></label>
          <LandmarkSearch
            value={form.landmark}
            onChange={val => field('landmark', val)}
            onSelect={({ name, lat, lng }) => setForm(f => ({ ...f, landmark: name, landmark_lat: lat, landmark_lng: lng }))}
          />
          {form.landmark_lat && (
            <p style={{ fontSize: '0.75rem', color: 'var(--green-dark)', marginTop: '4px' }}>
              ✓ Location pinned ({form.landmark_lat.toFixed(4)}, {form.landmark_lng.toFixed(4)})
            </p>
          )}
        </div>

        {/* Contact */}
        <div>
          <label className="label required">Contact Number / Numero ng Telepono</label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} color="var(--gray)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="input-field"
              style={{ paddingLeft: '40px', borderColor: errors.contact_number ? 'var(--red)' : '' }}
              placeholder="09XXXXXXXXX"
              value={form.contact_number}
              onChange={e => field('contact_number', e.target.value)}
            />
          </div>
          {errors.contact_number && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.contact_number}</p>}
        </div>

        {/* Are you in contact with a sales rep? */}
        <div>
          <label className="label">Are you in contact with a Sales Rep? / Mayroon kang Sales Rep?</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {[{ val: true, label: 'Yes / Oo' }, { val: false, label: 'No / Hindi' }].map(({ val, label }) => (
              <button key={String(val)} type="button"
                onClick={() => { setHasSalesRep(val); if (!val) field('sales_rep_id', ''); }}
                style={{
                  flex: 1, padding: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                  border: `1.5px solid ${hasSalesRep === val ? 'var(--blue)' : 'rgba(166,113,228,0.2)'}`,
                  borderRadius: '8px',
                  background: hasSalesRep === val ? 'var(--navy)' : 'transparent',
                  color: hasSalesRep === val ? 'white' : 'var(--navy)',
                  transition: 'all 0.15s',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Sales Rep dropdown — only if yes */}
        {hasSalesRep && (
          <div>
            <label className="label required">Sales Representative / Sales Rep</label>
            <div style={{ position: 'relative' }}>
              <Users size={16} color="var(--gray)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
              <ChevronDown size={16} color="var(--gray)" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <select
                className="input-field"
                style={{ paddingLeft: '40px', paddingRight: '40px', appearance: 'none', borderColor: errors.sales_rep_id ? 'var(--red)' : '' }}
                value={form.sales_rep_id}
                onChange={e => field('sales_rep_id', e.target.value)}
              >
                <option value="">-- Select your sales rep / Pumili ng inyong sales rep --</option>
                {salesReps.map(r => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </select>
            </div>
            {errors.sales_rep_id && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.sales_rep_id}</p>}
          </div>
        )}

        {/* Product */}
        <div>
          <label className="label required">Product Order / Produktong I-oorder</label>
          <div style={{ position: 'relative' }}>
            <Package size={16} color="var(--gray)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
            <ChevronDown size={16} color="var(--gray)" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <select
              className="input-field"
              style={{ paddingLeft: '40px', paddingRight: '40px', appearance: 'none', borderColor: errors.product_id ? 'var(--red)' : '' }}
              value={form.product_id}
              onChange={e => {
                const selected = products.find(p => p.id === e.target.value);
                setForm(f => ({ ...f, product_id: e.target.value, product_name: selected?.name || '' }));
                if (errors.product_id) setErrors(er => ({ ...er, product_id: null }));
              }}
            >
              <option value="">-- Select a product / Pumili ng produkto --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.price_range ? `— ${p.price_range}` : ''}
                </option>
              ))}
            </select>
          </div>
          {errors.product_id && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.product_id}</p>}

          {/* Product preview */}
          {form.product_id && (() => {
            const p = products.find(x => x.id === form.product_id);
            return p ? (
              <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(52,152,219,0.06)', borderRadius: '8px', border: '1px solid rgba(52,152,219,0.15)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.8rem' }}>{productEmoji(p.name)}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>{p.name}</p>
                  {p.tagline && <p style={{ fontSize: '0.78rem', color: 'var(--blue)' }}>{p.tagline}</p>}
                  {p.price_range && <p style={{ fontSize: '0.78rem', color: 'var(--red)', fontWeight: 600 }}>{p.price_range}</p>}
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* Note */}
        <div>
          <label className="label">Note to Seller / Mensahe sa Nagbebenta</label>
          <div style={{ position: 'relative' }}>
            <FileText size={16} color="var(--gray)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            <textarea
              className="input-field"
              style={{ paddingLeft: '40px', resize: 'vertical', minHeight: '90px' }}
              placeholder="Any special requests or questions / Anumang espesyal na kahilingan o katanungan"
              value={form.note}
              onChange={e => field('note', e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {submitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : '📦 Submit Order / Isumite ang Order'}
        </button>

        <p style={{ fontSize: '0.78rem', color: 'var(--gray)', textAlign: 'center', lineHeight: 1.6 }}>
          By submitting, our sales team will contact you within 24 hours. / Sa pag-submit, makikipag-ugnayan sa inyo ang aming sales team sa loob ng 24 na oras.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function productEmoji(name) {
  if (name?.includes('WiFi'))      return '📶';
  if (name?.includes('Carwash'))   return '🚗';
  if (name?.includes('Condiment')) return '🧂';
  if (name?.includes('Charging'))  return '⚡';
  if (name?.includes('Coffee'))    return '☕';
  return '🏧';
}