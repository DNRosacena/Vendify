import OrderForm from '../components/OrderForm';

export default function Order() {
  return (
    <div style={{ paddingTop: '68px' }}>
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '56px 24px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <span className="tag" style={{ color: 'rgba(255,255,255,0.5)' }}>Order / Umorder</span>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'white', margin: '10px 0 14px' }}>
            Place Your Order
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Fill out the form below and our sales team will contact you within 24 hours to confirm your order.
          </p>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 80px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '48px', alignItems: 'start' }}>
        <div>
          <OrderForm />
        </div>

        {/* Side info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* What happens next */}
          <div style={{ background: 'var(--light)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(44,62,80,0.08)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--navy)' }}>
              📋 What happens next?
            </h3>
            {[
              { step: '1', text: 'Sales team receives your order' },
              { step: '2', text: 'We contact you within 24 hours' },
              { step: '3', text: 'Production team builds your machine' },
              { step: '4', text: 'Rider delivers & demonstrates' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '22px', height: '22px', background: 'var(--red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 700 }}>{s.step}</span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--navy)', lineHeight: 1.5 }}>{s.text}</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div style={{ background: 'var(--navy)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', color: 'white' }}>💬 Need help?</h3>
            <p style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, marginBottom: '14px' }}>
              Our sales team is available to assist you with your order.
            </p>
            <a href="tel:+639XXXXXXXXX" style={{ display: 'block', background: 'var(--red)', color: 'white', textAlign: 'center', padding: '10px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>
              📞 Call Us Now
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 340px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}