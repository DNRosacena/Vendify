import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = ['All', 'Internet', 'Automotive', 'Food & Beverage', 'Electronics'];

export default function Products() {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [activecat, setActiveCat] = useState('All');

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true)
      .then(({ data }) => { setProducts(data || []); setLoading(false); });
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activecat === 'All' || p.category === activecat;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ paddingTop: '68px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a0412 0%, var(--navy) 100%)', padding: '56px 24px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '10%', top: '20%', width: '300px', height: '300px', background: 'var(--blue)', borderRadius: '50%', opacity: 0.06, filter: 'blur(70px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <span className="tag" style={{ color: 'var(--blue)', background: 'rgba(166,113,228,0.12)', padding: '4px 14px', borderRadius: '20px', border: '1px solid rgba(166,113,228,0.2)' }}>
            Catalog / Katalogo
          </span>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'white', margin: '12px 0 14px' }}>
            Our Vending Machines
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.55)', maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            Quality vending solutions for every business type. Choose your machine and start earning.
          </p>

          {/* Search */}
          <div style={{ maxWidth: '460px', margin: '0 auto', position: 'relative' }}>
            <Search size={16} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              placeholder="Search products... / Maghanap ng produkto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '13px 16px 13px 42px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '10px', color: 'white', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'rgba(166,113,228,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.2)'}
            />
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ background: 'var(--navy)', borderBottom: '1px solid rgba(166,113,228,0.1)', padding: '0 24px', position: 'sticky', top: '68px', zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', padding: '12px 0' }}>
          <SlidersHorizontal size={15} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginRight: '8px' }} />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              style={{
                padding: '7px 16px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                fontSize: '0.82rem', fontWeight: activecat === cat ? 700 : 500,
                whiteSpace: 'nowrap', transition: 'all 0.18s',
                background: activecat === cat
                  ? 'linear-gradient(135deg, var(--blue), var(--red))'
                  : 'rgba(255,255,255,0.06)',
                color: activecat === cat ? 'white' : 'rgba(255,255,255,0.55)',
                boxShadow: activecat === cat ? '0 2px 12px rgba(166,113,228,0.3)' : 'none',
              }}
            >
              {cat}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', paddingRight: '4px' }}>
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: '380px', background: 'var(--light)', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔍</p>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '8px' }}>No products found</p>
            <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>Try a different search or category filter.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}