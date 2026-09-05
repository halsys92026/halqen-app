'use client';

import { useState } from 'react';

type Profile = {
  kind: string;
  business: string;
  display_name: string;
  title: string;
  phone: string;
  email: string;
  color: string;
  photo_url: string | null;
  brand: string | null;
};

export default function ScanPage() {
  const [entered, setEntered] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitCode(code: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Something went wrong');
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setTimeout(() => setEntered(''), 350);
      } else {
        setProfile(json.profile);
      }
    } catch {
      setError('Network error — check your connection');
    } finally {
      setLoading(false);
    }
  }

  function pressDigit(d: string) {
    if (entered.length >= 4 || loading) return;
    const next = entered + d;
    setEntered(next);
    if (next.length === 4) {
      submitCode(next);
    }
  }

  function reset() {
    setEntered('');
    setProfile(null);
    setError(null);
  }

  return (
    <div
      style={{ background: '#1C1B19', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}
    >
      <div
        style={{ width: '100%', maxWidth: 380, background: '#221F1B', border: '1px solid #3a352c', borderRadius: 32, padding: 32, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)' }}
      >
        {!profile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: '#8A8478', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
              Enter access code
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 28, animation: shake ? 'shake 0.4s' : 'none' }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 48, height: 56, borderRadius: 12,
                    border: `1px solid ${entered.length > i ? '#C08A4E' : '#3a352c'}`,
                    background: '#1C1B19', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#F2EEE6', fontSize: 20, fontFamily: 'monospace',
                  }}
                >
                  {entered[i] ? '•' : ''}
                </div>
              ))}
            </div>
            {error && <div style={{ color: '#c96b56', fontSize: 12, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 240 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) =>
                d === '' ? (
                  <div key={i} />
                ) : d === '⌫' ? (
                  <button
                    key={i}
                    onClick={() => setEntered(entered.slice(0, -1))}
                    style={{ height: 52, borderRadius: 14, border: 'none', background: 'transparent', color: '#8A8478', fontSize: 16, cursor: 'pointer' }}
                  >
                    ⌫
                  </button>
                ) : (
                  <button
                    key={i}
                    onClick={() => pressDigit(d)}
                    disabled={loading}
                    style={{ height: 52, borderRadius: 14, border: '1px solid #3a352c', background: 'transparent', color: '#F2EEE6', fontSize: 17, cursor: 'pointer' }}
                  >
                    {d}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ color: '#5FAE8F', fontSize: 12, marginBottom: 16 }}>✓ Code verified</div>
            <div style={{ background: `${profile.color}1A`, border: `1px solid ${profile.color}55`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: profile.color, marginBottom: 8 }}>
                {profile.business}
              </p>
              <h2 style={{ fontSize: 20, color: '#F2EEE6', marginBottom: 4 }}>{profile.display_name}</h2>
              <p style={{ fontSize: 13, color: '#8A8478', marginBottom: 12 }}>{profile.title}</p>
              <p style={{ fontSize: 14, color: '#F2EEE6' }}>{profile.phone}</p>
              <p style={{ fontSize: 14, color: '#F2EEE6' }}>{profile.email}</p>
            </div>
            <button
              onClick={reset}
              style={{ width: '100%', padding: 12, borderRadius: 14, border: 'none', background: '#F2EEE6', color: '#1C1B19', fontWeight: 600, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes shake {0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
