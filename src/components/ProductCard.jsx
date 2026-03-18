import { useNavigate } from 'react-router-dom';
import { ArrowRight, Tag } from 'lucide-react';

export default function ProductCard({ product, index = 0 }) {
  const navigate = useNavigate();

  return (
    <div
      className={`card animate-fade-up delay-${Math.min(index + 1, 6)}`}
      style={{ overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {/* Image */}
      <div style={{
        height: '200px',
        background: `linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3.8rem', marginBottom: '8px' }}>{productEmoji(product.name)}</div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Image Coming Soon
            </p>
          </div>
        )}

        {/* Category badge */}
        {product.category && (
          <div style={{
            position: 'absolute', top: '12px', left: '12px',
            background: 'rgba(17,7,24,0.75)', backdropFilter: 'blur(8px)',
            color: 'var(--blue)', padding: '3px 10px', borderRadius: '20px',
            fontSize: '0.65rem', fontWeight: 700, border: '1px solid rgba(166,113,228,0.25)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {product.category}
          </div>
        )}

        {/* Price badge */}
        {product.price_range && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'linear-gradient(135deg, var(--blue), var(--red))',
            color: 'white', padding: '4px 10px', borderRadius: '20px',
            fontSize: '0.70rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <Tag size={10} /> {product.price_range}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '5px' }}>
          {product.name}
        </h3>
        {product.tagline && (
          <p style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600, marginBottom: '8px' }}>
            {product.tagline}
          </p>
        )}
        <p style={{ fontSize: '0.84rem', color: 'var(--gray)', lineHeight: 1.65, marginBottom: '16px', flex: 1 }}>
          {product.description || 'Premium quality vending machine built for reliability and performance.'}
        </p>

        {/* Features preview */}
        {product.features && product.features.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {product.features.slice(0, 3).map((f, i) => (
              <span key={i} style={{ fontSize: '0.68rem', background: 'rgba(166,113,228,0.08)', color: 'var(--blue)', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(166,113,228,0.15)', fontWeight: 500 }}>
                {f}
              </span>
            ))}
          </div>
        )}

        <button
          style={{ width: '100%', background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.85rem', padding: '11px', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          onClick={e => { e.stopPropagation(); navigate(`/products/${product.id}`); }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          View Details <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function productEmoji(name) {
  if (name?.includes('WiFi'))      return '📶';
  if (name?.includes('Carwash'))   return '🚗';
  if (name?.includes('Condiment')) return '🧂';
  if (name?.includes('Charging'))  return '⚡';
  if (name?.includes('Coffee'))    return '☕';
  return '🏧';
}