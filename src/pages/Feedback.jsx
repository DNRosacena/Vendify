import { useState } from 'react';
import { Search, XCircle, Star, CheckCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FeedbackForm, { FeedbackThankYou } from '../components/FeedbackForm';

export default function Feedback() {
  const [refCode,   setRefCode]   = useState('');
  const [order,     setOrder]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [searched,  setSearched]  = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSearch = async () => {
    if (!refCode.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setSearched(true);
    setAlreadySubmitted(false);
    setSubmitted(false);

    // Normalize reference code (same logic as Track page)
    let normalized = refCode.trim().toUpperCase().replace(/\s/g, '');
    const stripped = normalized.replace(/-/g, '');
    if (/^VND\d{10}$/.test(stripped)) {
      normalized = stripped.slice(0, 9) + '-' + stripped.slice(9);
    } else {
      const m = stripped.match(/^([A-Z]+)(\d{4})([A-Z]{4})$/);
      if (m) normalized = `${m[1]}-${m[2]}-${m[3]}`;
    }

    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('*, assigned_sales:assigned_sales_id(full_name)')
      .eq('reference_code', normalized)
      .single();

    if (orderErr || !orderData) {
      setError('No order found with that reference code. Please check and try again.');
      setLoading(false);
      return;
    }

    if (orderData.status !== 'delivered') {
      setError('Feedback is only available for delivered orders. Your order status is currently: ' + (orderData.status?.replace(/_/g, ' ') || 'unknown') + '.');
      setLoading(false);
      return;
    }

    // Check if feedback already submitted
    const { data: existing } = await supabase
      .from('feedbacks')
      .select('id')
      .eq('order_id', orderData.id)
      .maybeSingle();

    setOrder(orderData);
    if (existing) setAlreadySubmitted(true);
    setLoading(false);
  };

  return (
    <div style={{ paddingTop: '68px', minHeight: '100vh', background: 'var(--light)' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a0412 0%, var(--navy) 100%)', padding: '56px 24px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '200px', background: 'var(--blue)', borderRadius: '50%', opacity: 0.05, filter: 'blur(70px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <span style={{ color: 'var(--blue)', background: 'rgba(166,113,228,0.12)', padding: '4px 14px', borderRadius: '20px', border: '1px solid rgba(166,113,228,0.2)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Rate Our Service
          </span>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: 'white', margin: '12px 0 14px' }}>
            Customer Feedback
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.55)', marginBottom: '32px', lineHeight: 1.7 }}>
            Share your experience with our sales and delivery team. / Ibahagi ang inyong karanasan sa aming sales at delivery team.
          </p>

          {/* Search */}
          <form
            onSubmit={e => { e.preventDefault(); handleSearch(); }}
            style={{ display: 'flex', gap: '10px', maxWidth: '480px', margin: '0 auto' }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={refCode}
                onChange={e => setRefCode(e.target.value)}
                placeholder="e.g. VND260310-1234"
                autoCorrect="off"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                style={{ width: '100%', padding: '13px 16px 13px 42px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(166,113,228,0.25)', borderRadius: '10px', color: 'white', fontSize: '1rem', outline: 'none', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(166,113,228,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.25)'}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !refCode.trim()}
              style={{ padding: '13px 24px', background: 'linear-gradient(135deg, var(--blue), var(--red))', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', borderRadius: '10px', cursor: loading || !refCode.trim() ? 'not-allowed' : 'pointer', opacity: loading || !refCode.trim() ? 0.5 : 1, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(166,113,228,0.3)', fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? '…' : 'Find Order'}
            </button>
          </form>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Error */}
        {searched && error && !loading && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(231,76,60,0.15)' }}>
            <XCircle size={40} color="var(--red)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '8px' }}>Order Not Found</h3>
            <p style={{ color: 'var(--gray)', fontSize: '0.9rem', lineHeight: 1.6 }}>{error}</p>
          </div>
        )}

        {/* Order found */}
        {order && !loading && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>

            {/* Order info */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '20px 24px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(166,113,228,0.12)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--blue), var(--red))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={18} color="white" fill="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--gray)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>Order</p>
                <p style={{ fontFamily: 'Playfair Display, serif', fontWeight: 800, color: 'var(--navy)', fontSize: '1.05rem', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.reference_code}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--gray)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>Product</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)' }}>{order.product_name}</p>
              </div>
            </div>

            {/* Feedback form or already-submitted */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', boxShadow: '0 4px 20px rgba(44,62,80,0.06)', border: '1px solid rgba(166,113,228,0.12)' }}>
              {submitted || alreadySubmitted ? (
                <>
                  <FeedbackThankYou />
                  {alreadySubmitted && !submitted && (
                    <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--gray)', marginTop: '10px' }}>
                      You have already submitted feedback for this order.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', marginBottom: '20px' }}>
                    Rate Your Experience
                  </h3>
                  <FeedbackForm order={order} onSubmitted={() => setSubmitted(true)} />
                </>
              )}
            </div>

            {/* Try another */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => { setOrder(null); setRefCode(''); setSearched(false); setSubmitted(false); setAlreadySubmitted(false); }}
                style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif' }}
              >
                Submit for another order <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!searched && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: '3rem', marginBottom: '14px' }}>⭐</p>
            <p style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: '6px', fontSize: '1rem' }}>Enter your reference number above</p>
            <p style={{ color: 'var(--gray)', fontSize: '0.88rem', lineHeight: 1.65 }}>
              We'd love to hear about your experience with our sales and delivery team.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
