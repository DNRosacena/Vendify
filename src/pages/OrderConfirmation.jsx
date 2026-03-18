import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Home, Package } from 'lucide-react';

export default function OrderConfirmation() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const ref        = state?.ref || 'VT-XXXXXXXX';
  const productName = state?.productName || 'your vending machine';

  return (
    <div style={{ paddingTop: '68px', minHeight: '100vh', background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ maxWidth: '560px', width: '100%', background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 8px 40px rgba(44,62,80,0.1)' }}>

        {/* Success icon */}
        <div style={{ width: '72px', height: '72px', background: 'rgba(46,204,113,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={36} color="var(--green)" />
        </div>

        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>
          Order Received!
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--gray)', marginBottom: '28px' }}>
          Natanggap na ang iyong order. / Your order has been received.
        </p>

        {/* Reference */}
        <div style={{ background: 'var(--light)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--gray)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Reference Number / Sangguniang Numero
          </p>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '0.04em' }}>
            {ref}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: '4px' }}>
            Save this number for tracking / I-save ang numerong ito para sa pagsubaybay
          </p>
        </div>

        {/* Product */}
        <div style={{ background: 'rgba(52,152,219,0.06)', border: '1px solid rgba(52,152,219,0.15)', borderRadius: '10px', padding: '16px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
          <Package size={24} color="var(--blue)" />
          <div>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>Product ordered:</p>
            <p style={{ fontWeight: 700, color: 'var(--navy)' }}>{productName}</p>
          </div>
        </div>

        {/* What's next */}
        <div style={{ textAlign: 'left', marginBottom: '32px' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', marginBottom: '10px' }}>What happens next:</p>
          {[
            'Our sales team will call you within 24 hours',
            'We\'ll confirm your order details and delivery address',
            'Production team will build your machine',
            'Rider will deliver and demonstrate the machine',
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '7px' }}>
              <CheckCircle size={14} color="var(--green)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <p style={{ fontSize: '0.84rem', color: 'var(--gray)', lineHeight: 1.5 }}>{s}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={() => navigate('/')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Home size={15} /> Home
          </button>
          <button className="btn-primary" onClick={() => navigate('/products')} style={{ flex: 1 }}>
            Order Another
          </button>
        </div>
      </div>
    </div>
  );
}