import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminLogin() {
  const navigate  = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: user } = await supabase
        .from('users').select('role').eq('id', session.user.id).single();
      if (user?.role === 'admin') navigate('/admin');
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setError('Invalid email or password. / Mali ang email o password.'); setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile }  = await supabase.from('users').select('role').eq('id', user.id).single();

    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Access denied. Admin accounts only. / Naka-restrict ang access na ito.');
      setLoading(false);
      return;
    }

    navigate('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0412 0%, #110718 55%, #1e0a2e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>

      {/* BG blobs */}
      <div style={{ position: 'absolute', left: '15%', top: '20%', width: '350px', height: '350px', background: 'var(--blue)', borderRadius: '50%', opacity: 0.06, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '15%', bottom: '20%', width: '300px', height: '300px', background: 'var(--red)', borderRadius: '50%', opacity: 0.06, filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--blue), var(--red))', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(166,113,228,0.3)' }}>
            <Shield size={26} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: '6px' }}>Admin Portal</h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Vendify — Internal Dashboard</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(166,113,228,0.18)', borderRadius: '16px', padding: '32px', backdropFilter: 'blur(20px)' }}>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(254,120,227,0.08)', border: '1px solid rgba(254,120,227,0.2)', borderRadius: '8px', padding: '11px 14px', marginBottom: '20px', fontSize: '0.84rem', color: 'var(--red)', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="admin@vendify.ph"
                style={{ width: '100%', padding: '12px 14px 12px 38px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(166,113,228,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.2)'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                style={{ width: '100%', padding: '12px 40px 12px 38px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(166,113,228,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.2)'}
              />
              <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', padding: 0 }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(166,113,228,0.3)' : 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.95rem', padding: '13px', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 20px rgba(166,113,228,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Signing in...</>
            ) : (
              <><Shield size={15} /> Sign In to Dashboard</>
            )}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}>
          Admin access only. Unauthorized access is prohibited.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}