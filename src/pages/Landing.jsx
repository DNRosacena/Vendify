import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Phone, ChevronRight, Zap, Truck, Wrench, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';

export default function Landing() {
  const navigate  = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).limit(3)
      .then(({ data }) => setProducts(data || []));
  }, []);

  const whyItems = [
    { icon: Wrench,    title: 'Locally Manufactured', titleFil: 'Gawa sa Pilipinas',        desc: 'Built right here in the Philippines with quality parts.' },
    { icon: Truck,     title: 'Nationwide Delivery',  titleFil: 'Delivery sa Buong Bansa',  desc: 'We deliver and demonstrate anywhere in the Philippines.' },
    { icon: TrendingUp,title: 'Passive Income Ready', titleFil: 'Para sa Kita Kahit Tulog', desc: 'Designed to generate income with minimal maintenance.' },
    { icon: Zap,       title: 'Full After-Sales',     titleFil: 'Suporta Pagkatapos Bilhin','desc': 'Installation, demo, and ongoing technical support.' },
  ];

  const steps = [
    { num: '01', title: 'Browse & Choose',    titleFil: 'Piliin ang Produkto', desc: 'Explore our vending machines and select what fits your business.' },
    { num: '02', title: 'Fill Out the Form',  titleFil: 'Punan ang Form',      desc: 'Provide your details and we\'ll process your order right away.' },
    { num: '03', title: 'We Build & Deliver', titleFil: 'Gagawin at Ihahatid', desc: 'Our team builds and our riders deliver to your location.' },
    { num: '04', title: 'Demo & Go Live',     titleFil: 'Demo at Simulan',     desc: 'We demonstrate how it works so you can start earning immediately.' },
  ];

  const machineItems = [
    { emoji: '📶', name: 'Piso WiFi Vendo',    color: '#a671e4' },
    { emoji: '🚗', name: 'Carwash Vendo',      color: '#fe78e3' },
    { emoji: '🧂', name: 'Condiments Vendo',   color: '#a671e4' },
    { emoji: '⚡', name: 'Charging Vendo',     color: '#fe78e3' },
    { emoji: '☕', name: 'Coffee Vendo',       color: '#a671e4' },
  ];

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(135deg, #0a0412 0%, #110718 55%, #1e0a2e 100%)`,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: '68px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* BG glow blobs */}
        <div style={{ position: 'absolute', left: '-5%',   top: '10%',  width: '420px', height: '420px', background: 'var(--blue)', borderRadius: '50%', opacity: 0.07, filter: 'blur(90px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '5%',   bottom: '5%',width: '360px', height: '360px', background: 'var(--red)',  borderRadius: '50%', opacity: 0.08, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '20%',  top: '15%',  width: '200px', height: '200px', background: 'var(--blue)', borderRadius: '50%', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />

        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(var(--light) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>

          {/* LEFT — Text */}
          <div>
            <div className="animate-fade-up delay-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(166,113,228,0.12)', border: '1px solid rgba(166,113,228,0.22)', borderRadius: '20px', padding: '5px 14px', marginBottom: '24px' }}>
              <span style={{ fontSize: '0.9rem', color: 'white' }}>🇵🇭</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--blue)' }}>Made in the Philippines</span>
            </div>

            <h1 className="animate-fade-up delay-2" style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)', fontWeight: 800, color: 'white', lineHeight: 1.13, marginBottom: '20px' }}>
              Quality Vending<br />
              <span style={{ background: 'linear-gradient(90deg, var(--blue), var(--red))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Machines
              </span>{' '}Built<br />
              for Your Business
            </h1>

            <p className="animate-fade-up delay-3" style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.78, marginBottom: '32px', maxWidth: '480px' }}>
              From Piso WiFi to Coffee Vendo — we manufacture, deliver, and demonstrate quality vending solutions across the Philippines. Start earning passive income today.
            </p>

            <div className="animate-fade-up delay-4" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
              <button
                onClick={() => navigate('/order')}
                style={{ background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.95rem', padding: '13px 28px', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 24px rgba(254,120,227,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(254,120,227,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(254,120,227,0.25)'; }}
              >
                Order Now <ArrowRight size={16} />
              </button>
              <button className="btn-outline-white" onClick={() => navigate('/products')} style={{ padding: '13px 28px', fontSize: '0.95rem', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                View Products
              </button>
            </div>

            <div className="animate-fade-up delay-5" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {['500+ Machines Sold', '100% Filipino-Made', 'Nationwide Delivery'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={15} color="var(--blue)" />
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Vending machine visual */}
          <div className="animate-fade-up delay-3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>

            {/* Outer glow ring */}
            <div style={{ position: 'absolute', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(166,113,228,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Main machine showcase card */}
            <div style={{ width: '320px', position: 'relative', zIndex: 1 }}>
              {/* Machine body */}
              <div style={{
                background: 'linear-gradient(160deg, rgba(166,113,228,0.18) 0%, rgba(254,120,227,0.10) 100%)',
                border: '1px solid rgba(166,113,228,0.25)',
                borderRadius: '20px',
                padding: '28px 24px 24px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(166,113,228,0.15)', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--blue)', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--blue)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Vendify Products</span>
                  </div>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>Our Machines</p>
                </div>

                {/* Machine list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {machineItems.map((m, i) => (
                    <div
                      key={m.name}
                      className={`animate-fade-up delay-${i + 2}`}
                      onClick={() => navigate('/products')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '10px', padding: '10px 14px',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(166,113,228,0.12)'; e.currentTarget.style.borderColor = 'rgba(166,113,228,0.3)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    >
                      <div style={{ width: '36px', height: '36px', background: `${m.color}22`, border: `1px solid ${m.color}44`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                        {m.emoji}
                      </div>
                      <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500, flex: 1 }}>{m.name}</span>
                      <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
                    </div>
                  ))}
                </div>

                {/* CTA inside card */}
                <button
                  onClick={() => navigate('/order')}
                  style={{ width: '100%', background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.85rem', padding: '11px', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'opacity 0.2s', letterSpacing: '0.02em' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  🛒 Order Now / Umorder Na
                </button>
              </div>

              {/* Floating stats badges */}
              <div style={{ position: 'absolute', top: '-16px', right: '-20px', background: 'var(--navy)', border: '1px solid rgba(166,113,228,0.25)', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--blue)', lineHeight: 1 }}>500+</p>
                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', whiteSpace: 'nowrap' }}>Machines Sold</p>
              </div>
              <div style={{ position: 'absolute', bottom: '-14px', left: '-18px', background: 'var(--navy)', border: '1px solid rgba(254,120,227,0.25)', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--red)', lineHeight: 1 }}>24h</p>
                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', whiteSpace: 'nowrap' }}>Response Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile responsive */}
        <style>{`
          @media (max-width: 768px) {
            section > div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }
            section > div[style*="grid-template-columns"] > div:nth-child(2) {
              display: none !important;
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </section>

      {/* ── Featured Products ─────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'var(--light)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="tag">Our Products / Aming Produkto</span>
            <h2 className="section-title" style={{ margin: '8px auto 14px' }}>Featured Vending Machines</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Each machine is carefully manufactured and tested before delivery.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <button className="btn-secondary" onClick={() => navigate('/products')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              View All Products <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── How it Works ──────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span className="tag">Process / Proseso</span>
            <h2 className="section-title" style={{ margin: '8px auto 14px' }}>How It Works</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>From order to earning — simple and straightforward.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px' }}>
            {steps.map((s, i) => (
              <div key={s.num} className={`animate-fade-up delay-${i + 1}`} style={{ textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontFamily: 'Playfair Display, serif', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 4px 16px rgba(166,113,228,0.3)' }}>
                  {s.num}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>{s.title}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600, marginBottom: '8px' }}>{s.titleFil}</p>
                <p style={{ fontSize: '0.84rem', color: 'var(--gray)', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us ────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'var(--navy)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span className="tag" style={{ color: 'rgba(255,255,255,0.45)' }}>Why Choose Us / Bakit Kami</span>
            <h2 className="section-title" style={{ color: 'white', margin: '8px auto 14px' }}>Built on Trust & Quality</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {whyItems.map((item, i) => (
              <div key={i} className={`animate-fade-up delay-${i + 1}`} style={{ background: 'rgba(166,113,228,0.07)', border: '1px solid rgba(166,113,228,0.15)', borderRadius: '14px', padding: '24px', transition: 'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(166,113,228,0.12)'; e.currentTarget.style.borderColor = 'rgba(166,113,228,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(166,113,228,0.07)'; e.currentTarget.style.borderColor = 'rgba(166,113,228,0.15)'; }}
              >
                <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, var(--blue), var(--red))', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 4px 16px rgba(166,113,228,0.3)' }}>
                  <item.icon size={20} color="white" />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{item.title}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600, marginBottom: '8px' }}>{item.titleFil}</p>
                <p style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.48)', lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feedback CTA ──────────────────────────────────── */}
      <section style={{ padding: '64px 24px', background: 'var(--light)', textAlign: 'center' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(166,113,228,0.15), rgba(254,120,227,0.1))', border: '1px solid rgba(166,113,228,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.6rem' }}>
            ⭐
          </div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--navy)', marginBottom: '10px' }}>
            Already a Customer? / Kasalukuyang Customer?
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--gray)', lineHeight: 1.7, marginBottom: '24px' }}>
            We'd love to hear about your experience. Rate your sales representative and delivery rider — your feedback helps us improve. / I-rate ang inyong karanasan sa aming serbisyo.
          </p>
          <button
            onClick={() => navigate('/feedback')}
            style={{ background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.92rem', padding: '13px 30px', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 18px rgba(166,113,228,0.25)', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            ⭐ Rate Our Service
          </button>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, var(--navy-light) 0%, var(--navy) 100%)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '300px', background: 'var(--blue)', borderRadius: '50%', opacity: 0.06, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: 'white', marginBottom: '14px' }}>
            Ready to Start Earning?
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '32px' }}>
            Handa ka na bang kumita? Order your vending machine today and our team will take care of the rest.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/order')}
              style={{ background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.95rem', padding: '14px 32px', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 24px rgba(254,120,227,0.25)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Order Now / Umorder Na
            </button>
            <button
              onClick={() => navigate('/contact')}
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 600, fontSize: '0.9rem', padding: '14px 28px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              <Phone size={15} /> Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}