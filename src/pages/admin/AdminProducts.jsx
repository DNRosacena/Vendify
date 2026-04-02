import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, X, Upload, Image, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CATEGORIES = ['Smart Home', 'Security', 'Lighting', 'Audio', 'Entertainment', 'Climate', 'Other'];

export default function AdminProducts() {
  const [products, setProducts]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [form,     setForm]       = useState(null); // null | { product? }
  const [deleting, setDeleting]   = useState(null);
  const [toggling, setToggling]   = useState(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);
    setLoading(false);
  };

  const handleToggleActive = async (product) => {
    setToggling(product.id);
    await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
    setToggling(null);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeleting(product.id);
    await supabase.from('products').delete().eq('id', product.id);
    setProducts(prev => prev.filter(p => p.id !== product.id));
    setDeleting(null);
  };

  const handleSaved = (saved, isNew) => {
    if (isNew) setProducts(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
    else        setProducts(prev => prev.map(p => p.id === saved.id ? saved : p));
    setForm(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{products.length} product{products.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setForm({})}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg,var(--blue),var(--red))', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      {/* Product grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray)' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid rgba(166,113,228,0.2)', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading products…
        </div>
      ) : products.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid rgba(166,113,228,0.12)' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📦</p>
          <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '6px' }}>No products yet</p>
          <p style={{ fontSize: '0.84rem', color: 'var(--gray)' }}>Click "Add Product" to create your first product.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
          {products.map(p => (
            <ProductCard key={p.id} product={p}
              toggling={toggling === p.id}
              deleting={deleting === p.id}
              onEdit={() => setForm({ product: p })}
              onToggle={() => handleToggleActive(p)}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {/* Product form modal */}
      {form !== null && (
        <ProductFormModal
          product={form.product}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Product card ───────────────────────────────────────────────
function ProductCard({ product: p, toggling, deleting, onEdit, onToggle, onDelete }) {
  const thumb = p.image_url || (p.images?.[0]);

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${p.is_active ? 'rgba(166,113,228,0.12)' : 'rgba(149,165,166,0.2)'}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: p.is_active ? 1 : 0.7 }}>

      {/* Thumbnail */}
      <div style={{ position: 'relative', height: '160px', background: 'rgba(166,113,228,0.06)', overflow: 'hidden' }}>
        {thumb ? (
          <img src={thumb} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image size={36} color="rgba(166,113,228,0.3)" />
          </div>
        )}
        {!p.is_active && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(149,165,166,0.9)', color: 'white', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '12px' }}>HIDDEN</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px', flex: 1 }}>
        <p style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.95rem', marginBottom: '2px' }}>{p.name}</p>
        {p.tagline && <p style={{ fontSize: '0.77rem', color: 'var(--gray)', marginBottom: '6px', lineHeight: 1.4 }}>{p.tagline}</p>}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {p.category && (
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--blue)', background: 'rgba(166,113,228,0.08)', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.04em' }}>{p.category}</span>
          )}
          {p.price_range && (
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--gray)', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '10px' }}>{p.price_range}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(166,113,228,0.08)', display: 'flex', gap: '6px' }}>
        <button onClick={onEdit}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', background: 'rgba(166,113,228,0.08)', border: '1px solid rgba(166,113,228,0.15)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--blue)', fontFamily: 'Inter,sans-serif' }}>
          <Edit2 size={13} /> Edit
        </button>
        <button onClick={onToggle} disabled={toggling}
          style={{ padding: '7px 10px', background: p.is_active ? 'rgba(39,174,96,0.08)' : 'rgba(149,165,166,0.1)', border: `1px solid ${p.is_active ? 'rgba(39,174,96,0.2)' : 'rgba(149,165,166,0.2)'}`, borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: toggling ? 0.5 : 1 }}>
          {p.is_active ? <Eye size={14} color="#27AE60" /> : <EyeOff size={14} color="var(--gray)" />}
        </button>
        <button onClick={onDelete} disabled={deleting}
          style={{ padding: '7px 10px', background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.15)', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: deleting ? 0.5 : 1 }}>
          <Trash2 size={14} color="#E74C3C" />
        </button>
      </div>
    </div>
  );
}

