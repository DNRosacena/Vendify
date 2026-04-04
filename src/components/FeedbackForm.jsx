import { useState } from 'react';
import { Star, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => !disabled && setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          style={{ background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', padding: '3px', lineHeight: 0 }}
        >
          <Star
            size={30}
            fill={active >= n ? '#f59e0b' : 'none'}
            color={active >= n ? '#f59e0b' : 'rgba(149,165,166,0.35)'}
            style={{ transition: 'all 0.1s', display: 'block' }}
          />
        </button>
      ))}
    </div>
  );
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function FeedbackForm({ order, onSubmitted }) {
  const hasRider = !!(order.assigned_rider_id && !['lbc', 'jnt'].includes(order.delivery_type));

  const [salesRating,   setSalesRating]   = useState(0);
  const [salesComment,  setSalesComment]  = useState('');
  const [riderRating,   setRiderRating]   = useState(0);
  const [riderComment,  setRiderComment]  = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  const canSubmit = salesRating > 0 && (!hasRider || riderRating > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');

    const { error: err } = await supabase.from('feedbacks').insert({
      order_id:       order.id,
      reference_code: order.reference_code,
      sales_rating:   salesRating,
      sales_comment:  salesComment.trim() || null,
      rider_rating:   hasRider ? riderRating : null,
      rider_comment:  hasRider && riderComment.trim() ? riderComment.trim() : null,
    });

    if (err) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    } else {
      onSubmitted?.();
    }
  };

  return (
    <form onSubmit={handleSubmit}>

      {/* Sales rating */}
      <div style={{ marginBottom: hasRider ? '28px' : '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(166,113,228,0.15), rgba(254,120,227,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🧑‍💼</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--navy)', margin: 0 }}>
              Sales Representative
              {order.assigned_sales?.full_name && (
                <span style={{ fontWeight: 500, color: 'var(--gray)', fontSize: '0.8rem', marginLeft: '6px' }}>
                  — {order.assigned_sales.full_name}
                </span>
              )}
            </p>
            <p style={{ fontSize: '0.76rem', color: 'var(--gray)', margin: '2px 0 0' }}>
              How satisfied are you with our sales service?
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <StarRating value={salesRating} onChange={setSalesRating} disabled={submitting} />
          {salesRating > 0 && (
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b' }}>{LABELS[salesRating]}</span>
          )}
        </div>
        <textarea
          value={salesComment}
          onChange={e => setSalesComment(e.target.value)}
          placeholder="Leave a comment (optional) / Mag-iwan ng komento (opsyonal)"
          disabled={submitting}
          rows={2}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', color: 'var(--navy)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: 'rgba(166,113,228,0.02)' }}
          onFocus={e => e.target.style.borderColor = 'rgba(166,113,228,0.5)'}
          onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.2)'}
        />
      </div>

      {/* Rider rating */}
      {hasRider && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(166,113,228,0.15), rgba(254,120,227,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🏍️</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--navy)', margin: 0 }}>Delivery Rider</p>
              <p style={{ fontSize: '0.76rem', color: 'var(--gray)', margin: '2px 0 0' }}>
                How was your delivery experience?
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <StarRating value={riderRating} onChange={setRiderRating} disabled={submitting} />
            {riderRating > 0 && (
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b' }}>{LABELS[riderRating]}</span>
            )}
          </div>
          <textarea
            value={riderComment}
            onChange={e => setRiderComment(e.target.value)}
            placeholder="Leave a comment (optional) / Mag-iwan ng komento (opsyonal)"
            disabled={submitting}
            rows={2}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(166,113,228,0.2)', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', color: 'var(--navy)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: 'rgba(166,113,228,0.02)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(166,113,228,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(166,113,228,0.2)'}
          />
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--red)', fontSize: '0.83rem', marginBottom: '12px' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '12px 28px',
          background: canSubmit && !submitting ? 'linear-gradient(135deg, var(--blue), var(--red))' : 'rgba(166,113,228,0.12)',
          color: canSubmit && !submitting ? 'white' : 'rgba(149,165,166,0.8)',
          fontWeight: 700, fontSize: '0.9rem', border: 'none', borderRadius: '10px',
          cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: canSubmit && !submitting ? '0 4px 16px rgba(166,113,228,0.3)' : 'none',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <Send size={15} />
        {submitting ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </form>
  );
}

export function FeedbackThankYou() {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(46,204,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <CheckCircle size={26} color="var(--green)" />
      </div>
      <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', marginBottom: '6px' }}>
        Thank you for your feedback!
      </p>
      <p style={{ fontSize: '0.84rem', color: 'var(--gray)', lineHeight: 1.6 }}>
        Salamat sa inyong feedback. It helps us improve our service. / Nakakatulong ito sa amin para mapabuti ang aming serbisyo.
      </p>
    </div>
  );
}
