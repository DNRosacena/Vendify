import { Link } from 'react-router-dom';
import { Facebook, MessageCircle, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--dark)', color: 'white', paddingTop: '56px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px', paddingBottom: '48px' }}>

        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--red)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 900 }}>V</span>
            </div>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 800 }}>Vendify</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: '20px' }}>
            Your trusted partner for quality vending machine solutions in the Philippines.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { icon: Facebook, href: '#' },
              { icon: MessageCircle, href: '#' },
            ].map(({ icon: Icon, href }, i) => (
              <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.55)', transition: 'all 0.2s', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Quick Links</p>
          {[['Home', '/'], ['Products', '/products'], ['Order Now', '/order'], ['Contact Us', '/contact']].map(([label, path]) => (
            <Link key={path} to={path} style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', textDecoration: 'none', marginBottom: '9px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = 'white'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
            >{label}</Link>
          ))}
        </div>

        {/* Products */}
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Products</p>
          {['Piso WiFi Vendo', 'Carwash Vendo Set', 'Condiments Vendo', 'Charging Vendo', 'Coffee Vendo'].map(p => (
            <p key={p} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', marginBottom: '9px' }}>{p}</p>
          ))}
        </div>

        {/* Contact */}
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Contact</p>
          {[
            { icon: Phone, text: '+63 9XX XXX XXXX' },
            { icon: Mail,  text: 'info@Vendify.ph' },
            { icon: MapPin,text: 'Metro Manila, Philippines' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Icon size={14} color="var(--red)" />
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '18px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Vendify. All rights reserved. · Built with ❤️ in the Philippines
        </p>
      </div>
    </footer>
  );
}