// ── Product form modal ─────────────────────────────────────────
function ProductFormModal({ product, onClose, onSaved }) {
  const isNew = !product;

  const [name,        setName]        = useState(product?.name        || '');
  const [tagline,     setTagline]     = useState(product?.tagline     || '');
  const [description, setDescription] = useState(product?.description || '');
  const [category,    setCategory]    = useState(product?.category    || '');
  const [priceRange,  setPriceRange]  = useState(product?.price_range || '');
  const [variants, setVariants] = useState(
    (product?.variants || []).map(v => ({
      image:          v.image          || '',
      label:          v.label          || '',
      price:          v.price     != null ? String(v.price)          : '',
      original_price: v.original_price != null ? String(v.original_price) : '',
      inclusions:     Array.isArray(v.inclusions) ? v.inclusions : [],
    }))
  );
  const [features,    setFeatures]    = useState(product?.features    || []);
  const [warranty,    setWarranty]    = useState(product?.warranty || '');
  const [specs,       setSpecs]       = useState(() => {
    const s = product?.specs || {};
    return Object.entries(s).map(([k, v]) => ({ k, v: String(v) }));
  });
  const [isActive,       setIsActive]       = useState(product?.is_active ?? true);
  const [basePrice,      setBasePrice]      = useState(product?.base_price         != null ? String(product.base_price)         : '');
  const [productComm,    setProductComm]    = useState(product?.product_commission  != null ? String(product.product_commission)  : '');
  const [deliveryFee,    setDeliveryFee]    = useState(product?.delivery_fee        != null ? String(product.delivery_fee)        : '');

  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  // Add-row input states
  const [newFeature,   setNewFeature]   = useState('');
  const [newSpecKey,   setNewSpecKey]   = useState('');
  const [newSpecVal,   setNewSpecVal]   = useState('');

  const variantImgRef       = useRef();
  const variantImgTargetRef = useRef(null);
  const [uploadingVariantImg, setUploadingVariantImg] = useState(false);

  const handleVariantImageUpload = async (e, variantIdx) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingVariantImg(true);
    try {
      const tmpId = product?.id || `tmp_${Date.now()}`;
      const file  = files[0];
      const ext   = file.name.split('.').pop().toLowerCase();
      const path  = `${tmpId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { contentType: `image/${ext}`, upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
        if (urlData?.publicUrl) {
          setVariants(prev => prev.map((v, i) => i === variantIdx ? { ...v, image: urlData.publicUrl } : v));
        }
      }
    } finally {
      setUploadingVariantImg(false);
      e.target.value = '';
    }
  };

  const addFeature = () => {
    const v = newFeature.trim();
    if (!v) return;
    setFeatures(prev => [...prev, v]);
    setNewFeature('');
  };

  const addSpec = () => {
    const k = newSpecKey.trim(), v = newSpecVal.trim();
    if (!k || !v) return;
    setSpecs(prev => [...prev, { k, v }]);
    setNewSpecKey(''); setNewSpecVal('');
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Product name is required.'); return; }
    setSaving(true);
    setError('');

    const specsObj = specs.reduce((acc, { k, v }) => { acc[k] = v; return acc; }, {});
    const cleanVariants = variants.map(v => ({
      image:          v.image || null,
      label:          v.label.trim(),
      price:          parseFloat(v.price)          || 0,
      original_price: v.original_price ? (parseFloat(v.original_price) || null) : null,
      inclusions:     v.inclusions,
    }));
    const variantImages = cleanVariants.map(v => v.image).filter(Boolean);
    const prices = cleanVariants.map(v => v.price).filter(p => p > 0);
    const autoPriceRange = prices.length === 0
      ? (priceRange.trim() || null)
      : prices.length === 1
        ? `₱${prices[0].toLocaleString()}`
        : `₱${Math.min(...prices).toLocaleString()} – ₱${Math.max(...prices).toLocaleString()}`;
    const fields = {
      name:                name.trim(),
      tagline:             tagline.trim()     || null,
      description:         description.trim() || null,
      category:            category           || null,
      price_range:         autoPriceRange,
      image_url:           variantImages[0]   || null,
      images:              variantImages,
      inclusions:          cleanVariants[0]?.inclusions?.map(i => ({ name: i, price: 0 })) || [],
      variants:            cleanVariants,
      features,
      warranty:            warranty.trim() || null,
      specs:               specsObj,
      is_active:           isActive,
      base_price:          parseFloat(basePrice)   || 0,
      product_commission:  parseFloat(productComm) || 0,
      delivery_fee:        parseFloat(deliveryFee) || 0,
    };

    let saved;
    if (isNew) {
      const { data, error: dbErr } = await supabase.from('products').insert(fields).select().single();
      if (dbErr) { setError(dbErr.message); setSaving(false); return; }
      saved = data;
    } else {
      const { data, error: dbErr } = await supabase.from('products').update(fields).eq('id', product.id).select().single();
      if (dbErr) { setError(dbErr.message); setSaving(false); return; }
      saved = data;
    }

    setSaving(false);
    onSaved(saved, isNew);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,7,24,0.5)', backdropFilter: 'blur(4px)', zIndex: 300 }} />

      {/* Panel */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', background: 'white', zIndex: 301, boxShadow: '-8px 0 40px rgba(17,7,24,0.18)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s ease' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(166,113,228,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>{isNew ? 'Add Product' : 'Edit Product'}</p>
            <p style={{ fontSize: '0.74rem', color: 'var(--gray)' }}>{isNew ? 'Fill in the product details below.' : `Editing: ${product.name}`}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Active toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <div onClick={() => setIsActive(v => !v)}
                style={{ width: '40px', height: '22px', borderRadius: '11px', background: isActive ? 'var(--blue)' : 'rgba(149,165,166,0.4)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '3px', left: isActive ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: isActive ? 'var(--blue)' : 'var(--gray)' }}>{isActive ? 'Active' : 'Hidden'}</span>
            </label>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Basic info */}
          <Section title="Basic Info">
            <Field label="Name *">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Smart Lock Pro" style={inputStyle} />
            </Field>
            <Field label="Tagline">
              <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short catchy subtitle" style={inputStyle} />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Full product description…" rows={4} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Category">
                <div style={{ position: 'relative' }}>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: '28px' }}>
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={13} color="var(--gray)" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </Field>
              <Field label="Price Range (fallback if no variants)">
                <input value={priceRange} onChange={e => setPriceRange(e.target.value)} placeholder="e.g. ₱12,000 – ₱15,000" style={inputStyle} />
              </Field>
            </div>
            <Field label="Warranty">
              <input
                value={warranty}
                onChange={e => setWarranty(e.target.value)}
                placeholder="e.g. 1 Year Limited Warranty"
                style={inputStyle}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--gray)', marginTop: '4px' }}>
                Printed on every product waybill. Leave blank to use the default.
              </p>
            </Field>
          </Section>

          {/* Pricing & Commission */}
          <Section title="Pricing & Commission" subtitle="Used to auto-compute commissions at order time">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <Field label="Base Price (₱)">
                <input type="number" min="0" step="0.01" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0.00" style={inputStyle} />
              </Field>
              <Field label="Sales Rep Comm. A (₱)">
                <input type="number" min="0" step="0.01" value={productComm} onChange={e => setProductComm(e.target.value)} placeholder="0.00" style={inputStyle} />
              </Field>
              <Field label="Rider Delivery Fee A (₱)">
                <input type="number" min="0" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="0.00" style={inputStyle} />
              </Field>
            </div>
          </Section>

          {/* Variants */}
          <Section title="Variants" subtitle="Each variant has its own image, price, and parts list. Price range is auto-computed.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {variants.map((v, idx) => (
                <div key={idx} style={{ border: '1px solid rgba(166,113,228,0.18)', borderRadius: '10px', padding: '12px', background: 'rgba(166,113,228,0.02)' }}>
                  {/* Image + Label + Delete */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div
                      onClick={() => { variantImgTargetRef.current = idx; variantImgRef.current?.click(); }}
                      style={{ width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px dashed rgba(166,113,228,0.35)', flexShrink: 0, cursor: 'pointer', background: 'rgba(166,113,228,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                    >
                      {v.image ? (
                        <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : uploadingVariantImg && variantImgTargetRef.current === idx ? (
                        <div style={{ width: '20px', height: '20px', border: '2px solid rgba(166,113,228,0.2)', borderTop: '2px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      ) : (
                        <>
                          <Upload size={16} color="rgba(166,113,228,0.5)" />
                          <span style={{ fontSize: '0.58rem', color: 'var(--gray)', marginTop: '3px' }}>Image</span>
                        </>
                      )}
                      {idx === 0 && v.image && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(166,113,228,0.85)', color: 'white', fontSize: '0.50rem', fontWeight: 700, textAlign: 'center', padding: '2px', letterSpacing: '0.05em' }}>COVER</div>
                      )}
                    </div>
                    <input
                      value={v.label}
                      onChange={e => setVariants(prev => prev.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))}
                      placeholder={`Variant ${idx + 1} label`}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={() => setVariants(prev => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'flex-start', color: 'var(--gray)', flexShrink: 0 }}>
                      <X size={15} />
                    </button>
                  </div>
                  {/* Prices */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--gray)', marginBottom: '3px', letterSpacing: '0.04em' }}>PRICE (₱) *</label>
                      <input type="number" min="0" value={v.price}
                        onChange={e => setVariants(prev => prev.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))}
                        placeholder="e.g. 19000" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--gray)', marginBottom: '3px', letterSpacing: '0.04em' }}>ORIGINAL PRICE (strikethrough)</label>
                      <input type="number" min="0" value={v.original_price}
                        onChange={e => setVariants(prev => prev.map((x, i) => i === idx ? { ...x, original_price: e.target.value } : x))}
                        placeholder="Optional" style={inputStyle} />
                    </div>
                  </div>
                  {/* Inclusions */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--gray)', marginBottom: '5px', letterSpacing: '0.04em' }}>PARTS / INCLUSIONS</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                      {v.inclusions.map((inc, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(166,113,228,0.05)', borderRadius: '6px', padding: '5px 10px' }}>
                          <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--navy)' }}>• {inc}</span>
                          <button onClick={() => setVariants(prev => prev.map((x, i) => i === idx ? { ...x, inclusions: x.inclusions.filter((_, k) => k !== j) } : x))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                            <X size={11} color="var(--gray)" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <VariantInclusionRow onAdd={newInc => {
                      if (!newInc.trim()) return;
                      setVariants(prev => prev.map((x, i) => i === idx ? { ...x, inclusions: [...x.inclusions, newInc.trim()] } : x));
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setVariants(prev => [...prev, { image: '', label: '', price: '', original_price: '', inclusions: [] }])}
              style={{ marginTop: variants.length ? '8px' : 0, width: '100%', padding: '10px', border: '2px dashed rgba(166,113,228,0.25)', borderRadius: '10px', background: 'rgba(166,113,228,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--gray)', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>
              <Plus size={15} color="var(--blue)" /> Add Variant
            </button>
            <input ref={variantImgRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => variantImgTargetRef.current !== null && handleVariantImageUpload(e, variantImgTargetRef.current)} />
            <p style={{ fontSize: '0.74rem', color: 'var(--gray)', marginTop: '4px' }}>First variant's image becomes the cover. Price range is auto-computed from variants.</p>
          </Section>

          {/* Features */}
          <Section title="Key Features">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {features.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(166,113,228,0.05)', borderRadius: '8px', padding: '8px 12px' }}>
                  <span style={{ flex: 1, fontSize: '0.86rem', color: 'var(--navy)' }}>• {item}</span>
                  <button onClick={() => setFeatures(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                    <X size={13} color="var(--gray)" />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={newFeature} onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                placeholder="e.g. Remote access via app" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addFeature}
                style={{ padding: '9px 14px', background: 'rgba(166,113,228,0.1)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Plus size={16} color="var(--blue)" />
              </button>
            </div>
          </Section>

          {/* Specs */}
          <Section title="Specifications" subtitle="Key-value pairs shown in a spec table">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {specs.map((spec, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(166,113,228,0.05)', borderRadius: '8px', padding: '8px 12px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray)', minWidth: '100px' }}>{spec.k}</span>
                  <span style={{ flex: 1, fontSize: '0.86rem', color: 'var(--navy)' }}>{spec.v}</span>
                  <button onClick={() => setSpecs(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                    <X size={13} color="var(--gray)" />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={newSpecKey} onChange={e => setNewSpecKey(e.target.value)}
                placeholder="Key (e.g. Connectivity)" style={{ ...inputStyle, flex: 1 }} />
              <input value={newSpecVal} onChange={e => setNewSpecVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSpec())}
                placeholder="Value (e.g. Wi-Fi, Bluetooth)" style={{ ...inputStyle, flex: 1.5 }} />
              <button onClick={addSpec}
                style={{ padding: '9px 14px', background: 'rgba(166,113,228,0.1)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Plus size={16} color="var(--blue)" />
              </button>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(166,113,228,0.1)', flexShrink: 0 }}>
          {error && <p style={{ color: '#E74C3C', fontSize: '0.82rem', marginBottom: '10px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '11px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '9px', background: 'none', color: 'var(--gray)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              style={{ flex: 2, padding: '11px', border: 'none', borderRadius: '9px', background: saving || !name.trim() ? 'rgba(166,113,228,0.1)' : 'linear-gradient(135deg,var(--blue),var(--red))', color: saving || !name.trim() ? 'var(--gray)' : 'white', fontWeight: 700, fontSize: '0.88rem', cursor: saving || !name.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Inter,sans-serif' }}>
              {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function VariantInclusionRow({ onAdd }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(val); setVal(''); } }}
        placeholder="e.g. Universal Coin Slot"
        style={{ ...inputStyle, flex: 1, fontSize: '0.82rem' }}
      />
      <button onClick={() => { onAdd(val); setVal(''); }}
        style={{ padding: '9px 12px', background: 'rgba(166,113,228,0.1)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <Plus size={14} color="var(--blue)" />
      </button>
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</p>
        {subtitle && <p style={{ fontSize: '0.74rem', color: 'rgba(149,165,166,0.8)', marginTop: '1px' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--gray)', marginBottom: '5px', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid rgba(166,113,228,0.2)',
  borderRadius: '8px',
  fontSize: '0.88rem',
  fontFamily: 'Inter,sans-serif',
  color: 'var(--navy)',
  outline: 'none',
  background: 'white',
  boxSizing: 'border-box',
};
