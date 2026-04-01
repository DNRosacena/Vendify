import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Props:
 *  orderId     – uuid of the order
 *  senderName  – display name of the current participant
 *  senderType  – 'customer' | 'user'
 *  senderId    – uuid (for staff) | null (for customers)
 */
export default function OrderChat({ orderId, senderName, senderType, senderId, salesId, riderId, referenceCode }) {
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  // ── Load & subscribe ──────────────────────────────────────
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat_${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'order_messages',
        filter: `order_id=eq.${orderId}`,
      }, loadMessages)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at');
    setMessages(data || []);
    setLoading(false);
  };

  // ── Notify all order participants except the sender ────────
  const notifyChat = async () => {
    const title = '💬 New Chat Message';
    const body  = `${senderName} sent a message on order ${referenceCode || orderId}`;

    const { data: admins } = await supabase
      .from('users').select('id').eq('role', 'admin').eq('is_active', true);

    const inserts = [];
    for (const a of admins || []) {
      if (a.id !== senderId) inserts.push({ user_id: a.id, title, body, order_id: orderId });
    }
    if (salesId && salesId !== senderId)
      inserts.push({ user_id: salesId, title, body, order_id: orderId });
    if (riderId && riderId !== senderId)
      inserts.push({ user_id: riderId, title, body, order_id: orderId });

    if (inserts.length) await supabase.from('notifications').insert(inserts);
  };

  // ── Send text ─────────────────────────────────────────────
  const sendText = async () => {
    if (!text.trim()) return;
    setSending(true);
    await supabase.from('order_messages').insert({
      order_id:    orderId,
      sender_id:   senderId || null,
      sender_name: senderName,
      sender_type: senderType,
      content:     text.trim(),
    });
    notifyChat(); // fire-and-forget
    setText('');
    await loadMessages();
    setSending(false);
  };

  // ── Send file ─────────────────────────────────────────────
  const sendFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      alert('File too large. Maximum 5 MB. / Sobrang laki ng file. Max 5 MB.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    const ext  = file.name.split('.').pop()?.toLowerCase();
    const path = `${orderId}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from('order-attachments')
      .upload(path, file);

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('order-attachments')
        .getPublicUrl(path);

      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      await supabase.from('order_messages').insert({
        order_id:    orderId,
        sender_id:   senderId || null,
        sender_name: senderName,
        sender_type: senderType,
        file_url:    publicUrl,
        file_name:   file.name,
        file_type:   isImage ? 'image' : 'file',
      });
      notifyChat(); // fire-and-forget
      await loadMessages();
    }
    setUploading(false);
    e.target.value = '';
  };

  // ── Ownership check ───────────────────────────────────────
  const isOwn = (msg) => {
    if (senderId && msg.sender_id === senderId) return true;
    if (!senderId && msg.sender_type === 'customer'
        && msg.sender_name === senderName) return true;
    return false;
  };

  const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' });

  const roleLabel = (senderType) => {
    switch (senderType) {
      case 'admin':    return 'Admin';
      case 'rider':    return 'Rider';
      case 'sales':    return 'Sales';
      case 'customer': return 'Customer';
      default:         return '';
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Messages list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--gray)', padding: '40px 0' }}>
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</p>
            <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>
              No messages yet — start the conversation!
            </p>
            <p style={{ color: 'var(--gray)', fontSize: '0.78rem', marginTop: '2px' }}>
              Wala pang mensahe — magsimulang mag-usap!
            </p>
          </div>
        ) : messages.map(msg => {
          const own = isOwn(msg);
          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: own ? 'flex-end' : 'flex-start',
            }}>
              {!own && (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 600,
                  marginBottom: '3px', paddingLeft: '4px',
                }}>
                  {roleLabel(msg.sender_type) && (
                    <span style={{ color: 'var(--blue)' }}>
                      {roleLabel(msg.sender_type)} |{' '}
                    </span>
                  )}
                  <span style={{ color: 'var(--gray)' }}>{msg.sender_name}</span>
                </span>
              )}
              <div style={{
                maxWidth: '72%',
                padding: '10px 14px',
                borderRadius: own ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: own
                  ? 'linear-gradient(135deg, var(--blue), var(--red))'
                  : 'rgba(166,113,228,0.08)',
                border: own ? 'none' : '1px solid rgba(166,113,228,0.15)',
              }}>
                {msg.file_type === 'image' ? (
                  <img
                    src={msg.file_url} alt={msg.file_name}
                    style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }}
                  />
                ) : msg.file_type === 'file' ? (
                  <a
                    href={msg.file_url} target="_blank" rel="noopener noreferrer"
                    style={{
                      color: own ? 'white' : 'var(--blue)',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '0.85rem', textDecoration: 'none',
                    }}
                  >
                    <FileText size={14} /> {msg.file_name}
                  </a>
                ) : (
                  <p style={{
                    margin: 0,
                    color: own ? 'white' : 'var(--navy)',
                    fontSize: '0.88rem', lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </p>
                )}
              </div>
              <span style={{
                fontSize: '0.65rem', color: 'var(--gray)',
                marginTop: '3px', paddingLeft: '4px', paddingRight: '4px',
              }}>
                {fmtTime(msg.created_at)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid rgba(166,113,228,0.12)',
        display: 'flex', gap: '8px', alignItems: 'flex-end',
        background: 'white',
      }}>
        {/* File attach */}
        <input type="file" ref={fileRef} onChange={sendFile} style={{ display: 'none' }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Attach file (max 5 MB)"
          style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            border: '1px solid rgba(166,113,228,0.2)',
            background: uploading ? 'rgba(166,113,228,0.04)' : 'rgba(166,113,228,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          <Paperclip size={15} color="var(--blue)" />
        </button>

        {/* Text input */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          placeholder="Type a message… / Mag-type ng mensahe…"
          rows={1}
          style={{
            flex: 1, padding: '9px 14px',
            border: '1px solid rgba(166,113,228,0.2)',
            borderRadius: '18px', resize: 'none', overflowY: 'hidden',
            fontSize: '0.88rem', fontFamily: 'Inter, sans-serif',
            outline: 'none', lineHeight: 1.5,
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />

        {/* Send */}
        <button
          onClick={sendText}
          disabled={sending || !text.trim()}
          style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            border: 'none',
            background: text.trim()
              ? 'linear-gradient(135deg, var(--blue), var(--red))'
              : 'rgba(166,113,228,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          <Send size={15} color={text.trim() ? 'white' : 'var(--gray)'} />
        </button>
      </div>
    </div>
  );
}
