import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, CheckCircle, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import { productEmoji } from '../components/ProductCard';

export default function ProductDetail() {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const [product,   setProduct]   = useState(null);
  const [related,   setRelated]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [imgIndex,  setImgIndex]  = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      setLoading(true);
      setImgIndex(0);

      const { data } = await supabase
        .from('products').select('*').eq('id', id).single();

      if (!data) { navigate('/products'); return; }
      setProduct(data);

      const { data: rel } = await supabase
        .from('products').select('*')
        .eq('is_active', true)
        .neq('id', id)
        .eq('category', data.category)
        .limit(3);

      // If not enough in same category, fill from others
      if (!rel || rel.length < 2) {
        const { data: others } = await supabase
          .from('products').select('*')
          .eq('is_active', true)
          .neq('id', id)
          .limit(3);
        setRelated(others || []);
      } else {
        setRelated(rel || []);
      }

      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ paddingTop: '68px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid rgba(166,113,228,0.2)', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>Loading product...</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!product) return null;

  const specs      = product.specs    || {};
  const features   = product.features || [];
  const images     = product.images   || [];
  const inclusions = (product.inclusions || []).map(i => typeof i === 'string' ? {name:i, price:0} : i);
  const hasImages = images.length > 0;

  const prevImg = () => setImgIndex(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIndex(i => (i + 1) % images.length);

  return (
    <div style={{ paddingTop: '68px' }}>

      {/* Breadcrumb */}
      <div style={{ background: 'var(--navy)', borderBottom: '1px solid rgba(166,113,228,0.1)', padding: '12px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => navigate('/products')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'color 0.15s', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
          >
            <ArrowLeft size={13} /> Products
          </button>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 500 }}>{product.name}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', alignItems: 'start', marginBottom: '64px' }}>

          {/* LEFT — Image gallery */}
          <div>
            {/* Main image */}
            <div style={{
              height: '420px', borderRadius: '16px', overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', border: '1px solid rgba(166,113,228,0.15)',
              marginBottom: '12px',
            }}>
              {hasImages ? (
                <>
                  <img
                    src={images[imgIndex]}
                    alt={`${product.name} ${imgIndex + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'fadeIn 0.3s ease' }}
                  />
                  {images.length > 1 && (
                    <>
                      <button onClick={prevImg}
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(17,7,24,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--blue)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(17,7,24,0.7)'}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button onClick={nextImg}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(17,7,24,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--blue)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(17,7,24,0.7)'}
                      >
                        <ChevronRight size={18} />
                      </button>
                      {/* Dot indicators */}
                      <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                        {images.map((_, i) => (
                          <button key={i} onClick={() => setImgIndex(i)}
                            style={{ width: imgIndex === i ? '20px' : '7px', height: '7px', borderRadius: '4px', background: imgIndex === i ? 'var(--blue)' : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '6rem', marginBottom: '12px' }}>{productEmoji(product.name)}</div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Product Image Coming Soon</p>
                </div>
              )}

              {/* Category badge */}
              {product.category && (
                <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(17,7,24,0.8)', backdropFilter: 'blur(8px)', color: 'var(--blue)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, border: '1px solid rgba(166,113,228,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {product.category}
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {hasImages && images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {images.map((img, i) => (
                  <div key={i} onClick={() => setImgIndex(i)}
                    style={{ width: '72px', height: '72px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${imgIndex === i ? 'var(--blue)' : 'transparent'}`, transition: 'border-color 0.2s', opacity: imgIndex === i ? 1 : 0.6 }}
                  >
                    <img src={img} alt={`thumb ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Product info */}
          <div>
            {/* Price */}
            {product.price_range && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(166,113,228,0.15), rgba(254,120,227,0.10))', border: '1px solid rgba(166,113,228,0.25)', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--blue), var(--red))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.06em' }}>
                  {product.price_range}
                </span>
              </div>
            )}

            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2, marginBottom: '8px' }}>
              {product.name}
            </h1>

            {product.tagline && (
              <p style={{ fontSize: '1rem', color: 'var(--blue)', fontWeight: 600, marginBottom: '14px' }}>
                {product.tagline}
              </p>
            )}

            <p style={{ fontSize: '0.95rem', color: 'var(--gray)', lineHeight: 1.75, marginBottom: '24px' }}>
              {product.description}
            </p>

            {/* Features */}
            {features.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Key Features
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <CheckCircle size={15} color="var(--blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '0.88rem', color: 'var(--navy)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inclusions */}
            {inclusions.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  What's in the Box
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {inclusions.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(166,113,228,0.04)', borderRadius: '8px', border: '1px solid rgba(166,113,228,0.1)' }}>
                      <span style={{ fontSize: '13px', flexShrink: 0 }}>📦</span>
                      <span style={{ fontSize: '0.88rem', color: 'var(--navy)', flex: 1 }}>{item.name}</span>
                      {item.price > 0
                        ? <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#22a85a', background: 'rgba(34,168,90,0.1)', padding: '3px 10px', borderRadius: '12px', flexShrink: 0 }}>+₱{Number(item.price).toLocaleString()}</span>
                        : <span style={{ fontSize: '0.75rem', color: 'var(--gray)', fontWeight: 500, flexShrink: 0 }}>Included</span>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/order', { state: { productId: product.id, productName: product.name } })}
                style={{ flex: 1, minWidth: '160px', background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.92rem', padding: '13px 24px', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(166,113,228,0.3)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(166,113,228,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(166,113,228,0.3)'; }}
              >
                <ShoppingCart size={16} /> Order Now
              </button>
              <button
                onClick={() => navigate('/contact')}
                style={{ padding: '13px 20px', background: 'transparent', color: 'var(--navy)', fontWeight: 600, fontSize: '0.88rem', border: '1.5px solid rgba(44,62,80,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(44,62,80,0.15)'; e.currentTarget.style.color = 'var(--navy)'; }}
              >
                Ask a Question
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '20px', flexWrap: 'wrap' }}>
              {['🇵🇭 Filipino-made', '🚚 Nationwide delivery', '🔧 Full demo included'].map(b => (
                <span key={b} style={{ fontSize: '0.75rem', color: 'var(--gray)', fontWeight: 500 }}>{b}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Specs table */}
        {Object.keys(specs).length > 0 && (
          <div style={{ marginBottom: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Package size={20} color="var(--blue)" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--navy)' }}>
                Technical Specifications
              </h2>
            </div>
            <div style={{ border: '1px solid rgba(166,113,228,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
              {Object.entries(specs).map(([key, val], i) => (
                <div key={key} style={{
                  display: 'grid', gridTemplateColumns: '220px 1fr',
                  borderBottom: i < Object.entries(specs).length - 1 ? '1px solid rgba(166,113,228,0.08)' : 'none',
                  background: i % 2 === 0 ? 'rgba(166,113,228,0.03)' : 'white',
                }}>
                  <div style={{ padding: '14px 20px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--navy)', borderRight: '1px solid rgba(166,113,228,0.08)', display: 'flex', alignItems: 'center' }}>
                    {key}
                  </div>
                  <div style={{ padding: '14px 20px', fontSize: '0.88rem', color: 'var(--gray)', display: 'flex', alignItems: 'center' }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--navy)' }}>
                You May Also Like
              </h2>
              <button onClick={() => navigate('/products')}
                style={{ fontSize: '0.85rem', color: 'var(--blue)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              >
                View All <ChevronRight size={15} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}