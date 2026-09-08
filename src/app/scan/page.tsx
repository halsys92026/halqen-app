'use client';

import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/Layout';
import { Button } from '@/components/Button';

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
  bio: string | null;
};

// Builds a standard vCard containing ONLY basic contact info — name, business,
// title, phone, email, and photo. Deliberately never includes bio or any
// credential/verification data; that stays on the webpage only.
async function buildVCard(profile: Profile): Promise<string> {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`FN:${profile.display_name || profile.business}`);
  if (profile.business) lines.push(`ORG:${profile.business}`);
  if (profile.title) lines.push(`TITLE:${profile.title}`);
  if (profile.phone) lines.push(`TEL;TYPE=CELL:${profile.phone}`);
  if (profile.email) lines.push(`EMAIL:${profile.email}`);

  if (profile.photo_url) {
    try {
      const res = await fetch(profile.photo_url);
      const blob = await res.blob();
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const type = blob.type.includes('png') ? 'PNG' : 'JPEG';
      lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${base64}`);
    } catch {
      // If the photo can't be fetched, the vCard still works without it
    }
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export default function ScanPage() {
  const [entered, setEntered] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

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

  async function saveContact() {
    if (!profile) return;
    setSavingContact(true);
    try {
      const vcard = await buildVCard(profile);
      const blob = new Blob([vcard], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // iOS Safari handles a forced "download" attribute inconsistently for
        // vCards — sometimes routing to the Files app instead of the native
        // Add Contact screen. Navigating directly to the vCard data lets
        // Safari recognize the MIME type and show the native contact preview.
        window.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(profile.display_name || profile.business || 'contact').replace(/\s+/g, '-')}.vcf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setSavingContact(false);
    }
  }

  return (
    <div
      style={{
        background: 'radial-gradient(circle at 25% 10%, #16204f 0%, #0A1330 55%)',
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 380, background: '#111a3d', border: '1px solid #22305e', borderRadius: 28,
          padding: 32, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)', animation: 'hq-fade-in 0.4s ease',
        }}
      >
        {!profile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <Logo size={30} wordmarkSize={17} />
            </div>
            <div style={{ color: '#8B93B8', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
              Enter access code
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, animation: shake ? 'hq-shake 0.4s' : 'none' }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 48, height: 56, borderRadius: 12,
                    border: `1.5px solid ${entered.length > i ? '#5AA7FF' : '#22305e'}`,
                    background: '#0A1330', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#F2EEE6', fontSize: 20, fontFamily: 'monospace',
                    boxShadow: entered.length > i ? '0 0 0 3px rgba(90,167,255,0.15)' : 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {entered[i] ? '•' : ''}
                </div>
              ))}
            </div>
            <div style={{ height: 24, marginBottom: 4 }}>
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8B93B8', fontSize: 12 }}>
                  <Spinner size={14} /> Checking…
                </div>
              )}
              {!loading && error && <div style={{ color: '#e07a63', fontSize: 12 }}>{error}</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 240, marginTop: 12 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) =>
                d === '' ? (
                  <div key={i} />
                ) : d === '⌫' ? (
                  <button
                    key={i}
                    onClick={() => setEntered(entered.slice(0, -1))}
                    style={{ height: 52, borderRadius: 14, border: 'none', background: 'transparent', color: '#8B93B8', fontSize: 16, cursor: 'pointer' }}
                  >
                    ⌫
                  </button>
                ) : (
                  <button
                    key={i}
                    onClick={() => pressDigit(d)}
                    disabled={loading}
                    style={{ height: 52, borderRadius: 14, border: '1px solid #22305e', background: 'transparent', color: '#F2EEE6', fontSize: 17, cursor: 'pointer' }}
                  >
                    {d}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div style={{ animation: 'hq-fade-in 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5FAE8F', fontSize: 12, marginBottom: 16 }}>
              <span style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', background: 'rgba(95,174,143,0.15)', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</span>
              Code verified
            </div>
            <div style={{ background: `${profile.color}1A`, border: `1px solid ${profile.color}55`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {profile.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photo_url}
                    alt={profile.display_name}
                    style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${profile.color}66` }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: '50%', background: `${profile.color}33`, color: profile.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 18,
                      border: `1px solid ${profile.color}66`, flexShrink: 0,
                    }}
                  >
                    {(profile.display_name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: profile.color, marginBottom: 2 }}>
                    {profile.business}
                  </p>
                  <h2 style={{ fontSize: 18, color: '#F2EEE6', fontWeight: 600 }}>{profile.display_name}</h2>
                </div>
              </div>
              {profile.title && <p style={{ fontSize: 13, color: '#8B93B8', marginBottom: 10 }}>{profile.title}</p>}
              {profile.bio && (
                <p style={{ fontSize: 13, color: '#c9cfe8', lineHeight: 1.5, marginBottom: 14, fontStyle: 'italic' }}>
                  {profile.bio}
                </p>
              )}
              <div style={{ borderTop: `1px solid ${profile.color}33`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} style={{ fontSize: 14, color: '#F2EEE6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: profile.color }}>☎</span> {profile.phone}
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} style={{ fontSize: 14, color: '#F2EEE6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: profile.color }}>✉</span> {profile.email}
                  </a>
                )}
              </div>
            </div>
            <Button full onClick={saveContact} disabled={savingContact} style={{ marginBottom: 10 }}>
              {savingContact ? <Spinner size={16} /> : 'Save contact'}
            </Button>
            <Button full variant="secondary" onClick={reset}>
              Done
            </Button>
          </div>
        )}
      </div>
      <style>{`@keyframes hq-shake {0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
