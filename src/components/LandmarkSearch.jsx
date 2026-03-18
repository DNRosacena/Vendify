import { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Loader } from 'lucide-react';

export default function LandmarkSearch({ value, onChange, onSelect }) {
  const [query,       setQuery]       = useState(value || '');
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef   = useRef(null);
  const wrapperRef    = useRef(null);

  useEffect(() => {
    const handleClick = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = async (q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=ph&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'VendoTrack/1.0' } }
      );
      const data = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleChange = e => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 500);
  };

  const handleSelect = (result) => {
    const display = result.display_name;
    setQuery(display);
    onChange(display);
    onSelect({
      name: display,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    });
    setShowResults(false);
    setResults([]);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <MapPin size={16} color="var(--gray)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search landmark or address..."
          className="input-field"
          style={{ paddingLeft: '40px', paddingRight: loading ? '40px' : '16px' }}
        />
        {loading && (
          <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            <Loader size={15} color="var(--gray)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'white', border: '1px solid rgba(44,62,80,0.12)',
          borderRadius: '8px', marginTop: '4px',
          boxShadow: '0 8px 24px rgba(44,62,80,0.12)',
          maxHeight: '280px', overflowY: 'auto',
        }}>
          {results.map((r, i) => (
            <button
              key={r.place_id}
              onClick={() => handleSelect(r)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: i < results.length - 1 ? '1px solid rgba(44,62,80,0.06)' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,152,219,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <MapPin size={14} color="var(--red)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 500, lineHeight: 1.4 }}>
                  {r.display_name.split(',')[0]}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: '2px' }}>
                  {r.display_name.split(',').slice(1, 4).join(',')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}