import { useState, useEffect } from 'react';
import { Wrench, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Converts YouTube watch/short URLs to embed URLs; returns URL as-is otherwise.
function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      // already an embed URL
      if (u.pathname.startsWith('/embed/')) return url;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('?')[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {}
  return url;
}

export default function Troubleshooting() {
  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('troubleshooting_videos')
        .select('*')
        .order('created_at', { ascending: true });
      setVideos(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ paddingTop: '68px', minHeight: '100vh', background: 'var(--light)' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a0412 0%, var(--navy) 100%)', padding: '56px 24px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '200px', background: 'var(--blue)', borderRadius: '50%', opacity: 0.05, filter: 'blur(70px)', pointerEvents: 'none' }} />
        <span className="tag" style={{ color: 'var(--blue)', background: 'rgba(166,113,228,0.12)', padding: '4px 14px', borderRadius: '20px', border: '1px solid rgba(166,113,228,0.2)', position: 'relative' }}>
          Basic Troubleshooting / Pangunahing Pag-aayos
        </span>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'white', margin: '12px 0 14px', position: 'relative' }}>
          Basic Troubleshooting
        </h1>
        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.55)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7, position: 'relative' }}>
          Watch our guide videos to solve common issues with your vending machine. / Panoorin ang aming mga gabay na video para ayusin ang mga karaniwang problema.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--gray)', fontSize: '0.9rem' }}>
            Loading…
          </div>
        ) : videos.length === 0 ? (
          /* ── Under Development ── */
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(166,113,228,0.08)', border: '2px solid rgba(166,113,228,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Wrench size={36} color="rgba(166,113,228,0.4)" />
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '12px' }}>
              Under Development
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--gray)', lineHeight: 1.75, maxWidth: '480px', margin: '0 auto 8px' }}>
              We're currently preparing troubleshooting guides for your vending machine.
            </p>
            <p style={{ fontSize: '0.88rem', color: 'rgba(166,113,228,0.5)', lineHeight: 1.7 }}>
              Kasalukuyan kaming naghahanda ng mga gabay sa pag-aayos. Pakibalik mamaya.
            </p>
          </div>
        ) : (
          /* ── Video grid ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '28px' }}>
            {videos.map(v => (
              <div key={v.id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(44,62,80,0.07)', border: '1px solid rgba(166,113,228,0.10)', display: 'flex', flexDirection: 'column' }}>
                {/* Embedded video */}
                <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
                  <iframe
                    src={toEmbedUrl(v.video_url)}
                    title={v.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  />
                </div>
                {/* Info */}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <PlayCircle size={18} color="var(--blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', margin: 0, lineHeight: 1.4 }}>{v.title}</h3>
                  </div>
                  {v.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--gray)', lineHeight: 1.65, margin: 0 }}>{v.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
