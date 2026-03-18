import { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Send, Facebook } from 'lucide-react';

export default function Contact() {
  const [form, setForm]   = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent]   = useState(false);

  const handleSubmit = () => {
    if (!form.name || !form.message) return;
    setSent(true);
  };

  const contactItems = [
    { icon: Phone,          label: 'Call / Tumawag',     value: '+63 9XX XXX XXXX',          href: 'tel:+639XXXXXXXXX' },
    { icon: MessageCircle,  label: 'Viber / WhatsApp',   value: '+63 9XX XXX XXXX',          href: '#' },
    { icon: Mail,           label: 'Email',              value: 'info@vendotrack.ph',        href: 'mailto:info@vendotrack.ph' },
    { icon: Facebook,       label: 'Facebook',           value: 'VendoTrack Philippines',    href: '#' },
    { icon: MapPin,         label: 'Address',            value: 'Metro Manila, Philippines', href: '#' },
  ];

  return (
    <div style={{ paddingTop: '68px' }}>
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <span className="tag" style={{ color: 'rgba(255,255,255,0.5)' }}>Contact / Makipag-ugnayan</span>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'white', margin: '10px 0 14px' }}>
          Get in Touch
        </h1>
        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
          May tanong ka ba? Makipag-ugnayan sa aming koponan. / Have questions? Our team is ready to assist you.
        </p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>

        {/* Contact info */}
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '24px', color: 'var(--navy)' }}>
            Contact Information
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
            {contactItems.map(({ icon: Icon, label, value, href }, i) => (
              <a key={i} href={href} style={{ display: 'flex', gap: '14px', alignItems: 'center', textDecoration: 'none', padding: '14px 16px', background: 'var(--light)', borderRadius: '10px', border: '1px solid rgba(44,62,80,0.06)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.06)'; e.currentTarget.style.borderColor = 'rgba(231,76,60,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--light)'; e.currentTarget.style.borderColor = 'rgba(44,62,80,0.06)'; }}
              >
                <div style={{ width: '40px', height: '40px', background: 'var(--red)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--gray)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontSize: '0.92rem', color: 'var(--navy)', fontWeight: 600 }}>{value}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Business hours */}
          <div style={{ background: 'var(--navy)', borderRadius: '12px', padding: '24px', color: 'white' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '14px', fontSize: '1rem' }}>🕐 Business Hours</h3>
            {[
              { day: 'Monday – Friday', time: '8:00 AM – 6:00 PM' },
              { day: 'Saturday',        time: '8:00 AM – 5:00 PM' },
              { day: 'Sunday',          time: 'Closed / Sarado' },
            ].map(r => (
              <div key={r.day} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>{r.day}</span>
                <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>{r.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '24px', color: 'var(--navy)' }}>
            Send a Message / Magpadala ng Mensahe
          </h2>
          {sent ? (
            <div style={{ padding: '48px', background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</p>
              <h3 style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--navy)', marginBottom: '8px' }}>Message Sent!</h3>
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>We'll get back to you within 24 hours. / Magbabalik kami sa loob ng 24 na oras.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { key: 'name', label: 'Full Name / Buong Pangalan', placeholder: 'Juan dela Cruz', required: true },
                { key: 'email', label: 'Email', placeholder: 'juan@email.com', required: false },
                { key: 'phone', label: 'Phone Number / Numero', placeholder: '09XXXXXXXXX', required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className={`label ${f.required ? 'required' : ''}`}>{f.label}</label>
                  <input className="input-field" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="label required">Message / Mensahe</label>
                <textarea
                  className="input-field"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="Your question or message / Ang iyong tanong o mensahe"
                  value={form.message}
                  onChange={e => setForm(x => ({ ...x, message: e.target.value }))}
                />
              </div>
              <button className="btn-primary" onClick={handleSubmit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                <Send size={15} /> Send Message / Ipadala
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}