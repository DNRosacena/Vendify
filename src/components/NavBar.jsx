import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart } from 'lucide-react';
import LogoIcon from './LogoIcon';

export default function Navbar() {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname }            = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHome = pathname === '/';

  const links = [
    { label: 'Home',     labelFil: 'Tahanan',         path: '/' },
    { label: 'Products', labelFil: 'Produkto',        path: '/products' },
    { label: 'Order',    labelFil: 'Umorder',         path: '/order' },
    { label: 'Track',    labelFil: 'Subaybayan',      path: '/track' },
    { label: 'Warranty',        labelFil: 'Garantiya',       path: '/warranty' },
    { label: 'Troubleshooting', labelFil: 'Pag-aayos',      path: '/troubleshooting' },
    { label: 'Contact',         labelFil: 'Makipag-ugnayan', path: '/contact' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled || !isHome ? 'rgba(17,7,24,0.96)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(166,113,228,0.15)' : 'none',
      transition: 'all 0.3s',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LogoIcon size={36} />
          <div>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>Vendify</p>
            <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Vending Solutions</p>
          </div>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                color: pathname === link.path ? 'var(--red)' : 'rgba(255,255,255,0.80)',
                fontWeight: pathname === link.path ? 700 : 500,
                fontSize: '0.88rem',
                padding: '8px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.15s',
                background: pathname === link.path ? 'rgba(254,120,227,0.10)' : 'transparent',
              }}
              onMouseEnter={e => { if (pathname !== link.path) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (pathname !== link.path) e.currentTarget.style.background = 'transparent'; }}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/order">
            <button
              className="btn-primary"
              style={{ marginLeft: '8px', padding: '9px 20px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, var(--blue), var(--red))', border: 'none' }}
            >
              <ShoppingCart size={15} /> Order Now
            </button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          style={{ display: 'none', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          className="mobile-menu-btn"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: 'var(--navy)', borderTop: '1px solid rgba(166,113,228,0.15)', padding: '12px 0' }}>
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              style={{ display: 'block', color: 'rgba(255,255,255,0.85)', fontWeight: 500, fontSize: '0.95rem', padding: '12px 24px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              {link.label}
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', marginLeft: '8px' }}>{link.labelFil}</span>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          nav > div > div:nth-child(2) { display: none !important; }
        }
      `}</style>
    </nav>
  );
}