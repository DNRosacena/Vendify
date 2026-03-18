import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children, requiredRole = 'admin' }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed,  setAllowed]  = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        // Wait for Supabase to restore session from localStorage
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

        console.log('[ProtectedRoute] session:', session);
        console.log('[ProtectedRoute] session error:', sessionErr);

        if (!session) {
          console.log('[ProtectedRoute] No session — redirecting to login');
          navigate('/admin/login');
          return;
        }

        const { data: user, error: userErr } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        console.log('[ProtectedRoute] user record:', user);
        console.log('[ProtectedRoute] user error:', userErr);

        if (userErr || !user) {
          console.log('[ProtectedRoute] Could not fetch user record');
          navigate('/admin/login');
          return;
        }

        if (user.role !== requiredRole) {
          console.log('[ProtectedRoute] Wrong role:', user.role, '— expected:', requiredRole);
          await supabase.auth.signOut();
          navigate('/admin/login');
          return;
        }

        console.log('[ProtectedRoute] Access granted');
        setAllowed(true);
      } catch (err) {
        console.error('[ProtectedRoute] Unexpected error:', err);
        navigate('/admin/login');
      } finally {
        setChecking(false);
      }
    };

    check();
  }, []);

  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(166,113,228,0.2)', borderTop: '3px solid var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>Verifying access...</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return allowed ? children : null;
}